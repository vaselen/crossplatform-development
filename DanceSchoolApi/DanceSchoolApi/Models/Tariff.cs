using System.Collections.Generic;

namespace DanceSchoolApi.Models
{
    public class Tariff
    {
        public int TariffId { get; set; }
        public int DurationDays { get; set; }
        public decimal Price { get; set; }

        public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
    }
}