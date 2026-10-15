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

        public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();

        public bool IsAgeAllowed(int age) => age >= MinAge && age <= MaxAge;
    }
}
