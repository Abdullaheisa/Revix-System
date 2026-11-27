"use client";

import { useEffect, useRef, useState } from "react";
import type { ContractVoucherType, RentalContractDto } from "@/store/api/fleetApi";
import { RevixIcon } from "@/components/ui/RevixIcons";

interface ContractActionsMenuProps {
  contract: RentalContractDto;
  isRtl: boolean;
  onPrintContract: (contract: RentalContractDto) => void;
  onOpenVoucher: (contract: RentalContractDto, type: ContractVoucherType) => void;
  onCompleteContract: (contract: RentalContractDto) => void;
  onCancelContract: (contract: RentalContractDto) => void;
}

export function ContractActionsMenu({
  contract,
  isRtl,
  onPrintContract,
  onOpenVoucher,
  onCompleteContract,
  onCancelContract,
}: ContractActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleClose(e: MouseEvent) {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        btnRef.current &&
        !btnRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handleScroll() {
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClose);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClose);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  function toggleMenu() {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const menuWidth = 192;
      const spaceBelow = window.innerHeight - rect.bottom;
      const estimatedHeight = contract.status === "active" ? 260 : 180;
      const top =
        spaceBelow < estimatedHeight
          ? Math.max(8, rect.top - estimatedHeight - 4)
          : rect.bottom + 4;
      const left = isRtl
        ? Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.left))
        : Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth));
      setCoords({ top, left });
    }
    setOpen(true);
  }

  return (
    <div className="inline-flex justify-center">
      <button
        ref={btnRef}
        type="button"
        onClick={toggleMenu}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={isRtl ? "إجراءات العقد" : "Contract actions"}
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-revix-border bg-white text-revix-secondary transition-colors hover:border-revix-primary/40 hover:bg-revix-surface hover:text-revix-dark"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>

      {open && coords && (
        <div
          ref={menuRef}
          role="menu"
          dir={isRtl ? "rtl" : "ltr"}
          style={{ top: coords.top, left: coords.left }}
          className="fixed z-50 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 text-xs shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onPrintContract(contract);
            }}
            className="flex w-full cursor-pointer items-center gap-2 px-3.5 py-2 text-start font-semibold text-slate-800 hover:bg-slate-50"
          >
            <RevixIcon name="file-text" size={14} className="text-slate-500" />
            <span>{isRtl ? "طباعة / توقيع" : "Print / Sign"}</span>
          </button>

          <div className="my-1 border-t border-slate-100" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenVoucher(contract, "receipt");
            }}
            className="flex w-full cursor-pointer items-center gap-2 px-3.5 py-2 text-start font-medium text-emerald-800 hover:bg-emerald-50/70"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>{isRtl ? "سند قبض" : "Receipt Voucher"}</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenVoucher(contract, "payment");
            }}
            className="flex w-full cursor-pointer items-center gap-2 px-3.5 py-2 text-start font-medium text-amber-800 hover:bg-amber-50/70"
          >
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>{isRtl ? "سند دفع" : "Payment Voucher"}</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenVoucher(contract, "refund");
            }}
            className="flex w-full cursor-pointer items-center gap-2 px-3.5 py-2 text-start font-medium text-rose-700 hover:bg-rose-50/70"
          >
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span>{isRtl ? "سند مرتجع" : "Refund Voucher"}</span>
          </button>

          {contract.status === "active" && (
            <>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onCompleteContract(contract);
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3.5 py-2 text-start font-semibold text-revix-primary hover:bg-emerald-50/70"
              >
                <RevixIcon name="check" size={14} />
                <span>{isRtl ? "استلام وإغلاق" : "Return & Close"}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onCancelContract(contract);
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3.5 py-2 text-start font-semibold text-rose-600 hover:bg-rose-50"
              >
                <RevixIcon name="x" size={14} />
                <span>{isRtl ? "إلغاء العقد" : "Cancel Contract"}</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
