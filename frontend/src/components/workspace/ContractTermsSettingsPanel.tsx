"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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

function cellToString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).replace(/\r?\n/g, " ").trim();
  }
  if (typeof value === "object") {
    const obj = value as { richText?: Array<{ text?: string }>; text?: string; result?: unknown };
    if (Array.isArray(obj.richText)) {
      return obj.richText.map((r) => r.text ?? "").join("").replace(/\r?\n/g, " ").trim();
    }
    if (typeof obj.text === "string") {
      return obj.text.replace(/\r?\n/g, " ").trim();
    }
    if (obj.result != null) {
      return String(obj.result).replace(/\r?\n/g, " ").trim();
    }
  }
  return "";
}

function isArabicHeader(val: string): boolean {
  const s = val.toLowerCase();
  return s === "ar" || s.includes("arabic") || s.includes("عرب");
}

function isEnglishHeader(val: string): boolean {
  const s = val.toLowerCase();
  return s === "en" || s.includes("english") || s.includes("انجليز") || s.includes("إنجليز");
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
  const [savedNotice, setSavedNotice] = useState<string | undefined>();
  const [errorNotice, setErrorNotice] = useState<string | undefined>();

  // Modal state: null = closed, { mode: "add" } or { mode: "edit", clause, index }
  const [modalState, setModalState] = useState<
    | null
    | { mode: "add"; insertAfterIndex?: number }
    | { mode: "edit"; clause: TermClauseItem; index: number }
  >(null);
  const [draftAr, setDraftAr] = useState("");
  const [draftEn, setDraftEn] = useState("");
  const [modalError, setModalError] = useState<string | undefined>();

  // Excel import modal state
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [excelPreview, setExcelPreview] = useState<TermClauseItem[]>([]);
  const [excelFileName, setExcelFileName] = useState("");
  const [excelMode, setExcelMode] = useState<"replace" | "append">("replace");
  const [excelError, setExcelError] = useState<string | undefined>();
  const [isParsingExcel, setIsParsingExcel] = useState(false);

  useEffect(() => {
    setClauses(buildInitialClauses(company));
  }, [company.contractTermsAr, company.contractTermsEn]);

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

  async function persistClauses(nextClauses: TermClauseItem[], successMsg: string) {
    setSavedNotice(undefined);
    setErrorNotice(undefined);
    const { ar: cleanAr, en: cleanEn } = serializeClauses(nextClauses);

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

      setClauses(nextClauses);
      setSavedNotice(successMsg);
      return true;
    } catch {
      setErrorNotice(
        isRtl ? "تعذر حفظ التعديلات على الشروط." : "Unable to save contract terms.",
      );
      return false;
    }
  }

  function openAddModal(insertAfterIndex?: number) {
    setDraftAr("");
    setDraftEn("");
    setModalError(undefined);
    setModalState({ mode: "add", insertAfterIndex });
  }

  function openEditModal(clause: TermClauseItem, index: number) {
    setDraftAr(clause.ar);
    setDraftEn(clause.en);
    setModalError(undefined);
    setModalState({ mode: "edit", clause, index });
  }

  async function handleModalSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedAr = draftAr.replace(/\r?\n/g, " ").trim();
    const trimmedEn = draftEn.replace(/\r?\n/g, " ").trim();

    if (!trimmedAr && !trimmedEn) {
      setModalError(
        isRtl
          ? "يرجى إدخال نص البند بالعربية أو الإنجليزية على الأقل."
          : "Please enter at least Arabic or English clause text.",
      );
      return;
    }

    if (!modalState) return;

    let nextClauses: TermClauseItem[];
    if (modalState.mode === "add") {
      const newItem: TermClauseItem = {
        id: `term-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ar: trimmedAr,
        en: trimmedEn,
      };
      if (typeof modalState.insertAfterIndex === "number") {
        nextClauses = [...clauses];
        nextClauses.splice(modalState.insertAfterIndex + 1, 0, newItem);
      } else {
        nextClauses = [...clauses, newItem];
      }
    } else {
      nextClauses = clauses.map((item) =>
        item.id === modalState.clause.id
          ? { ...item, ar: trimmedAr, en: trimmedEn }
          : item,
      );
    }

    const ok = await persistClauses(
      nextClauses,
      modalState.mode === "add"
        ? isRtl
          ? "تمت إضافة البند وحفظه بنجاح."
          : "Clause added and saved."
        : isRtl
          ? "تم تعديل البند وحفظه بنجاح."
          : "Clause updated and saved.",
    );

    if (ok) {
      setModalState(null);
    }
  }

  async function handleRemoveClause(id: string) {
    const nextClauses = clauses.filter((item) => item.id !== id);
    await persistClauses(
      nextClauses,
      isRtl ? "تم حذف البند بنجاح." : "Clause deleted.",
    );
  }

  async function handleMoveClause(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= clauses.length) return;
    const nextClauses = [...clauses];
    const temp = nextClauses[index]!;
    nextClauses[index] = nextClauses[target]!;
    nextClauses[target] = temp;

    await persistClauses(
      nextClauses,
      isRtl ? "تم تحديث ترتيب البنود." : "Clause order updated.",
    );
  }

  async function handleRestoreDefaults() {
    const arLines = parseLines(DEFAULT_CONTRACT_TERMS_AR);
    const enLines = parseLines(DEFAULT_CONTRACT_TERMS_EN);
    const count = Math.max(arLines.length, enLines.length);
    const nextClauses = Array.from({ length: count }, (_, i) => ({
      id: `term-default-${i + 1}-${Date.now()}`,
      ar: arLines[i] ?? "",
      en: enLines[i] ?? "",
    }));
    setSearchQuery("");
    await persistClauses(
      nextClauses,
      isRtl ? "تمت استعادة الشروط الافتراضية وحفظها." : "Default terms restored and saved.",
    );
  }

  async function handleDownloadTemplate() {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Contract Terms");

    sheet.columns = [
      { header: "النص بالعربية (Arabic)", key: "ar", width: 65 },
      { header: "النص بالإنجليزية (English)", key: "en", width: 65 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    const source = clauses.length > 0 ? clauses : buildInitialClauses(company);
    for (const item of source) {
      sheet.addRow({ ar: item.ar, en: item.en });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "contract-terms-template.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleExcelFileChange(file: File | null) {
    setExcelError(undefined);
    setExcelPreview([]);
    setExcelFileName("");
    if (!file) return;

    setExcelFileName(file.name);
    setIsParsingExcel(true);

    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);

      const sheet = workbook.worksheets[0];
      if (!sheet) {
        setExcelError(isRtl ? "ملف الإكسيل فارغ." : "The Excel file is empty.");
        return;
      }

      const rows: string[][] = [];
      sheet.eachRow((row) => {
        const vals = [1, 2, 3].map((colIdx) => cellToString(row.getCell(colIdx).value));
        if (vals.some(Boolean)) {
          rows.push(vals);
        }
      });

      if (rows.length === 0) {
        setExcelError(isRtl ? "لم يتم العثور على بيانات في الملف." : "No rows found in the file.");
        return;
      }

      const firstRow = rows[0]!;
      let arCol = 0;
      let enCol = 1;
      let startIndex = 0;

      const foundAr = firstRow.findIndex(isArabicHeader);
      const foundEn = firstRow.findIndex(isEnglishHeader);
      if (foundAr !== -1 || foundEn !== -1) {
        arCol = foundAr !== -1 ? foundAr : 0;
        enCol = foundEn !== -1 ? foundEn : arCol === 0 ? 1 : 0;
        startIndex = 1;
      } else if (
        firstRow[0] &&
        /^(#|م|no|number|clause)/i.test(firstRow[0]) &&
        firstRow[1]
      ) {
        arCol = 1;
        enCol = 2;
        startIndex = 1;
      }

      const parsed: TermClauseItem[] = [];
      for (let i = startIndex; i < rows.length; i += 1) {
        const row = rows[i]!;
        const ar = (row[arCol] ?? "").trim();
        const en = (row[enCol] ?? "").trim();
        if (!ar && !en) continue;
        parsed.push({
          id: `term-xlsx-${Date.now()}-${i}`,
          ar,
          en,
        });
      }

      if (parsed.length === 0) {
        setExcelError(
          isRtl
            ? "لم يتم العثور على بنود صالحة في الملف."
            : "No valid clauses found in the Excel file.",
        );
        return;
      }

      setExcelPreview(parsed);
    } catch {
      setExcelError(
        isRtl
          ? "تعذر قراءة ملف الإكسيل. تأكد من أن الملف بصيغة .xlsx صالحة."
          : "Unable to read Excel file. Please ensure it is a valid .xlsx file.",
      );
    } finally {
      setIsParsingExcel(false);
    }
  }

  async function handleConfirmExcelImport() {
    if (excelPreview.length === 0) return;
    const nextClauses =
      excelMode === "append" ? [...clauses, ...excelPreview] : excelPreview;

    const ok = await persistClauses(
      nextClauses,
      isRtl
        ? `تم استيراد ${excelPreview.length} بند من ملف الإكسيل وحفظها بنجاح.`
        : `Imported and saved ${excelPreview.length} clauses from Excel.`,
    );
    if (ok) {
      setExcelModalOpen(false);
      setExcelPreview([]);
      setExcelFileName("");
    }
  }

  return (
    <div className="space-y-5 pb-10" dir={isRtl ? "rtl" : "ltr"}>
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-revix-border pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
              {isRtl ? "شروط وأحكام عقد الإيجار" : "Contract Terms & Conditions"}
            </h1>
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-revix-primary">
              {isRtl ? `${clauses.length} بند` : `${clauses.length} clauses`}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-revix-secondary">
            {isRtl
              ? "استعرض بنود العقد بصيغة ثنائية اللغة، واضغط على «تعديل» في أي بند لتحديثه في نافذة مستقلة."
              : "Review your bilingual contract clauses below. Click Edit on any clause to update it in a focused popup."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={isSaving}
            onClick={() => {
              setExcelError(undefined);
              setExcelPreview([]);
              setExcelFileName("");
              setExcelModalOpen(true);
            }}
            className="gap-1.5"
          >
            <RevixIcon name="layers" size={14} />
            <span>{isRtl ? "استيراد من Excel" : "Import Excel"}</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isSaving}
            onClick={handleRestoreDefaults}
            className="gap-1.5"
          >
            <RevixIcon name="refresh-cw" size={14} />
            <span>{isRtl ? "استعادة الافتراضي" : "Restore Defaults"}</span>
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={isSaving}
            onClick={() => openAddModal()}
            className="gap-1.5 rounded-xl px-4"
          >
            <RevixIcon name="plus" size={14} />
            <span>{isRtl ? "إضافة بند جديد" : "Add Clause"}</span>
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

      {/* Document Sheet Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {/* Document Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <RevixIcon name="file-text" size={15} className="text-revix-primary" />
            <span>{isRtl ? "وثيقة الشروط والأحكام" : "Terms & Conditions Document"}</span>
          </div>

          <div className="relative w-full sm:w-72">
            <RevixIcon
              name="search"
              size={14}
              className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                isRtl ? "right-3" : "left-3"
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isRtl ? "بحث في البنود..." : "Search clauses..."
              }
              className={`h-8 w-full rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:border-revix-primary focus:outline-hidden ${
                isRtl ? "pr-8 pl-3" : "pl-8 pr-3"
              }`}
            />
          </div>
        </div>

        {/* Column Headers (Desktop) */}
        {filteredClauses.length > 0 && (
          <div className="hidden border-b border-slate-100 bg-slate-50/40 px-5 py-2 text-[11px] font-semibold text-slate-500 lg:grid lg:grid-cols-[52px_1fr_1fr_132px] lg:gap-6">
            <div>{isRtl ? "م" : "#"}</div>
            <div>{isRtl ? "النص بالعربية" : "Arabic Clause"}</div>
            <div>{isRtl ? "النص بالإنجليزية" : "English Clause"}</div>
            <div className="text-end">{isRtl ? "الإجراءات" : "Actions"}</div>
          </div>
        )}

        {/* Clauses Rows */}
        {clauses.length === 0 ? (
          <div className="py-14 text-center">
            <RevixIcon name="file-text" size={30} className="mx-auto text-slate-300" />
            <p className="mt-2.5 text-sm font-medium text-slate-700">
              {isRtl ? "لا توجد بنود مضافة حالياً" : "No clauses added yet"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {isRtl
                ? "أضف بنداً جديداً أو استعد الشروط الافتراضية."
                : "Add a new clause or restore the default terms."}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button type="button" variant="secondary" onClick={handleRestoreDefaults}>
                {isRtl ? "استعادة الافتراضي" : "Restore Defaults"}
              </Button>
              <Button type="button" variant="primary" onClick={() => openAddModal()}>
                {isRtl ? "إضافة بند جديد" : "Add Clause"}
              </Button>
            </div>
          </div>
        ) : filteredClauses.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            {isRtl
              ? `لا توجد بنود مطابقة للبحث «${searchQuery}».`
              : `No clauses match "${searchQuery}".`}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredClauses.map(({ clause, index }) => {
              const isFiltering = Boolean(searchQuery.trim());
              return (
                <div
                  key={clause.id}
                  className="group grid grid-cols-1 gap-4 px-5 py-4 transition-colors hover:bg-slate-50/60 lg:grid-cols-[52px_1fr_1fr_132px] lg:items-start lg:gap-6"
                >
                  {/* Number Badge */}
                  <div className="flex items-center justify-between lg:block">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 font-mono text-xs font-bold text-revix-primary ring-1 ring-emerald-200/70">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    {/* Mobile Actions */}
                    <div className="flex items-center gap-1 lg:hidden">
                      <button
                        type="button"
                        onClick={() => openEditModal(clause, index)}
                        className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {isRtl ? "تعديل" : "Edit"}
                      </button>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleRemoveClause(clause.id)}
                        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                        aria-label={isRtl ? "حذف البند" : "Delete clause"}
                      >
                        <RevixIcon name="trash-2" size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Arabic Text */}
                  <div dir="rtl" className="text-[13px] leading-6 text-slate-800">
                    {clause.ar || (
                      <span className="italic text-slate-400">
                        {isRtl ? "لم يُضف نص عربي لهذا البند" : "No Arabic text"}
                      </span>
                    )}
                  </div>

                  {/* English Text */}
                  <div dir="ltr" className="text-[12.5px] leading-6 text-slate-600">
                    {clause.en || (
                      <span className="italic text-slate-400">
                        {isRtl ? "لم يُضف نص إنجليزي لهذا البند" : "No English text"}
                      </span>
                    )}
                  </div>

                  {/* Desktop Actions */}
                  <div className="hidden items-center justify-end gap-1 lg:flex">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => openEditModal(clause, index)}
                      className="inline-flex h-7 cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-700 transition-colors hover:border-revix-primary/40 hover:bg-emerald-50/50 hover:text-revix-primary"
                    >
                      {isRtl ? "تعديل" : "Edit"}
                    </button>

                    {!isFiltering && (
                      <>
                        <button
                          type="button"
                          disabled={isSaving || index === 0}
                          onClick={() => handleMoveClause(index, -1)}
                          title={isRtl ? "تحريك لأعلى" : "Move up"}
                          aria-label={isRtl ? "تحريك البند لأعلى" : "Move clause up"}
                          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <RevixIcon name="chevron-up" size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={isSaving || index === clauses.length - 1}
                          onClick={() => handleMoveClause(index, 1)}
                          title={isRtl ? "تحريك لأسفل" : "Move down"}
                          aria-label={isRtl ? "تحريك البند لأسفل" : "Move clause down"}
                          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <RevixIcon name="chevron-down" size={13} />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleRemoveClause(clause.id)}
                      title={isRtl ? "حذف البند" : "Delete clause"}
                      aria-label={isRtl ? "حذف البند" : "Delete clause"}
                      className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <RevixIcon name="trash-2" size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Clause Popup Modal */}
      {modalState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          onClick={() => !isSaving && setModalState(null)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-emerald-50 px-2 font-mono text-xs font-bold text-revix-primary">
                  {modalState.mode === "edit"
                    ? String(modalState.index + 1).padStart(2, "0")
                    : "+"}
                </span>
                <h2 className="text-sm font-bold text-slate-900">
                  {modalState.mode === "edit"
                    ? isRtl
                      ? `تعديل البند رقم ${modalState.index + 1}`
                      : `Edit Clause #${modalState.index + 1}`
                    : isRtl
                      ? "إضافة بند جديد"
                      : "Add New Clause"}
                </h2>
              </div>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => setModalState(null)}
                aria-label={isRtl ? "إغلاق" : "Close"}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700"
              >
                <RevixIcon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4 p-5">
              {modalError && (
                <Alert
                  variant="error"
                  message={modalError}
                  onClose={() => setModalError(undefined)}
                />
              )}

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="modal-clause-ar"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800"
                  >
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                      AR
                    </span>
                    <span>{isRtl ? "النص بالعربية" : "Arabic Text"}</span>
                  </label>
                  <span className="font-mono text-[11px] text-slate-400">
                    {draftAr.length}
                  </span>
                </div>
                <textarea
                  id="modal-clause-ar"
                  rows={4}
                  dir="rtl"
                  value={draftAr}
                  onChange={(e) => setDraftAr(e.target.value)}
                  placeholder={
                    isRtl ? "اكتب نص البند بالعربية..." : "Enter Arabic clause text..."
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/40 p-3 text-[13px] leading-6 text-slate-800 placeholder:text-slate-400 focus:border-revix-primary focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="modal-clause-en"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800"
                  >
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                      EN
                    </span>
                    <span>{isRtl ? "النص بالإنجليزية" : "English Text"}</span>
                  </label>
                  <span className="font-mono text-[11px] text-slate-400">
                    {draftEn.length}
                  </span>
                </div>
                <textarea
                  id="modal-clause-en"
                  rows={4}
                  dir="ltr"
                  value={draftEn}
                  onChange={(e) => setDraftEn(e.target.value)}
                  placeholder={
                    isRtl
                      ? "اكتب نص البند بالإنجليزية..."
                      : "Enter English clause text..."
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/40 p-3 text-[13px] leading-6 text-slate-800 placeholder:text-slate-400 focus:border-revix-primary focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSaving}
                  onClick={() => setModalState(null)}
                >
                  {isRtl ? "إلغاء" : "Cancel"}
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
                      ? "حفظ البند"
                      : "Save Clause"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Import Popup Modal */}
      {excelModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          onClick={() => !isSaving && setExcelModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <RevixIcon name="layers" size={16} className="text-revix-primary" />
                <h2 className="text-sm font-bold text-slate-900">
                  {isRtl ? "استيراد البنود من ملف Excel" : "Import Clauses from Excel"}
                </h2>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setExcelModalOpen(false)}
                aria-label={isRtl ? "إغلاق" : "Close"}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700"
              >
                <RevixIcon name="x" size={16} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-800">
                    {isRtl ? "نموذج ملف الإكسيل (.xlsx)" : "Excel Template (.xlsx)"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {isRtl
                      ? "عمود للنص بالعربية وعمود للنص بالإنجليزية (كل صف = بند واحد)."
                      : "One column for Arabic text and one column for English text (one row per clause)."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleDownloadTemplate}
                  className="text-xs"
                >
                  {isRtl ? "تحميل النموذج" : "Download Template"}
                </Button>
              </div>

              <div>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/40 px-4 py-6 text-center transition-colors hover:border-revix-primary/60 hover:bg-emerald-50/20">
                  <RevixIcon name="file-text" size={24} className="text-slate-400" />
                  <span className="mt-2 text-xs font-semibold text-slate-700">
                    {excelFileName
                      ? excelFileName
                      : isRtl
                        ? "اضغط لاختيار ملف Excel (.xlsx)"
                        : "Click to select an Excel file (.xlsx)"}
                  </span>
                  <span className="mt-0.5 text-[11px] text-slate-400">
                    {isParsingExcel
                      ? isRtl
                        ? "جاري قراءة الملف..."
                        : "Parsing file..."
                      : isRtl
                        ? "يدعم ملفات .xlsx فقط"
                        : "Supports .xlsx files"}
                  </span>
                  <input
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                    onChange={(e) => handleExcelFileChange(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              {excelError && (
                <Alert
                  variant="error"
                  message={excelError}
                  onClose={() => setExcelError(undefined)}
                />
              )}

              {excelPreview.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-emerald-700">
                      {isRtl
                        ? `تمت قراءة ${excelPreview.length} بند بنجاح`
                        : `Parsed ${excelPreview.length} clauses successfully`}
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      <label className="inline-flex cursor-pointer items-center gap-1.5">
                        <input
                          type="radio"
                          name="excelMode"
                          checked={excelMode === "replace"}
                          onChange={() => setExcelMode("replace")}
                        />
                        <span>{isRtl ? "استبدال البنود الحالية" : "Replace existing"}</span>
                      </label>
                      <label className="inline-flex cursor-pointer items-center gap-1.5">
                        <input
                          type="radio"
                          name="excelMode"
                          checked={excelMode === "append"}
                          onChange={() => setExcelMode("append")}
                        />
                        <span>{isRtl ? "إضافة على الحالية" : "Append to existing"}</span>
                      </label>
                    </div>
                  </div>

                  <div className="max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/40">
                    {excelPreview.slice(0, 6).map((item, idx) => (
                      <div key={item.id} className="grid grid-cols-1 gap-2 p-2.5 text-[11px] sm:grid-cols-2">
                        <p dir="rtl" className="truncate text-slate-800">
                          <span className="font-mono font-bold text-revix-primary">
                            {idx + 1}.{" "}
                          </span>
                          {item.ar || "—"}
                        </p>
                        <p dir="ltr" className="truncate text-slate-600">
                          {item.en || "—"}
                        </p>
                      </div>
                    ))}
                    {excelPreview.length > 6 && (
                      <div className="p-2 text-center text-[11px] text-slate-500">
                        {isRtl
                          ? `+ ${excelPreview.length - 6} بنود أخرى...`
                          : `+ ${excelPreview.length - 6} more clauses...`}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSaving}
                  onClick={() => setExcelModalOpen(false)}
                >
                  {isRtl ? "إلغاء" : "Cancel"}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={isSaving || excelPreview.length === 0}
                  onClick={handleConfirmExcelImport}
                  className="rounded-xl px-5"
                >
                  {isSaving
                    ? isRtl
                      ? "جاري الحفظ..."
                      : "Saving..."
                    : isRtl
                      ? "تأكيد الاستيراد والحفظ"
                      : "Import & Save"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
