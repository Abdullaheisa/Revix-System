import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createApp } from "../src/app.ts";
import type { BackendEnvConfig } from "../src/config/env.ts";
import { InMemoryAuthDataStore } from "../src/db/memoryStore.ts";
import { InMemoryEmailDeliveryAdapter } from "../src/modules/auth/emailDelivery.ts";
import { NetworkServiceError } from "../src/modules/network/networkService.ts";

async function startTestServer() {
  const store = new InMemoryAuthDataStore();
  const emailAdapter = new InMemoryEmailDeliveryAdapter();
  const env: BackendEnvConfig = {
    nodeEnv: "test",
    port: 0,
    databaseUrl: undefined,
    uploadsDir: "uploads",
    frontendOrigin: "http://localhost:3000",
    sessionCookieName: "revix_session",
    sessionTtlHours: 24,
  };

  const { app, networkService } = createApp({ env, store, emailAdapter });
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
    networkService,
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

describe("Phase 4 — Company Network: Main Company ↔ Connected Local Companies", () => {
  it("manages invitations, links companies with permitted branches, strictly enforces view-only on writes, and handles status toggles & termination", async () => {
    const ctx = await startTestServer();
    try {
      // 1. Setup Main Company (HQ in Egypt)
      const mainOwnerCookie = await signupAndVerify(
        ctx.baseUrl,
        ctx.emailAdapter,
        "main-hq@revix.test",
        "HQ Master Admin",
      );

      const createMainCompanyRes = await fetch(
        `${ctx.baseUrl}/workspace/company`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: mainOwnerCookie,
          },
          body: JSON.stringify({
            name: "Revix Main Network Corp",
            legalName: "Revix Network Global LLC",
            brandColor: "#059669",
            phone: "+201000000001",
            email: "hq@revix.test",
            countryCode: "EG",
            city: "Cairo",
            address: "Nasr City",
            baseCurrency: "EGP",
            timezone: "Africa/Cairo",
            businessRegNumber: "CR-EG-1001",
            operatingMode: "network_main",
          }),
        },
      );
      assert.equal(createMainCompanyRes.status, 201);
      const mainCompanyJson = (await createMainCompanyRes.json()) as any;
      const mainCompanyId = mainCompanyJson.data.company.id;
      assert.equal(mainCompanyJson.data.company.operatingMode, "network_main");

      // 2. Setup Local Partner Company (Independent in Kuwait)
      const localOwnerCookie = await signupAndVerify(
        ctx.baseUrl,
        ctx.emailAdapter,
        "kw-partner@revix.test",
        "Kuwait Partner Admin",
      );

      const createLocalCompanyRes = await fetch(
        `${ctx.baseUrl}/workspace/company`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: localOwnerCookie,
          },
          body: JSON.stringify({
            name: "Al-Bahar Car Rental",
            legalName: "Al-Bahar Rent A Car Co WLL",
            brandColor: "#2563EB",
            phone: "+96522000001",
            email: "partner@albahar.test",
            countryCode: "KW",
            city: "Kuwait City",
            address: "Salhiya Complex",
            baseCurrency: "KWD",
            timezone: "Asia/Kuwait",
            businessRegNumber: "CR-KW-8888",
            operatingMode: "independent",
          }),
        },
      );
      assert.equal(createLocalCompanyRes.status, 201);
      const localCompanyJson = (await createLocalCompanyRes.json()) as any;
      const localCompanyId = localCompanyJson.data.company.id;
      assert.equal(localCompanyJson.data.company.operatingMode, "independent");

      // Add 2 branches to local company: Airport (shared) and Downtown (private)
      const createAirportBranchRes = await fetch(
        `${ctx.baseUrl}/workspace/branches`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: localOwnerCookie,
          },
          body: JSON.stringify({
            name: "Kuwait Int Airport Terminal 4",
            code: "KWI-T4",
            countryCode: "KW",
            city: "Farwaniya",
            address: "Airport Zone",
            phone: "+96522000002",
            email: "kwi-t4@albahar.test",
            workingDays: "Daily",
            workingHours: "24 Hours",
          }),
        },
      );
      assert.equal(createAirportBranchRes.status, 201);
      const airportBranch = ((await createAirportBranchRes.json()) as any).data
        .branch;

      const createDowntownBranchRes = await fetch(
        `${ctx.baseUrl}/workspace/branches`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: localOwnerCookie,
          },
          body: JSON.stringify({
            name: "Kuwait Downtown Branch",
            code: "KWI-DT",
            countryCode: "KW",
            city: "Kuwait City",
            address: "Fahad Al-Salem St",
            phone: "+96522000003",
            email: "kwi-dt@albahar.test",
            workingDays: "Sun - Thu",
            workingHours: "09:00 - 21:00",
          }),
        },
      );
      assert.equal(createDowntownBranchRes.status, 201);

      // 3. Main Company invites Local Partner to the Network
      const inviteRes = await fetch(`${ctx.baseUrl}/network/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: mainOwnerCookie,
        },
        body: JSON.stringify({
          inviteeEmail: "kw-partner@revix.test",
          localCompanyName: "Al-Bahar Car Rental",
          locale: "ar",
        }),
      });
      assert.equal(inviteRes.status, 201);
      const inviteJson = (await inviteRes.json()) as any;
      assert.ok(inviteJson.data.inviteLink);

      // Extract raw token from invite link: /invite/network?token=...
      const rawToken = inviteJson.data.inviteLink.split("token=")[1];
      assert.ok(rawToken, "Token must be present in invite link");

      // 4. Local Company previews network invitation
      const previewRes = await fetch(
        `${ctx.baseUrl}/network/invitations/preview?token=${rawToken}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );
      assert.equal(previewRes.status, 200);
      const previewJson = (await previewRes.json()) as any;
      assert.equal(
        previewJson.data.mainCompany.name,
        "Revix Main Network Corp",
      );
      assert.equal(previewJson.data.mainCompany.countryCode, "EG");

      // 5. Local Company accepts invitation and only shares the Airport branch
      const acceptRes = await fetch(
        `${ctx.baseUrl}/network/invitations/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: localOwnerCookie,
          },
          body: JSON.stringify({
            token: rawToken,
            permittedBranchIds: [airportBranch.id],
          }),
        },
      );
      assert.equal(acceptRes.status, 200);
      const acceptJson = (await acceptRes.json()) as any;
      const linkId = acceptJson.data.link.id;
      assert.equal(acceptJson.data.link.status, "active");

      // Verify local company mode updated to local_partner
      const checkLocalCompany = await ctx.store.findCompanyById(localCompanyId);
      assert.equal(checkLocalCompany?.operatingMode, "local_partner");
      assert.equal(checkLocalCompany?.parentCompanyId, mainCompanyId);

      // 6. Test Network Overview for Main Company
      const mainOverviewRes = await fetch(`${ctx.baseUrl}/network/overview`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: mainOwnerCookie,
        },
      });
      assert.equal(mainOverviewRes.status, 200);
      const mainOverviewJson = (await mainOverviewRes.json()) as any;
      assert.equal(mainOverviewJson.data.isMainCompany, true);
      assert.equal(mainOverviewJson.data.connectedPartners.length, 1);
      const partnerDto = mainOverviewJson.data.connectedPartners[0];
      assert.equal(partnerDto.name, "Al-Bahar Car Rental");
      assert.equal(partnerDto.permittedBranches.length, 1);
      assert.equal(partnerDto.permittedBranches[0].code, "KWI-T4");

      // 7. Test Network Overview for Local Company
      const localOverviewRes = await fetch(`${ctx.baseUrl}/network/overview`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: localOwnerCookie,
        },
      });
      assert.equal(localOverviewRes.status, 200);
      const localOverviewJson = (await localOverviewRes.json()) as any;
      assert.equal(localOverviewJson.data.isLocalPartner, true);
      assert.equal(localOverviewJson.data.parentLinks.length, 1);
      assert.equal(
        localOverviewJson.data.parentLinks[0].mainCompany.name,
        "Revix Main Network Corp",
      );

      // 8. Strict View-Only Access Guard Verification:
      // Main company reading local partner resources -> Allowed
      await assert.doesNotReject(async () => {
        await ctx.networkService.assertViewOnlyProtection(
          mainCompanyId,
          localCompanyId,
          "read",
        );
      });

      // Main company writing/modifying local partner resources -> FORBIDDEN (403)
      await assert.rejects(
        async () => {
          await ctx.networkService.assertViewOnlyProtection(
            mainCompanyId,
            localCompanyId,
            "write",
          );
        },
        (err: unknown) => {
          assert.ok(err instanceof NetworkServiceError);
          assert.equal(err.code, "FORBIDDEN_NETWORK_VIEW_ONLY");
          assert.equal(err.status, 403);
          return true;
        },
      );

      // 9. Update Link Status (Pause / Resume)
      const pauseRes = await fetch(
        `${ctx.baseUrl}/network/links/${linkId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: mainOwnerCookie,
          },
          body: JSON.stringify({ status: "paused" }),
        },
      );
      assert.equal(pauseRes.status, 200);
      const pausedJson = (await pauseRes.json()) as any;
      assert.equal(pausedJson.data.link.status, "paused");

      // When link is paused, cross-tenant access is rejected
      await assert.rejects(
        async () => {
          await ctx.networkService.assertViewOnlyProtection(
            mainCompanyId,
            localCompanyId,
            "read",
          );
        },
        (err: unknown) => {
          assert.ok(err instanceof NetworkServiceError);
          assert.equal(err.code, "FORBIDDEN_CROSS_TENANT");
          return true;
        },
      );

      // Resume link
      const resumeRes = await fetch(
        `${ctx.baseUrl}/network/links/${linkId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: mainOwnerCookie,
          },
          body: JSON.stringify({ status: "active" }),
        },
      );
      assert.equal(resumeRes.status, 200);

      // 10. Terminate Link: Local Company reverts to independent
      const terminateRes = await fetch(
        `${ctx.baseUrl}/network/links/${linkId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Cookie: mainOwnerCookie,
          },
        },
      );
      assert.equal(terminateRes.status, 200);

      const postTerminateCompany =
        await ctx.store.findCompanyById(localCompanyId);
      assert.equal(postTerminateCompany?.operatingMode, "independent");
      assert.equal(postTerminateCompany?.parentCompanyId, null);
    } finally {
      await ctx.close();
    }
  });
});
