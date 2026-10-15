using DanceSchoolApi.Contracts;
using DanceSchoolApi.Models;
using DanceSchoolApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DanceSchoolApi.Controllers.Admin;

[ApiController]
[Authorize(Roles = UserRoles.Admin)]
[Route("api/admin/accounts")]
public class AccountsController(AuthService accounts) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<AccountResponse>>> GetAll(CancellationToken ct) =>
        Ok(await accounts.GetAllAsync(ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AccountResponse>> GetById(int id, CancellationToken ct) =>
        Ok(await accounts.GetByIdAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<AccountResponse>> Create(CreateAccountRequest request, CancellationToken ct)
    {
        var result = await accounts.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.UserId }, result);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, AccountRequest request, CancellationToken ct)
    {
        await accounts.UpdateAsync(id, request, ct);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await accounts.DeleteAsync(id, ct);
        return NoContent();
    }
}
