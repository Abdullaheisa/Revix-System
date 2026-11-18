import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  validateNewPassword,
} from "../src/lib/auth/passwordPolicy.ts";
import { sanitizeReturnUrl } from "../src/lib/auth/redirect.ts";
import { extractApiErrorCode } from "../src/store/api/baseApi.ts";




describe("Frontend open-redirect protection (sanitizeReturnUrl)", () => {
  it("allows safe locale-aware internal paths", () => {
    assert.equal(sanitizeReturnUrl("/en/account", "en"), "/en/account");
    assert.equal(
      sanitizeReturnUrl("/account/security", "ar"),
      "/ar/account/security",
    );
    assert.equal(sanitizeReturnUrl("/en/account", "ar"), "/ar/account");
    assert.equal(sanitizeReturnUrl("/", "en"), "/en");
  });

  it("rejects external URLs, protocol-relative URLs, backslashes, schemes, and auth loops", () => {
    assert.equal(
      sanitizeReturnUrl("https://evil.example/steal", "en"),
      "/en/workspace",
    );
    assert.equal(sanitizeReturnUrl("//evil.example", "en"), "/en/workspace");
    assert.equal(sanitizeReturnUrl("/\\evil.example", "ar"), "/ar/workspace");
    assert.equal(sanitizeReturnUrl("javascript:alert(1)", "en"), "/en/workspace");
    assert.equal(sanitizeReturnUrl("/en/login", "en"), "/en/workspace");
    assert.equal(sanitizeReturnUrl("/en/signup", "en"), "/en/workspace");
    assert.equal(
      sanitizeReturnUrl("/en/forgot-password", "en"),
      "/en/workspace",
    );
    assert.equal(sanitizeReturnUrl("/ar/auth/action", "ar"), "/ar/workspace");
    assert.equal(sanitizeReturnUrl("/ar/register", "ar"), "/ar/workspace");
    assert.equal(sanitizeReturnUrl(undefined, "ar"), "/ar/workspace");
  });
});

describe("Frontend password policy alignment (Revix Auth)", () => {
  it("enforces configured minimum length and character classes without trimming spaces or imposing a 72-byte cap", () => {
    assert.equal(MIN_PASSWORD_LENGTH, 12);
    assert.equal(MAX_PASSWORD_LENGTH, 4096);

    assert.equal(validateNewPassword("Short1a"), "too_short");
    assert.equal(validateNewPassword("lowercaseonly123"), "missing_uppercase");
    assert.equal(validateNewPassword("UPPERCASEONLY123"), "missing_lowercase");
    assert.equal(validateNewPassword("NoNumbersHereAtAll"), "missing_number");

    // Spaces are preserved and longer passphrases > 72 UTF-8 bytes succeed up to 4096 chars
    const longPassphrase = `${"Revix Fleet Rental 2026 ".repeat(5)}A1`;
    assert.equal(validateNewPassword(`  ${longPassphrase}  `), null);
    assert.equal(
      validateNewPassword(`${"Aa1".repeat(1400)}`),
      "too_long",
    );
  });
});

describe("Redux Toolkit API Error Code Extraction (extractApiErrorCode)", () => {
  it("normalizes RTK Query fetch, rate-limit, and structured backend error payloads", () => {
    assert.equal(
      extractApiErrorCode({ status: "FETCH_ERROR", error: "Failed to fetch" }),
      "SERVICE_UNAVAILABLE",
    );
    assert.equal(
      extractApiErrorCode({ status: 429, data: {} }),
      "RATE_LIMITED",
    );
    assert.equal(
      extractApiErrorCode({
        status: 409,
        data: { ok: false, error: { code: "EMAIL_IN_USE" } },
      }),
      "EMAIL_IN_USE",
    );
    assert.equal(
      extractApiErrorCode({
        status: 403,
        data: { ok: false, error: { code: "EMAIL_NOT_VERIFIED" } },
      }),
      "EMAIL_NOT_VERIFIED",
    );
    assert.equal(
      extractApiErrorCode({ status: 401, data: {} }),
      "UNAUTHORIZED",
    );
  });
});


