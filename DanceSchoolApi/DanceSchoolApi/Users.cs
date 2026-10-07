namespace DanceSchoolApi.Auth
{
    public class AppUser
    {
        public string Login { get; set; } = "";
        public string PasswordHash { get; set; } = "";
        public string Role { get; set; } = "user";
    }

    public static class UsersStore
    {
        public static List<AppUser> Users { get; } = new()
        {
            new AppUser { Login = "admin", PasswordHash = Hash("admin123"), Role = "admin" },
            new AppUser { Login = "user",  PasswordHash = Hash("user123"),  Role = "user"  }
        };

        public static string Hash(string s)
        {
            using var md5 = System.Security.Cryptography.MD5.Create();
            var bytes = System.Text.Encoding.UTF8.GetBytes(s);
            var hash = md5.ComputeHash(bytes);
            return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
        }
    }
}