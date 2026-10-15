using DanceSchoolApi.Contracts;
using DanceSchoolApi.Models;
using DanceSchoolApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DanceSchoolApi.Controllers.Admin;

[ApiController]
[Authorize(Roles = UserRoles.Admin)]
[Route("api/admin/subscriptions")]
public class SubscriptionsController(SubscriptionService subscriptions) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<SubscriptionResponse>>> GetAll([FromQuery] SubscriptionQuery filter, CancellationToken ct) =>
        Ok(await subscriptions.GetAllAsync(filter, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SubscriptionResponse>> GetById(int id, CancellationToken ct) =>
        Ok(await subscriptions.GetByIdAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<SubscriptionResponse>> Create(PurchaseSubscriptionRequest request, CancellationToken ct)
    {
        var result = await subscriptions.PurchaseAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.SubscriptionId }, result);
    }

    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<SubscriptionResponse>> Cancel(int id, CancellationToken ct) =>
        Ok(await subscriptions.CancelAsync(id, ct));
}
