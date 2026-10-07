using System.Collections.Generic;

namespace DanceSchoolApi.Models
{
    public class Team
    {
        public int TeamId { get; set; }
        public string Name { get; set; } = string.Empty;

        public int TeacherId { get; set; }
        public Teacher? Teacher { get; set; }

        public int MinAge { get; set; }
        public int MaxAge { get; set; }
        public int MaxStudents { get; set; }

        public ICollection<StudentTeam> StudentTeams { get; set; } = new List<StudentTeam>();

        // есть ли свободные места в команде
        public bool HasAvailableSlots() => StudentTeams.Count < MaxStudents;

        public int GetCurrentStudentsCount() => StudentTeams.Count;

        public int GetFreeSlotsCount() => MaxStudents - StudentTeams.Count;
        /// <summary>
        /// 
        /// </summary>
        /// <param name="student"></param>
        /// <param name="error"></param>
        /// <returns></returns>
        // попытка записать ученика с проверкой возраста и мест.
        // Возвращает false и текст ошибки, если запись невозможна.
        public bool TryEnrollStudent(Student student, out string error)
        {
            if (!HasAvailableSlots())
            {
                error = "В команде нет свободных мест.";
                return false;
            }

            if (!student.IsEligibleForTeam(this))
            {
                error = $"Ученик не подходит по возрасту (нужно {MinAge}-{MaxAge}).";
                return false;
            }

            StudentTeams.Add(new StudentTeam
            {
                StudentId = student.StudentId,
                Student = student,
                TeamId = TeamId,
                Team = this
            });

            error = string.Empty;
            return true;
        }
    }
}