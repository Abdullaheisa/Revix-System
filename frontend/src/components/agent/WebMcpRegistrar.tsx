"use client";

import { useEffect } from "react";

interface WebMcpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args?: Record<string, unknown>) => Promise<unknown> | unknown;
}

interface ModelContextLike {
  registerTool?: (tool: WebMcpToolDefinition) => void;
}

declare global {
  interface Navigator {
    modelContext?: ModelContextLike;
  }
}

export function WebMcpRegistrar() {
  useEffect(() => {
    const modelContext =
      typeof navigator !== "undefined" ? navigator.modelContext : undefined;
    if (!modelContext || typeof modelContext.registerTool !== "function") {
      return;
    }

    const tools: WebMcpToolDefinition[] = [
      {
        name: "get_platform_overview",
        description:
          "Get an overview of Revix System capabilities, departments (CRM, Operations, Finance, Asset, Sales), and public endpoints.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        execute: () => ({
          name: "Revix System",
          vendor: "Revix Mobility",
          url: "https://system.revixmobility.com",
          departments: ["CRM", "Operations", "Finance", "Asset", "Sales"],
          links: {
            about: "https://system.revixmobility.com/about",
            contact: "https://system.revixmobility.com/contact",
            terms: "https://system.revixmobility.com/terms",
            privacy: "https://system.revixmobility.com/privacy",
            llmsTxt: "https://system.revixmobility.com/llms.txt",
            mcpServerCard:
              "https://system.revixmobility.com/.well-known/mcp/server-card.json",
          },
        }),
      },
      {
        name: "get_contact_info",
        description:
          "Retrieve official support and contact information for Revix Mobility.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        execute: () => ({
          organization: "Revix Mobility",
          email: "support@revixmobility.com",
          contactPage: "https://system.revixmobility.com/contact",
          languages: ["en", "ar"],
        }),
      },
      {
        name: "navigate_to_section",
        description:
          "Scroll to a specific section on the Revix System homepage (platform, networks, integrations, plans, faq).",
        inputSchema: {
          type: "object",
          properties: {
            section: {
              type: "string",
              enum: ["platform", "networks", "integrations", "plans", "faq"],
            },
          },
          required: ["section"],
        },
        execute: (args) => {
          const section = typeof args?.section === "string" ? args.section : "";
          const el = section ? document.getElementById(section) : null;
          if (el) {
            el.scrollIntoView({ behavior: "smooth" });
            return { navigated: true, section };
          }
          return { navigated: false, section };
        },
      },
    ];

    for (const tool of tools) {
      try {
        modelContext.registerTool(tool);
      } catch {
        // Ignore duplicate registration on hot reload or strict browsers
      }
    }
  }, []);

  return null;
}
