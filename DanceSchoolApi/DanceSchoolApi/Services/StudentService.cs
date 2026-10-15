using System.ComponentModel.DataAnnotations;
using DanceSchoolApi.Contracts;
using DanceSchoolApi.Data;
using DanceSchoolApi.Models;
using Microsoft.EntityFrameworkCore;

namespace DanceSchoolApi.Services;

public class StudentService(DanceSchoolContext context, TimeProvider timeProvider)
{
    private DateOnly Today => DateOnly.FromDateTime(timeProvider.GetLocalNow().DateTime);

    public async Task<List<StudentResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var today = Today;
        var students = await context.Students.AsNoTracking().OrderBy(s => s.StudentId).ToListAsync(cancellationToken);
        return students.Select(s => ToResponse(s, today)).ToList();
    }

    public async Task<StudentResponse> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var student = await context.Students.AsNoTracking().SingleOrDefaultAsync(s => s.StudentId == id, cancellationToken)
            ?? throw new EntityNotFoundException("Ученик не найден.");
        return ToResponse(student, Today);
    }

    public async Task<StudentResponse> CreateAsync(StudentRequest request, CancellationToken cancellationToken = default)
    {
        Validate(request);
        var student = new Student();
        Apply(student, request);
        context.Students.Add(student);
        await context.SaveChangesAsync(cancellationToken);
        return ToResponse(student, Today);
    }

    public async Task UpdateAsync(int id, StudentRequest request, CancellationToken cancellationToken = default)
    {
        Validate(request);
        var student = await context.Students.SingleOrDefaultAsync(s => s.StudentId == id, cancellationToken)
            ?? throw new EntityNotFoundException("Ученик не найден.");
        Apply(student, request);
        await context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var student = await context.Students.SingleOrDefaultAsync(s => s.StudentId == id, cancellationToken)
            ?? throw new EntityNotFoundException("Ученик не найден.");
        if (await context.Subscriptions.AnyAsync(s => s.StudentId == id, cancellationToken))
            throw new BusinessRuleException("Нельзя удалить ученика с историей абонементов.");
        if (await context.AppUsers.AnyAsync(u => u.StudentId == id, cancellationToken))
            throw new BusinessRuleException("Сначала удалите связанный аккаунт ученика.");

        context.Students.Remove(student);
        await context.SaveChangesAsync(cancellationToken);
    }

    public async Task<List<StudentTeamResponse>> GetTeamsAsync(int studentId, CancellationToken cancellationToken = default)
    {
        if (!await context.Students.AnyAsync(s => s.StudentId == studentId, cancellationToken))
            throw new EntityNotFoundException("Ученик не найден.");

        return await SubscriptionService.ActiveOn(context.Subscriptions.AsNoTracking(), Today)
            .Where(s => s.StudentId == studentId)
            .Select(s => s.Team).Distinct()
            .Select(team => new StudentTeamResponse(team.TeamId, team.Name,
                (team.Teacher!.LastName + " " + team.Teacher.FirstName + " " + team.Teacher.MiddleName).Trim()))
            .ToListAsync(cancellationToken);
    }

    public async Task<List<StudentResponse>> GetEligibleForTeamAsync(int teamId, CancellationToken cancellationToken = default)
    {
        var today = Today;
        var team = await context.Teams.AsNoTracking().SingleOrDefaultAsync(t => t.TeamId == teamId, cancellationToken)
            ?? throw new EntityNotFoundException("Команда не найдена.");
        var activeStudentIds = SubscriptionService.ActiveOn(context.Subscriptions, today)
            .Where(s => s.TeamId == teamId).Select(s => s.StudentId);
        var students = await context.Students.AsNoTracking()
            .Where(s => !activeStudentIds.Contains(s.StudentId)).ToListAsync(cancellationToken);

        // Возраст рассчитывается после SQL-запроса: свойство Age в БД не хранится.
        return students.Where(s => team.IsAgeAllowed(s.GetAge(today)))
            .Select(s => ToResponse(s, today)).ToList();
    }

    internal static StudentResponse ToResponse(Student student, DateOnly today) => new(
        student.StudentId, student.FirstName, student.LastName, student.MiddleName,
        student.DateOfBirth, student.GetAge(today), student.Phone);

    public async Task UpdatePhoneAsync(int id, UpdateStudentPhoneRequest request, CancellationToken cancellationToken = default)
    {
        Validator.ValidateObject(request, new ValidationContext(request), true);
        var student = await context.Students.SingleOrDefaultAsync(s => s.StudentId == id, cancellationToken)
            ?? throw new EntityNotFoundException("Ученик не найден.");
        student.Phone = request.Phone;
        await context.SaveChangesAsync(cancellationToken);
    }

    internal void Validate(StudentRequest request)
    {
        Validator.ValidateObject(request, new ValidationContext(request), validateAllProperties: true);
        if (request.DateOfBirth == default || request.DateOfBirth > Today)
            throw new ValidationException("Укажите дату рождения, которая не находится в будущем.");
    }

    internal static void Apply(Student student, StudentRequest request)
    {
        student.FirstName = request.FirstName.Trim();
        student.LastName = request.LastName.Trim();
        student.MiddleName = request.MiddleName?.Trim() ?? string.Empty;
        student.DateOfBirth = request.DateOfBirth;
        student.Phone = request.Phone;
    }
}
