using System;

namespace DanceSchoolApi.Models
{
    public class Subscription
    {
        public int SubscriptionId { get; set; }

        public int StudentTeamId { get; set; }
        public StudentTeam? StudentTeam { get; set; }

        public int TariffId { get; set; }
        public Tariff? Tariff { get; set; }

        public DateTime PurchaseDate { get; set; } = DateTime.Now;
        public bool IsActive => DateTime.Now > ExpirationDate;

        //дата окончания действия абонемента (зависит от тарифа)
        public DateTime ExpirationDate { get; set; }

        /*
        {
            if (Tariff == null)
                throw new InvalidOperationException("Тариф не загружен (используйте Include(Tariff) в запросе).");
            //к дате покупки прибавляется duration
            return PurchaseDate.AddDays(Tariff.DurationDays);
        }
        */
        //сбрасывает дату покупки и делает активным 
        public void Renew()
        {
            PurchaseDate = DateTime.Now;
        }

        public int DaysLeft => (ExpirationDate - DateTime.Now).Days > 0 ? (ExpirationDate - DateTime.Now).Days : 0;
        
    }
}