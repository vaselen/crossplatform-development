using System.ComponentModel.DataAnnotations;
using DanceSchoolApi.Contracts;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace DanceSchoolApi.Infrastructure;

public class ServiceExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var sqlState = FindSqlState(exception);
        var (status, message) = exception switch
        {
            EntityNotFoundException => (StatusCodes.Status404NotFound, exception.Message),
            BusinessRuleException => (StatusCodes.Status409Conflict, exception.Message),
            ValidationException => (StatusCodes.Status400BadRequest, exception.Message),
            AuthenticationFailedException => (StatusCodes.Status401Unauthorized, exception.Message),
            DbUpdateConcurrencyException => (StatusCodes.Status409Conflict, "Данные изменились. Повторите запрос."),
            _ when sqlState is "40001" or "40P01"
                => (StatusCodes.Status409Conflict, "Данные изменились во время операции. Повторите запрос."),
            _ when sqlState is "23503" or "23001"
                => (StatusCodes.Status409Conflict, "Операция нарушает связи с другими записями."),
            _ when sqlState == "23505"
                => (StatusCodes.Status409Conflict, "Логин или профиль уже связан с другим аккаунтом."),
            _ => (0, string.Empty)
        };

        if (status == 0)
            return false;

        if (status == StatusCodes.Status401Unauthorized)
            httpContext.Response.Headers.WWWAuthenticate = "Bearer";

        await Results.Problem(statusCode: status, title: message, instance: httpContext.Request.Path)
            .ExecuteAsync(httpContext);
        return true;
    }

    private static string? FindSqlState(Exception exception)
    {
        // NpgsqlExecutionStrategy может обернуть DbUpdateException ещё в InvalidOperationException.
        for (Exception? current = exception; current is not null; current = current.InnerException)
            if (current is PostgresException postgres)
                return postgres.SqlState;
        return null;
    }
}
