namespace DanceSchoolApi.Contracts;

public record StudentResponse(int StudentId, string FirstName, string LastName, string MiddleName,
    DateOnly DateOfBirth, int Age, string Phone);

public record TeacherResponse(int TeacherId, string FirstName, string LastName, string MiddleName,
    DateOnly DateOfBirth, int Age, string Style, decimal Rating);

public record TeamResponse
{
    public int TeamId { get; init; }
    public string Name { get; init; } = string.Empty;
    public int TeacherId { get; init; }
    public string TeacherName { get; init; } = string.Empty;
    public int MinAge { get; init; }
    public int MaxAge { get; init; }
    public int MaxStudents { get; init; }
    public int StudentsCount { get; init; }
    public int FreeSlots => Math.Max(0, MaxStudents - StudentsCount);
}

public record StudentTeamResponse(int TeamId, string TeamName, string TeacherName);

public record TariffResponse(int TariffId, int DurationDays, decimal Price, bool IsArchive);

public record SubscriptionResponse(int SubscriptionId, int StudentId, string StudentName,
    int TeamId, string TeamName, int TariffId, decimal TariffPrice, DateOnly PurchaseDate,
    DateOnly EndDate, DateOnly PlannedEndDate, bool IsCancelled, bool IsActiveNow, int DaysLeft);

public record AccountResponse(int UserId, string Login, string Role, int? StudentId, int? TeacherId);

public record AuthResponse(string Token, DateTimeOffset ExpiresAt, AccountResponse Account);

public record PublicTeacherResponse(int TeacherId, string FirstName, string LastName,
    string MiddleName, string Style, decimal Rating);

public record TeamMemberResponse(int StudentId, string FirstName, string LastName,
    string MiddleName, int Age, DateOnly EndDate);
