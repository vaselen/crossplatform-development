using System.ComponentModel.DataAnnotations;
using System.Data;
using DanceSchoolApi.Contracts;
using DanceSchoolApi.Data;
using DanceSchoolApi.Models;
using Microsoft.EntityFrameworkCore;

namespace DanceSchoolApi.Services;

public class SubscriptionService(DanceSchoolContext context, TimeProvider timeProvider)
{
    private DateOnly Today => DateOnly.FromDateTime(timeProvider.GetLocalNow().DateTime);

    public async Task<List<SubscriptionResponse>> GetAllAsync(CancellationToken cancellationToken = default)
        => await GetAllAsync(new SubscriptionQuery(), cancellationToken);

    public async Task<List<SubscriptionResponse>> GetAllAsync(SubscriptionQuery filter, CancellationToken cancellationToken = default)
    {
        Validator.ValidateObject(filter, new ValidationContext(filter), true);
        if (filter.PurchasedFrom > filter.PurchasedTo)
            throw new ValidationException("Начало периода покупки не может быть позже окончания.");
        var today = Today;
        var query = FilterStatus(context.Subscriptions.AsNoTracking(), filter.Status, today);
        if (filter.StudentId.HasValue)
            query = query.Where(s => s.StudentId == filter.StudentId);
        if (filter.TeamId.HasValue)
            query = query.Where(s => s.TeamId == filter.TeamId);
        if (filter.PurchasedFrom.HasValue)
            query = query.Where(s => s.PurchaseDate >= filter.PurchasedFrom);
        if (filter.PurchasedTo.HasValue)
            query = query.Where(s => s.PurchaseDate <= filter.PurchasedTo);
        var rows = await (from subscription in query
            join student in context.Students on subscription.StudentId equals student.StudentId
            join team in context.Teams on subscription.TeamId equals team.TeamId
            join tariff in context.Tariffs on subscription.TariffId equals tariff.TariffId
            orderby subscription.SubscriptionId
            select new { Subscription = subscription, Student = student, Team = team, Tariff = tariff })
            .ToListAsync(cancellationToken);
        return rows.Select(r => ToResponse(r.Subscription, r.Student, r.Team, r.Tariff, today)).ToList();
    }

    public Task<List<SubscriptionResponse>> GetForStudentAsync(int studentId, string? status, CancellationToken cancellationToken = default) =>
        GetAllAsync(new SubscriptionQuery { StudentId = studentId, Status = status }, cancellationToken);

    public async Task<SubscriptionResponse> GetForStudentByIdAsync(int studentId, int id, CancellationToken cancellationToken = default)
    {
        var sub = await Details().SingleOrDefaultAsync(s => s.SubscriptionId == id && s.StudentId == studentId, cancellationToken)
            ?? throw new EntityNotFoundException("Абонемент не найден.");
        return ToResponse(sub, sub.Student, sub.Team, sub.Tariff, Today);
    }

    public Task<SubscriptionResponse> PurchaseForStudentAsync(int studentId, PurchaseOwnSubscriptionRequest request, CancellationToken cancellationToken = default) =>
        PurchaseAsync(new PurchaseSubscriptionRequest { StudentId = studentId, TeamId = request.TeamId, TariffId = request.TariffId }, cancellationToken);

    public async Task<SubscriptionResponse> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var sub = await Details().SingleOrDefaultAsync(s => s.SubscriptionId == id, cancellationToken)
            ?? throw new EntityNotFoundException("Абонемент не найден.");
        return ToResponse(sub, sub.Student, sub.Team, sub.Tariff, Today);
    }

    public async Task<SubscriptionResponse> PurchaseAsync(PurchaseSubscriptionRequest request, CancellationToken cancellationToken = default)
    {
        Validator.ValidateObject(request, new ValidationContext(request), validateAllProperties: true);
        await using var transaction = await context.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var today = Today;
        var student = await context.Students.AsNoTracking().SingleOrDefaultAsync(s => s.StudentId == request.StudentId, cancellationToken)
            ?? throw new EntityNotFoundException("Ученик не найден.");
        var team = await context.Teams.AsNoTracking().SingleOrDefaultAsync(t => t.TeamId == request.TeamId, cancellationToken)
            ?? throw new EntityNotFoundException("Команда не найдена.");
        var tariff = await context.Tariffs.AsNoTracking().SingleOrDefaultAsync(t => t.TariffId == request.TariffId, cancellationToken)
            ?? throw new EntityNotFoundException("Тариф не найден.");

        if (tariff.IsArchive)
            throw new BusinessRuleException("Нельзя купить абонемент по архивному тарифу.");
        if (!team.IsAgeAllowed(student.GetAge(today)))
            throw new BusinessRuleException($"Ученик не подходит по возрасту (нужно {team.MinAge}-{team.MaxAge}).");

        var active = ActiveOn(context.Subscriptions, today);
        if (await active.AnyAsync(s => s.StudentId == request.StudentId && s.TeamId == request.TeamId, cancellationToken))
            throw new BusinessRuleException("У ученика уже есть действующий абонемент в эту команду.");

        var studentsCount = await active.Where(s => s.TeamId == request.TeamId)
            .Select(s => s.StudentId).Distinct().CountAsync(cancellationToken);
        if (studentsCount >= team.MaxStudents)
            throw new BusinessRuleException("В команде нет свободных мест.");

        if (tariff.DurationDays > DateOnly.MaxValue.DayNumber - today.DayNumber)
            throw new ValidationException("Продолжительность тарифа слишком велика для вычисления даты окончания.");

        var subscription = new Subscription(student.StudentId, team.TeamId, tariff.TariffId, today, tariff.DurationDays);
        context.Subscriptions.Add(subscription);
        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return ToResponse(subscription, student, team, tariff, today);
    }

    public Task<SubscriptionResponse> CancelAsync(int id, CancellationToken cancellationToken = default) =>
        CancelCoreAsync(id, null, cancellationToken);

    public Task<SubscriptionResponse> CancelForStudentAsync(int studentId, int id, CancellationToken cancellationToken = default) =>
        CancelCoreAsync(id, studentId, cancellationToken);

    private async Task<SubscriptionResponse> CancelCoreAsync(int id, int? studentId, CancellationToken cancellationToken)
    {
        var today = Today;
        var subscription = await context.Subscriptions.Include(s => s.Student).Include(s => s.Team).Include(s => s.Tariff)
            .SingleOrDefaultAsync(s => s.SubscriptionId == id && (!studentId.HasValue || s.StudentId == studentId), cancellationToken)
            ?? throw new EntityNotFoundException("Абонемент не найден.");
        try
        {
            subscription.Cancel(today);
        }
        catch (InvalidOperationException exception)
        {
            throw new BusinessRuleException(exception.Message);
        }

        await context.SaveChangesAsync(cancellationToken);
        return ToResponse(subscription, subscription.Student, subscription.Team, subscription.Tariff, today);
    }

    public async Task<List<SubscriptionResponse>> GetActiveAsync(CancellationToken cancellationToken = default)
    {
        var today = Today;
        var subscriptions = await ActiveOn(Details(), today).ToListAsync(cancellationToken);
        return subscriptions.Select(s => ToResponse(s, s.Student, s.Team, s.Tariff, today)).ToList();
    }

    public async Task<List<SubscriptionResponse>> GetExpiredAsync(CancellationToken cancellationToken = default)
    {
        var today = Today;
        var subscriptions = await Details().Where(s => !s.IsCancelled && s.EndDate <= today).ToListAsync(cancellationToken);
        return subscriptions.Select(s => ToResponse(s, s.Student, s.Team, s.Tariff, today)).ToList();
    }

    internal static IQueryable<Subscription> ActiveOn(IQueryable<Subscription> subscriptions, DateOnly date) =>
        subscriptions.Where(s => !s.IsCancelled && s.PurchaseDate <= date && s.EndDate > date);

    private static IQueryable<Subscription> FilterStatus(IQueryable<Subscription> query, string? status, DateOnly today) =>
        status?.Trim().ToLowerInvariant() switch
        {
            null or "" or "all" => query,
            "active" => ActiveOn(query, today),
            "expired" => query.Where(s => !s.IsCancelled && s.EndDate <= today),
            "cancelled" => query.Where(s => s.IsCancelled),
            _ => throw new ValidationException("Статус должен быть all, active, expired или cancelled.")
        };

    private IQueryable<Subscription> Details() => context.Subscriptions.AsNoTracking()
        .Include(s => s.Student).Include(s => s.Team).Include(s => s.Tariff);

    private static SubscriptionResponse ToResponse(Subscription sub, Student student, Team team, Tariff tariff, DateOnly today) => new(
        sub.SubscriptionId, sub.StudentId, student.GetFullName(), sub.TeamId, team.Name,
        sub.TariffId, tariff.Price, sub.PurchaseDate, sub.EndDate,
        sub.PurchaseDate.AddDays(tariff.DurationDays), sub.IsCancelled, sub.IsActiveOn(today), sub.GetDaysLeft(today));
}
