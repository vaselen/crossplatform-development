using System.ComponentModel.DataAnnotations;
using System.Data;
using DanceSchoolApi.Contracts;
using DanceSchoolApi.Data;
using DanceSchoolApi.Models;
using Microsoft.EntityFrameworkCore;

namespace DanceSchoolApi.Services;

public class TeamService(DanceSchoolContext context, TimeProvider timeProvider)
{
    private DateOnly Today => DateOnly.FromDateTime(timeProvider.GetLocalNow().DateTime);

    public Task<List<TeamResponse>> GetAllAsync(CancellationToken cancellationToken = default) =>
        Query(Today).OrderBy(t => t.TeamId).ToListAsync(cancellationToken);

    public Task<List<TeamResponse>> GetAllAsync(TeamQuery filter, CancellationToken cancellationToken = default)
    {
        Validator.ValidateObject(filter, new ValidationContext(filter), true);
        var query = Query(Today);
        if (filter.TeacherId.HasValue)
            query = query.Where(t => t.TeacherId == filter.TeacherId);
        if (filter.Age.HasValue)
            query = query.Where(t => t.MinAge <= filter.Age && t.MaxAge >= filter.Age);
        if (filter.OnlyAvailable)
            query = query.Where(t => t.StudentsCount < t.MaxStudents);
        return query.OrderBy(t => t.TeamId).ToListAsync(cancellationToken);
    }

    public Task<List<TeamResponse>> GetForTeacherAsync(int teacherId, CancellationToken cancellationToken = default) =>
        Query(Today).Where(t => t.TeacherId == teacherId).OrderBy(t => t.TeamId).ToListAsync(cancellationToken);

    public async Task<TeamResponse> GetByIdAsync(int id, CancellationToken cancellationToken = default) =>
        await Query(Today).SingleOrDefaultAsync(t => t.TeamId == id, cancellationToken)
            ?? throw new EntityNotFoundException("Команда не найдена.");

    public async Task<TeamResponse> CreateAsync(TeamRequest request, CancellationToken cancellationToken = default)
    {
        await ValidateAsync(request, cancellationToken);
        var team = new Team();
        Apply(team, request);
        context.Teams.Add(team);
        await context.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(team.TeamId, cancellationToken);
    }

    public async Task UpdateAsync(int id, TeamRequest request, CancellationToken cancellationToken = default)
    {
        // Изменение вместимости и покупка должны согласовываться при одновременных запросах.
        await using var transaction = await context.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        await ValidateAsync(request, cancellationToken);
        var team = await context.Teams.SingleOrDefaultAsync(t => t.TeamId == id, cancellationToken)
            ?? throw new EntityNotFoundException("Команда не найдена.");
        var studentsCount = await SubscriptionService.ActiveOn(context.Subscriptions, Today)
            .Where(s => s.TeamId == id).Select(s => s.StudentId).Distinct().CountAsync(cancellationToken);
        if (request.MaxStudents < studentsCount)
            throw new BusinessRuleException("Вместимость команды не может быть меньше числа действующих участников.");

        Apply(team, request);
        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var team = await context.Teams.SingleOrDefaultAsync(t => t.TeamId == id, cancellationToken)
            ?? throw new EntityNotFoundException("Команда не найдена.");
        if (await context.Subscriptions.AnyAsync(s => s.TeamId == id, cancellationToken))
            throw new BusinessRuleException("Нельзя удалить команду с историей абонементов.");

        context.Teams.Remove(team);
        await context.SaveChangesAsync(cancellationToken);
    }

    public Task<List<TeamResponse>> GetAvailableAsync(CancellationToken cancellationToken = default) =>
        Query(Today).Where(t => t.StudentsCount < t.MaxStudents).ToListAsync(cancellationToken);

    public async Task<List<StudentResponse>> GetStudentsAsync(int teamId, CancellationToken cancellationToken = default)
    {
        var today = Today;
        if (!await context.Teams.AnyAsync(t => t.TeamId == teamId, cancellationToken))
            throw new EntityNotFoundException("Команда не найдена.");

        var students = await SubscriptionService.ActiveOn(context.Subscriptions.AsNoTracking(), today)
            .Where(s => s.TeamId == teamId).Select(s => s.Student).Distinct().ToListAsync(cancellationToken);
        return students.Select(s => StudentService.ToResponse(s, today)).ToList();
    }

    public async Task<List<TeamMemberResponse>> GetMembersForTeacherAsync(int teacherId, int teamId, CancellationToken cancellationToken = default)
    {
        if (!await context.Teams.AnyAsync(t => t.TeamId == teamId && t.TeacherId == teacherId, cancellationToken))
            throw new EntityNotFoundException("Команда не найдена среди ваших команд.");
        return await GetMembersAsync(teamId, cancellationToken);
    }

    public async Task<List<TeamMemberResponse>> GetMembersAsync(int teamId, CancellationToken cancellationToken = default)
    {
        if (!await context.Teams.AnyAsync(t => t.TeamId == teamId, cancellationToken))
            throw new EntityNotFoundException("Команда не найдена.");
        var today = Today;
        var rows = await (from subscription in SubscriptionService.ActiveOn(context.Subscriptions.AsNoTracking(), today)
            join student in context.Students on subscription.StudentId equals student.StudentId
            where subscription.TeamId == teamId
            orderby student.LastName, student.FirstName
            select new { Student = student, subscription.EndDate }).ToListAsync(cancellationToken);
        return rows.Select(r => new TeamMemberResponse(r.Student.StudentId, r.Student.FirstName,
            r.Student.LastName, r.Student.MiddleName, r.Student.GetAge(today), r.EndDate)).ToList();
    }

    private IQueryable<TeamResponse> Query(DateOnly today) => context.Teams.AsNoTracking().Select(team => new TeamResponse
    {
        TeamId = team.TeamId,
        Name = team.Name,
        TeacherId = team.TeacherId,
        TeacherName = (team.Teacher!.LastName + " " + team.Teacher.FirstName + " " + team.Teacher.MiddleName).Trim(),
        MinAge = team.MinAge,
        MaxAge = team.MaxAge,
        MaxStudents = team.MaxStudents,
        StudentsCount = team.Subscriptions.Where(s => !s.IsCancelled && s.PurchaseDate <= today && s.EndDate > today)
            .Select(s => s.StudentId).Distinct().Count()
    });

    private async Task ValidateAsync(TeamRequest request, CancellationToken cancellationToken)
    {
        Validator.ValidateObject(request, new ValidationContext(request), validateAllProperties: true);
        if (request.MaxAge < request.MinAge)
            throw new ValidationException("Максимальный возраст не может быть меньше минимального.");
        if (!await context.Teachers.AnyAsync(t => t.TeacherId == request.TeacherId, cancellationToken))
            throw new EntityNotFoundException("Учитель не найден.");
    }

    private static void Apply(Team team, TeamRequest request)
    {
        team.Name = request.Name.Trim();
        team.TeacherId = request.TeacherId;
        team.MinAge = request.MinAge;
        team.MaxAge = request.MaxAge;
        team.MaxStudents = request.MaxStudents;
    }
}
