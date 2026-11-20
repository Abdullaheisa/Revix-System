"use client";

import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setRoutePage } from "@/store/slices/workspaceSlice";

/**
 * Persists table pagination across sub-page navigation, browser Back/Forward,
 * and full page refreshes (F5) by syncing Redux `pageByRoute` with `?page=N`.
 */
export function usePersistedPage(routeKey: string): [number, (nextPage: number) => void] {
  const dispatch = useAppDispatch();
  const page = useAppSelector(
    (state) => state.workspace.pageByRoute[routeKey] ?? 1,
  );

  // Sync from URL `?page=` on mount and browser popstate
  useEffect(() => {
    const syncFromUrl = () => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const raw = params.get("page");
      if (raw) {
        const parsed = Number.parseInt(raw, 10);
        if (Number.isFinite(parsed) && parsed >= 1 && parsed !== page) {
          dispatch(setRoutePage({ routeKey, page: parsed }));
        }
      }
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [routeKey, dispatch]);

  const setPage = useCallback(
    (nextPage: number) => {
      const safePage = Math.max(1, Math.floor(nextPage));
      dispatch(setRoutePage({ routeKey, page: safePage }));

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (safePage <= 1) {
          url.searchParams.delete("page");
        } else {
          url.searchParams.set("page", String(safePage));
        }
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      }
    },
    [routeKey, dispatch],
  );

  return [page, setPage];
}
