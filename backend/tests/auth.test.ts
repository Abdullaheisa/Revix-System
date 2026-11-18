import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { createApp } from "../src/app.ts";
import type { BackendEnvConfig } from "../src/config/env.ts";
import { InMemoryAuthDataStore } from "../src/db/memoryStore.ts";
import { InMemoryEmailDeliveryAdapter } from "../src/modules/auth/emailDelivery.ts";
import { hashPassword, verifyPassword } from "../src/security/passwordHash.ts";
import { validateNewPassword } from "../src/security/passwordPolicy.ts";

describe("Backend Argon2id Password Hashing & Policy", () => {
  it("hashes and verifies long passphrases (>72 bytes) with spaces in constant time", async () => {
    const passphrase = `  ${"Revix B2B SaaS Fleet Platform 2026 ".repeat(3)}A1  `;
    assert.equal(validateNewPassword(passphrase), null);

    const phcHash = await hashPassword(passphrase);
    assert.ok(phcHash.startsWith("$argon2id$v=19$"));
    assert.equal(await verifyPassword(passphrase, phcHash), true);
    assert.equal(await verifyPassword(passphrase.trim(), phcHash), false);
    assert.equal(await verifyPassword("WrongPassword123", phcHash), false);
  });
});

describe("Backend Express Authentication Lifecycle (Integration)", () => {
  const env: BackendEnvConfig = {
    nodeEnv: "test",
    port: 0,
    databaseUrl: undefined,
    frontendOrigin: "http://localhost:3000",
    sessionCookieName: "revix_session",
    sessionTtlHours: 168,
  };

  const store = new InMemoryAuthDataStore();
  const emailAdapter = new InMemoryEmailDeliveryAdapter();
  const { app } = createApp({ env, store, emailAdapter });

  let server: http.Server;
  let baseUrl = "";

  before(async () => {
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  });

  function extractSessionCookie(res: Response): string | null {
    const raw = res.headers.get("set-cookie");
    if (!raw) return null;
    const match = raw.match(/revix_session=([^;]+)/);
    return match && match[1] ? `revix_session=${match[1]}` : null;
  }

  it("registers a new user, issues an HttpOnly session cookie, queues verification email, and blocks duplicate emails", async () => {
    const signupRes = await fetch(`${baseUrl}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Ahmad Al-Mansoor",
        email: "Owner@AlNoorMobility.com",
        password: "StrongPassword2026",
        locale: "ar",
      }),
    });

    assert.equal(signupRes.status, 201);
    const cookie = extractSessionCookie(signupRes);
    assert.ok(cookie, "Expected HttpOnly session cookie on signup");

    const body = (await signupRes.json()) as {
      ok: boolean;
      data: {
        user: { email: string; emailVerified: boolean };
        verificationEmailSent: boolean;
      };
    };
    assert.equal(body.ok, true);
    assert.equal(body.data.user.email, "owner@alnoormobility.com");
    assert.equal(body.data.user.emailVerified, false);
    assert.equal(body.data.verificationEmailSent, true);
    assert.equal(emailAdapter.verificationOutbox.length, 1);

    // Duplicate registration with different casing must fail with 409 EMAIL_IN_USE
    const dupRes = await fetch(`${baseUrl}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Duplicate User",
        email: "owner@alnoormobility.com",
        password: "StrongPassword2026",
        locale: "en",
      }),
    });
    assert.equal(dupRes.status, 409);
  });

  it("blocks login before email verification, verifies email via single-use token, and allows login after verification", async () => {
    // 1. Login before email verification returns 403 EMAIL_NOT_VERIFIED
    const preVerifyLogin = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "owner@alnoormobility.com",
        password: "StrongPassword2026",
      }),
    });
    assert.equal(preVerifyLogin.status, 403);
    const preVerifyJson = (await preVerifyLogin.json()) as {
      error: { code: string };
    };
    assert.equal(preVerifyJson.error.code, "EMAIL_NOT_VERIFIED");

    // 2. Verify email using the queued token
    const queued = emailAdapter.verificationOutbox[0];
    assert.ok(queued);

    const verifyRes = await fetch(`${baseUrl}/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: queued.rawToken }),
    });
    assert.equal(verifyRes.status, 200);

    // 3. Reusing the same token must fail with 400 INVALID_TOKEN
    const reuseRes = await fetch(`${baseUrl}/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: queued.rawToken }),
    });
    assert.equal(reuseRes.status, 400);

    // 4. Login after verification succeeds
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "owner@alnoormobility.com",
        password: "StrongPassword2026",
      }),
    });
    assert.equal(loginRes.status, 200);
    const sessionCookie = extractSessionCookie(loginRes);
    assert.ok(sessionCookie);

    // 5. Inspect current session via GET /auth/me
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Cookie: sessionCookie },
    });
    assert.equal(meRes.status, 200);
    const meJson = (await meRes.json()) as {
      ok: boolean;
      data: { user: { email: string; emailVerified: boolean } };
    };
    assert.equal(meJson.data.user.emailVerified, true);
  });

  it("supports password change and revokes prior sessions, plus forgot/reset password flow", async () => {
    // Sign in to get an active session
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "owner@alnoormobility.com",
        password: "StrongPassword2026",
      }),
    });
    const sessionCookie = extractSessionCookie(loginRes);
    assert.ok(sessionCookie);

    // Wrong current password must fail with 400 WRONG_CURRENT_PASSWORD
    const badChangeRes = await fetch(`${baseUrl}/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        currentPassword: "WrongCurrentPassword123",
        newPassword: "UpdatedPassword2026",
      }),
    });
    assert.equal(badChangeRes.status, 400);

    // Valid password change succeeds and revokes the existing session
    const okChangeRes = await fetch(`${baseUrl}/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        currentPassword: "StrongPassword2026",
        newPassword: "UpdatedPassword2026",
      }),
    });
    assert.equal(okChangeRes.status, 200);

    // Old session cookie must now be rejected by GET /auth/me
    const oldSessionMe = await fetch(`${baseUrl}/auth/me`, {
      headers: { Cookie: sessionCookie },
    });
    assert.equal(oldSessionMe.status, 401);

    // Request password reset
    const forgotRes = await fetch(`${baseUrl}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "owner@alnoormobility.com",
        locale: "en",
      }),
    });
    assert.equal(forgotRes.status, 200);
    const resetMail = emailAdapter.passwordResetOutbox[0];
    assert.ok(resetMail);

    // Complete password reset
    const resetRes = await fetch(`${baseUrl}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: resetMail.rawToken,
        newPassword: "RecoveredPassword2026",
      }),
    });
    assert.equal(resetRes.status, 200);

    // Login with the recovered password succeeds
    const finalLogin = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "owner@alnoormobility.com",
        password: "RecoveredPassword2026",
      }),
    });
    assert.equal(finalLogin.status, 200);
  });
});
