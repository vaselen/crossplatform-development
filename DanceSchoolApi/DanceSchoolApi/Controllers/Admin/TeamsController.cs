using DanceSchoolApi.Contracts;
using DanceSchoolApi.Models;
using DanceSchoolApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DanceSchoolApi.Controllers.Admin;

[ApiController]
[Authorize(Roles = UserRoles.Admin)]
[Route("api/admin/teams")]
public class TeamsController(TeamService service, StudentService students) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<TeamResponse>>> GetAll(CancellationToken ct) =>
        Ok(await service.GetAllAsync(ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TeamResponse>> GetById(int id, CancellationToken ct) =>
        Ok(await service.GetByIdAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<TeamResponse>> Create(TeamRequest request, CancellationToken ct)
    {
        var result = await service.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.TeamId }, result);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, TeamRequest request, CancellationToken ct)
    {
        await service.UpdateAsync(id, request, ct);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await service.DeleteAsync(id, ct);
        return NoContent();
    }

    [HttpGet("{id:int}/students")]
    public async Task<ActionResult<List<TeamMemberResponse>>> GetStudents(int id, CancellationToken ct) =>
        Ok(await service.GetMembersAsync(id, ct));

    [HttpGet("{id:int}/eligible-students")]
    public async Task<ActionResult<List<StudentResponse>>> GetEligibleStudents(int id, CancellationToken ct) =>
        Ok(await students.GetEligibleForTeamAsync(id, ct));
}

