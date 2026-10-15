using DanceSchoolApi.Contracts;
using DanceSchoolApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DanceSchoolApi.Controllers.Common;

[ApiController]
[AllowAnonymous]
[Route("api/catalog")]
public class CatalogController(TeamService teams, TeacherService teachers, TariffService tariffs) : ControllerBase
{
    [HttpGet("teams")]
    public async Task<ActionResult<List<TeamResponse>>> GetTeams([FromQuery] TeamQuery filter, CancellationToken ct) =>
        Ok(await teams.GetAllAsync(filter, ct));

    [HttpGet("teams/{id:int}")]
    public async Task<ActionResult<TeamResponse>> GetTeam(int id, CancellationToken ct) =>
        Ok(await teams.GetByIdAsync(id, ct));

    [HttpGet("teachers")]
    public async Task<ActionResult<List<PublicTeacherResponse>>> GetTeachers(CancellationToken ct) =>
        Ok(await teachers.GetPublicAsync(ct));

    [HttpGet("teachers/{id:int}")]
    public async Task<ActionResult<PublicTeacherResponse>> GetTeacher(int id, CancellationToken ct) =>
        Ok(await teachers.GetPublicByIdAsync(id, ct));

    [HttpGet("tariffs")]
    public async Task<ActionResult<List<TariffResponse>>> GetTariffs(CancellationToken ct) =>
        Ok(await tariffs.GetAllAsync(false, ct));

    [HttpGet("tariffs/{id:int}")]
    public async Task<ActionResult<TariffResponse>> GetTariff(int id, CancellationToken ct) =>
        Ok(await tariffs.GetPublicByIdAsync(id, ct));
}
