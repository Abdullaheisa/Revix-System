import { resolveAssetUrl } from "@/store/api/baseApi";
import type { CompanyDto } from "@/store/api/workspaceApi";

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `rgba(20, 83, 45, ${alpha})`;
  }
  const r = Number.parseInt(cleaned.slice(0, 2), 16);
  const g = Number.parseInt(cleaned.slice(2, 4), 16);
  const b = Number.parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Opens a clean, print-ready branded Partner API v1 Integration Guide PDF
 * matching the structure of Revix-Partner-API-Guide.pdf using the parent
 * company's logo, brand color, company name, and dedicated baseUrl.
 */
export function openPartnerApiGuidePdf(options: {
  company: CompanyDto;
  baseUrl: string;
}): void {
  const { company, baseUrl } = options;
  const brand = /^#[0-9a-fA-F]{6}$/.test(company.brandColor || "")
    ? company.brandColor
    : "#14532D";
  const tintBg = hexToRgba(brand, 0.08);
  const tintBorder = hexToRgba(brand, 0.22);
  const safeName = escapeHtml(company.name || "Partner");
  const safeUpper = escapeHtml((company.name || "PARTNER").toUpperCase());
  const safeBaseUrl = escapeHtml(baseUrl);
  const logoSrc = company.logoUrl ? resolveAssetUrl(company.logoUrl) : "";
  const currency = escapeHtml(company.baseCurrency || "SAR");

  const headerHtml = (pageNum: string) => `
    <div class="doc-header">
      <div class="brand-lockup">
        ${
          logoSrc
            ? `<img src="${escapeHtml(logoSrc)}" alt="${safeName}" class="brand-logo" />`
            : `<div class="brand-text-logo">${safeUpper}</div>`
        }
        <span class="brand-sub">${safeName} • Car Rental</span>
      </div>
      <div class="doc-tag">PARTNER API / V1</div>
    </div>
    <div class="doc-divider"></div>
    <div class="doc-footer">
      <span>${safeUpper} • INTEGRATION GUIDE</span>
      <span>${pageNum}</span>
    </div>
  `;

  const html = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8" />
  <title>${safeName} — Partner API v1 Integration Guide</title>
  <style>
    @page { size: A4; margin: 16mm 16mm 18mm 16mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 0;
      font-size: 10.5pt;
      line-height: 1.5;
      background: #ffffff;
    }
    .page {
      position: relative;
      page-break-after: always;
      padding-bottom: 24px;
    }
    .page:last-child { page-break-after: auto; }
    .doc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .brand-lockup { display: flex; align-items: center; gap: 10px; }
    .brand-logo { height: 34px; max-width: 150px; object-fit: contain; }
    .brand-text-logo {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 0.04em;
      color: ${brand};
    }
    .brand-sub { font-size: 10px; color: #64748b; font-weight: 600; }
    .doc-tag { font-size: 10px; font-weight: 700; color: ${brand}; letter-spacing: 0.06em; }
    .doc-divider { height: 1px; background: #e2e8f0; margin-bottom: 18px; }
    .doc-footer {
      position: fixed;
      bottom: 8mm;
      left: 16mm;
      right: 16mm;
      display: none;
    }
    .eyebrow {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: ${brand};
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      margin: 0 0 8px 0;
      color: #0f172a;
    }
    h2 {
      font-size: 13px;
      font-weight: 700;
      margin: 16px 0 6px 0;
      color: #0f172a;
    }
    p { margin: 6px 0 10px 0; color: #334155; }
    .code-box {
      background: ${tintBg};
      border: 1px solid ${tintBorder};
      border-radius: 8px;
      padding: 10px 14px;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 9.2pt;
      line-height: 1.45;
      color: #0f172a;
      white-space: pre-wrap;
      word-break: break-word;
      margin: 8px 0 12px 0;
    }
    .page-meta {
      margin-top: 18px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #64748b;
      font-weight: 600;
    }
  </style>
</head>
<body>

  <!-- PAGE 1 -->
  <div class="page">
    ${headerHtml("01")}
    <div class="eyebrow">01 / START HERE</div>
    <h1>Connect to ${safeName}</h1>
    <p>Technical integration guide for websites that distribute ${safeName} rental offers.</p>

    <h2>Base URL</h2>
    <div class="code-box">${safeBaseUrl}</div>

    <h2>Required headers</h2>
    <div class="code-box">X-Partner-API-Key: &lt;YOUR_PARTNER_API_KEY&gt;
Accept: application/json
Content-Type: application/json   (POST with JSON)</div>

    <p>The simplest Postman setup is <strong>X-Partner-API-Key</strong>. <code>Authorization: Bearer &lt;YOUR_PARTNER_API_KEY&gt;</code> is also accepted. Send the key from your server over HTTPS. Never put it in a URL, browser bundle, screenshot or public log.</p>
    <p>Production keys are issued separately for each distribution website from the ${safeName} Integrations dashboard.</p>

    <h2>The integration sequence</h2>
    <p>1. Ping. 2. Load locations. 3. Load the vehicle catalogue. 4. Search availability. 5. Quote selected extras. 6. Create a booking. 7. Retrieve the booking. 8. Cancel when required.</p>

    <h2>Success and error envelopes</h2>
    <div class="code-box">{
  "success": true,
  "data": {
    "ready": true,
    "companyName": "${safeName}",
    "environment": "production"
  },
  "meta": {
    "requestId": "request-example",
    "timestamp": "2026-11-09T12:00:00.000Z"
  }
}</div>
    <p>All endpoints return JSON. List responses also include pagination metadata. Save <code>meta.requestId</code> for support and debugging.</p>
    <div class="page-meta"><span>${safeUpper} • INTEGRATION GUIDE</span><span>01</span></div>
  </div>

  <!-- PAGE 2 -->
  <div class="page">
    ${headerHtml("02")}
    <div class="eyebrow">02 / POSTMAN</div>
    <h1>Build each request</h1>
    <p>A practical guide to method, URL, headers, query parameters and JSON bodies.</p>

    <h2>1 · Choose the method and full URL</h2>
    <div class="code-box">GET  ${safeBaseUrl}/ping
GET  ${safeBaseUrl}/locations
GET  ${safeBaseUrl}/catalog
GET  ${safeBaseUrl}/availability
POST ${safeBaseUrl}/quote
POST ${safeBaseUrl}/bookings</div>

    <h2>2 · Add headers</h2>
    <div class="code-box">X-Partner-API-Key   &lt;YOUR_PARTNER_API_KEY&gt;
Accept              application/json
Content-Type        application/json   (POST only)</div>

    <h2>3 · GET search: use Params</h2>
    <div class="code-box">pickup_location   RUH
return_location   RUH
pickup_date       2026-12-01
return_date       2026-12-03
pickup_time       10:00
return_time       10:00
driver_age        30</div>

    <h2>4 · POST requests: Body tab, raw JSON</h2>
    <div class="code-box">{
  "pickup_location": "RUH",
  "pickup_date": "2026-12-01",
  "return_date": "2026-12-03",
  "driver_age": 30,
  "vehicle_id": "&lt;vehicleId from availability&gt;",
  "selected_extras": []
}</div>
    <p>In booking, <code>expected_total</code> must be a number copied from the latest quote, and <code>currency</code> must match that quote.</p>
    <div class="page-meta"><span>${safeUpper} • INTEGRATION GUIDE</span><span>02</span></div>
  </div>

  <!-- PAGE 3 -->
  <div class="page">
    ${headerHtml("03")}
    <div class="eyebrow">03 / DISCOVERY</div>
    <h1>Ping &amp; locations</h1>
    <p>Verify the key and use only location identifiers returned by ${safeName}.</p>

    <h2>GET /ping • read scope • HTTP 200</h2>
    <p>Headers only. <code>data.environment</code> reports <code>production</code>.</p>

    <h2>GET /locations • read scope • HTTP 200</h2>
    <p>Headers only. <code>data</code> is an array; <code>totalCount</code> is at the top level. Use the location <code>id</code> or <code>code</code>.</p>
    <div class="code-box">{
  "success": true,
  "totalCount": 1,
  "data": [
    {
      "id": "&lt;location id from response&gt;",
      "code": "RUH",
      "name": "Riyadh Main Branch",
      "nameAr": "فرع الرياض الرئيسي",
      "city": "Riyadh",
      "country": "SA",
      "currency": "${currency}",
      "type": "branch",
      "category": "Branch",
      "companyName": "${safeName}"
    }
  ],
  "meta": {
    "requestId": "request-example",
    "timestamp": "2026-11-09T12:00:00.000Z"
  }
}</div>
    <div class="page-meta"><span>${safeUpper} • INTEGRATION GUIDE</span><span>03</span></div>
  </div>

  <!-- PAGE 4 -->
  <div class="page">
    ${headerHtml("04")}
    <div class="eyebrow">04 / CATALOG</div>
    <h1>Vehicle catalogue</h1>
    <p>Load the ${safeName}-branded fleet variants, included benefits, and retail rate schedule without rental dates.</p>

    <h2>GET /catalog • read scope • HTTP 200</h2>
    <div class="code-box">GET ${safeBaseUrl}/catalog?limit=20&amp;category=SUV&amp;transmission=AUTOMATIC</div>
    <p>Optional: <code>limit</code> (default 20, max 50), <code>cursor</code>, <code>category</code> and <code>transmission</code>. Cars without required photos, specifications or configured pricing are omitted.</p>

    <h2>Sample data item</h2>
    <div class="code-box">{
  "vehicleId": "&lt;vehicle id&gt;",
  "displayName": "&lt;${safeName} vehicle name&gt;",
  "category": "SUV",
  "imageUrl": "&lt;image URL or null&gt;",
  "companyName": "${safeName}",
  "specifications": {
    "seats": 5,
    "doors": 4,
    "bags": 2,
    "transmission": "AUTOMATIC",
    "fuel": "PETROL",
    "fuelTypes": ["PETROL"],
    "airConditioning": true
  },
  "mileagePolicy": "Limited 250 km/day",
  "mileage": 250,
  "includedKmPerDay": 250,
  "extraKmPrice": 0.5,
  "excess": 1500,
  "securityDeposit": {
    "amount": 1000,
    "currency": "${currency}",
    "required": true,
    "refundable": true,
    "collectedAt": "PICKUP",
    "policy": "Refundable card hold collected at pickup and released after return under the rental terms."
  },
  "pricing": {
    "currency": "${currency}",
    "schema": "REVIX_RATE_CARD_V1",
    "quoteRequiredForExactRental": true,
    "taxesIncluded": null,
    "rates": [
      {
        "unit": "DAY",
        "unitDays": 1,
        "amount": 350,
        "dailyEquivalent": 350,
        "minRentalDays": 1,
        "maxRentalDays": 2
      }
    ]
  }
}</div>
    <p>Pagination returns <code>pagination.nextCursor</code> and <code>pagination.hasMore</code>.</p>
    <div class="page-meta"><span>${safeUpper} • INTEGRATION GUIDE</span><span>04</span></div>
  </div>

  <!-- PAGE 5 -->
  <div class="page">
    ${headerHtml("05")}
    <div class="eyebrow">05 / SEARCH</div>
    <h1>Availability</h1>
    <p>Search current offers using pickup and return dates, local times, and driver age.</p>

    <h2>GET /availability • read scope • HTTP 200</h2>
    <div class="code-box">GET ${safeBaseUrl}/availability?pickup_location=RUH&amp;return_location=RUH&amp;pickup_date=2026-12-01&amp;return_date=2026-12-03&amp;pickup_time=10:00&amp;return_time=10:00&amp;driver_age=30</div>
    <p><code>pickup_location</code>, <code>pickup_date</code>, <code>return_date</code> and <code>driver_age</code> (18–120) are required.</p>

    <h2>Sample data item</h2>
    <div class="code-box">{
  "vehicleId": "&lt;vehicleId&gt;",
  "displayName": "&lt;vehicle name&gt;",
  "category": "&lt;category&gt;",
  "imageUrl": "&lt;image URL or null&gt;",
  "companyName": "${safeName}",
  "specifications": {
    "seats": 5,
    "doors": 4,
    "fuel": "PETROL",
    "transmission": "AUTOMATIC",
    "airConditioning": true,
    "suitcases": 2
  },
  "includedFeatures": ["Basic Insurance", "Limited 250 km/day"],
  "fuelPolicy": "Same to same",
  "deliveryPolicy": "Counter pickup at branch",
  "mileagePolicy": "Limited 250 km/day",
  "mileage": 250,
  "includedKmPerDay": 250,
  "extraKmPrice": 0.5,
  "excess": 1500,
  "freeCancellation": true,
  "instantConfirmation": true,
  "pricing": {
    "currency": "${currency}",
    "durationDays": 2,
    "dailyRate": 350,
    "totalPrice": 700
  },
  "securityDeposit": {
    "amount": 1000,
    "currency": "${currency}",
    "required": true,
    "refundable": true,
    "collectedAt": "PICKUP",
    "policy": "Refundable card hold collected at pickup and released after return under the rental terms."
  },
  "availableExtras": []
}</div>
    <div class="page-meta"><span>${safeUpper} • INTEGRATION GUIDE</span><span>05</span></div>
  </div>

  <!-- PAGE 6 -->
  <div class="page">
    ${headerHtml("06")}
    <div class="eyebrow">06 / PRICE</div>
    <h1>Quote selected extras</h1>
    <p>Get the authoritative retail amount before confirming with your customer.</p>

    <h2>POST /quote • read scope • HTTP 200</h2>
    <div class="code-box">{
  "pickup_location": "RUH",
  "return_location": "RUH",
  "pickup_date": "2026-12-01",
  "return_date": "2026-12-03",
  "pickup_time": "10:00",
  "return_time": "10:00",
  "driver_age": 30,
  "vehicle_id": "&lt;vehicleId from availability&gt;",
  "selected_extras": []
}</div>

    <h2>Sample response</h2>
    <div class="code-box">{
  "vehicleId": "&lt;vehicleId&gt;",
  "durationDays": 2,
  "selectedExtras": [],
  "pricing": {
    "currency": "${currency}",
    "dailyRate": 350,
    "vehicleOnlyTotal": 700,
    "paidExtrasTotal": 0,
    "totalPrice": 700,
    "grandTotal": 700
  },
  "securityDeposit": {
    "amount": 1000,
    "currency": "${currency}",
    "required": true,
    "refundable": true,
    "collectedAt": "PICKUP",
    "policy": "Refundable card hold collected at pickup and released after return under the rental terms."
  }
}</div>
    <div class="page-meta"><span>${safeUpper} • INTEGRATION GUIDE</span><span>06</span></div>
  </div>

  <!-- PAGE 7 -->
  <div class="page">
    ${headerHtml("07")}
    <div class="eyebrow">07 / RESERVE</div>
    <h1>Create a booking</h1>
    <p>Use the approved quote total and a stable booking identifier generated by your system.</p>

    <h2>POST /bookings • book scope • HTTP 201</h2>
    <div class="code-box">{
  "pickup_location": "RUH",
  "return_location": "RUH",
  "pickup_date": "2026-12-01",
  "return_date": "2026-12-03",
  "pickup_time": "10:00",
  "return_time": "10:00",
  "driver_age": 30,
  "vehicle_id": "&lt;vehicleId from availability&gt;",
  "selected_extras": [],
  "external_booking_id": "partner-booking-unique-001",
  "expected_total": 700,
  "currency": "${currency}",
  "customer": {
    "first_name": "Alex",
    "last_name": "Morgan",
    "email": "customer@example.com",
    "phone": "+966500000000",
    "country_of_residence": "SA",
    "flight_number": "SV123"
  }
}</div>
    <p>Customer <code>first_name</code>, <code>last_name</code>, <code>email</code>, international <code>phone</code> and <code>country_of_residence</code> are required.</p>
    <div class="page-meta"><span>${safeUpper} • INTEGRATION GUIDE</span><span>07</span></div>
  </div>

  <!-- PAGE 8 -->
  <div class="page">
    ${headerHtml("08")}
    <div class="eyebrow">08 / MANAGE</div>
    <h1>Read &amp; cancel</h1>
    <p>Use the external ID that your own website assigned to the booking.</p>

    <h2>POST booking / GET lookup response</h2>
    <div class="code-box">{
  "bookingReference": "RSV-2026-0001",
  "externalBookingId": "partner-booking-unique-001",
  "status": "CONFIRMED",
  "companyName": "${safeName}",
  "vehicleId": "&lt;vehicle id&gt;",
  "pickupLocation": "RUH",
  "rentalDurationDays": 2,
  "pricing": {
    "currency": "${currency}",
    "dailyRate": 350,
    "vehicleOnlyTotal": 700,
    "paidExtrasTotal": 0,
    "totalPrice": 700,
    "grandTotal": 700
  },
  "selectedExtras": [],
  "cancelledAt": null
}</div>

    <h2>GET /bookings/{externalBookingId} • read scope • HTTP 200</h2>
    <p>Returns current booking status and pricing. Another partner's booking returns 404.</p>

    <h2>POST /bookings/{externalBookingId}/cancel • cancel scope • HTTP 200</h2>
    <div class="code-box">{
  "reason": "Customer requested cancellation"
}</div>
    <div class="page-meta"><span>${safeUpper} • INTEGRATION GUIDE</span><span>08</span></div>
  </div>

  <!-- PAGE 9 -->
  <div class="page">
    ${headerHtml("09")}
    <div class="eyebrow">09 / RECOVERY</div>
    <h1>Handle errors</h1>
    <p>Use HTTP status for broad handling and <code>error.code</code> for the specific response.</p>
    <div class="code-box">{
  "success": false,
  "error": {
    "code": "PRICE_CHANGED",
    "message": "The retail total or currency changed. Refresh availability and get customer approval before retrying."
  },
  "meta": {
    "requestId": "request-example",
    "timestamp": "2026-11-09T12:00:00.000Z"
  }
}</div>
    <p><strong>400</strong> · VALIDATION_ERROR, INVALID_LOCATION, INVALID_RENTAL_PERIOD, EXPECTED_PRICE_REQUIRED, IDEMPOTENCY_KEY_MISMATCH</p>
    <p><strong>401</strong> · PARTNER_AUTH_REQUIRED, INVALID_PARTNER_API_KEY</p>
    <p><strong>403</strong> · PARTNER_SUSPENDED, INSUFFICIENT_PARTNER_SCOPE</p>
    <p><strong>404</strong> · PARTNER_BOOKING_NOT_FOUND, VEHICLE_NOT_FOUND</p>
    <p><strong>409</strong> · PRICE_CHANGED, VEHICLE_UNAVAILABLE, IDEMPOTENCY_KEY_REUSED</p>
    <p><strong>429</strong> · PARTNER_RATE_LIMIT</p>
    <div class="page-meta"><span>${safeUpper} • INTEGRATION GUIDE</span><span>09</span></div>
  </div>

  <!-- PAGE 10 -->
  <div class="page">
    ${headerHtml("10")}
    <div class="eyebrow">10 / GO LIVE</div>
    <h1>Production setup</h1>
    <p>Production credentials are issued separately for each distribution website. Store the key on your server, never in a browser app.</p>
    <p>Call <code>GET ${safeBaseUrl}/ping</code> and confirm <code>data.environment</code> is <code>production</code>. Then fetch current locations and vehicles, and use the IDs returned by current availability and quote responses.</p>
    <div class="page-meta"><span>${safeUpper} • INTEGRATION GUIDE</span><span>10</span></div>
  </div>

  <script>
    window.addEventListener("load", function () {
      setTimeout(function () { window.print(); }, 250);
    });
  </script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=1024,height=768");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}
