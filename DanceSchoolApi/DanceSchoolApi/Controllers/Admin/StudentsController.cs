using DanceSchoolApi.Contracts;
using DanceSchoolApi.Models;
using DanceSchoolApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DanceSchoolApi.Controllers.Admin;

[ApiController]
[Authorize(Roles = UserRoles.Admin)]
[Route("api/admin/students")]
public class StudentsController(StudentService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<StudentResponse>>> GetAll(CancellationToken ct) =>
        Ok(await service.GetAllAsync(ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<StudentResponse>> GetById(int id, CancellationToken ct) =>
        Ok(await service.GetByIdAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<StudentResponse>> Create(StudentRequest request, CancellationToken ct)
    {
        var result = await service.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.StudentId }, result);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, StudentRequest request, CancellationToken ct)
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

    [HttpGet("{id:int}/teams")]
    public async Task<ActionResult<List<StudentTeamResponse>>> GetTeams(int id, CancellationToken ct) =>
        Ok(await service.GetTeamsAsync(id, ct));
}

