using DanceSchoolApi.Auth;
using Microsoft.AspNetCore.Mvc;

namespace DanceSchoolApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        public record LoginData(string Login, string Password);

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginData data)
        {
            var hash = UsersStore.Hash(data.Password);
            var user = UsersStore.Users
                .FirstOrDefault(u => u.Login == data.Login && u.PasswordHash == hash);

            if (user == null)
                return Unauthorized(new { message = "wrong login/password" });

            return Ok(AuthOptions.GenerateToken(user.Login, user.Role));
        }
    }
}