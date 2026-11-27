export function navigateBackOrFallback(
  router: { back: () => void; push: (href: string) => void },
  fallbackHref: string,
): void {
  if (typeof window !== "undefined") {
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    const hasHistory =
      typeof idx === "number" ? idx > 0 : window.history.length > 1;
    if (hasHistory) {
      router.back();
      return;
    }
  }
  router.push(fallbackHref);
}
