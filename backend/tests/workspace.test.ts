import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { createApp } from "../src/app.ts";
import type { BackendEnvConfig } from "../src/config/env.ts";
import { InMemoryAuthDataStore } from "../src/db/memoryStore.ts";
import { InMemoryEmailDeliveryAdapter } from "../src/modules/auth/emailDelivery.ts";

describe("Phase 2 — Company Onboarding, Multi-Country Branches & Tenant Isolation", () => {
  const env: BackendEnvConfig = {
    nodeEnv: "test",
    port: 0,
    databaseUrl: undefined,
    uploadsDir: "uploads",
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

  async function registerAndVerifyUser(
    fullName: string,
    email: string,
  ): Promise<string> {
    const signupRes = await fetch(`${baseUrl}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        email,
        password: "RevixStrongPassword2026",
        locale: "ar",
      }),
    });
    assert.equal(signupRes.status, 201);
    const rawCookie = signupRes.headers.get("set-cookie") ?? "";
    const match = rawCookie.match(/revix_session=([^;]+)/);
    assert.ok(match && match[1]);
    const sessionCookie = `revix_session=${match[1]}`;

    const verifyRes = await fetch(`${baseUrl}/auth/dev-verify-session`, {
      method: "POST",
      headers: { Cookie: sessionCookie },
    });
    assert.equal(verifyRes.status, 200);
    return sessionCookie;
  }

  it("walks through company onboarding, first branch creation, automatic country currency, shared addresses, and cross-tenant isolation", async () => {
    const tenantACookie = await registerAndVerifyUser(
      "Khalid Al-Saud",
      "khalid@alnoor-rental.com",
    );

    // 1. Initial context requires company setup
    const initCtxRes = await fetch(`${baseUrl}/workspace/context`, {
      headers: { Cookie: tenantACookie },
    });
    assert.equal(initCtxRes.status, 200);
    const initCtx = (await initCtxRes.json()) as {
      data: { onboardingState: string; company: unknown; branches: unknown[] };
    };
    assert.equal(initCtx.data.onboardingState, "needs_company");

    // 2. Create Company A (Headquarters in Saudi Arabia, base currency SAR)
    const createCompRes = await fetch(`${baseUrl}/workspace/company`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tenantACookie,
      },
      body: JSON.stringify({
        name: "Al Noor Mobility",
        legalName: "Al Noor Car Rental LLC",
        brandColor: "#14532D",
        phone: "+966500000001",
        email: "info@alnoor-rental.com",
        countryCode: "SA",
        city: "Riyadh",
        address: "King Fahd Road, Building 42",
        postalCode: "11564",
        baseCurrency: "SAR",
        timezone: "Asia/Riyadh",
        businessRegNumber: "CR-1010998877",
        taxRegNumber: "VAT-3000112233",
        operatingMode: "network_main",
      }),
    });
    assert.equal(createCompRes.status, 201);

    // Context now requires first branch
    const afterCompCtxRes = await fetch(`${baseUrl}/workspace/context`, {
      headers: { Cookie: tenantACookie },
    });
    const afterCompCtx = (await afterCompCtxRes.json()) as {
      data: { onboardingState: string };
    };
    assert.equal(afterCompCtx.data.onboardingState, "needs_first_branch");

    // 3. Create First Branch in Riyadh (SA -> SAR)
    const branch1Res = await fetch(`${baseUrl}/workspace/branches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tenantACookie,
      },
      body: JSON.stringify({
        name: "Riyadh Airport Terminal 5",
        code: "RUH-T5",
        countryCode: "SA",
        city: "Riyadh",
        address: "King Fahd Road, Building 42",
        phone: "+966500000002",
        email: "ruh-t5@alnoor-rental.com",
        workingDays: "Daily",
        workingHours: "24 Hours",
      }),
    });
    assert.equal(branch1Res.status, 201);
    const branch1Json = (await branch1Res.json()) as {
      data: { branch: { id: string; currencyCode: string; code: string } };
    };
    assert.equal(branch1Json.data.branch.currencyCode, "SAR");
    assert.equal(branch1Json.data.branch.code, "RUH-T5");

    // 4. Create Second Branch in Kuwait (KW -> KWD automatically!) with same physical address allowed
    const branch2Res = await fetch(`${baseUrl}/workspace/branches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tenantACookie,
      },
      body: JSON.stringify({
        name: "Kuwait City Airport Desk",
        code: "KWI-01",
        countryCode: "KW",
        city: "Kuwait City",
        address: "Airport Road, Desk 12",
        phone: "+96522000001",
        email: "kwi@alnoor-rental.com",
        workingDays: "Sun - Thu",
        workingHours: "08:00 - 22:00",
      }),
    });
    assert.equal(branch2Res.status, 201);
    const branch2Json = (await branch2Res.json()) as {
      data: { branch: { id: string; currencyCode: string } };
    };
    assert.equal(branch2Json.data.branch.currencyCode, "KWD");

    // Another branch at the exact same Kuwait address succeeds with a distinct code
    const branch3SameAddressRes = await fetch(`${baseUrl}/workspace/branches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tenantACookie,
      },
      body: JSON.stringify({
        name: "Kuwait City VIP Lounge",
        code: "KWI-VIP",
        countryCode: "KW",
        city: "Kuwait City",
        address: "Airport Road, Desk 12",
        phone: "+96522000002",
        email: "kwi-vip@alnoor-rental.com",
        workingDays: "Sun - Thu",
        workingHours: "08:00 - 22:00",
      }),
    });
    assert.equal(branch3SameAddressRes.status, 201);

    // Duplicate branch code in the same company fails with 409
    const dupCodeRes = await fetch(`${baseUrl}/workspace/branches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tenantACookie,
      },
      body: JSON.stringify({
        name: "Duplicate Code Branch",
        code: "kwi-01",
        countryCode: "KW",
        city: "Kuwait City",
        address: "Another Street",
        phone: "+96522000003",
        email: "dup@alnoor-rental.com",
        workingDays: "Sun - Thu",
        workingHours: "08:00 - 22:00",
      }),
    });
    assert.equal(dupCodeRes.status, 409);

    // 5. Cross-Tenant Isolation: Independent Tenant B cannot modify Tenant A's branch
    const tenantBCookie = await registerAndVerifyUser(
      "Nasser Al-Sabah",
      "nasser@gulf-drive.com",
    );
    await fetch(`${baseUrl}/workspace/company`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tenantBCookie,
      },
      body: JSON.stringify({
        name: "Gulf Drive Rental",
        legalName: "Gulf Drive Co. WLL",
        brandColor: "#0F172A",
        phone: "+96522999999",
        email: "info@gulf-drive.com",
        countryCode: "KW",
        city: "Kuwait City",
        address: "Airport Road, Desk 12",
        postalCode: "13001",
        baseCurrency: "KWD",
        timezone: "Asia/Kuwait",
        businessRegNumber: "KW-778899",
        taxRegNumber: "",
        operatingMode: "independent",
      }),
    });

    const crossTenantEditRes = await fetch(
      `${baseUrl}/workspace/branches/${branch1Json.data.branch.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: tenantBCookie,
        },
        body: JSON.stringify({
          name: "Hijacked Branch",
          code: "HIJACK",
          countryCode: "KW",
          city: "Kuwait City",
          address: "Airport Road",
          phone: "+965000000",
          email: "evil@gulf-drive.com",
          workingDays: "Daily",
          workingHours: "24 Hours",
          isActive: true,
        }),
      },
    );
    assert.equal(crossTenantEditRes.status, 404);
  });
});
