import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createApp } from "../src/app.ts";
import type { BackendEnvConfig } from "../src/config/env.ts";
import { InMemoryAuthDataStore } from "../src/db/memoryStore.ts";
import { InMemoryEmailDeliveryAdapter } from "../src/modules/auth/emailDelivery.ts";

async function startTestServer() {
  const store = new InMemoryAuthDataStore();
  const emailAdapter = new InMemoryEmailDeliveryAdapter();
  const env: BackendEnvConfig = {
    nodeEnv: "test",
    port: 0,
    databaseUrl: undefined,
    frontendOrigin: "http://localhost:3000",
    sessionCookieName: "revix_session",
    sessionTtlHours: 24,
  };

  const { app } = createApp({ env, store, emailAdapter });
  const server = await new Promise<import("node:http").Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  return {
    baseUrl,
    store,
    emailAdapter,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      ),
  };
}

function extractSessionCookie(res: Response): string {
  const raw = res.headers.get("set-cookie") ?? "";
  const match = raw.match(/revix_session=[^;]+/);
  return match ? match[0] : "";
}

async function signupAndVerify(
  baseUrl: string,
  emailAdapter: InMemoryEmailDeliveryAdapter,
  email: string,
  fullName: string,
): Promise<string> {
  const signupRes = await fetch(`${baseUrl}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName,
      email,
      password: "StrongPassword123!",
      locale: "en",
    }),
  });
  assert.equal(signupRes.status, 201);
  const cookie = extractSessionCookie(signupRes);
  const mail = emailAdapter.verificationOutbox.find(
    (entry) => entry.toEmail === email.toLowerCase(),
  );
  assert.ok(mail, "Verification email should be queued");

  const verifyRes = await fetch(`${baseUrl}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ token: mail.rawToken }),
  });
  assert.equal(verifyRes.status, 200);
  return cookie;
}

describe("Phase 3 — Team Setup, Invitations, Single-Company Email & 2D RBAC", () => {
  it("seeds roles, enforces single-company email, scopes branches, blocks unauthorized writes, and revokes suspended sessions", async () => {
    const ctx = await startTestServer();
    try {
      // 1. Owner A signs up, creates Company A with a valid PNG logo and 2 branches
      const ownerACookie = await signupAndVerify(
        ctx.baseUrl,
        ctx.emailAdapter,
        "owner-a@revix.test",
        "Owner Alpha",
      );

      // Reject unsafe SVG logo
      const badLogoRes = await fetch(`${ctx.baseUrl}/workspace/company`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: ownerACookie,
        },
        body: JSON.stringify({
          name: "Alpha Mobility",
          legalName: "Alpha Mobility LLC",
          logoUrl: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
          brandColor: "#14532D",
          phone: "+966500000001",
          email: "info@alpha.test",
          countryCode: "SA",
          city: "Riyadh",
          address: "King Fahd Rd",
          baseCurrency: "SAR",
          timezone: "Asia/Riyadh",
          businessRegNumber: "CR-1010",
          operatingMode: "independent",
        }),
      });
      assert.equal(badLogoRes.status, 400);

      // Accept valid PNG base64 logo
      const validPngLogo =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      const createCompanyARes = await fetch(`${ctx.baseUrl}/workspace/company`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: ownerACookie,
        },
        body: JSON.stringify({
          name: "Alpha Mobility",
          legalName: "Alpha Mobility LLC",
          logoUrl: validPngLogo,
          brandColor: "#14532D",
          phone: "+966500000001",
          email: "info@alpha.test",
          countryCode: "SA",
          city: "Riyadh",
          address: "King Fahd Rd",
          baseCurrency: "SAR",
          timezone: "Asia/Riyadh",
          businessRegNumber: "CR-1010",
          operatingMode: "independent",
        }),
      });
      assert.equal(createCompanyARes.status, 201);
      const companyAJson = (await createCompanyARes.json()) as {
        data: { company: { id: string; logoUrl: string | null } };
      };
      assert.equal(companyAJson.data.company.logoUrl, validPngLogo);

      // Create 2 branches: Riyadh (RUH) & Jeddah (JED)
      const branch1Res = await fetch(`${ctx.baseUrl}/workspace/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: ownerACookie },
        body: JSON.stringify({
          name: "Riyadh Airport",
          code: "RUH-01",
          countryCode: "SA",
          city: "Riyadh",
          address: "Terminal 1",
          phone: "+966500000011",
          email: "ruh@alpha.test",
          workingDays: "Sun - Thu",
          workingHours: "08:00 - 22:00",
        }),
      });
      assert.equal(branch1Res.status, 201);
      const branch1Id = (
        (await branch1Res.json()) as { data: { branch: { id: string } } }
      ).data.branch.id;

      const branch2Res = await fetch(`${ctx.baseUrl}/workspace/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: ownerACookie },
        body: JSON.stringify({
          name: "Jeddah Corniche",
          code: "JED-01",
          countryCode: "SA",
          city: "Jeddah",
          address: "Corniche Rd",
          phone: "+966500000012",
          email: "jed@alpha.test",
          workingDays: "Sun - Thu",
          workingHours: "08:00 - 22:00",
        }),
      });
      assert.equal(branch2Res.status, 201);
      const branch2Id = (
        (await branch2Res.json()) as { data: { branch: { id: string } } }
      ).data.branch.id;

      // 2. Verify Team Overview returns 6 seeded default roles + Owner member
      const overviewRes = await fetch(`${ctx.baseUrl}/team/overview`, {
        headers: { Cookie: ownerACookie },
      });
      assert.equal(overviewRes.status, 200);
      const overviewJson = (await overviewRes.json()) as {
        data: {
          roles: Array<{ id: string; code: string }>;
          members: Array<{ email: string; roleCode: string; isOwner: boolean }>;
        };
      };
      assert.equal(overviewJson.data.roles.length, 6);
      assert.equal(overviewJson.data.members.length, 1);
      assert.equal(overviewJson.data.members[0].roleCode, "owner");

      const repRole = overviewJson.data.roles.find(
        (r) => r.code === "representative",
      );
      const financeRole = overviewJson.data.roles.find(
        (r) => r.code === "finance_manager",
      );
      assert.ok(repRole && financeRole);

      // 3. Invite a Representative scoped ONLY to Branch 1 (RUH-01)
      const inviteRes = await fetch(`${ctx.baseUrl}/team/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: ownerACookie },
        body: JSON.stringify({
          fullName: "Sara Rep",
          email: "sara@alpha.test",
          phone: "+966500000099",
          roleId: repRole.id,
          branchIds: [branch1Id],
          locale: "en",
        }),
      });
      assert.equal(inviteRes.status, 201);
      const inviteMail = ctx.emailAdapter.invitationOutbox.find(
        (m) => m.toEmail === "sara@alpha.test",
      );
      assert.ok(inviteMail, "Invitation email should be queued");

      // Preview invitation via POST body
      const previewRes = await fetch(`${ctx.baseUrl}/team/invitations/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: inviteMail.rawToken }),
      });
      assert.equal(previewRes.status, 200);
      const previewJson = (await previewRes.json()) as {
        data: {
          invitation: { companyName: string; branchNames: string[] };
        };
      };
      assert.equal(previewJson.data.invitation.companyName, "Alpha Mobility");
      assert.equal(previewJson.data.invitation.branchNames.length, 1);

      // Accept invitation -> receives HttpOnly session cookie
      const acceptRes = await fetch(`${ctx.baseUrl}/team/invitations/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: inviteMail.rawToken,
          password: "SaraStrongPassword123!",
        }),
      });
      assert.equal(acceptRes.status, 200);
      const saraCookie = extractSessionCookie(acceptRes);
      assert.ok(saraCookie.includes("revix_session="));

      // Re-using the same token must fail (single-use)
      const replayRes = await fetch(`${ctx.baseUrl}/team/invitations/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: inviteMail.rawToken,
          password: "SaraStrongPassword123!",
        }),
      });
      assert.equal(replayRes.status, 400);

      // 4. Verify Sara's Workspace Context only exposes Branch 1 (strict branch scoping!)
      const saraCtxRes = await fetch(`${ctx.baseUrl}/workspace/context`, {
        headers: { Cookie: saraCookie },
      });
      assert.equal(saraCtxRes.status, 200);
      const saraCtxJson = (await saraCtxRes.json()) as {
        data: {
          branches: Array<{ id: string }>;
          membership: { roleCode: string; scopeType: string };
        };
      };
      assert.equal(saraCtxJson.data.membership.roleCode, "representative");
      assert.equal(saraCtxJson.data.branches.length, 1);
      assert.equal(saraCtxJson.data.branches[0].id, branch1Id);

      // 5. Verify 2D RBAC blocks Sara from updating company or inviting employees
      const saraInviteAttempt = await fetch(`${ctx.baseUrl}/team/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: saraCookie },
        body: JSON.stringify({
          fullName: "Unauthorized",
          email: "other@alpha.test",
          phone: "",
          roleId: repRole.id,
          branchIds: [branch1Id],
          locale: "en",
        }),
      });
      assert.equal(saraInviteAttempt.status, 403);

      const saraBranchUpdateAttempt = await fetch(
        `${ctx.baseUrl}/workspace/branches/${branch2Id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", Cookie: saraCookie },
          body: JSON.stringify({
            name: "Hacked Branch",
            code: "JED-01",
            countryCode: "SA",
            city: "Jeddah",
            address: "Corniche Rd",
            phone: "+966500000012",
            email: "jed@alpha.test",
            workingDays: "Sun - Thu",
            workingHours: "08:00 - 22:00",
            isActive: true,
          }),
        },
      );
      assert.equal(saraBranchUpdateAttempt.status, 403);

      // 6. Enforce Single Company per Email: Company B cannot invite sara@alpha.test
      const ownerBCookie = await signupAndVerify(
        ctx.baseUrl,
        ctx.emailAdapter,
        "owner-b@revix.test",
        "Owner Beta",
      );
      await fetch(`${ctx.baseUrl}/workspace/company`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: ownerBCookie },
        body: JSON.stringify({
          name: "Beta Cars",
          legalName: "Beta Cars LLC",
          brandColor: "#14532D",
          phone: "+965500000001",
          email: "info@beta.test",
          countryCode: "KW",
          city: "Kuwait City",
          address: "Gulf Rd",
          baseCurrency: "KWD",
          timezone: "Asia/Kuwait",
          businessRegNumber: "KW-2020",
          operatingMode: "independent",
        }),
      });
      const overviewBRes = await fetch(`${ctx.baseUrl}/team/overview`, {
        headers: { Cookie: ownerBCookie },
      });
      const overviewBJson = (await overviewBRes.json()) as {
        data: { roles: Array<{ id: string; code: string }> };
      };
      const betaCeoRole = overviewBJson.data.roles.find(
        (r) => r.code === "ceo",
      )!;

      const crossCompanyInvite = await fetch(`${ctx.baseUrl}/team/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: ownerBCookie },
        body: JSON.stringify({
          fullName: "Sara Duplicate",
          email: "sara@alpha.test",
          phone: "",
          roleId: betaCeoRole.id,
          branchIds: [],
          locale: "en",
        }),
      });
      assert.equal(crossCompanyInvite.status, 409);
      const crossCompanyJson = (await crossCompanyInvite.json()) as {
        error: { code: string };
      };
      assert.equal(crossCompanyJson.error.code, "EMAIL_ALREADY_IN_COMPANY");

      // 7. Owner A updates Finance Manager role permissions & suspends Sara (revoking her session)
      const updateRoleRes = await fetch(
        `${ctx.baseUrl}/team/roles/${financeRole.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", Cookie: ownerACookie },
          body: JSON.stringify({
            scopeType: "company_wide",
            permissions: {
              company: ["read"],
              branches: ["read"],
              finance: ["read", "create", "approve"],
            },
          }),
        },
      );
      assert.equal(updateRoleRes.status, 200);

      const overviewAfterRes = await fetch(`${ctx.baseUrl}/team/overview`, {
        headers: { Cookie: ownerACookie },
      });
      const overviewAfterJson = (await overviewAfterRes.json()) as {
        data: { members: Array<{ id: string; email: string }> };
      };
      const saraMember = overviewAfterJson.data.members.find(
        (m) => m.email === "sara@alpha.test",
      )!;

      const suspendRes = await fetch(
        `${ctx.baseUrl}/team/members/${saraMember.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Cookie: ownerACookie },
          body: JSON.stringify({
            roleId: repRole.id,
            phone: "+966500000099",
            status: "suspended",
            branchIds: [branch1Id],
          }),
        },
      );
      assert.equal(suspendRes.status, 200);

      // Sara's existing session must now be revoked (401)
      const saraAfterSuspend = await fetch(`${ctx.baseUrl}/workspace/context`, {
        headers: { Cookie: saraCookie },
      });
      assert.equal(saraAfterSuspend.status, 401);
    } finally {
      await ctx.close();
    }
  });
});
