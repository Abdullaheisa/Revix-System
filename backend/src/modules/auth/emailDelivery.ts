export interface VerificationEmailPayload {
  toEmail: string;
  fullName: string;
  locale: "en" | "ar";
  rawToken: string;
}

export interface PasswordResetEmailPayload {
  toEmail: string;
  fullName: string;
  locale: "en" | "ar";
  rawToken: string;
}

export interface EmailDeliveryAdapter {
  sendVerificationEmail(payload: VerificationEmailPayload): Promise<void>;
  sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<void>;
}

/**
 * Default adapter when an external SMTP/API email provider is not yet configured.
 * Never logs raw tokens in production. In tests/dev, stores outbox entries in memory for inspection.
 */
export class InMemoryEmailDeliveryAdapter implements EmailDeliveryAdapter {
  public readonly verificationOutbox: VerificationEmailPayload[] = [];
  public readonly passwordResetOutbox: PasswordResetEmailPayload[] = [];

  async sendVerificationEmail(
    payload: VerificationEmailPayload,
  ): Promise<void> {
    this.verificationOutbox.push(payload);
  }

  async sendPasswordResetEmail(
    payload: PasswordResetEmailPayload,
  ): Promise<void> {
    this.passwordResetOutbox.push(payload);
  }
}
