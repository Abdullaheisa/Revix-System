"use client";

import { useMemo, useState, type FormEvent } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { TableEmptyRow } from "@/components/ui/EmptyState";
import { RevixIcon } from "@/components/ui/RevixIcons";
import {
  MasterFormModal,
  MASTER_INPUT_CLASS,
  MASTER_LABEL_CLASS,
} from "@/components/shared/workspace";
import { ResourceFeedback } from "@/components/shared/ResourceFeedback";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  useCreateVehicleBodyStyleMutation,
  useListVehicleBodyStylesQuery,
} from "@/store/api/fleetApi";

export function BodyStylesMasterPanel({ isRtl }: { isRtl: boolean }) {
  const { data, isLoading } = useListVehicleBodyStylesQuery();
  const [createBodyStyle, { isLoading: isCreating }] = useCreateVehicleBodyStyleMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [search, setSearch] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const customStyles = useMemo(() => data?.data ?? [], [data?.data]);

  const filteredStyles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customStyles;
    return customStyles.filter(
      (s) =>
        s.nameAr.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q),
    );
  }, [customStyles, search]);

  const openCreateModal = () => {
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!nameAr.trim()) {
      setErrorMsg(isRtl ? "اسم الهيكل مطلوب." : "Body style name is required.");
      return;
    }

    try {
      await createBodyStyle({
        code: (nameEn.trim() || nameAr.trim()).toLowerCase().replace(/\s+/g, "_"),
        nameEn: nameEn.trim() || nameAr.trim(),
        nameAr: nameAr.trim(),
      }).unwrap();

      setNameAr("");
      setNameEn("");
      setIsModalOpen(false);
    } catch (err) {
      setErrorMsg(
        getApiErrorMessage(err) || (isRtl ? "تعذر حفظ هيكل السيارة." : "Failed to save body style."),
      );
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
            Body Style
          </h1>
          <span className="rounded-md bg-revix-surface px-2 py-0.5 font-mono text-xs font-semibold text-revix-secondary">
            {filteredStyles.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-64">
            <RevixIcon
              name="search"
              size={14}
              className="pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-revix-secondary"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isRtl ? "بحث في هياكل السيارات..." : "Search body styles..."}
              className="h-9 w-full rounded-lg border border-revix-border bg-revix-white ps-9 pe-3 text-xs text-revix-dark placeholder:text-revix-muted focus:border-revix-primary focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-revix-primary-hover"
          >
            <RevixIcon name="plus" size={14} />
            <span>{isRtl ? "إضافة هيكل" : "Add Body Style"}</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <ResourceFeedback isLoading isRtl={isRtl} />
      ) : (
        <div className="flex min-h-0 flex-initial flex-col overflow-hidden rounded-xl border border-revix-border bg-revix-white">
          <DataTable fitAvailableHeight className="text-xs">
            <thead>
              <tr className="border-b border-revix-border bg-revix-surface/75 text-[11.5px] font-semibold uppercase tracking-wide text-revix-secondary">
                <th className="px-4 py-2.5 text-start">{isRtl ? "اسم الهيكل" : "Body Style"}</th>
                <th className="px-4 py-2.5 text-start">{isRtl ? "الوصف" : "Description"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-revix-border/70">
              {filteredStyles.length === 0 ? (
                <TableEmptyRow
                  colSpan={2}
                  title={isRtl ? "لا توجد هياكل سيارات مسجلة بعد" : "No body styles added yet"}
                  description={
                    isRtl
                      ? "أضف أنواع هياكل السيارات الخاصة بشركتك لاستخدامها في الفريان."
                      : "Add your company's vehicle body styles to use them in Variants."
                  }
                  actionLabel={search.trim() ? undefined : isRtl ? "إضافة هيكل" : "Add Body Style"}
                  onAction={search.trim() ? undefined : openCreateModal}
                />
              ) : (
                filteredStyles.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-revix-accent-soft/40">
                    <td className="px-4 py-2.5 font-bold text-revix-dark">{s.nameAr}</td>
                    <td className="px-4 py-2.5 text-revix-secondary">
                      {s.nameEn !== s.nameAr ? s.nameEn : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </DataTable>
        </div>
      )}

      {/* Popup Create Modal */}
      <MasterFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        isRtl={isRtl}
        title={isRtl ? "إضافة هيكل سيارة جديد" : "Add New Body Style"}
        errorMsg={errorMsg}
        isSubmitting={isCreating}
        submitLabel={isRtl ? "حفظ الهيكل" : "Save Body Style"}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={MASTER_LABEL_CLASS}>
              {isRtl ? "اسم الهيكل *" : "Body Style Name *"}
            </label>
            <input
              type="text"
              required
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder={isRtl ? "مثال: هاتشباك" : "e.g. Hatchback"}
              className={MASTER_INPUT_CLASS}
            />
          </div>

          <div>
            <label className={MASTER_LABEL_CLASS}>
              {isRtl ? "الوصف" : "Description"}
            </label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder={isRtl ? "وصف إضافي (اختياري)" : "Optional description"}
              className={MASTER_INPUT_CLASS}
            />
          </div>
        </div>
      </MasterFormModal>
    </div>
  );
}
