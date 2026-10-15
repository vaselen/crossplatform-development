using DanceSchoolApi.Contracts;
using DanceSchoolApi.Models;
using DanceSchoolApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DanceSchoolApi.Controllers.Admin;

[ApiController]
[Authorize(Roles = UserRoles.Admin)]
[Route("api/admin/tariffs")]
public class TariffsController(TariffService tariffs) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<TariffResponse>>> GetAll(CancellationToken ct, bool includeArchive = false) =>
        Ok(await tariffs.GetAllAsync(includeArchive, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TariffResponse>> GetById(int id, CancellationToken ct) =>
        Ok(await tariffs.GetByIdAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<TariffResponse>> Create(TariffRequest request, CancellationToken ct)
    {
        var result = await tariffs.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.TariffId }, result);
    }

    [HttpPost("{id:int}/archive")]
    public async Task<IActionResult> Archive(int id, CancellationToken ct)
    {
        await tariffs.ArchiveAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:int}/restore")]
    public async Task<IActionResult> Restore(int id, CancellationToken ct)
    {
        await tariffs.RestoreAsync(id, ct);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await tariffs.DeleteAsync(id, ct);
        return NoContent();
    }
}
