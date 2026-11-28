"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { useTrackNavigationHistory } from "@/lib/navigationHistory";
import { makeStore } from "./store";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(makeStore);
  useTrackNavigationHistory();

  useEffect(() => {
    const sanitizeNumericInput = (e: Event) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement) || target.type !== "number") return;
      if (/^0+\d/.test(target.value)) {
        target.value = target.value.replace(/^0+(?=\d)/, "");
      }
    };

    document.addEventListener("input", sanitizeNumericInput, true);
    return () => {
      document.removeEventListener("input", sanitizeNumericInput, true);
    };
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
