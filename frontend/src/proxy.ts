import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { getMarkdownForPath } from "./lib/agent/siteMarkdown";

const handleI18nRouting = createMiddleware(routing);

/**
 * Next.js 16 request proxy entrypoint.
 * Serves Markdown for AI agents when Accept: text/markdown is requested on public pages,
 * and handles `/en` (default at `/`) and `/ar` locale routing.
 */
export function proxy(request: NextRequest) {
  const accept = request.headers.get("accept") || "";
  if (accept.includes("text/markdown")) {
    const md = getMarkdownForPath(request.nextUrl.pathname);
    if (md) {
      return new NextResponse(md, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          Vary: "Accept",
        },
      });
    }
  }
  return handleI18nRouting(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
