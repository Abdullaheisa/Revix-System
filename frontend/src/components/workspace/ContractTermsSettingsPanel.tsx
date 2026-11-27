"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { SectionCard } from "@/components/ui/SectionCard";
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

function buildInitialClauses(company: CompanyDto): TermClauseItem[] {
  const arLines = (company.contractTermsAr?.trim()
    ? company.contractTermsAr
    : DEFAULT_CONTRACT_TERMS_AR
  )
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const enLines = (company.contractTermsEn?.trim()
    ? company.contractTermsEn
    : DEFAULT_CONTRACT_TERMS_EN
  )
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const count = Math.max(arLines.length, enLines.length);
  const items: TermClauseItem[] = [];
  for (let i = 0; i < count; i += 1) {
    items.push({
      id: `term-${i + 1}-${Date.now()}`,
      ar: arLines[i] ?? "",
      en: enLines[i] ?? "",
    });
  }
  return items;
}

export function ContractTermsSettingsPanel({
  isRtl,
  company,
}: ContractTermsSettingsPanelProps) {
  const [updateCompany, { isLoading: isSaving }] = useUpdateCompanyMutation();

  const [clauses, setClauses] = useState<TermClauseItem[]>(() =>
    buildInitialClauses(company),
  );
  const [savedNotice, setSavedNotice] = useState<string | undefined>();
  const [errorNotice, setErrorNotice] = useState<string | undefined>();

  function handleAddClause() {
    setClauses((prev) => [
      ...prev,
      { id: `term-${Date.now()}-${prev.length}`, ar: "", en: "" },
    ]);
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
    const arLines = DEFAULT_CONTRACT_TERMS_AR.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const enLines = DEFAULT_CONTRACT_TERMS_EN.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const count = Math.max(arLines.length, enLines.length);
    const next: TermClauseItem[] = [];
    for (let i = 0; i < count; i += 1) {
      next.push({
        id: `term-default-${i + 1}-${Date.now()}`,
        ar: arLines[i] ?? "",
        en: enLines[i] ?? "",
      });
    }
    setClauses(next);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavedNotice(undefined);
    setErrorNotice(undefined);

    const cleanAr = clauses
      .map((c) => c.ar.replace(/\r?\n/g, " ").trim())
      .filter(Boolean)
      .join("\n");
    const cleanEn = clauses
      .map((c) => c.en.replace(/\r?\n/g, " ").trim())
      .filter(Boolean)
      .join("\n");

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
      className="space-y-4 pb-8"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-revix-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
            {isRtl ? "شروط وأحكام عقد الإيجار" : "Contract Terms & Conditions"}
          </h1>
          <p className="mt-0.5 text-xs text-revix-secondary">
            {isRtl
              ? "أضف ورتّب كل بند على حدة بالعربية والإنجليزية ليظهر مرقماً ومنظماً في الصفحة الثانية من عقد الإيجار."
              : "Add and order each clause individually in Arabic and English. They appear numbered in Page 2 of printed contracts."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleRestoreDefaults}
          >
            {isRtl ? "استعادة الافتراضي" : "Restore Defaults"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddClause}
          >
            <RevixIcon name="plus" size={14} />
            <span>{isRtl ? "إضافة شرط جديد" : "Add Term"}</span>
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving} className="rounded-xl px-5">
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

      <SectionCard
        title={
          isRtl
            ? `بنود العقد (${clauses.length})`
            : `Contract Clauses (${clauses.length})`
        }
      >
        <div className="space-y-3">
          {clauses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-revix-border py-8 text-center text-xs text-revix-secondary">
              {isRtl
                ? "لا توجد شروط مضافة حالياً. اضغط على «إضافة شرط جديد» للبدء."
                : "No clauses added yet. Click \"Add Term\" to add your first clause."}
            </div>
          ) : (
            clauses.map((clause, index) => (
              <div
                key={clause.id}
                className="rounded-xl border border-revix-border bg-revix-surface/35 p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-0.5 font-mono text-xs font-bold text-revix-primary">
                    {isRtl ? `البند #${index + 1}` : `Clause #${index + 1}`}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveClause(index, -1)}
                      title={isRtl ? "تحريك لأعلى" : "Move up"}
                      className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-revix-border bg-white text-revix-secondary hover:bg-revix-surface disabled:opacity-40"
                    >
                      <RevixIcon name="chevron-up" size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={index === clauses.length - 1}
                      onClick={() => handleMoveClause(index, 1)}
                      title={isRtl ? "تحريك لأسفل" : "Move down"}
                      className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-revix-border bg-white text-revix-secondary hover:bg-revix-surface disabled:opacity-40"
                    >
                      <RevixIcon name="chevron-down" size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveClause(clause.id)}
                      title={isRtl ? "حذف البند" : "Delete clause"}
                      className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                    >
                      <RevixIcon name="x" size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-revix-dark">
                      {isRtl ? "النص بالعربية" : "Arabic Text"}
                    </label>
                    <textarea
                      rows={3}
                      dir="rtl"
                      value={clause.ar}
                      onChange={(e) => handleUpdateClause(clause.id, "ar", e.target.value)}
                      placeholder={isRtl ? "اكتب نص الشرط بالعربية..." : "Enter Arabic clause text..."}
                      className="w-full rounded-lg border border-revix-border bg-white p-2.5 text-xs leading-relaxed focus:border-revix-primary focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-revix-dark">
                      {isRtl ? "النص بالإنجليزية" : "English Text"}
                    </label>
                    <textarea
                      rows={3}
                      dir="ltr"
                      value={clause.en}
                      onChange={(e) => handleUpdateClause(clause.id, "en", e.target.value)}
                      placeholder={isRtl ? "اكتب نص الشرط بالإنجليزية..." : "Enter English clause text..."}
                      className="w-full rounded-lg border border-revix-border bg-white p-2.5 text-xs leading-relaxed focus:border-revix-primary focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            ))
          )}

          <div className="pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddClause}
              className="w-full justify-center border-dashed"
            >
              <RevixIcon name="plus" size={14} />
              <span>{isRtl ? "إضافة شرط جديد" : "Add New Term"}</span>
            </Button>
          </div>
        </div>
      </SectionCard>
    </form>
  );
}
