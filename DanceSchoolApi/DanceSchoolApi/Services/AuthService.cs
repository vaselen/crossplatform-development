using System.ComponentModel.DataAnnotations;
using System.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using DanceSchoolApi.Auth;
using DanceSchoolApi.Contracts;
using DanceSchoolApi.Data;
using DanceSchoolApi.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace DanceSchoolApi.Services;

public class AuthService(DanceSchoolContext context, IPasswordHasher<AppUser> passwords,
    AuthOptions options, TimeProvider timeProvider, StudentService students)
{
    public async Task<AuthResponse> RegisterAsync(RegisterStudentRequest request, CancellationToken cancellationToken = default)
    {
        students.Validate(request);
        await ValidateLoginAsync(request.Login, null, cancellationToken);
        var student = new Student();
        StudentService.Apply(student, request);
        var user = NewUser(request.Login, request.Password, UserRoles.Student);
        user.Student = student;
        context.AppUsers.Add(user);
        // EF сохраняет аккаунт и новый профиль одной транзакцией.
        await context.SaveChangesAsync(cancellationToken);
        return GenerateToken(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        Validate(request);
        var login = NormalizeLogin(request.Login);
        var user = await context.AppUsers.SingleOrDefaultAsync(u => u.NormalizedLogin == login, cancellationToken);
        if (user is null)
            throw new AuthenticationFailedException("Неверный логин или пароль.");
        var result = passwords.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
            throw new AuthenticationFailedException("Неверный логин или пароль.");
        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = passwords.HashPassword(user, request.Password);
            await context.SaveChangesAsync(cancellationToken);
        }
        return GenerateToken(user);
    }

    public async Task ChangePasswordAsync(int userId, ChangePasswordRequest request, CancellationToken cancellationToken = default)
    {
        Validate(request);
        var user = await FindAsync(userId, cancellationToken);
        if (passwords.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword) == PasswordVerificationResult.Failed)
            throw new AuthenticationFailedException("Текущий пароль неверен.");
        user.PasswordHash = passwords.HashPassword(user, request.NewPassword);
        user.TokenVersion++;
        await context.SaveChangesAsync(cancellationToken);
    }

    public async Task<List<AccountResponse>> GetAllAsync(CancellationToken cancellationToken = default) =>
        (await context.AppUsers.AsNoTracking().OrderBy(u => u.UserId).ToListAsync(cancellationToken))
        .Select(ToResponse).ToList();

    public async Task<AccountResponse> GetByIdAsync(int id, CancellationToken cancellationToken = default) =>
        ToResponse(await FindAsync(id, cancellationToken));

    public async Task<AccountResponse> CreateAsync(CreateAccountRequest request, CancellationToken cancellationToken = default)
    {
        Validate(request);
        await ValidateAccountAsync(request, null, cancellationToken);
        var user = NewUser(request.Login, request.Password, request.Role);
        user.StudentId = request.StudentId;
        user.TeacherId = request.TeacherId;
        context.AppUsers.Add(user);
        await context.SaveChangesAsync(cancellationToken);
        return ToResponse(user);
    }

    public async Task UpdateAsync(int id, AccountRequest request, CancellationToken cancellationToken = default)
    {
        Validate(request);
        await using var transaction = await context.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var user = await FindAsync(id, cancellationToken);
        await ValidateAccountAsync(request, id, cancellationToken);
        if (user.Role == UserRoles.Admin && request.Role != UserRoles.Admin)
            await EnsureAnotherAdminAsync(id, cancellationToken);
        user.Login = request.Login.Trim();
        user.NormalizedLogin = NormalizeLogin(request.Login);
        user.Role = request.Role;
        user.StudentId = request.StudentId;
        user.TeacherId = request.TeacherId;
        user.TokenVersion++;
        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        await using var transaction = await context.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var user = await FindAsync(id, cancellationToken);
        if (user.Role == UserRoles.Admin)
            await EnsureAnotherAdminAsync(id, cancellationToken);
        // Профиль и история абонементов остаются в базе.
        context.AppUsers.Remove(user);
        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task<bool> ValidateTokenAsync(ClaimsPrincipal principal, CancellationToken cancellationToken = default)
    {
        if (!int.TryParse(principal.FindFirstValue("sub"), out var id)
            || !int.TryParse(principal.FindFirstValue("token_version"), out var version))
            return false;
        var user = await context.AppUsers.AsNoTracking().SingleOrDefaultAsync(u => u.UserId == id, cancellationToken);
        if (user is null || user.TokenVersion != version || user.Role != principal.FindFirstValue("role"))
            return false;
        if (!HasValidProfile(user.Role, user.StudentId, user.TeacherId))
            return false;
        if (principal.Identity is not ClaimsIdentity identity)
            return false;
        // Идентификаторы профилей берём из текущей записи БД, а не из тела запроса.
        foreach (var claim in identity.FindAll("student_id").Concat(identity.FindAll("teacher_id")).ToList())
            identity.RemoveClaim(claim);
        if (user.StudentId.HasValue)
            identity.AddClaim(new Claim("student_id", user.StudentId.Value.ToString()));
        if (user.TeacherId.HasValue)
            identity.AddClaim(new Claim("teacher_id", user.TeacherId.Value.ToString()));
        return true;
    }

    private async Task ValidateAccountAsync(AccountRequest request, int? currentId, CancellationToken cancellationToken)
    {
        if (!HasValidProfile(request.Role, request.StudentId, request.TeacherId))
            throw new ValidationException("Ученик должен иметь только StudentId, преподаватель — только TeacherId, администратор — ни одного профиля.");
        await ValidateLoginAsync(request.Login, currentId, cancellationToken);
        if (request.StudentId.HasValue)
        {
            if (!await context.Students.AnyAsync(s => s.StudentId == request.StudentId, cancellationToken))
                throw new EntityNotFoundException("Ученик не найден.");
            if (await context.AppUsers.AnyAsync(u => u.UserId != currentId && u.StudentId == request.StudentId, cancellationToken))
                throw new BusinessRuleException("У ученика уже есть аккаунт.");
        }
        if (request.TeacherId.HasValue)
        {
            if (!await context.Teachers.AnyAsync(t => t.TeacherId == request.TeacherId, cancellationToken))
                throw new EntityNotFoundException("Преподаватель не найден.");
            if (await context.AppUsers.AnyAsync(u => u.UserId != currentId && u.TeacherId == request.TeacherId, cancellationToken))
                throw new BusinessRuleException("У преподавателя уже есть аккаунт.");
        }
    }

    private async Task ValidateLoginAsync(string login, int? currentId, CancellationToken cancellationToken)
    {
        var normalized = NormalizeLogin(login);
        if (normalized.Length is < 1 or > 100)
            throw new ValidationException("Логин должен содержать от 1 до 100 символов.");
        if (await context.AppUsers.AnyAsync(u => u.UserId != currentId && u.NormalizedLogin == normalized, cancellationToken))
            throw new BusinessRuleException("Этот логин уже занят.");
    }

    private async Task EnsureAnotherAdminAsync(int id, CancellationToken cancellationToken)
    {
        if (!await context.AppUsers.AnyAsync(u => u.UserId != id && u.Role == UserRoles.Admin, cancellationToken))
            throw new BusinessRuleException("Нельзя удалить или лишить прав последнего администратора.");
    }

    private async Task<AppUser> FindAsync(int id, CancellationToken cancellationToken) =>
        await context.AppUsers.SingleOrDefaultAsync(u => u.UserId == id, cancellationToken)
        ?? throw new EntityNotFoundException("Аккаунт не найден.");

    private AppUser NewUser(string login, string password, string role)
    {
        var user = new AppUser { Login = login.Trim(), NormalizedLogin = NormalizeLogin(login), Role = role };
        user.PasswordHash = passwords.HashPassword(user, password);
        return user;
    }

    private AuthResponse GenerateToken(AppUser user)
    {
        var now = timeProvider.GetUtcNow();
        var expires = now.AddHours(options.LifetimeInHours);
        var claims = new[]
        {
            new Claim("sub", user.UserId.ToString()),
            new Claim("name", user.Login),
            new Claim("role", user.Role),
            new Claim("token_version", user.TokenVersion.ToString()),
            new Claim("jti", Guid.NewGuid().ToString())
        };
        var jwt = new JwtSecurityToken(options.Issuer, options.Audience, claims, now.UtcDateTime,
            expires.UtcDateTime, new SigningCredentials(options.GetSigningKey(), SecurityAlgorithms.HmacSha256));
        return new AuthResponse(new JwtSecurityTokenHandler().WriteToken(jwt), expires, ToResponse(user));
    }

    private static bool HasValidProfile(string role, int? studentId, int? teacherId) => role switch
    {
        UserRoles.Student => studentId > 0 && teacherId is null,
        UserRoles.Teacher => teacherId > 0 && studentId is null,
        UserRoles.Admin => studentId is null && teacherId is null,
        _ => false
    };

    private static string NormalizeLogin(string login) => login.Trim().ToUpperInvariant();
    private static AccountResponse ToResponse(AppUser user) => new(user.UserId, user.Login, user.Role, user.StudentId, user.TeacherId);
    private static void Validate(object request) => Validator.ValidateObject(request, new ValidationContext(request), true);
}
