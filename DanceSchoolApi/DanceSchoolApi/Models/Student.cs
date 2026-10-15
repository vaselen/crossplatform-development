using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;

namespace DanceSchoolApi.Models
{
    public class Student
    {
        public int StudentId { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string MiddleName { get; set; } = string.Empty;
        public DateOnly DateOfBirth { get; set; }

        [MaxLength(20)]
        public string Phone { get; set; } = string.Empty;

        public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();

        [NotMapped]
        public int Age => GetAge(DateOnly.FromDateTime(DateTime.Today));

        public string GetFullName() => string.Join(" ",
            new[] { LastName, FirstName, MiddleName }.Where(part => !string.IsNullOrWhiteSpace(part)));

        public int GetAge(DateOnly onDate)
        {
            var age = onDate.Year - DateOfBirth.Year;
            return DateOfBirth.AddYears(age) > onDate ? age - 1 : age;
        }

    }
}
