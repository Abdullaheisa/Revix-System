import type { Response } from "express";
import { FleetServiceError } from "./fleetService.ts";

export function paginateResponse<T>(
  items: T[],
  query: Record<string, unknown>,
  defaultPageSize = 15,
): {
  ok: true;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
} {
  const hasPageParam = query.page !== undefined || query.pageSize !== undefined;
  const totalItems = items.length;

  if (!hasPageParam) {
    return {
      ok: true,
      data: items,
      pagination: {
        page: 1,
        pageSize: totalItems || defaultPageSize,
        totalItems,
        totalPages: 1,
      },
    };
  }

  const rawPage = Number.parseInt(String(query.page ?? "1"), 10);
  const rawPageSize = Number.parseInt(String(query.pageSize ?? String(defaultPageSize)), 10);
  const pageSize = Number.isFinite(rawPageSize)
    ? Math.min(Math.max(1, rawPageSize), 100)
    : defaultPageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Number.isFinite(rawPage)
    ? Math.min(Math.max(1, rawPage), totalPages)
    : 1;
  const start = (page - 1) * pageSize;

  return {
    ok: true,
    data: items.slice(start, start + pageSize),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
    },
  };
}

export function handleFleetError(res: Response, err: unknown): void {
  if (err instanceof FleetServiceError) {
    res.status(err.status).json({
      ok: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  const pgCode = (err as { code?: string } | null)?.code;
  if (pgCode === "22P02") {
    res.status(400).json({
      ok: false,
      error: {
        code: "INVALID_ID",
        message: "Invalid identifier format.",
      },
    });
    return;
  }
  if (pgCode === "23503") {
    res.status(400).json({
      ok: false,
      error: {
        code: "INVALID_REFERENCE",
        message: "Referenced record does not exist.",
      },
    });
    return;
  }
  if (pgCode === "23505") {
    res.status(409).json({
      ok: false,
      error: {
        code: "DUPLICATE_RECORD",
        message: "A record with these details already exists.",
      },
    });
    return;
  }
  if (pgCode === "23514") {
    res.status(400).json({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Provided values violate data constraints.",
      },
    });
    return;
  }

  console.error("Unhandled fleet error:", err);
  res.status(500).json({
    ok: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected server error occurred.",
    },
  });
}

export function detectImageExtension(buffer: Buffer): "png" | "jpg" | "webp" | null {
  if (buffer.length < 12) return null;
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "png";
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}
