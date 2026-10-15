using System.ComponentModel.DataAnnotations;

namespace DanceSchoolApi.Contracts;

public class StudentRequest
{
    [Required]
    public string FirstName { get; init; } = string.Empty;
    [Required]
    public string LastName { get; init; } = string.Empty;
    public string? MiddleName { get; init; }
    public DateOnly DateOfBirth { get; init; }
    [MaxLength(20)]
    public string Phone { get; init; } = string.Empty;
}

public class TeacherRequest
{
    [Required]
    public string FirstName { get; init; } = string.Empty;
    [Required]
    public string LastName { get; init; } = string.Empty;
    public string? MiddleName { get; init; }
    public DateOnly DateOfBirth { get; init; }
    public string Style { get; init; } = string.Empty;
    [Range(typeof(decimal), "0", "9.99", ParseLimitsInInvariantCulture = true, ConvertValueInInvariantCulture = true)]
    public decimal Rating { get; init; }
}

public class TeamRequest
{
    [Required]
    public string Name { get; init; } = string.Empty;
    [Range(1, int.MaxValue)]
    public int TeacherId { get; init; }
    [Range(0, int.MaxValue)]
    public int MinAge { get; init; }
    [Range(0, int.MaxValue)]
    public int MaxAge { get; init; }
    [Range(1, int.MaxValue)]
    public int MaxStudents { get; init; }
}

public class TariffRequest
{
    [Range(1, int.MaxValue)]
    public int DurationDays { get; init; }
    [Range(typeof(decimal), "0", "99999999.99", ParseLimitsInInvariantCulture = true, ConvertValueInInvariantCulture = true)]
    public decimal Price { get; init; }
}

public class PurchaseSubscriptionRequest
{
    [Range(1, int.MaxValue)]
    public int StudentId { get; init; }
    [Range(1, int.MaxValue)]
    public int TeamId { get; init; }
    [Range(1, int.MaxValue)]
    public int TariffId { get; init; }
}

public class LoginRequest
{
    [Required, MaxLength(100)]
    public string Login { get; init; } = string.Empty;
    [Required]
    public string Password { get; init; } = string.Empty;
}

public class RegisterStudentRequest : StudentRequest
{
    [Required, MaxLength(100)]
    public string Login { get; init; } = string.Empty;
    [Required, MinLength(8)]
    public string Password { get; init; } = string.Empty;
}

public class AccountRequest
{
    [Required, MaxLength(100)]
    public string Login { get; init; } = string.Empty;
    [Required]
    public string Role { get; init; } = string.Empty;
    [Range(1, int.MaxValue)]
    public int? StudentId { get; init; }
    [Range(1, int.MaxValue)]
    public int? TeacherId { get; init; }
}

public class CreateAccountRequest : AccountRequest
{
    [Required, MinLength(8)]
    public string Password { get; init; } = string.Empty;
}

public class ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; init; } = string.Empty;
    [Required, MinLength(8)]
    public string NewPassword { get; init; } = string.Empty;
}

public class UpdateStudentPhoneRequest
{
    [MaxLength(20)]
    public string Phone { get; init; } = string.Empty;
}

public class PurchaseOwnSubscriptionRequest
{
    [Range(1, int.MaxValue)]
    public int TeamId { get; init; }
    [Range(1, int.MaxValue)]
    public int TariffId { get; init; }
}

public class TeamQuery
{
    [Range(1, int.MaxValue)]
    public int? TeacherId { get; init; }
    [Range(0, int.MaxValue)]
    public int? Age { get; init; }
    public bool OnlyAvailable { get; init; }
}

public class SubscriptionQuery
{
    [Range(1, int.MaxValue)]
    public int? StudentId { get; init; }
    [Range(1, int.MaxValue)]
    public int? TeamId { get; init; }
    public string? Status { get; init; }
    public DateOnly? PurchasedFrom { get; init; }
    public DateOnly? PurchasedTo { get; init; }
}
