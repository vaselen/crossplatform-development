using System.ComponentModel.DataAnnotations;
using DanceSchoolApi.Contracts;
using DanceSchoolApi.Data;
using DanceSchoolApi.Models;
using Microsoft.EntityFrameworkCore;

namespace DanceSchoolApi.Services;

public class TariffService(DanceSchoolContext context)
{
    public async Task<List<TariffResponse>> GetAllAsync(bool includeArchive = false, CancellationToken cancellationToken = default)
    {
        var tariffs = await context.Tariffs.AsNoTracking().Where(t => includeArchive || !t.IsArchive)
            .OrderBy(t => t.TariffId).ToListAsync(cancellationToken);
        return tariffs.Select(ToResponse).ToList();
    }

    public async Task<TariffResponse> GetByIdAsync(int id, CancellationToken cancellationToken = default) =>
        ToResponse(await FindAsync(id, cancellationToken));

    public async Task<TariffResponse> CreateAsync(TariffRequest request, CancellationToken cancellationToken = default)
    {
        Validate(request);
        var tariff = new Tariff(request.DurationDays, request.Price);
        context.Tariffs.Add(tariff);
        await context.SaveChangesAsync(cancellationToken);
        return ToResponse(tariff);
    }

    public async Task<TariffResponse> GetPublicByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var tariff = await context.Tariffs.AsNoTracking()
            .SingleOrDefaultAsync(t => t.TariffId == id && !t.IsArchive, cancellationToken)
            ?? throw new EntityNotFoundException("Действующий тариф не найден.");
        return ToResponse(tariff);
    }

    public async Task ArchiveAsync(int id, CancellationToken cancellationToken = default)
    {
        var tariff = await FindAsync(id, cancellationToken);
        tariff.Archive();
        await context.SaveChangesAsync(cancellationToken);
    }

    public async Task RestoreAsync(int id, CancellationToken cancellationToken = default)
    {
        var tariff = await FindAsync(id, cancellationToken);
        tariff.Restore();
        await context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var tariff = await FindAsync(id, cancellationToken);
        if (await context.Subscriptions.AnyAsync(s => s.TariffId == id, cancellationToken))
            throw new BusinessRuleException("Нельзя удалить тариф, использованный в абонементах. Его можно архивировать.");

        context.Tariffs.Remove(tariff);
        await context.SaveChangesAsync(cancellationToken);
    }

    private async Task<Tariff> FindAsync(int id, CancellationToken cancellationToken) =>
        await context.Tariffs.SingleOrDefaultAsync(t => t.TariffId == id, cancellationToken)
            ?? throw new EntityNotFoundException("Тариф не найден.");

    private static TariffResponse ToResponse(Tariff tariff) => new(
        tariff.TariffId, tariff.DurationDays, tariff.Price, tariff.IsArchive);

    private static void Validate(TariffRequest request)
    {
        Validator.ValidateObject(request, new ValidationContext(request), validateAllProperties: true);
        if (decimal.Round(request.Price, 2) != request.Price)
            throw new ValidationException("Цена должна содержать не более двух знаков после запятой.");
    }
}
