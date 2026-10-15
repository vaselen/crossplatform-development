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
        public DbSet<Subscription> Subscriptions => Set<Subscription>();
        public DbSet<Tariff> Tariffs => Set<Tariff>();
        public DbSet<AppUser> AppUsers => Set<AppUser>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)  
        {
            modelBuilder.Entity<AppUser>().HasKey(u => u.UserId);
            modelBuilder.Entity<AppUser>().HasIndex(u => u.NormalizedLogin).IsUnique();
            modelBuilder.Entity<AppUser>().Property(u => u.Login).HasMaxLength(100);
            modelBuilder.Entity<AppUser>().Property(u => u.NormalizedLogin).HasMaxLength(100);
            modelBuilder.Entity<AppUser>().Property(u => u.Role).HasMaxLength(20);
            modelBuilder.Entity<AppUser>().Property(u => u.TokenVersion).IsConcurrencyToken();
            modelBuilder.Entity<AppUser>()
                .HasOne(u => u.Student).WithOne()
                .HasForeignKey<AppUser>(u => u.StudentId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<AppUser>()
                .HasOne(u => u.Teacher).WithOne()
                .HasForeignKey<AppUser>(u => u.TeacherId).OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Team>()
                .HasOne(t => t.Teacher)
                .WithMany(te => te.Teams)
                .HasForeignKey(t => t.TeacherId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Subscription>()
                .HasOne(sub => sub.Student)
                .WithMany(student => student.Subscriptions)
                .HasForeignKey(sub => sub.StudentId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Subscription>()
                .HasOne(sub => sub.Team)
                .WithMany(team => team.Subscriptions)
                .HasForeignKey(sub => sub.TeamId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Subscription>()
                .HasOne(sub => sub.Tariff)
                .WithMany(t => t.Subscriptions)
                .HasForeignKey(sub => sub.TariffId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Student>()
                .Property(s => s.DateOfBirth)
                .HasColumnType("date");

            modelBuilder.Entity<Student>()
                .Property(s => s.Phone)
                .HasMaxLength(20);

            modelBuilder.Entity<Teacher>()
                .Property(t => t.DateOfBirth)
                .HasColumnType("date");

            modelBuilder.Entity<Subscription>()
                .Property(s => s.PurchaseDate)
                .HasColumnType("date");

            modelBuilder.Entity<Subscription>()
                .Property(s => s.EndDate)
                .HasColumnType("date");

            modelBuilder.Entity<Subscription>()
                .Property(s => s.IsCancelled)
                .HasDefaultValue(false);

            modelBuilder.Entity<Subscription>()
                .HasIndex(s => new { s.StudentId, s.TeamId, s.EndDate });

            modelBuilder.Entity<Tariff>()
                .Property(t => t.IsArchive)
                .HasDefaultValue(false);

            modelBuilder.Entity<Tariff>()
                .Property(t => t.Price)
                .HasPrecision(10, 2);

            modelBuilder.Entity<Teacher>()
                .Property(t => t.Rating)
                .HasPrecision(3, 2);
        }
    }
}
