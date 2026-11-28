const BASE_URL = "https://system.revixmobility.com";

const PAGE_MARKDOWN: Record<string, string> = {
  "/": `# Revix System — Car Rental & Fleet Operations ERP

Revix System by **Revix Mobility** is a multi-branch car rental and fleet operations platform built for rental agencies, leasing companies, and partner networks.

## Core Departments & Capabilities

- **CRM**: Customer directory, ID & license records, rental history, and bilingual contract terms.
- **Operations**: Fleet readiness, inter-branch vehicle movements, driver assignments, and rental calendar.
- **Finance**: Purchase orders (PO), vendor directory, insurance policies, price lists, and multi-currency branch balances.
- **Asset**: Vehicle asset registry, variants, models, body styles, colors, and vehicle photo catalog.
- **Sales**: Rental contracts, booking timeline, duration-band pricing, and rental inclusions.

## Public Links

- [About Revix](${BASE_URL}/about)
- [Contact](${BASE_URL}/contact)
- [Terms of Service](${BASE_URL}/terms)
- [Privacy Policy](${BASE_URL}/privacy)
- [Sign In](${BASE_URL}/login)
- [Create Account](${BASE_URL}/signup)
- [llms.txt](${BASE_URL}/llms.txt)
- [MCP Server Card](${BASE_URL}/.well-known/mcp/server-card.json)

## Contact

- Email: support@revixmobility.com
- Website: ${BASE_URL}
`,
  "/about": `# About Revix Mobility

Revix System is built by Revix Mobility to unify car rental operations, fleet asset management, purchasing, and multi-branch finance in a single workspace.

- Website: ${BASE_URL}
- Contact: support@revixmobility.com
`,
  "/contact": `# Contact Revix Mobility

- Support Email: support@revixmobility.com
- Website: ${BASE_URL}
- Legal: [Terms of Service](${BASE_URL}/terms) | [Privacy Policy](${BASE_URL}/privacy)
`,
  "/terms": `# Terms of Service — Revix System

These Terms of Service govern access to and use of the Revix System platform at ${BASE_URL}.

For questions, contact support@revixmobility.com.
`,
  "/privacy": `# Privacy Policy — Revix System

Revix Mobility respects tenant data isolation and processes company, fleet, and customer records strictly for authorized workspace operations.

For privacy inquiries, contact support@revixmobility.com.
`,
};

export function getMarkdownForPath(pathname: string): string | null {
  const clean = pathname.replace(/^\/(en|ar)(?=\/|$)/, "") || "/";
  return PAGE_MARKDOWN[clean] ?? null;
}
