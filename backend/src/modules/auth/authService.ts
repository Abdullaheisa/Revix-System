import crypto from "node:crypto";
import type { AuthDataStore, UserRecord } from "../../db/store.ts";
import { hashPassword, verifyPassword } from "../../security/passwordHash.ts";
import {
  validateNewPassword,
  type PasswordPolicyIssue,
} from "../../security/passwordPolicy.ts";
import {
  generateSecureToken,
  hashOpaqueToken,
} from "../../security/tokens.ts";
import type { EmailDeliveryAdapter } from "./emailDelivery.ts";

const VERIFY_EMAIL_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESET_PASSWORD_TTL_MS = 60 * 60 * 1000; // 1 hour

// Pre-computed dummy Argon2id hash to equalize login timing when email does not exist
const DUMMY_ARGON2_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0c2FsdA$3f8B2uX4y5z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0O1P";

export interface PublicAuthUser {
  id: string;
  fullName: string;
  email: string;
  emailVerified: boolean;
  status: "active" | "disabled";
  companyId: string | null;
  signatureDataUrl?: string | null;
}

function toPublicUser(
  user: UserRecord,
  companyId: string | null = null,
): PublicAuthUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    emailVerified: user.emailVerifiedAt !== null,
    status: user.status,
    companyId,
    signatureDataUrl: user.signatureDataUrl ?? null,
  };
}

export type AuthServiceErrorCode =
  | "EMAIL_IN_USE"
  | "WEAK_PASSWORD"
  | "INVALID_CREDENTIALS"
  | "EMAIL_NOT_VERIFIED"
  | "USER_DISABLED"
  | "INVALID_TOKEN"
  | "EXPIRED_TOKEN"
  | "ALREADY_VERIFIED"
  | "UNAUTHORIZED"
  | "WRONG_CURRENT_PASSWORD"
  | "DELIVERY_FAILED"
  | "INVALID_INPUT";

export class AuthServiceError extends Error {
  public readonly code: AuthServiceErrorCode;
  public readonly status: number;
  public readonly policyIssue?: PasswordPolicyIssue;
  public readonly rawSessionToken?: string;
  public readonly sessionExpiresAt?: Date;

  constructor(
    code: AuthServiceErrorCode,
    message: string,
    status: number,
    policyIssue?: PasswordPolicyIssue,
    session?: { rawSessionToken: string; sessionExpiresAt: Date },
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.policyIssue = policyIssue;
    this.rawSessionToken = session?.rawSessionToken;
    this.sessionExpiresAt = session?.sessionExpiresAt;
  }
}

export class AuthService {
  private readonly store: AuthDataStore;
  private readonly emailAdapter: EmailDeliveryAdapter;
  private readonly sessionTtlMs: number;
  private readonly requireEmailVerification: boolean;

  constructor(options: {
    store: AuthDataStore;
    emailAdapter: EmailDeliveryAdapter;
    sessionTtlHours?: number;
    requireEmailVerification?: boolean;
  }) {
    this.store = options.store;
    this.emailAdapter = options.emailAdapter;
    this.sessionTtlMs = (options.sessionTtlHours ?? 168) * 60 * 60 * 1000;
    this.requireEmailVerification = options.requireEmailVerification ?? true;
  }

  async signup(input: {
    fullName: string;
    email: string;
    password: string;
    locale: "en" | "ar";
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<{
    user: PublicAuthUser;
    rawSessionToken: string;
    sessionExpiresAt: Date;
    verificationEmailSent: boolean;
  }> {
    const cleanName = input.fullName.trim();
    const cleanEmail = input.email.trim().toLowerCase();

    const policyIssue = validateNewPassword(input.password);
    if (policyIssue) {
      throw new AuthServiceError(
        "WEAK_PASSWORD",
        "Password does not meet security policy requirements.",
        400,
        policyIssue,
      );
    }

    const existing = await this.store.findUserByEmail(cleanEmail);
    if (existing) {
      throw new AuthServiceError(
        "EMAIL_IN_USE",
        "Unable to complete registration with that email address.",
        409,
      );
    }

    const passwordHash = await hashPassword(input.password);
    let user: UserRecord;
    try {
      user = await this.store.createUser({
        id: crypto.randomUUID(),
        fullName: cleanName,
        email: cleanEmail,
        passwordHash,
      });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "23505") {
        throw new AuthServiceError(
          "EMAIL_IN_USE",
          "Unable to complete registration with that email address.",
          409,
        );
      }
      throw err;
    }

    const rawVerifyToken = generateSecureToken(32);
    const verifyTokenHash = hashOpaqueToken(rawVerifyToken);
    const verifyExpiresAt = new Date(Date.now() + VERIFY_EMAIL_TTL_MS);

    await this.store.createActionToken({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenType: "verify_email",
      tokenHash: verifyTokenHash,
      expiresAt: verifyExpiresAt,
    });

    const rawSessionToken = generateSecureToken(32);
    const sessionTokenHash = hashOpaqueToken(rawSessionToken);
    const sessionExpiresAt = new Date(Date.now() + this.sessionTtlMs);

    await this.store.createSession({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: sessionTokenHash,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      expiresAt: sessionExpiresAt,
    });

    await this.store.recordAuditLog({
      actorUserId: user.id,
      action: "auth.user.signup",
      entityType: "user",
      entityId: user.id,
      metadata: { locale: input.locale },
    });

    let verificationEmailSent = true;
    try {
      await this.emailAdapter.sendVerificationEmail({
        toEmail: user.email,
        fullName: user.fullName,
        locale: input.locale,
        rawToken: rawVerifyToken,
      });
    } catch {
      verificationEmailSent = false;
    }

    return {
      user: toPublicUser(user),
      rawSessionToken,
      sessionExpiresAt,
      verificationEmailSent,
    };
  }

  async resendVerificationEmail(input: {
    userId: string;
    locale: "en" | "ar";
  }): Promise<{ alreadyVerified: boolean }> {
    const user = await this.store.findUserById(input.userId);
    if (!user || user.status === "disabled") {
      throw new AuthServiceError("UNAUTHORIZED", "Authentication required.", 401);
    }

    if (user.emailVerifiedAt !== null) {
      return { alreadyVerified: true };
    }

    const now = new Date();
    await this.store.invalidateUnusedActionTokens(
      user.id,
      "verify_email",
      now,
    );

    const rawVerifyToken = generateSecureToken(32);
    const verifyTokenHash = hashOpaqueToken(rawVerifyToken);
    await this.store.createActionToken({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenType: "verify_email",
      tokenHash: verifyTokenHash,
      expiresAt: new Date(now.getTime() + VERIFY_EMAIL_TTL_MS),
    });

    await this.emailAdapter.sendVerificationEmail({
      toEmail: user.email,
      fullName: user.fullName,
      locale: input.locale,
      rawToken: rawVerifyToken,
    });

    await this.store.recordAuditLog({
      actorUserId: user.id,
      action: "auth.email_verification.resent",
      entityType: "user",
      entityId: user.id,
    });

    return { alreadyVerified: false };
  }

  async verifyEmailWithToken(rawToken: string): Promise<{ user: PublicAuthUser }> {
    const tokenHash = hashOpaqueToken(rawToken.trim());
    const now = new Date();
    const outcome = await this.store.consumeActionToken(
      tokenHash,
      "verify_email",
      now,
    );

    if (outcome.status === "invalid") {
      throw new AuthServiceError(
        "INVALID_TOKEN",
        "This verification link is invalid or has already been used.",
        400,
      );
    }

    if (outcome.status === "expired") {
      throw new AuthServiceError(
        "EXPIRED_TOKEN",
        "This verification link has expired.",
        400,
      );
    }

    await this.store.markUserEmailVerified(outcome.token.userId, now);
    const updatedUser = await this.store.findUserById(outcome.token.userId);
    if (!updatedUser) {
      throw new AuthServiceError(
        "INVALID_TOKEN",
        "Associated user account was not found.",
        400,
      );
    }

    await this.store.recordAuditLog({
      actorUserId: updatedUser.id,
      action: "auth.email_verification.completed",
      entityType: "user",
      entityId: updatedUser.id,
    });

    return { user: toPublicUser(updatedUser) };
  }

  async devVerifyUserById(userId: string): Promise<{ user: PublicAuthUser }> {
    const now = new Date();
    await this.store.invalidateUnusedActionTokens(
      userId,
      "verify_email",
      now,
    );
    await this.store.markUserEmailVerified(userId, now);
    const updatedUser = await this.store.findUserById(userId);
    if (!updatedUser) {
      throw new AuthServiceError("UNAUTHORIZED", "User not found.", 401);
    }

    await this.store.recordAuditLog({
      actorUserId: updatedUser.id,
      action: "auth.email_verification.dev_completed",
      entityType: "user",
      entityId: updatedUser.id,
    });

    return { user: toPublicUser(updatedUser) };
  }

  async login(input: {
    email: string;
    password: string;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<{
    user: PublicAuthUser;
    rawSessionToken: string;
    sessionExpiresAt: Date;
  }> {
    const cleanEmail = input.email.trim().toLowerCase();
    const user = await this.store.findUserByEmail(cleanEmail);

    if (!user) {
      await verifyPassword(input.password, DUMMY_ARGON2_HASH);
      throw new AuthServiceError(
        "INVALID_CREDENTIALS",
        "The email address or password is incorrect.",
        401,
      );
    }

    const passwordMatches = await verifyPassword(
      input.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      await this.store.recordAuditLog({
        actorUserId: user.id,
        action: "auth.login.failed_password",
        entityType: "user",
        entityId: user.id,
      });
      throw new AuthServiceError(
        "INVALID_CREDENTIALS",
        "The email address or password is incorrect.",
        401,
      );
    }

    if (user.status === "disabled") {
      throw new AuthServiceError(
        "USER_DISABLED",
        "This account is currently disabled.",
        403,
      );
    }

    const membership = await this.store.findMembershipByUserId(user.id);
    if (membership?.status === "suspended") {
      throw new AuthServiceError(
        "USER_DISABLED",
        "Your account has been suspended by the company administrator.",
        403,
      );
    }

    const rawSessionToken = generateSecureToken(32);
    const sessionTokenHash = hashOpaqueToken(rawSessionToken);
    const sessionExpiresAt = new Date(Date.now() + this.sessionTtlMs);

    await this.store.createSession({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: sessionTokenHash,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      expiresAt: sessionExpiresAt,
    });

    if (this.requireEmailVerification && user.emailVerifiedAt === null) {
      throw new AuthServiceError(
        "EMAIL_NOT_VERIFIED",
        "Please verify your email address before signing in.",
        403,
        undefined,
        { rawSessionToken, sessionExpiresAt },
      );
    }

    await this.store.recordAuditLog({
      actorUserId: user.id,
      action: "auth.login.succeeded",
      entityType: "user",
      entityId: user.id,
    });

    const company = membership
      ? null
      : await this.store.findCompanyByOwnerUserId(user.id);
    const companyId = membership?.companyId ?? company?.id ?? null;

    return {
      user: toPublicUser(user, companyId),
      rawSessionToken,
      sessionExpiresAt,
    };
  }

  async authenticateSession(
    rawSessionToken: string | undefined,
  ): Promise<PublicAuthUser | null> {
    if (!rawSessionToken || rawSessionToken.trim().length === 0) {
      return null;
    }

    const tokenHash = hashOpaqueToken(rawSessionToken.trim());
    const now = new Date();
    const session = await this.store.findActiveSessionByTokenHash(
      tokenHash,
      now,
    );
    if (!session) {
      return null;
    }

    const user = await this.store.findUserById(session.userId);
    if (!user || user.status === "disabled") {
      return null;
    }

    const membership = await this.store.findMembershipByUserId(user.id);
    if (membership?.status === "suspended") {
      return null;
    }

    const company = membership
      ? null
      : await this.store.findCompanyByOwnerUserId(user.id);
    const companyId = membership?.companyId ?? company?.id ?? null;
    return toPublicUser(user, companyId);
  }

  async updateMySignature(
    rawSessionToken: string | undefined,
    signatureDataUrl: string | null,
  ): Promise<PublicAuthUser> {
    const authUser = await this.authenticateSession(rawSessionToken);
    if (!authUser) {
      throw new AuthServiceError("UNAUTHORIZED", "Not signed in.", 401);
    }
    const cleanSig = signatureDataUrl?.trim() || null;
    if (cleanSig && !cleanSig.startsWith("data:image/")) {
      throw new AuthServiceError("INVALID_INPUT", "Invalid signature image format.", 400);
    }
    const updated = await this.store.updateUserSignature(authUser.id, cleanSig);
    if (!updated) {
      throw new AuthServiceError("UNAUTHORIZED", "User not found.", 401);
    }
    return toPublicUser(updated, authUser.companyId);
  }

  async logout(rawSessionToken: string | undefined): Promise<void> {
    if (!rawSessionToken || rawSessionToken.trim().length === 0) {
      return;
    }
    const tokenHash = hashOpaqueToken(rawSessionToken.trim());
    await this.store.revokeSessionByTokenHash(tokenHash, new Date());
  }

  async requestPasswordReset(input: {
    email: string;
    locale: "en" | "ar";
  }): Promise<void> {
    const cleanEmail = input.email.trim().toLowerCase();
    const user = await this.store.findUserByEmail(cleanEmail);
    if (!user || user.status === "disabled") {
      // Anti-enumeration: succeed silently when email is not registered
      return;
    }

    const now = new Date();
    await this.store.invalidateUnusedActionTokens(
      user.id,
      "reset_password",
      now,
    );

    const rawResetToken = generateSecureToken(32);
    const resetTokenHash = hashOpaqueToken(rawResetToken);

    await this.store.createActionToken({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenType: "reset_password",
      tokenHash: resetTokenHash,
      expiresAt: new Date(now.getTime() + RESET_PASSWORD_TTL_MS),
    });

    await this.emailAdapter.sendPasswordResetEmail({
      toEmail: user.email,
      fullName: user.fullName,
      locale: input.locale,
      rawToken: rawResetToken,
    });

    await this.store.recordAuditLog({
      actorUserId: user.id,
      action: "auth.password_reset.requested",
      entityType: "user",
      entityId: user.id,
    });
  }

  async resetPasswordWithToken(input: {
    rawToken: string;
    newPassword: string;
  }): Promise<void> {
    const policyIssue = validateNewPassword(input.newPassword);
    if (policyIssue) {
      throw new AuthServiceError(
        "WEAK_PASSWORD",
        "Password does not meet security policy requirements.",
        400,
        policyIssue,
      );
    }

    const tokenHash = hashOpaqueToken(input.rawToken.trim());
    const now = new Date();
    const outcome = await this.store.consumeActionToken(
      tokenHash,
      "reset_password",
      now,
    );

    if (outcome.status === "invalid") {
      throw new AuthServiceError(
        "INVALID_TOKEN",
        "This password reset link is invalid or has already been used.",
        400,
      );
    }

    if (outcome.status === "expired") {
      throw new AuthServiceError(
        "EXPIRED_TOKEN",
        "This password reset link has expired.",
        400,
      );
    }

    const newPasswordHash = await hashPassword(input.newPassword);
    await this.store.updateUserPassword(
      outcome.token.userId,
      newPasswordHash,
      now,
    );
    await this.store.revokeAllUserSessions(outcome.token.userId, now);

    await this.store.recordAuditLog({
      actorUserId: outcome.token.userId,
      action: "auth.password_reset.completed",
      entityType: "user",
      entityId: outcome.token.userId,
    });
  }

  async changePassword(input: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    const user = await this.store.findUserById(input.userId);
    if (!user || user.status === "disabled") {
      throw new AuthServiceError("UNAUTHORIZED", "Authentication required.", 401);
    }

    const matchesCurrent = await verifyPassword(
      input.currentPassword,
      user.passwordHash,
    );
    if (!matchesCurrent) {
      await this.store.recordAuditLog({
        actorUserId: user.id,
        action: "auth.password_change.failed_current_password",
        entityType: "user",
        entityId: user.id,
      });
      throw new AuthServiceError(
        "WRONG_CURRENT_PASSWORD",
        "Your current password is incorrect.",
        400,
      );
    }

    const policyIssue = validateNewPassword(input.newPassword);
    if (policyIssue) {
      throw new AuthServiceError(
        "WEAK_PASSWORD",
        "Password does not meet security policy requirements.",
        400,
        policyIssue,
      );
    }

    const now = new Date();
    const newPasswordHash = await hashPassword(input.newPassword);
    await this.store.updateUserPassword(user.id, newPasswordHash, now);
    await this.store.revokeAllUserSessions(user.id, now);

    await this.store.recordAuditLog({
      actorUserId: user.id,
      action: "auth.password_change.completed",
      entityType: "user",
      entityId: user.id,
    });
  }
}
