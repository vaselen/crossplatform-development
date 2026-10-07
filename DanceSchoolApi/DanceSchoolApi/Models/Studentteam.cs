using System.Collections.Generic;

namespace DanceSchoolApi.Models
{
    public class StudentTeam
    {
        public int StudentTeamId { get; set; }

        public int StudentId { get; set; }
        public Student? Student { get; set; }

        public int TeamId { get; set; }
        public Team? Team { get; set; }

        public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
    }
}