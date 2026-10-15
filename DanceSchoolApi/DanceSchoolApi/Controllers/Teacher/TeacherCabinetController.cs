using DanceSchoolApi.Auth;
using DanceSchoolApi.Contracts;
using DanceSchoolApi.Models;
using DanceSchoolApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DanceSchoolApi.Controllers.Teacher;

[ApiController]
[Authorize(Roles = UserRoles.Teacher)]
[Route("api/teacher")]
public class TeacherCabinetController(TeacherService teachers, TeamService teams) : ControllerBase
{
    [HttpGet("me")]
    public async Task<ActionResult<TeacherResponse>> GetProfile(CancellationToken ct) =>
        Ok(await teachers.GetByIdAsync(User.GetTeacherId(), ct));

    [HttpGet("me/teams")]
    public async Task<ActionResult<List<TeamResponse>>> GetTeams(CancellationToken ct) =>
        Ok(await teams.GetForTeacherAsync(User.GetTeacherId(), ct));

    [HttpGet("teams/{id:int}/students")]
    public async Task<ActionResult<List<TeamMemberResponse>>> GetStudents(int id, CancellationToken ct) =>
        Ok(await teams.GetMembersForTeacherAsync(User.GetTeacherId(), id, ct));
}
