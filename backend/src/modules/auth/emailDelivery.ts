import nodemailer, { type Transporter } from "nodemailer";
import type { SmtpConfig } from "../../config/env.ts";

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

export interface EmployeeInvitationEmailPayload {
  toEmail: string;
  fullName: string;
  companyName: string;
  roleNameEn: string;
  roleNameAr: string;
  locale: "en" | "ar";
  rawToken: string;
}

export interface NetworkInvitationEmailPayload {
  toEmail: string;
  localCompanyName: string;
  mainCompanyName: string;
  locale: "en" | "ar";
  rawToken: string;
}

export interface EmailDeliveryAdapter {
  sendVerificationEmail(payload: VerificationEmailPayload): Promise<void>;
  sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<void>;
  sendEmployeeInvitationEmail?(
    payload: EmployeeInvitationEmailPayload,
  ): Promise<void>;
  sendNetworkInvitationEmail?(
    payload: NetworkInvitationEmailPayload,
  ): Promise<void>;
}

/**
 * Base in-memory adapter that captures outbox entries for tests and inspection.
 */
export class InMemoryEmailDeliveryAdapter implements EmailDeliveryAdapter {
  public readonly verificationOutbox: VerificationEmailPayload[] = [];
  public readonly passwordResetOutbox: PasswordResetEmailPayload[] = [];
  public readonly invitationOutbox: EmployeeInvitationEmailPayload[] = [];
  public readonly networkInvitationOutbox: NetworkInvitationEmailPayload[] = [];

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

  async sendEmployeeInvitationEmail(
    payload: EmployeeInvitationEmailPayload,
  ): Promise<void> {
    this.invitationOutbox.push(payload);
  }

  async sendNetworkInvitationEmail(
    payload: NetworkInvitationEmailPayload,
  ): Promise<void> {
    this.networkInvitationOutbox.push(payload);
  }
}

/**
 * Development console logger adapter.
 * Captures in memory AND logs clickable action URLs directly into the terminal.
 */
export class DevConsoleEmailDeliveryAdapter extends InMemoryEmailDeliveryAdapter {
  private readonly frontendOrigin: string;

  constructor(frontendOrigin: string) {
    super();
    this.frontendOrigin = frontendOrigin;
  }

  override async sendVerificationEmail(
    payload: VerificationEmailPayload,
  ): Promise<void> {
    await super.sendVerificationEmail(payload);
    const link = `${this.frontendOrigin}/${payload.locale}/verify-email?token=${encodeURIComponent(payload.rawToken)}`;
    this.logBox({
      title: "EMAIL VERIFICATION (تأكيد الحساب)",
      to: payload.toEmail,
      recipient: payload.fullName,
      subject:
        payload.locale === "ar"
          ? "تأكيد بريدك الإلكتروني في نظام ريفكس"
          : "Verify your Revix account email",
      actionUrl: link,
    });
  }

  override async sendPasswordResetEmail(
    payload: PasswordResetEmailPayload,
  ): Promise<void> {
    await super.sendPasswordResetEmail(payload);
    const link = `${this.frontendOrigin}/${payload.locale}/auth/action?mode=resetPassword&token=${encodeURIComponent(payload.rawToken)}`;
    this.logBox({
      title: "PASSWORD RESET (إعادة تعيين كلمة المرور)",
      to: payload.toEmail,
      recipient: payload.fullName,
      subject:
        payload.locale === "ar"
          ? "إعادة تعيين كلمة المرور - ريفكس"
          : "Reset your Revix password",
      actionUrl: link,
    });
  }

  override async sendEmployeeInvitationEmail(
    payload: EmployeeInvitationEmailPayload,
  ): Promise<void> {
    await super.sendEmployeeInvitationEmail(payload);
    const link = `${this.frontendOrigin}/invite?token=${encodeURIComponent(payload.rawToken)}`;
    const roleName = payload.locale === "ar" ? payload.roleNameAr : payload.roleNameEn;
    this.logBox({
      title: "EMPLOYEE INVITATION (دعوة انضمام موظف)",
      to: payload.toEmail,
      recipient: payload.fullName,
      subject:
        payload.locale === "ar"
          ? `دعوة للانضمام إلى فريق عمل ${payload.companyName}`
          : `Invitation to join ${payload.companyName} on Revix`,
      actionUrl: link,
      extra: `Company: ${payload.companyName} | Role: ${roleName}`,
    });
  }

  override async sendNetworkInvitationEmail(
    payload: NetworkInvitationEmailPayload,
  ): Promise<void> {
    await super.sendNetworkInvitationEmail(payload);
    const link = `${this.frontendOrigin}/invite/network?token=${encodeURIComponent(payload.rawToken)}`;
    this.logBox({
      title: "NETWORK PARTNERSHIP (دعوة ربط شركة بالشبكة)",
      to: payload.toEmail,
      recipient: payload.localCompanyName,
      subject:
        payload.locale === "ar"
          ? `دعوة ربط شبكة من شركة ${payload.mainCompanyName}`
          : `Network Link Invitation from ${payload.mainCompanyName}`,
      actionUrl: link,
      extra: `From: ${payload.mainCompanyName} -> To: ${payload.localCompanyName} (Strict View-Only)`,
    });
  }

  private logBox(data: {
    title: string;
    to: string;
    recipient: string;
    subject: string;
    actionUrl: string;
    extra?: string;
  }): void {
    console.log("\n" + "=".repeat(72));
    console.log(`[REVIX EMAIL DISPATCH] ${data.title}`);
    console.log(`To:        ${data.recipient} <${data.to}>`);
    console.log(`Subject:   ${data.subject}`);
    if (data.extra) {
      console.log(`Details:   ${data.extra}`);
    }
    console.log(`Action Link (Click to open):`);
    console.log(`\x1b[36m\x1b[1m${data.actionUrl}\x1b[0m`);
    console.log("=".repeat(72) + "\n");
  }
}

/**
 * Production-ready Nodemailer SMTP email adapter.
 * Sends real emails via configured SMTP host (Gmail, Mailtrap, Brevo, Sendgrid, etc.).
 * Includes styled, responsive HTML email templates with Revix brand identity.
 */
export class NodemailerEmailDeliveryAdapter implements EmailDeliveryAdapter {
  private readonly transporter: Transporter;
  private readonly config: SmtpConfig;
  private readonly frontendOrigin: string;
  public readonly verificationOutbox: VerificationEmailPayload[] = [];
  public readonly passwordResetOutbox: PasswordResetEmailPayload[] = [];
  public readonly invitationOutbox: EmployeeInvitationEmailPayload[] = [];
  public readonly networkInvitationOutbox: NetworkInvitationEmailPayload[] = [];

  constructor(
    config: SmtpConfig,
    frontendOrigin: string,
  ) {
    this.config = config;
    this.frontendOrigin = frontendOrigin;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  async sendVerificationEmail(
    payload: VerificationEmailPayload,
  ): Promise<void> {
    this.verificationOutbox.push(payload);
    const link = `${this.frontendOrigin}/${payload.locale}/verify-email?token=${encodeURIComponent(payload.rawToken)}`;
    const isAr = payload.locale === "ar";
    const subject = isAr
      ? "تأكيد بريدك الإلكتروني في نظام ريفكس"
      : "Verify your Revix account email";

    const html = this.buildEmailTemplate({
      locale: payload.locale,
      preheader: isAr ? "تأكيد الحساب في ريفكس" : "Confirm your Revix account",
      title: isAr ? "تأكيد بريدك الإلكتروني" : "Verify Your Email Address",
      greeting: isAr ? `مرحباً ${payload.fullName}،` : `Hello ${payload.fullName},`,
      bodyHtml: isAr
        ? `<p>شكراً لتسجيلك في منصة <strong>Revix</strong> لإدارة وتشغيل أساطيل تأجير السيارات.</p>
           <p>برجاء الضغط على الزر التالي لتأكيد ملكية بريدك الإلكتروني وتفعيل حسابك:</p>`
        : `<p>Thank you for registering on <strong>Revix</strong> Car Rental Operations Platform.</p>
           <p>Please click the button below to verify your email address and activate your account:</p>`,
      buttonText: isAr ? "تأكيد البريد الإلكتروني الآن" : "Verify Email Address",
      buttonUrl: link,
      expiryNote: isAr
        ? "تنتهي صلاحية هذا الرابط خلال 24 ساعة. إذا لم تكن قد أنشأت هذا الحساب، يمكنك تجاهل هذه الرسالة."
        : "This link will expire in 24 hours. If you did not create this account, please ignore this email.",
    });

    const text = isAr
      ? `مرحباً ${payload.fullName}،\n\nبرجاء تأكيد بريدك الإلكتروني عبر الرابط التالي:\n${link}\n\nصلاحية الرابط 24 ساعة.`
      : `Hello ${payload.fullName},\n\nPlease verify your email by visiting this link:\n${link}\n\nThis link expires in 24 hours.`;

    await this.deliver({ to: payload.toEmail, subject, html, text });
  }

  async sendPasswordResetEmail(
    payload: PasswordResetEmailPayload,
  ): Promise<void> {
    this.passwordResetOutbox.push(payload);
    const link = `${this.frontendOrigin}/${payload.locale}/auth/action?mode=resetPassword&token=${encodeURIComponent(payload.rawToken)}`;
    const isAr = payload.locale === "ar";
    const subject = isAr
      ? "إعادة تعيين كلمة المرور - نظام ريفكس"
      : "Reset your Revix password";

    const html = this.buildEmailTemplate({
      locale: payload.locale,
      preheader: isAr ? "إعادة تعيين كلمة المرور" : "Reset your password",
      title: isAr ? "إعادة تعيين كلمة المرور" : "Password Reset Request",
      greeting: isAr ? `مرحباً ${payload.fullName}،` : `Hello ${payload.fullName},`,
      bodyHtml: isAr
        ? `<p>تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في منصة <strong>Revix</strong>.</p>
           <p>اضغط على الزر أدناه لاختيار كلمة مرور جديدة:</p>`
        : `<p>We received a request to reset the password for your account on <strong>Revix</strong>.</p>
           <p>Click the button below to choose a new password:</p>`,
      buttonText: isAr ? "إعادة تعيين كلمة المرور" : "Reset Password",
      buttonUrl: link,
      expiryNote: isAr
        ? "هذا الرابط صالح للاستخدام مرة واحدة ولمدة 60 دقيقة فقط. إذا لم تطلب إعادة التعيين، يمكنك تجاهل هذه الرسالة وستظل كلمة مرورك الحالية آمنة."
        : "This link is valid for single use within 60 minutes. If you did not request this, you can safely ignore this email and your password will remain unchanged.",
    });

    const text = isAr
      ? `مرحباً ${payload.fullName}،\n\nلإعادة تعيين كلمة المرور اضغط على الرابط التالي:\n${link}\n\nصلاحية الرابط 60 دقيقة فقط.`
      : `Hello ${payload.fullName},\n\nTo reset your password, visit the link below:\n${link}\n\nThis link expires in 60 minutes.`;

    await this.deliver({ to: payload.toEmail, subject, html, text });
  }

  async sendEmployeeInvitationEmail(
    payload: EmployeeInvitationEmailPayload,
  ): Promise<void> {
    this.invitationOutbox.push(payload);
    const link = `${this.frontendOrigin}/invite?token=${encodeURIComponent(payload.rawToken)}`;
    const isAr = payload.locale === "ar";
    const roleName = isAr ? payload.roleNameAr : payload.roleNameEn;
    const subject = isAr
      ? `دعوة للانضمام إلى فريق عمل ${payload.companyName}`
      : `Invitation to join ${payload.companyName} on Revix`;

    const html = this.buildEmailTemplate({
      locale: payload.locale,
      preheader: isAr ? "دعوة انضمام لفريق العمل" : "Team member invitation",
      title: isAr ? "دعوة للانضمام لفريق العمل" : "Team Member Invitation",
      greeting: isAr ? `مرحباً ${payload.fullName}،` : `Hello ${payload.fullName},`,
      bodyHtml: isAr
        ? `<p>يسر شركة <strong>${payload.companyName}</strong> دعوتك للانضمام إلى فريق العمل عبر منصة <strong>Revix</strong>.</p>
           <p>الدور المخصص لك: <span style="background-color: #EDF4EF; color: #14532D; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${roleName}</span></p>
           <p>اضغط على الزر أدناه لتعيين كلمة مرورك وقبول الدعوة:</p>`
        : `<p><strong>${payload.companyName}</strong> has invited you to join their team on the <strong>Revix</strong> platform.</p>
           <p>Assigned Role: <span style="background-color: #EDF4EF; color: #14532D; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${roleName}</span></p>
           <p>Click the button below to accept the invitation and set up your password:</p>`,
      buttonText: isAr ? "قبول الدعوة وتفعيل الحساب" : "Accept Invitation & Join",
      buttonUrl: link,
      expiryNote: isAr
        ? "تنتهي صلاحية هذه الدعوة خلال 7 أيام."
        : "This invitation link expires in 7 days.",
    });

    const text = isAr
      ? `مرحباً ${payload.fullName}،\n\nتمت دعوتك من قبل ${payload.companyName} للانضمام بدور: ${roleName}.\nلقبول الدعوة وتعيين كلمة المرور:\n${link}`
      : `Hello ${payload.fullName},\n\nYou have been invited by ${payload.companyName} as ${roleName}.\nAccept here:\n${link}`;

    await this.deliver({ to: payload.toEmail, subject, html, text });
  }

  async sendNetworkInvitationEmail(
    payload: NetworkInvitationEmailPayload,
  ): Promise<void> {
    this.networkInvitationOutbox.push(payload);
    const link = `${this.frontendOrigin}/invite/network?token=${encodeURIComponent(payload.rawToken)}`;
    const isAr = payload.locale === "ar";
    const subject = isAr
      ? `دعوة ربط شركة بالشبكة من ${payload.mainCompanyName}`
      : `Network Link Invitation from ${payload.mainCompanyName}`;

    const html = this.buildEmailTemplate({
      locale: payload.locale,
      preheader: isAr ? "دعوة شراكة شبكة" : "Network partnership invitation",
      title: isAr ? "دعوة ربط شركة بالشبكة" : "Network Partnership Invitation",
      greeting: isAr ? `السادة ${payload.localCompanyName}،` : `Dear ${payload.localCompanyName},`,
      bodyHtml: isAr
        ? `<p>تدعوكم شركة <strong>${payload.mainCompanyName}</strong> لربط فروعكم وأسطولكم بالشبكة التشغيلية الموحدة في <strong>Revix</strong>.</p>
           <p style="background: #F0FDF4; border-left: 4px solid #14532D; padding: 10px 14px; border-radius: 4px; font-size: 13px; color: #14532D;">
             <strong>مبدأ العزل والأمان (View-Only):</strong> ستحصل الشركة الرئيسية على صلاحيات عرض ومطابقة فقط للفروع التي توافقون عليها، دون المساس بحساباتكم أو بياناتكم الحساسة.
           </p>
           <p>اضغط على الزر التالي لمراجعة الدعوة وتحديد الفروع المشاركة:</p>`
        : `<p><strong>${payload.mainCompanyName}</strong> invites you to connect your branches and fleet to their consolidated operational network on <strong>Revix</strong>.</p>
           <p style="background: #F0FDF4; border-left: 4px solid #14532D; padding: 10px 14px; border-radius: 4px; font-size: 13px; color: #14532D;">
             <strong>Strict View-Only Isolation:</strong> The main network company will only receive view permissions over permitted branches, with zero access to edit your accounts or sensitive assets.
           </p>
           <p>Click the button below to review and configure the shared branch scope:</p>`,
      buttonText: isAr ? "مراجعة وقبول ربط الشبكة" : "Review & Accept Network Link",
      buttonUrl: link,
      expiryNote: isAr
        ? "تنتهي صلاحية هذه الدعوة خلال 14 يوماً."
        : "This network invitation link expires in 14 days.",
    });

    const text = isAr
      ? `السادة ${payload.localCompanyName}،\n\nتدعوكم ${payload.mainCompanyName} لربط الفروع بالشبكة الرئيسية.\nللمراجعة والقبول:\n${link}`
      : `Dear ${payload.localCompanyName},\n\n${payload.mainCompanyName} invites you to connect to their network.\nReview here:\n${link}`;

    await this.deliver({ to: payload.toEmail, subject, html, text });
  }

  private async deliver(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: this.config.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      console.log(
        `[Revix Email] Sent email "${options.subject}" to ${options.to} via SMTP (Message ID: ${info.messageId})`,
      );
    } catch (err) {
      console.error(
        `[Revix Email] Failed to send email to ${options.to} via SMTP:`,
        err,
      );
      // Fallback log to console so developers are never blocked
      console.log(`[Revix Email Fallback] Content URL fallback in terminal:`);
      console.log(options.text);
      throw err;
    }
  }

  private buildEmailTemplate(opts: {
    locale: "en" | "ar";
    preheader: string;
    title: string;
    greeting: string;
    bodyHtml: string;
    buttonText: string;
    buttonUrl: string;
    expiryNote: string;
  }): string {
    const isAr = opts.locale === "ar";
    const dir = isAr ? "rtl" : "ltr";
    const align = isAr ? "right" : "left";

    return `<!DOCTYPE html>
<html lang="${opts.locale}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${opts.title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F9FAFB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827; }
    .container { max-width: 580px; margin: 30px auto; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background-color: #14532D; padding: 24px 32px; text-align: center; }
    .header h1 { margin: 0; color: #FFFFFF; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
    .header p { margin: 4px 0 0; color: #A7F3D0; font-size: 12px; }
    .content { padding: 32px; text-align: ${align}; line-height: 1.6; }
    .greeting { font-size: 16px; font-weight: 700; margin-bottom: 16px; color: #111827; }
    .cta-container { margin: 28px 0; text-align: center; }
    .cta-btn { display: inline-block; background-color: #14532D; color: #FFFFFF !important; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; box-shadow: 0 2px 4px rgba(20,83,45,0.2); }
    .link-fallback { font-size: 12px; color: #6B7280; word-break: break-all; margin-top: 24px; padding-top: 16px; border-top: 1px solid #E5E7EB; }
    .link-fallback a { color: #14532D; }
    .footer { background-color: #F9FAFB; padding: 20px 32px; border-top: 1px solid #E5E7EB; text-align: center; font-size: 11.5px; color: #6B7280; }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden;">${opts.preheader}</div>
  <div class="container">
    <div class="header">
      <h1>REVIX</h1>
      <p>Car Rental Operations Platform</p>
    </div>
    <div class="content">
      <div class="greeting">${opts.greeting}</div>
      ${opts.bodyHtml}
      <div class="cta-container">
        <a href="${opts.buttonUrl}" target="_blank" class="cta-btn">${opts.buttonText}</a>
      </div>
      <div class="link-fallback">
        <p style="margin: 0 0 6px;">${isAr ? "إذا لم يعمل الزر أعلاه، يمكنك نسخ الرابط التالي ولصقه في المتصفح:" : "If the button above does not work, copy and paste this URL into your browser:"}</p>
        <a href="${opts.buttonUrl}">${opts.buttonUrl}</a>
        <p style="margin: 12px 0 0; color: #9CA3AF; font-size: 11px;">${opts.expiryNote}</p>
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0;">&copy; ${new Date().getFullYear()} Revix System. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }
}
