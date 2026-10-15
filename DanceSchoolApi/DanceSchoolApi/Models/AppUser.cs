namespace DanceSchoolApi.Models;

public class AppUser
{
    public int UserId { get; set; }
    public string Login { get; set; } = string.Empty;
    public string NormalizedLogin { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = UserRoles.Student;
    // Изменение пароля или прав отзывает ранее выданные токены.
    public int TokenVersion { get; set; }
    public int? StudentId { get; set; }
    public Student? Student { get; set; }
    public int? TeacherId { get; set; }
    public Teacher? Teacher { get; set; }
}

public static class UserRoles
{
    public const string Student = "Student";
    public const string Teacher = "Teacher";
    public const string Admin = "Admin";
}
