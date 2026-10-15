using System.Security.Claims;
using System.Text;
using DanceSchoolApi.Contracts;
using Microsoft.IdentityModel.Tokens;

namespace DanceSchoolApi.Auth;

public class AuthOptions
{
    public string Issuer { get; set; } = "DanceSchool";
    public string Audience { get; set; } = "DanceSchoolClients";
    public int LifetimeInHours { get; set; } = 8;
    public string SigningKey { get; set; } = string.Empty;

    public SymmetricSecurityKey GetSigningKey() => new(Encoding.UTF8.GetBytes(SigningKey));

    public void Validate()
    {
        if (string.IsNullOrWhiteSpace(Issuer) || string.IsNullOrWhiteSpace(Audience)
            || LifetimeInHours is < 1 or > 24 || Encoding.UTF8.GetByteCount(SigningKey) < 32)
            throw new InvalidOperationException("Настройте Jwt:Issuer, Audience, LifetimeInHours (1–24) и SigningKey (не менее 32 байт).");
    }
}

public static class CurrentAccountClaims
{
    public static int GetAccountId(this ClaimsPrincipal user) => ReadId(user, "sub");
    public static int GetStudentId(this ClaimsPrincipal user) => ReadId(user, "student_id");
    public static int GetTeacherId(this ClaimsPrincipal user) => ReadId(user, "teacher_id");

    private static int ReadId(ClaimsPrincipal user, string claim) =>
        int.TryParse(user.FindFirstValue(claim), out var id) && id > 0
            ? id : throw new AuthenticationFailedException("Аккаунт не связан с требуемым профилем.");
}
