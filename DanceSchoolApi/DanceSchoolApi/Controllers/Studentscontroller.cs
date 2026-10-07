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
    public class StudentsController : ControllerBase
    {
        private readonly DanceSchoolContext _context;

        public StudentsController(DanceSchoolContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Student>>> GetAll()
        {
            return await _context.Students.ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Student>> GetById(int id)
        {
            var student = await _context.Students.FindAsync(id);
            if (student == null) return NotFound();
            return student;
        }

        [HttpPost]
        [Authorize(Roles = "admin")]
        public async Task<ActionResult<Student>> Create(Student student)
        {
            _context.Students.Add(student);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = student.StudentId }, student);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Update(int id, Student student)
        {
            if (id != student.StudentId) return BadRequest();
            _context.Entry(student).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var student = await _context.Students.FindAsync(id);
            if (student == null) return NotFound();
            _context.Students.Remove(student);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // Объединяет Student -> StudentTeam -> Team: в каких командах состоит ученик
        [HttpGet("{id}/teams")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<object>>> GetStudentTeams(int id)
        {
            var teams = await _context.StudentTeams
                .Where(st => st.StudentId == id)
                .Select(st => new
                {
                    st.TeamId,
                    TeamName = st.Team!.Name,
                    TeacherName = st.Team.Teacher!.FirstName + " " + st.Team.Teacher.LastName
                })
                .ToListAsync();

            if (!teams.Any() && await _context.Students.FindAsync(id) == null)
                return NotFound();

            return teams;
        }

        // Объединяет Student и Team: список учеников, подходящих по возрасту в конкретную команду
        // и ещё не состоящих в ней (Where + Select)
        [HttpGet("eligible/{teamId}")]
        [Authorize]
        public async Task<ActionResult<object>> GetEligibleForTeam(int teamId)
        {
            var team = await _context.Teams.FindAsync(teamId);
            if (team == null) return NotFound(new { message = "Команда не найдена." });

            var alreadyInTeam = _context.StudentTeams
                .Where(st => st.TeamId == teamId)
                .Select(st => st.StudentId);

            var eligible = await _context.Students
                .Where(s => s.Age >= team.MinAge
                            && s.Age <= team.MaxAge
                            && !alreadyInTeam.Contains(s.StudentId))
                .Select(s => new
                {
                    s.StudentId,
                    FullName = s.FirstName + " " + s.LastName,
                    s.Age,
                    s.Phone
                })
                .ToListAsync();

            if (!eligible.Any())
                return Ok(new
                {
                    message = "Нет учеников, подходящих под возрастные ограничения команды.",
                    data = eligible
                });

            return Ok(new
            {
                message = $"Найдено учеников: {eligible.Count}",
                data = eligible
            });
        }
    }
}