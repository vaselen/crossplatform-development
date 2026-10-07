using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using DanceSchoolApi.Data;
using DanceSchoolApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DanceSchoolApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SubscriptionsController : ControllerBase
    {
        private readonly DanceSchoolContext _context;

        public SubscriptionsController(DanceSchoolContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Subscription>>> GetAll()
        {
            return await _context.Subscriptions.ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Subscription>> GetById(int id)
        {
            var sub = await _context.Subscriptions.FindAsync(id);
            if (sub == null) return NotFound();
            return sub;
        }

        [HttpPost]
        [Authorize(Roles = "admin")]
        public async Task<ActionResult<Subscription>> Create(Subscription subscription)
        {
            _context.Subscriptions.Add(subscription);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = subscription.SubscriptionId }, subscription);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Update(int id, Subscription subscription)
        {
            if (id != subscription.SubscriptionId) return BadRequest();
            _context.Entry(subscription).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var sub = await _context.Subscriptions.FindAsync(id);
            if (sub == null) return NotFound();
            _context.Subscriptions.Remove(sub);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // Объединяет Subscription + Tariff + StudentTeam + Student: полная информация
        // об активных абонементах, использует методы GetExpirationDate/GetDaysLeft
        [HttpGet("active-details")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<object>>> GetActiveWithDetails()
        {
            var subs = await _context.Subscriptions
                .Include(s => s.Tariff)
                .Include(s => s.StudentTeam!)
                    .ThenInclude(st => st.Student)
                .Where(s => s.IsActive)
                .ToListAsync();

            var result = subs.Select(s => new
            {
                s.SubscriptionId,
                StudentName = s.StudentTeam!.Student!.FirstName + " " + s.StudentTeam.Student.LastName,
                TariffPrice = s.Tariff!.Price,
                ExpirationDate = s.GetExpirationDate(),
                DaysLeft = s.GetDaysLeft()
            });

            return Ok(result);
        }
            
        // Использует метод IsExpired() в LINQ, чтобы найти абонементы,
        // у которых флаг IsActive ещё не обновлён, хотя срок уже истёк
        [HttpGet("expired")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<object>>> GetExpiredButMarkedActive()
        {
            var subs = await _context.Subscriptions
                .Include(s => s.Tariff)
                .Include(s => s.StudentTeam!)
                    .ThenInclude(st => st.Student)
                .Where(s => s.IsActive)
                .ToListAsync();

            var expired = subs
                .Where(s => s.IsExpired())
                .Select(s => new
                {
                    s.SubscriptionId,
                    StudentName = s.StudentTeam!.Student!.FirstName + " " + s.StudentTeam.Student.LastName,
                    ExpiredOn = s.GetExpirationDate()
                });

            return Ok(expired);
        }
    }
}