using System.Security.Cryptography;
using DanceSchoolApi.Auth;
using DanceSchoolApi.Data;
using DanceSchoolApi.Infrastructure;
using DanceSchoolApi.Models;
using DanceSchoolApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;

public partial class Program
{
    public static async Task Main(string[] args)
    {
        await using var app = CreateApp(args);
        await app.RunAsync();
    }

    public static WebApplication CreateApp(string[] args)
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            Args = args,
            ApplicationName = typeof(Program).Assembly.GetName().Name
        });
        builder.Services.AddControllers();
        builder.Services.AddOpenApi();
        builder.Services.AddProblemDetails();
        builder.Services.AddExceptionHandler<ServiceExceptionHandler>();
        builder.Services.AddSingleton<TimeProvider>(TimeProvider.System);
        builder.Services.AddScoped<StudentService>();
        builder.Services.AddScoped<TeacherService>();
        builder.Services.AddScoped<TeamService>();
        builder.Services.AddScoped<TariffService>();
        builder.Services.AddScoped<SubscriptionService>();
        builder.Services.AddScoped<AuthService>();
        builder.Services.AddScoped<IPasswordHasher<AppUser>, PasswordHasher<AppUser>>();

        var connection = builder.Configuration.GetConnectionString("DanceSchoolConnection");
        if (string.IsNullOrWhiteSpace(connection))
            throw new InvalidOperationException("Укажите ConnectionStrings:DanceSchoolConnection в appsettings.json.");
        builder.Services.AddDbContext<DanceSchoolContext>(options =>
            options.UseNpgsql(connection));

        var auth = builder.Configuration.GetSection("Jwt").Get<AuthOptions>() ?? new AuthOptions();
        var temporaryKey = builder.Environment.IsDevelopment() && string.IsNullOrWhiteSpace(auth.SigningKey);
        if (temporaryKey)
            auth.SigningKey = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        auth.Validate();
        builder.Services.AddSingleton(auth);
        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
        {
            options.MapInboundClaims = false;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = auth.Issuer,
                ValidateAudience = true,
                ValidAudience = auth.Audience,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = auth.GetSigningKey(),
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero,
                NameClaimType = "name",
                RoleClaimType = "role"
            };
            options.Events = new JwtBearerEvents
            {
                OnTokenValidated = async context =>
                {
                    var service = context.HttpContext.RequestServices.GetRequiredService<AuthService>();
                    if (context.Principal is null || !await service.ValidateTokenAsync(context.Principal, context.HttpContext.RequestAborted))
                        context.Fail("Аккаунт удалён, пароль или права изменились. Войдите повторно.");
                }
            };
        });
        builder.Services.AddAuthorization(options =>
            options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

        var app = builder.Build();
        app.UseExceptionHandler();
        if (temporaryKey)
            app.Logger.LogWarning("Используется временный ключ JWT. После перезапуска потребуется вход. Для постоянного ключа заполните Jwt:SigningKey в appsettings.Development.json.");
        if (app.Environment.IsDevelopment())
        {
            app.MapOpenApi().AllowAnonymous();
            app.MapScalarApiReference().AllowAnonymous();
        }
        app.UseHttpsRedirection();
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();
        return app;
    }
}
