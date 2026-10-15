using System.Collections.Generic;
using System;

namespace DanceSchoolApi.Models
{
    public class Tariff
    {
        private Tariff()
        {
        }

        public Tariff(int durationDays, decimal price)
        {
            if (durationDays <= 0)
                throw new ArgumentOutOfRangeException(nameof(durationDays), "Продолжительность должна быть больше нуля.");

            if (price < 0)
                throw new ArgumentOutOfRangeException(nameof(price), "Цена не может быть отрицательной.");

            DurationDays = durationDays;
            Price = price;
        }

        public int TariffId { get; set; }
        public int DurationDays { get; private set; }
        public decimal Price { get; private set; }
        public bool IsArchive { get; private set; } = false;

        public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();

        public void Archive() => IsArchive = true;

        public void Restore() => IsArchive = false;
    }
}
