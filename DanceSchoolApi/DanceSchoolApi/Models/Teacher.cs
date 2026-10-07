using System.Collections.Generic;

namespace DanceSchoolApi.Models
{
    public class Teacher
    {
        public int TeacherId { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public int Age { get; set; }
        public string Style { get; set; } = string.Empty;
        public decimal Rating { get; set; }

        public ICollection<Team> Teams { get; set; } = new List<Team>();

        public string GetFullName() => $"{FirstName} {LastName}";
    }
}