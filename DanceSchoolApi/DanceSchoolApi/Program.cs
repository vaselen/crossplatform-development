using DanceSchoolApi.Auth;
using DanceSchoolApi.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddDbContext<DanceSchoolContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DanceSchoolConnection")));

// JWT
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = AuthOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = AuthOptions.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = AuthOptions.SigningKey,
            ValidateLifetime = true,
        };
    });

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseHttpsRedirection();
app.UseAuthentication();   
app.UseAuthorization();
app.MapControllers();

app.Run();