namespace DanceSchoolApi.Contracts;
/*
 значение: требуемая запись не найдена (404)
 */
public class EntityNotFoundException(string message) : Exception(message);
/*
 значение: операция нарушает правило приложения (409)
 */
public class BusinessRuleException(string message) : Exception(message);
/*
 значение: не удалось подтвердить пользователя или необходимые сведения его аккаунта (401)
 */
public class AuthenticationFailedException(string message) : Exception(message);
