using DanceSchoolApi.Models;
using Microsoft.EntityFrameworkCore;

namespace DanceSchoolApi.Data
{
    public class DanceSchoolContext : DbContext
    {
        public DanceSchoolContext(DbContextOptions<DanceSchoolContext> options)
            : base(options)
        {
        }

        public DbSet<Teacher> Teachers => Set<Teacher>();
        public DbSet<Team> Teams => Set<Team>();
        public DbSet<Student> Students => Set<Student>();
        public DbSet<StudentTeam> StudentTeams => Set<StudentTeam>();
        public DbSet<Subscription> Subscriptions => Set<Subscription>();
        public DbSet<Tariff> Tariffs => Set<Tariff>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
  
            modelBuilder.Entity<Team>()
                .HasOne(t => t.Teacher)
                .WithMany(te => te.Teams)
                .HasForeignKey(t => t.TeacherId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<StudentTeam>()
                .HasOne(st => st.Student)
                .WithMany(s => s.StudentTeams)
                .HasForeignKey(st => st.StudentId)
                .OnDelete(DeleteBehavior.Cascade);


            modelBuilder.Entity<StudentTeam>()
                .HasOne(st => st.Team)
                .WithMany(t => t.StudentTeams)
                .HasForeignKey(st => st.TeamId)
                .OnDelete(DeleteBehavior.Cascade);


            modelBuilder.Entity<Subscription>()
                .HasOne(sub => sub.StudentTeam)
                .WithMany(st => st.Subscriptions)
                .HasForeignKey(sub => sub.StudentTeamId)
                .OnDelete(DeleteBehavior.Cascade);


            modelBuilder.Entity<Subscription>()
                .HasOne(sub => sub.Tariff)
                .WithMany(t => t.Subscriptions)
                .HasForeignKey(sub => sub.TariffId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Student>()
                .HasIndex(s => s.Phone)
                .IsUnique();

            modelBuilder.Entity<Tariff>()
                .Property(t => t.Price)
                .HasPrecision(10, 2);

            modelBuilder.Entity<Teacher>()
                .Property(t => t.Rating)
                .HasPrecision(3, 2);
        }
    }
}