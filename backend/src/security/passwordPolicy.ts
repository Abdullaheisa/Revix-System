export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 4096;

export interface ConfiguredPasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireLetter: boolean;
  requireNumber: boolean;
}

export const DEFAULT_PASSWORD_POLICY: ConfiguredPasswordPolicy = {
  minLength: MIN_PASSWORD_LENGTH,
  maxLength: MAX_PASSWORD_LENGTH,
  requireUppercase: false,
  requireLowercase: false,
  requireLetter: true,
  requireNumber: true,
};

export type PasswordPolicyIssue =
  | "too_short"
  | "too_long"
  | "missing_uppercase"
  | "missing_lowercase"
  | "missing_letter"
  | "missing_number";

/**
 * Validates a new password against the Revix System policy.
 * Never trims spaces, and supports passphrases up to 4096 characters.
 */
export function validateNewPassword(
  password: string,
  policy: ConfiguredPasswordPolicy = DEFAULT_PASSWORD_POLICY,
): PasswordPolicyIssue | null {
  if (password.length < policy.minLength) {
    return "too_short";
  }

  if (password.length > policy.maxLength) {
    return "too_long";
  }

  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    return "missing_uppercase";
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    return "missing_lowercase";
  }

  if (policy.requireLetter && !/[a-zA-Z]/.test(password)) {
    return "missing_letter";
  }

  if (policy.requireNumber && !/\d/.test(password)) {
    return "missing_number";
  }

  return null;
}
