

export type UserStatus = "active" | "disabled";

export type ActionTokenType = "verify_email" | "reset_password";

export interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  emailVerifiedAt: Date | null;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface ActionTokenRecord {
  id: string;
  userId: string;
  tokenType: ActionTokenType;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface AuditLogInput {
  companyId?: string | null;
  branchId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AuditLogRecord extends Required<AuditLogInput> {
  id: string;
  actorName?: string | null;
  actorEmail?: string | null;
  createdAt: Date;
}
