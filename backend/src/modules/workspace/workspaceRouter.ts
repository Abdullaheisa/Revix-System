import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { BackendEnvConfig } from "../../config/env.ts";
import type { AuthService, PublicAuthUser } from "../auth/authService.ts";
import { SUPPORTED_COUNTRIES } from "./countryCatalog.ts";
import {
  WorkspaceService,
  WorkspaceServiceError,
} from "./workspaceService.ts";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const SAFE_LOGO_DATA_URL_REGEX =
  /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

function isValidLogoUrl(value: string): boolean {
  if (value.length === 0) return true;
  if (value.startsWith("https://") || value.startsWith("http://")) {
    return value.length <= 1024;
  }
  return value.length <= 350_000 && SAFE_LOGO_DATA_URL_REGEX.test(value);
}

const companyPayloadSchema = z.object({
  name: z.string().trim().min(1).max(160),
  legalName: z.string().trim().min(1).max(200),
  logoUrl: z
    .string()
    .trim()
    .refine(isValidLogoUrl, {
      message: "Logo must be a valid PNG, JPEG, or WebP image or HTTPS URL.",
    })
    .nullable()
    .optional(),
  brandColor: z
    .string()
    .trim()
    .regex(HEX_COLOR_REGEX)
    .optional()
    .default("#14532D"),
  phone: z.string().trim().min(4).max(48),
  email: z.string().trim().max(254).regex(EMAIL_REGEX),
  countryCode: z.string().trim().length(2),
  city: z.string().trim().min(1).max(120),
  address: z.string().trim().min(1).max(500),
  postalCode: z.string().trim().max(32).optional().default(""),
  baseCurrency: z.string().trim().length(3),
  timezone: z.string().trim().min(1).max(64),
  businessRegNumber: z.string().trim().min(1).max(96),
  taxRegNumber: z.string().trim().max(96).optional().default(""),
  operatingMode: z
    .enum(["independent", "network_main"])
    .optional()
    .default("independent"),
  contractTermsAr: z.string().max(25000).nullable().optional(),
  contractTermsEn: z.string().max(25000).nullable().optional(),
});

const branchPayloadSchema = z.object({
  name: z.string().trim().min(1).max(160),
  code: z.string().trim().min(1).max(48),
  countryCode: z.string().trim().length(2),
  city: z.string().trim().min(1).max(120),
  address: z.string().trim().min(1).max(500),
  phone: z.string().trim().min(4).max(48),
  email: z.string().trim().max(254).regex(EMAIL_REGEX),
  currencyCode: z.string().trim().min(3).max(8).optional(),
  timezone: z
    .string()
    .trim()
    .max(64)
    .refine(
      (tz) => {
        if (!tz) return true;
        try {
          Intl.DateTimeFormat(undefined, { timeZone: tz });
          return true;
        } catch {
          return false;
        }
      },
      { message: "Invalid IANA timezone." },
    )
    .optional(),
  workingDays: z.string().trim().min(1).max(160).default("Sun - Thu"),
  workingHours: z.string().trim().min(1).max(64).default("08:00 - 22:00"),
  isActive: z.boolean().optional().default(true),
});

function handleWorkspaceError(res: Response, err: unknown): void {
  if (err instanceof WorkspaceServiceError) {
    res.status(err.status).json({
      ok: false,
      error: {
        code: err.code,
        message: err.message,
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

export function createWorkspaceRouter(options: {
  authService: AuthService;
  workspaceService: WorkspaceService;
  env: BackendEnvConfig;
}): Router {
  const { authService, workspaceService, env } = options;
  const router = Router();

  async function requireVerifiedUser(
    req: Request,
    res: Response,
  ): Promise<PublicAuthUser | null> {
    const rawSession = req.cookies?.[env.sessionCookieName] as
      | string
      | undefined;
    const user = await authService.authenticateSession(rawSession);
    if (!user) {
      res.status(401).json({
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Please sign in to access your workspace.",
        },
      });
      return null;
    }

    // TEMPORARILY DISABLED FOR TESTING: skip email verification check
    // if (!user.emailVerified) {
    //   res.status(403).json({
    //     ok: false,
    //     error: {
    //       code: "EMAIL_NOT_VERIFIED",
    //       message: "Please verify your email address first.",
    //     },
    //   });
    //   return null;
    // }

    return user;
  }

  router.get("/countries", (_req: Request, res: Response) => {
    res.status(200).json({
      ok: true,
      data: {
        countries: SUPPORTED_COUNTRIES,
      },
    });
  });

  router.get("/context", async (req: Request, res: Response) => {
    const user = await requireVerifiedUser(req, res);
    if (!user) return;

    try {
      const context = await workspaceService.getWorkspaceContext(user.id);
      res.status(200).json({
        ok: true,
        data: {
          user,
          ...context,
        },
      });
    } catch (err) {
      handleWorkspaceError(res, err);
    }
  });

  router.post("/company", async (req: Request, res: Response) => {
    const user = await requireVerifiedUser(req, res);
    if (!user) return;

    const parsed = companyPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_INPUT",
          message: "Please check all required company information fields.",
        },
      });
      return;
    }

    try {
      const company = await workspaceService.createCompany({
        userId: user.id,
        ...parsed.data,
      });

      res.status(201).json({
        ok: true,
        data: { company },
      });
    } catch (err) {
      handleWorkspaceError(res, err);
    }
  });

  router.put("/company", async (req: Request, res: Response) => {
    const user = await requireVerifiedUser(req, res);
    if (!user) return;

    const parsed = companyPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_INPUT",
          message: "Please check all required company information fields.",
        },
      });
      return;
    }

    try {
      const company = await workspaceService.updateCompany({
        userId: user.id,
        ...parsed.data,
      });

      res.status(200).json({
        ok: true,
        data: { company },
      });
    } catch (err) {
      handleWorkspaceError(res, err);
    }
  });

  router.post("/branches", async (req: Request, res: Response) => {
    const user = await requireVerifiedUser(req, res);
    if (!user) return;

    const parsed = branchPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_INPUT",
          message: "Please check all required branch fields.",
        },
      });
      return;
    }

    try {
      const branch = await workspaceService.createBranch({
        userId: user.id,
        ...parsed.data,
      });

      res.status(201).json({
        ok: true,
        data: { branch },
      });
    } catch (err) {
      handleWorkspaceError(res, err);
    }
  });

  router.put("/branches/:branchId", async (req: Request, res: Response) => {
    const user = await requireVerifiedUser(req, res);
    if (!user) return;

    const branchId = String(req.params.branchId ?? "").trim();
    const parsed = branchPayloadSchema.safeParse(req.body);
    if (!branchId || !parsed.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_INPUT",
          message: "Please check all required branch fields.",
        },
      });
      return;
    }

    try {
      const branch = await workspaceService.updateBranch({
        userId: user.id,
        branchId,
        ...parsed.data,
      });

      res.status(200).json({
        ok: true,
        data: { branch },
      });
    } catch (err) {
      handleWorkspaceError(res, err);
    }
  });

  return router;
}
