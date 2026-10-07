using System.Collections.Generic;
using System.Linq;

namespace DanceSchoolApi.Models
{
    public class Student
    {
        public int StudentId { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public int Age { get; set; }
        public string Phone { get; set; } = string.Empty;

        public ICollection<StudentTeam> StudentTeams { get; set; } = new List<StudentTeam>();

        public string GetFullName() => $"{FirstName} {LastName}";

        // подходит ли ученик команде по возрастным ограничениям
        public bool IsEligibleForTeam(Team team)
        {
            return Age >= team.MinAge && Age <= team.MaxAge;
        }

        // сколько активных абонементов у ученика прямо сейчас
        public int GetActiveSubscriptionsCount()
        {
            return StudentTeams
                .SelectMany(st => st.Subscriptions)
                .Count(s => s.IsActive && !s.IsExpired());
        }

        public bool HasActiveSubscription() => GetActiveSubscriptionsCount() > 0;

        // в скольких командах сейчас состоит ученик
        public int GetTeamsCount() => StudentTeams.Select(st => st.TeamId).Distinct().Count();
    }
}