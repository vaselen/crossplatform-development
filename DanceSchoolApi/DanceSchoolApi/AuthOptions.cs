using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace DanceSchoolApi.Auth
{
    public static class AuthOptions
    {
        public const string Issuer = "DanceSchool";
        public const string Audience = "DanceSchoolClients";
        public const int LifetimeInHours = 8;
        public static SymmetricSecurityKey SigningKey =>
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                "DanceSchoolSuperSecretKey_AtLeast32Chars!"));

        public static object GenerateToken(string login, string role)
        {
            var now = DateTime.UtcNow;
            var claims = new List<Claim>
            {
                new Claim(ClaimsIdentity.DefaultNameClaimType, login),
                new Claim(ClaimsIdentity.DefaultRoleClaimType, role)
            };
            var identity = new ClaimsIdentity(claims, "Token",
                ClaimsIdentity.DefaultNameClaimType,
                ClaimsIdentity.DefaultRoleClaimType);

            var jwt = new JwtSecurityToken(
                issuer: Issuer,
                audience: Audience,
                notBefore: now,
                expires: now.AddHours(LifetimeInHours),
                claims: identity.Claims,
                signingCredentials: new SigningCredentials(
                    SigningKey, SecurityAlgorithms.HmacSha256));

            return new { token = new JwtSecurityTokenHandler().WriteToken(jwt) };
        }
    }
}