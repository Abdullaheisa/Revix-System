"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { RevixIcon } from "@/components/ui/RevixIcons";
import {
  useUpdateCompanyMutation,
  type CompanyDto,
} from "@/store/api/workspaceApi";
import {
  DEFAULT_CONTRACT_TERMS_AR,
  DEFAULT_CONTRACT_TERMS_EN,
} from "@/lib/constants/contractTerms";

export interface ContractTermsSettingsPanelProps {
  isRtl: boolean;
  company: CompanyDto;
}

interface TermClauseItem {
  id: string;
  ar: string;
  en: string;
}

function parseLines(raw?: string | null, fallback = ""): string[] {
  const source = raw?.trim() ? raw : fallback;
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildInitialClauses(company: CompanyDto): TermClauseItem[] {
  const arLines = parseLines(company.contractTermsAr, DEFAULT_CONTRACT_TERMS_AR);
  const enLines = parseLines(company.contractTermsEn, DEFAULT_CONTRACT_TERMS_EN);
  const count = Math.max(arLines.length, enLines.length);

  return Array.from({ length: count }, (_, i) => ({
    id: `term-${i + 1}`,
    ar: arLines[i] ?? "",
    en: enLines[i] ?? "",
  }));
}

function serializeClauses(clauses: TermClauseItem[]): { ar: string; en: string } {
  return {
    ar: clauses
      .map((c) => c.ar.replace(/\r?\n/g, " ").trim())
      .filter(Boolean)
      .join("\n"),
    en: clauses
      .map((c) => c.en.replace(/\r?\n/g, " ").trim())
      .filter(Boolean)
      .join("\n"),
  };
}

interface AutoResizeTextareaProps {
  id: string;
  dir: "rtl" | "ltr";
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

function AutoResizeTextarea({
  id,
  dir,
  value,
  placeholder,
  onChange,
}: AutoResizeTextareaProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 64)}px`;
  }, [value]);

  useEffect(() => {
    const handleResize = () => {
      const el = ref.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${Math.max(el.scrollHeight, 64)}px`;
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <textarea
      ref={ref}
      id={id}
      rows={2}
      dir={dir}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[13px] leading-6 text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-0"
    />
  );
}

export function ContractTermsSettingsPanel({
  isRtl,
  company,
}: ContractTermsSettingsPanelProps) {
  const [updateCompany, { isLoading: isSaving }] = useUpdateCompanyMutation();

  const [clauses, setClauses] = useState<TermClauseItem[]>(() =>
    buildInitialClauses(company),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [compactMode, setCompactMode] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [savedNotice, setSavedNotice] = useState<string | undefined>();
  const [errorNotice, setErrorNotice] = useState<string | undefined>();

  const baselineSerialized = useMemo(() => {
    const initial = buildInitialClauses(company);
    return serializeClauses(initial);
  }, [company]);

  const currentSerialized = useMemo(() => serializeClauses(clauses), [clauses]);

  const isDirty =
    currentSerialized.ar !== baselineSerialized.ar ||
    currentSerialized.en !== baselineSerialized.en;

  const filteredClauses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return clauses
      .map((clause, index) => ({ clause, index }))
      .filter(({ clause, index }) => {
        if (!q) return true;
        return (
          clause.ar.toLowerCase().includes(q) ||
          clause.en.toLowerCase().includes(q) ||
          `${index + 1}`.includes(q)
        );
      });
  }, [clauses, searchQuery]);

  function handleAddClause(insertAt?: number) {
    const newItem: TermClauseItem = {
      id: `term-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ar: "",
      en: "",
    };
    setClauses((prev) => {
      if (typeof insertAt === "number") {
        const next = [...prev];
        next.splice(insertAt + 1, 0, newItem);
        return next;
      }
      return [...prev, newItem];
    });
    if (compactMode) {
      setExpandedIds((prev) => ({ ...prev, [newItem.id]: true }));
    }
  }

  function handleUpdateClause(id: string, field: "ar" | "en", value: string) {
    setClauses((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  function handleRemoveClause(id: string) {
    setClauses((prev) => prev.filter((item) => item.id !== id));
  }

  function handleMoveClause(index: number, direction: -1 | 1) {
    setClauses((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const temp = next[index]!;
      next[index] = next[target]!;
      next[target] = temp;
      return next;
    });
  }

  function handleRestoreDefaults() {
    const arLines = parseLines(DEFAULT_CONTRACT_TERMS_AR);
    const enLines = parseLines(DEFAULT_CONTRACT_TERMS_EN);
    const count = Math.max(arLines.length, enLines.length);
    setClauses(
      Array.from({ length: count }, (_, i) => ({
        id: `term-default-${i + 1}-${Date.now()}`,
        ar: arLines[i] ?? "",
        en: enLines[i] ?? "",
      })),
    );
    setSearchQuery("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavedNotice(undefined);
    setErrorNotice(undefined);

    const { ar: cleanAr, en: cleanEn } = currentSerialized;

    try {
      await updateCompany({
        name: company.name,
        legalName: company.legalName,
        logoUrl: company.logoUrl ?? null,
        brandColor: company.brandColor,
        phone: company.phone,
        email: company.email,
        countryCode: company.countryCode,
        city: company.city,
        address: company.address,
        postalCode: company.postalCode,
        baseCurrency: company.baseCurrency,
        timezone: company.timezone,
        businessRegNumber: company.businessRegNumber,
        taxRegNumber: company.taxRegNumber,
        operatingMode:
          company.operatingMode === "network_main" ? "network_main" : "independent",
        contractTermsAr: cleanAr || null,
        contractTermsEn: cleanEn || null,
      }).unwrap();

      setSavedNotice(
        isRtl
          ? "تم حفظ شروط وأحكام العقود بنجاح."
          : "Contract terms & conditions saved successfully.",
      );
    } catch {
      setErrorNotice(
        isRtl
          ? "تعذر حفظ الشروط والأحكام."
          : "Unable to save contract terms.",
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 pb-12"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-revix-border pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
              {isRtl ? "شروط وأحكام عقد الإيجار" : "Contract Terms & Conditions"}
            </h1>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-slate-700">
              {isRtl ? `${clauses.length} بند` : `${clauses.length} clauses`}
            </span>
            {isDirty && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {isRtl ? "تغييرات غير محفوظة" : "Unsaved changes"}
              </span>
            )}
          </div>
          <p className="text-xs leading-relaxed text-revix-secondary">
            {isRtl
              ? "أضف ورتّب كل بند بالعربية والإنجليزية. تظهر البنود مرقّمة ومنسّقة تلقائياً في صفحة الشروط عند طباعة العقد."
              : "Manage and order each bilingual clause. Clauses are automatically numbered and formatted on the printed contract."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleRestoreDefaults}
            className="gap-1.5"
          >
            <RevixIcon name="refresh-cw" size={14} />
            <span>{isRtl ? "استعادة الافتراضي" : "Restore Defaults"}</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleAddClause()}
            className="gap-1.5"
          >
            <RevixIcon name="plus" size={14} />
            <span>{isRtl ? "إضافة بند" : "Add Clause"}</span>
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSaving}
            className="rounded-xl px-5"
          >
            {isSaving
              ? isRtl
                ? "جاري الحفظ..."
                : "Saving..."
              : isRtl
                ? "حفظ الشروط"
                : "Save Terms"}
          </Button>
        </div>
      </div>

      {savedNotice && (
        <Alert
          variant="success"
          message={savedNotice}
          onClose={() => setSavedNotice(undefined)}
        />
      )}
      {errorNotice && (
        <Alert
          variant="error"
          message={errorNotice}
          onClose={() => setErrorNotice(undefined)}
        />
      )}

      {/* Search & View Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-2xs">
        <div className="relative min-w-[220px] flex-1">
          <RevixIcon
            name="search"
            size={15}
            className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 ${
              isRtl ? "right-3" : "left-3"
            }`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isRtl
                ? "ابحث في البنود بالعربية أو الإنجليزية أو برقم البند..."
                : "Search clauses in Arabic, English, or by number..."
            }
            className={`h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 text-xs text-slate-800 placeholder:text-slate-400 focus:border-revix-primary focus:bg-white focus:outline-hidden ${
              isRtl ? "pr-9 pl-3" : "pl-9 pr-3"
            }`}
          />
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setCompactMode(false)}
            className={`cursor-pointer rounded-lg px-3 py-1.5 font-medium transition-colors ${
              !compactMode
                ? "bg-white text-revix-dark shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {isRtl ? "تحرير كامل" : "Full Editor"}
          </button>
          <button
            type="button"
            onClick={() => {
              setCompactMode(true);
              setExpandedIds({});
            }}
            className={`cursor-pointer rounded-lg px-3 py-1.5 font-medium transition-colors ${
              compactMode
                ? "bg-white text-revix-dark shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {isRtl ? "عرض مضغوط" : "Compact"}
          </button>
        </div>
      </div>

      {/* Clauses List */}
      {clauses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
          <RevixIcon name="file-text" size={28} className="mx-auto text-slate-300" />
          <p className="mt-2 text-sm font-medium text-slate-700">
            {isRtl ? "لا توجد شروط مضافة حالياً" : "No clauses added yet"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {isRtl
              ? "ابدأ بإضافة بند جديد أو استعادة الشروط الافتراضية."
              : "Add a new clause or restore the default terms to get started."}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button type="button" variant="secondary" onClick={handleRestoreDefaults}>
              {isRtl ? "استعادة الافتراضي" : "Restore Defaults"}
            </Button>
            <Button type="button" variant="primary" onClick={() => handleAddClause()}>
              {isRtl ? "إضافة بند جديد" : "Add Clause"}
            </Button>
          </div>
        </div>
      ) : filteredClauses.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-10 text-center text-xs text-slate-500">
          {isRtl
            ? `لا توجد بنود مطابقة للبحث «${searchQuery}».`
            : `No clauses match "${searchQuery}".`}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClauses.map(({ clause, index }) => {
            const isExpanded = !compactMode || Boolean(expandedIds[clause.id]);
            const missingAr = !clause.ar.trim();
            const missingEn = !clause.en.trim();
            const isFiltering = Boolean(searchQuery.trim());

            return (
              <div
                key={clause.id}
                className="group overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs transition-all focus-within:border-revix-primary/60 focus-within:ring-2 focus-within:ring-revix-primary/10 hover:border-slate-300"
              >
                {/* Clause Card Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/75 px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-revix-primary/10 px-2 font-mono text-xs font-bold text-revix-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">
                      {isRtl ? `البند رقم ${index + 1}` : `Clause #${index + 1}`}
                    </span>

                    {(missingAr || missingEn) && (
                      <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        {missingAr && missingEn
                          ? isRtl
                            ? "بند فارغ"
                            : "Empty clause"
                          : missingAr
                            ? isRtl
                              ? "ينقصه النص العربي"
                              : "Missing Arabic"
                            : isRtl
                              ? "ينقصه النص الإنجليزي"
                              : "Missing English"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {compactMode && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedIds((prev) => ({
                            ...prev,
                            [clause.id]: !prev[clause.id],
                          }))
                        }
                        className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                      >
                        {isExpanded
                          ? isRtl
                            ? "طي"
                            : "Collapse"
                          : isRtl
                            ? "تعديل"
                            : "Edit"}
                      </button>
                    )}

                    {!isFiltering && (
                      <>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveClause(index, -1)}
                          title={isRtl ? "تحريك لأعلى" : "Move up"}
                          aria-label={isRtl ? "تحريك البند لأعلى" : "Move clause up"}
                          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <RevixIcon name="chevron-up" size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={index === clauses.length - 1}
                          onClick={() => handleMoveClause(index, 1)}
                          title={isRtl ? "تحريك لأسفل" : "Move down"}
                          aria-label={isRtl ? "تحريك البند لأسفل" : "Move clause down"}
                          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <RevixIcon name="chevron-down" size={14} />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => handleAddClause(index)}
                      title={isRtl ? "إضافة بند بعد هذا البند" : "Insert clause below"}
                      aria-label={isRtl ? "إضافة بند بعد هذا البند" : "Insert clause below"}
                      className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-revix-primary/40 hover:bg-emerald-50 hover:text-revix-primary"
                    >
                      <RevixIcon name="plus" size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveClause(clause.id)}
                      title={isRtl ? "حذف البند" : "Delete clause"}
                      aria-label={isRtl ? "حذف البند" : "Delete clause"}
                      className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <RevixIcon name="trash-2" size={13} />
                    </button>
                  </div>
                </div>

                {/* Clause Content */}
                {isExpanded ? (
                  <div className="grid grid-cols-1 divide-y divide-slate-100 lg:grid-cols-2 lg:divide-y-0 lg:divide-x lg:rtl:divide-x-reverse">
                    {/* Arabic Side */}
                    <div className="p-4 transition-colors focus-within:bg-emerald-50/20">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <label
                          htmlFor={`${clause.id}-ar`}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700"
                        >
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                            AR
                          </span>
                          <span>{isRtl ? "النص بالعربية" : "Arabic Text"}</span>
                        </label>
                        <span className="font-mono text-[10px] text-slate-400">
                          {clause.ar.length}
                        </span>
                      </div>
                      <AutoResizeTextarea
                        id={`${clause.id}-ar`}
                        dir="rtl"
                        value={clause.ar}
                        onChange={(val) => handleUpdateClause(clause.id, "ar", val)}
                        placeholder={
                          isRtl
                            ? "اكتب نص البند بالعربية..."
                            : "Enter Arabic clause text..."
                        }
                      />
                    </div>

                    {/* English Side */}
                    <div className="p-4 transition-colors focus-within:bg-slate-50/60">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <label
                          htmlFor={`${clause.id}-en`}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700"
                        >
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                            EN
                          </span>
                          <span>{isRtl ? "النص بالإنجليزية" : "English Text"}</span>
                        </label>
                        <span className="font-mono text-[10px] text-slate-400">
                          {clause.en.length}
                        </span>
                      </div>
                      <AutoResizeTextarea
                        id={`${clause.id}-en`}
                        dir="ltr"
                        value={clause.en}
                        onChange={(val) => handleUpdateClause(clause.id, "en", val)}
                        placeholder={
                          isRtl
                            ? "اكتب نص البند بالإنجليزية..."
                            : "Enter English clause text..."
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() =>
                      setExpandedIds((prev) => ({ ...prev, [clause.id]: true }))
                    }
                    className="grid cursor-pointer grid-cols-1 gap-3 px-4 py-3 transition-colors hover:bg-slate-50/50 lg:grid-cols-2"
                  >
                    <p
                      dir="rtl"
                      className="line-clamp-2 text-xs leading-5 text-slate-700"
                    >
                      {clause.ar || (
                        <span className="italic text-slate-400">
                          {isRtl ? "بدون نص عربي" : "No Arabic text"}
                        </span>
                      )}
                    </p>
                    <p
                      dir="ltr"
                      className="line-clamp-2 text-xs leading-5 text-slate-600"
                    >
                      {clause.en || (
                        <span className="italic text-slate-400">
                          {isRtl ? "بدون نص إنجليزي" : "No English text"}
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Add Clause Action */}
      <button
        type="button"
        onClick={() => handleAddClause()}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-3.5 text-xs font-semibold text-slate-600 transition-colors hover:border-revix-primary/50 hover:bg-emerald-50/30 hover:text-revix-primary"
      >
        <RevixIcon name="plus" size={15} />
        <span>{isRtl ? "إضافة بند جديد في نهاية القائمة" : "Add New Clause at End"}</span>
      </button>

      {/* Sticky Save Bar when Unsaved Changes Exist */}
      {isDirty && (
        <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-xs">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>
              {isRtl
                ? "لديك تعديلات غير محفوظة على بنود العقد."
                : "You have unsaved changes to contract clauses."}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setClauses(buildInitialClauses(company))}
            >
              {isRtl ? "تراجع" : "Discard"}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSaving}
              className="rounded-xl px-5"
            >
              {isSaving
                ? isRtl
                  ? "جاري الحفظ..."
                  : "Saving..."
                : isRtl
                  ? "حفظ التغييرات"
                  : "Save Changes"}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
