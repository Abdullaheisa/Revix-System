import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { BackendEnvConfig } from "../../config/env.ts";
import { createRateLimiter } from "../../security/rateLimiter.ts";
import { AuthService, AuthServiceError } from "./authService.ts";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signupSchema = z.object({
  fullName: z.string().trim().min(1).max(160),
  email: z.string().trim().max(254).regex(EMAIL_REGEX),
  password: z.string().min(1).max(4096),
  locale: z.enum(["en", "ar"]).optional().default("en"),
});

const loginSchema = z.object({
  email: z.string().trim().max(254).regex(EMAIL_REGEX),
  password: z.string().min(1).max(4096),
});

const verifyEmailSchema = z.object({
  token: z.string().trim().min(16).max(256),
});

const resendVerificationSchema = z.object({
  locale: z.enum(["en", "ar"]).optional().default("en"),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().max(254).regex(EMAIL_REGEX),
  locale: z.enum(["en", "ar"]).optional().default("en"),
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(16).max(256),
  newPassword: z.string().min(1).max(4096),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(4096),
  newPassword: z.string().min(1).max(4096),
});

function setSessionCookie(
  res: Response,
  env: BackendEnvConfig,
  rawToken: string,
  expiresAt: Date,
): void {
  res.cookie(env.sessionCookieName, rawToken, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

function clearSessionCookie(res: Response, env: BackendEnvConfig): void {
  res.clearCookie(env.sessionCookieName, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    path: "/",
  });
}

function handleAuthError(res: Response, err: unknown): void {
  if (err instanceof AuthServiceError) {
    res.status(err.status).json({
      ok: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.policyIssue ? { policyIssue: err.policyIssue } : {}),
      },
    });
    return;
  }

  res.status(500).json({
    ok: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected server error occurred.",
    },
  });
}

export function createAuthRouter(options: {
  authService: AuthService;
  env: BackendEnvConfig;
}): Router {
  const { authService, env } = options;
  const router = Router();

  const strictAuthLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 15,
  });

  router.post(
    "/signup",
    strictAuthLimiter,
    async (req: Request, res: Response) => {
      const parsed = signupSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "INVALID_INPUT",
            message: "Please check your registration details.",
          },
        });
        return;
      }

      try {
        const result = await authService.signup({
          fullName: parsed.data.fullName,
          email: parsed.data.email,
          password: parsed.data.password,
          locale: parsed.data.locale,
          ipAddress: req.ip ?? null,
          userAgent: req.get("user-agent") ?? null,
        });

        setSessionCookie(
          res,
          env,
          result.rawSessionToken,
          result.sessionExpiresAt,
        );

        res.status(201).json({
          ok: true,
          data: {
            user: result.user,
            verificationEmailSent: result.verificationEmailSent,
          },
        });
      } catch (err) {
        if (
          err instanceof AuthServiceError &&
          err.rawSessionToken &&
          err.sessionExpiresAt
        ) {
          setSessionCookie(
            res,
            env,
            err.rawSessionToken,
            err.sessionExpiresAt,
          );
        }
        handleAuthError(res, err);
      }
    },
  );

  router.post(
    "/verify-email",
    strictAuthLimiter,
    async (req: Request, res: Response) => {
      const parsed = verifyEmailSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "INVALID_TOKEN",
            message: "This link is missing required details.",
          },
        });
        return;
      }

      try {
        const result = await authService.verifyEmailWithToken(parsed.data.token);
        res.status(200).json({
          ok: true,
          data: {
            user: result.user,
          },
        });
      } catch (err) {
        if (
          err instanceof AuthServiceError &&
          err.rawSessionToken &&
          err.sessionExpiresAt
        ) {
          setSessionCookie(
            res,
            env,
            err.rawSessionToken,
            err.sessionExpiresAt,
          );
        }
        handleAuthError(res, err);
      }
    },
  );

  router.post(
    "/resend-verification",
    strictAuthLimiter,
    async (req: Request, res: Response) => {
      const parsed = resendVerificationSchema.safeParse(req.body ?? {});
      const locale = parsed.success ? parsed.data.locale : "en";

      const rawSession = req.cookies?.[env.sessionCookieName] as
        | string
        | undefined;
      const currentUser = await authService.authenticateSession(rawSession);

      if (!currentUser) {
        res.status(401).json({
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Please sign in to resend your verification email.",
          },
        });
        return;
      }

      try {
        const result = await authService.resendVerificationEmail({
          userId: currentUser.id,
          locale,
        });
        res.status(200).json({
          ok: true,
          data: result,
        });
      } catch (err) {
        if (
          err instanceof AuthServiceError &&
          err.rawSessionToken &&
          err.sessionExpiresAt
        ) {
          setSessionCookie(
            res,
            env,
            err.rawSessionToken,
            err.sessionExpiresAt,
          );
        }
        handleAuthError(res, err);
      }
    },
  );

  router.post(
    "/dev-verify-session",
    strictAuthLimiter,
    async (req: Request, res: Response) => {
      if (env.nodeEnv === "production") {
        res.status(404).json({
          ok: false,
          error: {
            code: "NOT_FOUND",
            message: "Endpoint not available in production.",
          },
        });
        return;
      }

      const rawSession = req.cookies?.[env.sessionCookieName] as
        | string
        | undefined;
      const currentUser = await authService.authenticateSession(rawSession);

      if (!currentUser) {
        res.status(401).json({
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Please sign in or create an account first.",
          },
        });
        return;
      }

      try {
        const result = await authService.devVerifyUserById(currentUser.id);
        res.status(200).json({
          ok: true,
          data: {
            user: result.user,
          },
        });
      } catch (err) {
        if (
          err instanceof AuthServiceError &&
          err.rawSessionToken &&
          err.sessionExpiresAt
        ) {
          setSessionCookie(
            res,
            env,
            err.rawSessionToken,
            err.sessionExpiresAt,
          );
        }
        handleAuthError(res, err);
      }
    },
  );

  router.post(
    "/login",
    strictAuthLimiter,
    async (req: Request, res: Response) => {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "INVALID_INPUT",
            message: "Please enter a valid email address and password.",
          },
        });
        return;
      }

      try {
        const result = await authService.login({
          email: parsed.data.email,
          password: parsed.data.password,
          ipAddress: req.ip ?? null,
          userAgent: req.get("user-agent") ?? null,
        });

        setSessionCookie(
          res,
          env,
          result.rawSessionToken,
          result.sessionExpiresAt,
        );

        res.status(200).json({
          ok: true,
          data: {
            user: result.user,
          },
        });
      } catch (err) {
        if (
          err instanceof AuthServiceError &&
          err.rawSessionToken &&
          err.sessionExpiresAt
        ) {
          setSessionCookie(
            res,
            env,
            err.rawSessionToken,
            err.sessionExpiresAt,
          );
        }
        handleAuthError(res, err);
      }
    },
  );

  router.post("/logout", async (req: Request, res: Response) => {
    const rawSession = req.cookies?.[env.sessionCookieName] as
      | string
      | undefined;
    await authService.logout(rawSession);
    clearSessionCookie(res, env);
    res.status(200).json({ ok: true });
  });

  router.get("/me", async (req: Request, res: Response) => {
    const rawSession = req.cookies?.[env.sessionCookieName] as
      | string
      | undefined;
    const user = await authService.authenticateSession(rawSession);

    if (!user) {
      res.status(401).json({
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Not signed in.",
        },
      });
      return;
    }

    res.status(200).json({
      ok: true,
      data: { user },
    });
  });

  router.post(
    "/forgot-password",
    strictAuthLimiter,
    async (req: Request, res: Response) => {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "INVALID_INPUT",
            message: "Please enter a valid email address.",
          },
        });
        return;
      }

      try {
        await authService.requestPasswordReset({
          email: parsed.data.email,
          locale: parsed.data.locale,
        });

        res.status(200).json({
          ok: true,
          data: {
            message:
              "If an account exists for this email, password-reset instructions have been sent.",
          },
        });
      } catch (err) {
        if (
          err instanceof AuthServiceError &&
          err.rawSessionToken &&
          err.sessionExpiresAt
        ) {
          setSessionCookie(
            res,
            env,
            err.rawSessionToken,
            err.sessionExpiresAt,
          );
        }
        handleAuthError(res, err);
      }
    },
  );

  router.post(
    "/reset-password",
    strictAuthLimiter,
    async (req: Request, res: Response) => {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "INVALID_TOKEN",
            message: "This link is missing required details.",
          },
        });
        return;
      }

      try {
        await authService.resetPasswordWithToken({
          rawToken: parsed.data.token,
          newPassword: parsed.data.newPassword,
        });

        clearSessionCookie(res, env);
        res.status(200).json({ ok: true });
      } catch (err) {
        if (
          err instanceof AuthServiceError &&
          err.rawSessionToken &&
          err.sessionExpiresAt
        ) {
          setSessionCookie(
            res,
            env,
            err.rawSessionToken,
            err.sessionExpiresAt,
          );
        }
        handleAuthError(res, err);
      }
    },
  );

  router.post(
    "/change-password",
    strictAuthLimiter,
    async (req: Request, res: Response) => {
      const rawSession = req.cookies?.[env.sessionCookieName] as
        | string
        | undefined;
      const currentUser = await authService.authenticateSession(rawSession);

      if (!currentUser) {
        res.status(401).json({
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Please sign in again.",
          },
        });
        return;
      }

      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "INVALID_INPUT",
            message: "Please check your current and new passwords.",
          },
        });
        return;
      }

      try {
        await authService.changePassword({
          userId: currentUser.id,
          currentPassword: parsed.data.currentPassword,
          newPassword: parsed.data.newPassword,
        });

        clearSessionCookie(res, env);
        res.status(200).json({ ok: true });
      } catch (err) {
        if (
          err instanceof AuthServiceError &&
          err.rawSessionToken &&
          err.sessionExpiresAt
        ) {
          setSessionCookie(
            res,
            env,
            err.rawSessionToken,
            err.sessionExpiresAt,
          );
        }
        handleAuthError(res, err);
      }
    },
  );

  return router;
}
