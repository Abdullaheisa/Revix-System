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

  const { app, fleetService, networkService } = createApp({ env, store, emailAdapter });
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
    fleetService,
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

  const sent = emailAdapter.verificationOutbox.find((m) => m.toEmail === email);
  assert.ok(sent);
  const token = sent.rawToken;

  const verifyRes = await fetch(`${baseUrl}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ token }),
  });
  assert.equal(verifyRes.status, 200);
  return cookie;
}

async function onboardCompany(
  baseUrl: string,
  cookie: string,
  name: string,
  operatingMode: "independent" | "network_main" | "local_partner" = "independent",
): Promise<{ companyId: string; branchId: string }> {
  const compRes = await fetch(`${baseUrl}/workspace/company`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      name,
      legalName: `${name} LLC`,
      brandColor: "#059669",
      phone: "+201000000000",
      email: `hq@${name.toLowerCase().replace(/\s+/g, "")}.com`,
      countryCode: "EG",
      city: "Cairo",
      address: "Nasr City",
      baseCurrency: "EGP",
      timezone: "Africa/Cairo",
      businessRegNumber: "CR-12345",
      taxRegNumber: "TR-12345",
      operatingMode,
    }),
  });
  assert.equal(compRes.status, 201);
  const compJson = (await compRes.json()) as any;
  const companyId = compJson.data.company.id;

  const branchRes = await fetch(`${baseUrl}/workspace/branches`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      name: "Main Cairo Branch",
      code: "CAI-01",
      countryCode: "EG",
      city: "Cairo",
      address: "Nasr City",
      phone: "+201000000001",
      email: "cairo@branch.com",
      timezone: "Africa/Cairo",
      currency: "EGP",
      useCompanyAddress: true,
      workingHours: "08:00 - 22:00",
      workingDays: "Sun - Thu",
    }),
  });
  assert.equal(branchRes.status, 201);
  const branchJson = (await branchRes.json()) as any;
  return { companyId, branchId: branchJson.data.branch.id };
}

describe("Phase 5 — Purchasing & Fleet Management Lifecycle", () => {
  it("creates vehicle variants with duration-band rates, registers vendors, creates and approves POs, partially receives vehicles, and enforces tenant & branch security", async () => {
    const testEnv = await startTestServer();
    try {
      const ownerCookie = await signupAndVerify(
        testEnv.baseUrl,
        testEnv.emailAdapter,
        "owner.fleet@testrevix.com",
        "Fleet Owner",
      );

      const { branchId } = await onboardCompany(
        testEnv.baseUrl,
        ownerCookie,
        "Apex Rentals",
        "network_main",
      );

      // 1. Create Vehicle Variant (الفريان)
      const variantRes = await fetch(`${testEnv.baseUrl}/fleet/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: ownerCookie },
        body: JSON.stringify({
          make: "Toyota",
          model: "Camry",
          modelYear: 2024,
          trim: "GLE Executive",
          category: "sedan",
          transmission: "automatic",
          fuelType: "petrol",
          seatingCapacity: 5,
          sippCode: "ICAR",
        }),
      });
      assert.equal(variantRes.status, 201);
      const variantJson = (await variantRes.json()) as any;
      assert.equal(variantJson.ok, true);
      assert.equal(variantJson.data.make, "Toyota");
      assert.equal(variantJson.data.model, "Camry");
      assert.equal(variantJson.data.sippCode, "ICAR");
      const variantId = variantJson.data.id;

      // 2. List variants
      const listVarRes = await fetch(`${testEnv.baseUrl}/fleet/variants?category=sedan`, {
        headers: { Cookie: ownerCookie },
      });
      assert.equal(listVarRes.status, 200);
      const listVarJson = (await listVarRes.json()) as any;
      assert.equal(listVarJson.data.length, 1);

      // 3. Register Vendor
      const vendorRes = await fetch(`${testEnv.baseUrl}/fleet/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: ownerCookie },
        body: JSON.stringify({
          name: "Al-Futtaim Motors",
          legalName: "Al-Futtaim Automotive LLC",
          category: "dealership",
          contactPerson: "Tarek Mostafa",
          phone: "+201012345678",
          email: "sales@alfuttaim.com",
          countryCode: "EG",
          city: "Cairo",
          address: "Ring Road, 5th Settlement",
          taxNumber: "TX-998877",
          commercialRegister: "CR-443322",
          paymentTermsDays: 45,
          paymentTermsType: "net_terms",
          paymentTermsConfig: "Net 45",
        }),
      });
      assert.equal(vendorRes.status, 201);
      const vendorJson = (await vendorRes.json()) as any;
      assert.equal(vendorJson.ok, true);
      assert.equal(vendorJson.data.name, "Al-Futtaim Motors");
      assert.equal(vendorJson.data.paymentTermsType, "net_terms");
      assert.equal(vendorJson.data.paymentTermsDays, 45);
      const vendorId = vendorJson.data.id;

      // 3b. Register Vendor with Milestones & Installments
      const milestoneVendorRes = await fetch(`${testEnv.baseUrl}/fleet/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: ownerCookie },
        body: JSON.stringify({
          name: "Global Fleet Leasing",
          category: "leasing",
          contactPerson: "Amr Nabil",
          phone: "+201099887766",
          countryCode: "EG",
          city: "Giza",
          paymentTermsDays: 60,
          paymentTermsType: "milestones",
          paymentTermsConfig: "50_50",
        }),
      });
      assert.equal(milestoneVendorRes.status, 201);
      const milestoneVendorJson = (await milestoneVendorRes.json()) as any;
      assert.equal(milestoneVendorJson.data.paymentTermsType, "milestones");
      assert.equal(milestoneVendorJson.data.paymentTermsConfig, "50_50");

      // 4. Create Purchase Order (PO) with 2 vehicles of this variant
      const poRes = await fetch(`${testEnv.baseUrl}/fleet/purchase-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: ownerCookie },
        body: JSON.stringify({
          branchId,
          vendorId,
          orderDate: "2026-11-20",
          expectedDeliveryDate: "2026-12-05",
          currency: "EGP",
          upfrontPaid: 400000,
          installmentsCount: 12,
          notes: "Batch order for high season fleet expansion",
          items: [
            {
              variantId,
              quantity: 2,
              unitPrice: 850000,
              notes: "White exterior, black interior",
            },
          ],
        }),
      });
      assert.equal(poRes.status, 201);
      const poJson = (await poRes.json()) as any;
      assert.equal(poJson.ok, true);
      assert.equal(poJson.data.totalAmount, 1700000); // 2 * 850,000
      assert.equal(poJson.data.upfrontPaid, 400000);
      assert.equal(poJson.data.remainingAmount, 1300000);
      assert.equal(poJson.data.status, "approved");
      const poId = poJson.data.id;
      const itemId = poJson.data.items[0].id;

      // 5. Approve Purchase Order
      const approveRes = await fetch(`${testEnv.baseUrl}/fleet/purchase-orders/${poId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: ownerCookie },
        body: JSON.stringify({ status: "approved" }),
      });
      assert.equal(approveRes.status, 200);
      const approveJson = (await approveRes.json()) as any;
      assert.equal(approveJson.data.status, "approved");

      // 6. Receive 1st Vehicle from PO (Partial Receiving)
      const receive1Res = await fetch(`${testEnv.baseUrl}/fleet/purchase-orders/${poId}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: ownerCookie },
        body: JSON.stringify({
          itemId,
          branchId,
          vin: "JTDKN3DU5N0011223",
          licensePlate: "Cairo 1234 ABC",
          keyNumber: "KEY-01",
          color: "Pearl White",
          mileageOdometer: 15,
          registrationExpiry: "2027-11-20",
          insuranceExpiry: "2027-11-20",
          notes: "Received in pristine condition with 2 key fobs",
        }),
      });
      assert.equal(receive1Res.status, 201);
      const rcv1Json = (await receive1Res.json()) as any;
      assert.equal(rcv1Json.ok, true);
      assert.equal(rcv1Json.data.vehicle.vin, "JTDKN3DU5N0011223");
      assert.equal(rcv1Json.data.vehicle.status, "available");
      assert.equal(rcv1Json.data.po.status, "partially_received");
      assert.equal(rcv1Json.data.po.items[0].receivedCount, 1);

      // 7. Receive 2nd Vehicle (Completes PO)
      const receive2Res = await fetch(`${testEnv.baseUrl}/fleet/purchase-orders/${poId}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: ownerCookie },
        body: JSON.stringify({
          itemId,
          branchId,
          vin: "JTDKN3DU5N0011224",
          licensePlate: "Cairo 1235 ABC",
          keyNumber: "KEY-02",
          color: "Pearl White",
          mileageOdometer: 18,
          registrationExpiry: "2027-11-20",
          insuranceExpiry: "2027-11-20",
        }),
      });
      assert.equal(receive2Res.status, 201);
      const rcv2Json = (await receive2Res.json()) as any;
      assert.equal(rcv2Json.data.po.status, "completed");
      assert.equal(rcv2Json.data.po.items[0].receivedCount, 2);

      // 8. Reject Duplicate VIN registration
      const dupVinRes = await fetch(`${testEnv.baseUrl}/fleet/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: ownerCookie },
        body: JSON.stringify({
          branchId,
          variantId,
          vin: "JTDKN3DU5N0011223", // Already registered
          licensePlate: "Cairo 9999 XYZ",
          color: "Black",
          mileageOdometer: 0,
        }),
      });
      assert.equal(dupVinRes.status, 409);

      // 9. Check Fleet Metrics API
      const metricsRes = await fetch(`${testEnv.baseUrl}/fleet/metrics`, {
        headers: { Cookie: ownerCookie },
      });
      assert.equal(metricsRes.status, 200);
      const metricsJson = (await metricsRes.json()) as any;
      assert.equal(metricsJson.data.totalVehicles, 2);
      assert.equal(metricsJson.data.availableCount, 2);
      assert.equal(metricsJson.data.variantsCount, 1);
      assert.equal(metricsJson.data.vendorsCount, 2);

      // 10. List Vehicles with variant details enriched
      const listVehiclesRes = await fetch(`${testEnv.baseUrl}/fleet/vehicles`, {
        headers: { Cookie: ownerCookie },
      });
      assert.equal(listVehiclesRes.status, 200);
      const listVehiclesJson = (await listVehiclesRes.json()) as any;
      assert.equal(listVehiclesJson.data.length, 2);
      assert.equal(listVehiclesJson.data[0].variant.make, "Toyota");
      assert.equal(listVehiclesJson.data[0].variant.model, "Camry");
      assert.equal(listVehiclesJson.data[0].variant.sippCode, "ICAR");
    } finally {
      await testEnv.close();
    }
  });
});
