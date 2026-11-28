import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET() {
  const card = {
    $schema: "https://modelcontextprotocol.io/schemas/server-card/sep-1649.json",
    name: "revix-system",
    displayName: "Revix System",
    version: "1.0.0",
    description:
      "Multi-branch car rental & fleet operations ERP platform by Revix Mobility.",
    vendor: {
      name: "Revix Mobility",
      url: "https://system.revixmobility.com",
      email: "support@revixmobility.com",
    },
    endpoint: "https://system.revixmobility.com/api/mcp",
    transport: {
      type: "streamable-http",
      url: "https://system.revixmobility.com/api/mcp",
    },
    capabilities: {
      tools: { listChanged: false },
      resources: { subscribe: false, listChanged: false },
      prompts: { listChanged: false },
    },
    documentationUrl: "https://system.revixmobility.com/llms.txt",
    termsOfServiceUrl: "https://system.revixmobility.com/terms",
    privacyPolicyUrl: "https://system.revixmobility.com/privacy",
  };

  return NextResponse.json(card, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
