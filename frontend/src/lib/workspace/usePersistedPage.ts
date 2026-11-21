"use client";

import { useCallback, useEffect } from "react";
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
  const page = normalizePage(searchParams.get("page"));

  // The URL also handles Back to page 1, where the page parameter is absent.
  useEffect(() => {
    if (savedPage !== page) dispatch(setRoutePage({ routeKey, page }));
  }, [routeKey, dispatch, page, savedPage]);

  const setPage = useCallback(
    (nextPage: number) => {
      const safePage = normalizePage(nextPage);
      dispatch(setRoutePage({ routeKey, page: safePage }));

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (safePage <= 1) {
          url.searchParams.delete("page");
        } else {
          url.searchParams.set("page", String(safePage));
        }
        window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
      }
    },
    [routeKey, dispatch],
  );

  return [page, setPage];
}
