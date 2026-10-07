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
    public class TeamsController : ControllerBase
    {
        private readonly DanceSchoolContext _context;

        public TeamsController(DanceSchoolContext context)
        {
            _context = context;
        }


        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetAll()
        {
            var result = await _context.Teams
                .Select(t => new
                {
                    t.TeamId,
                    t.Name,
                    t.TeacherId,
                    TeacherName = t.Teacher != null ? t.Teacher.FirstName + " " + t.Teacher.LastName : null,
                    t.MinAge,
                    t.MaxAge,
                    t.MaxStudents,
                    StudentsCount = t.StudentTeams.Count
                })
                .ToListAsync();

            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Team>> GetById(int id)
        {
            var team = await _context.Teams.FindAsync(id);
            if (team == null) return NotFound();
            return team;
        }

        [HttpPost]
        [Authorize(Roles = "admin")]
        public async Task<ActionResult<Team>> Create(Team team)
        {
            _context.Teams.Add(team);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = team.TeamId }, team);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Update(int id, Team team)
        {
            if (id != team.TeamId) return BadRequest();
            _context.Entry(team).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var team = await _context.Teams.FindAsync(id);
            if (team == null) return NotFound();
            _context.Teams.Remove(team);
            await _context.SaveChangesAsync();
            return NoContent();
        }
        // Объединяет Team -> StudentTeam -> Student: список учеников команды
        [HttpGet("{id}/students")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<object>>> GetTeamStudents(int id)
        {
            var team = await _context.Teams.FindAsync(id);
            if (team == null) return NotFound();

            var students = await _context.StudentTeams
                .Where(st => st.TeamId == id)
                .Select(st => new
                {
                    st.Student!.StudentId,
                    FullName = st.Student.FirstName + " " + st.Student.LastName,
                    st.Student.Age,
                    st.Student.Phone
                })
                .ToListAsync();

            return students;
        }
        // Объединяет Team + Teacher: команды со свободными местами.
        // Использует бизнес-метод Team.GetFreeSlotsCount() после загрузки данных.
        [HttpGet("available")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<object>>> GetAvailableTeams()
        {
            var teams = await _context.Teams
                .Include(t => t.Teacher)
                .Include(t => t.StudentTeams)
                .ToListAsync();

            var result = teams
                .Where(t => t.HasAvailableSlots())
                .Select(t => new
                {
                    t.TeamId,
                    t.Name,
                    TeacherName = t.Teacher!.GetFullName(),
                    FreeSlots = t.GetFreeSlotsCount()
                });

            return Ok(result);
        }

        [HttpPost("enroll")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Enroll(int teamId, int studentId)
        {
            var team = await _context.Teams
                .Include(t => t.StudentTeams)
                .FirstOrDefaultAsync(t => t.TeamId == teamId);

            var student = await _context.Students.FindAsync(studentId);

            if (team == null || student == null)
                return NotFound();

            if (!team.TryEnrollStudent(student, out string error))
                return BadRequest(error);

            await _context.SaveChangesAsync();
            return Ok(new { message = "Ученик записан." });
        }
    }
}