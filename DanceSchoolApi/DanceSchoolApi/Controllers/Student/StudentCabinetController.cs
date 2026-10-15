using DanceSchoolApi.Auth;
using DanceSchoolApi.Contracts;
using DanceSchoolApi.Models;
using DanceSchoolApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DanceSchoolApi.Controllers.Student;

[ApiController]
[Authorize(Roles = UserRoles.Student)]
[Route("api/student/me")]
public class StudentCabinetController(StudentService students, SubscriptionService subscriptions) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<StudentResponse>> GetProfile(CancellationToken ct) =>
        Ok(await students.GetByIdAsync(User.GetStudentId(), ct));

    [HttpPatch]
    public async Task<IActionResult> UpdatePhone(UpdateStudentPhoneRequest request, CancellationToken ct)
    {
        await students.UpdatePhoneAsync(User.GetStudentId(), request, ct);
        return NoContent();
    }

    [HttpGet("teams")]
    public async Task<ActionResult<List<StudentTeamResponse>>> GetTeams(CancellationToken ct) =>
        Ok(await students.GetTeamsAsync(User.GetStudentId(), ct));

    [HttpGet("subscriptions")]
    public async Task<ActionResult<List<SubscriptionResponse>>> GetSubscriptions(CancellationToken ct, string? status = null) =>
        Ok(await subscriptions.GetForStudentAsync(User.GetStudentId(), status, ct));

    [HttpGet("subscriptions/{id:int}")]
    public async Task<ActionResult<SubscriptionResponse>> GetSubscription(int id, CancellationToken ct) =>
        Ok(await subscriptions.GetForStudentByIdAsync(User.GetStudentId(), id, ct));

    [HttpPost("subscriptions")]
    public async Task<ActionResult<SubscriptionResponse>> Purchase(PurchaseOwnSubscriptionRequest request, CancellationToken ct)
    {
        var result = await subscriptions.PurchaseForStudentAsync(User.GetStudentId(), request, ct);
        return CreatedAtAction(nameof(GetSubscription), new { id = result.SubscriptionId }, result);
    }

    [HttpPost("subscriptions/{id:int}/cancel")]
    public async Task<ActionResult<SubscriptionResponse>> Cancel(int id, CancellationToken ct) =>
        Ok(await subscriptions.CancelForStudentAsync(User.GetStudentId(), id, ct));
}
