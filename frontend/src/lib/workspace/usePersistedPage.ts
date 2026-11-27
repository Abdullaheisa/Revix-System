"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setRoutePage } from "@/store/slices/workspaceSlice";
import { normalizePage } from "./pagination";

/**
 * Persists table pagination across sub-page navigation, browser Back/Forward,
 * and full page refreshes (F5) by syncing Redux `pageByRoute` with `?page=N`.
 */
export function usePersistedPage(routeKey: string): [number, (nextPage: number) => void] {
  const dispatch = useAppDispatch();
  const savedPage = useAppSelector(
    (state) => state.workspace.pageByRoute[routeKey] ?? 1,
  );

  const searchParams = useSearchParams();
  const urlPageParam = searchParams.get("page");
  const lastUrlParamRef = useRef<string | null | undefined>(undefined);

  // Sync from URL only on initial mount or when the URL query param genuinely changes
  // (e.g., browser Back/Forward), never overwriting an in-app setPage() call.
  useEffect(() => {
    if (lastUrlParamRef.current === urlPageParam) return;
    lastUrlParamRef.current = urlPageParam;
    if (urlPageParam !== null) {
      const urlPage = normalizePage(urlPageParam);
      if (savedPage !== urlPage) {
        dispatch(setRoutePage({ routeKey, page: urlPage }));
      }
    }
  }, [routeKey, dispatch, urlPageParam, savedPage]);

  const setPage = useCallback(
    (nextPage: number) => {
      const safePage = normalizePage(nextPage);
      const nextParam = safePage <= 1 ? null : String(safePage);
      lastUrlParamRef.current = nextParam;
      dispatch(setRoutePage({ routeKey, page: safePage }));

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (safePage <= 1) {
          url.searchParams.delete("page");
        } else {
          url.searchParams.set("page", String(safePage));
        }
        window.history.replaceState(
          window.history.state,
          "",
          url.pathname + url.search + url.hash,
        );
      }
    },
    [routeKey, dispatch],
  );

  return [savedPage, setPage];
}
