using System.ComponentModel.DataAnnotations;
using DanceSchoolApi.Contracts;
using DanceSchoolApi.Data;
using DanceSchoolApi.Models;
using Microsoft.EntityFrameworkCore;

namespace DanceSchoolApi.Services;

public class TeacherService(DanceSchoolContext context, TimeProvider timeProvider)
{
    private DateOnly Today => DateOnly.FromDateTime(timeProvider.GetLocalNow().DateTime);

    public async Task<List<TeacherResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var today = Today;
        var teachers = await context.Teachers.AsNoTracking().OrderBy(t => t.TeacherId).ToListAsync(cancellationToken);
        return teachers.Select(t => ToResponse(t, today)).ToList();
    }

    public async Task<TeacherResponse> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var teacher = await context.Teachers.AsNoTracking().SingleOrDefaultAsync(t => t.TeacherId == id, cancellationToken)
            ?? throw new EntityNotFoundException("Учитель не найден.");
        return ToResponse(teacher, Today);
    }

    public async Task<TeacherResponse> CreateAsync(TeacherRequest request, CancellationToken cancellationToken = default)
    {
        Validate(request);
        var teacher = new Teacher();
        Apply(teacher, request);
        context.Teachers.Add(teacher);
        await context.SaveChangesAsync(cancellationToken);
        return ToResponse(teacher, Today);
    }

    public async Task UpdateAsync(int id, TeacherRequest request, CancellationToken cancellationToken = default)
    {
        Validate(request);
        var teacher = await context.Teachers.SingleOrDefaultAsync(t => t.TeacherId == id, cancellationToken)
            ?? throw new EntityNotFoundException("Учитель не найден.");
        Apply(teacher, request);
        await context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var teacher = await context.Teachers.SingleOrDefaultAsync(t => t.TeacherId == id, cancellationToken)
            ?? throw new EntityNotFoundException("Учитель не найден.");
        if (await context.Teams.AnyAsync(t => t.TeacherId == id, cancellationToken))
            throw new BusinessRuleException("Нельзя удалить учителя, который назначен на команду.");
        if (await context.AppUsers.AnyAsync(u => u.TeacherId == id, cancellationToken))
            throw new BusinessRuleException("Сначала удалите связанный аккаунт преподавателя.");

        context.Teachers.Remove(teacher);
        await context.SaveChangesAsync(cancellationToken);
    }

    public Task<List<PublicTeacherResponse>> GetPublicAsync(CancellationToken cancellationToken = default) =>
        context.Teachers.AsNoTracking().OrderBy(t => t.TeacherId)
            .Select(t => new PublicTeacherResponse(t.TeacherId, t.FirstName, t.LastName, t.MiddleName, t.Style, t.Rating))
            .ToListAsync(cancellationToken);

    public async Task<PublicTeacherResponse> GetPublicByIdAsync(int id, CancellationToken cancellationToken = default) =>
        await context.Teachers.AsNoTracking().Where(t => t.TeacherId == id)
            .Select(t => new PublicTeacherResponse(t.TeacherId, t.FirstName, t.LastName, t.MiddleName, t.Style, t.Rating))
            .SingleOrDefaultAsync(cancellationToken) ?? throw new EntityNotFoundException("Преподаватель не найден.");

    private static TeacherResponse ToResponse(Teacher teacher, DateOnly today) => new(
        teacher.TeacherId, teacher.FirstName, teacher.LastName, teacher.MiddleName,
        teacher.DateOfBirth, teacher.GetAge(today), teacher.Style, teacher.Rating);

    private void Validate(TeacherRequest request)
    {
        Validator.ValidateObject(request, new ValidationContext(request), validateAllProperties: true);
        if (request.DateOfBirth == default || request.DateOfBirth > Today)
            throw new ValidationException("Укажите дату рождения, которая не находится в будущем.");
    }

    private static void Apply(Teacher teacher, TeacherRequest request)
    {
        teacher.FirstName = request.FirstName.Trim();
        teacher.LastName = request.LastName.Trim();
        teacher.MiddleName = request.MiddleName?.Trim() ?? string.Empty;
        teacher.DateOfBirth = request.DateOfBirth;
        teacher.Style = request.Style;
        teacher.Rating = request.Rating;
    }
}
