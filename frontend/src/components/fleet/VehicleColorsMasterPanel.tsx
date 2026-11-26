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
  useCreateVehicleColorMutation,
  useListVehicleColorsQuery,
} from "@/store/api/fleetApi";

export const DEFAULT_MASTER_COLORS = [
  { nameEn: "White", nameAr: "أبيض", colorType: "exterior" },
  { nameEn: "Black", nameAr: "أسود", colorType: "exterior" },
  { nameEn: "Silver", nameAr: "فضي", colorType: "exterior" },
  { nameEn: "Gray", nameAr: "رمادي", colorType: "exterior" },
  { nameEn: "Blue", nameAr: "أزرق", colorType: "exterior" },
  { nameEn: "Red", nameAr: "أحمر", colorType: "exterior" },
  { nameEn: "Green", nameAr: "أخضر", colorType: "exterior" },
  { nameEn: "Gold", nameAr: "ذهبي", colorType: "exterior" },
  { nameEn: "Brown", nameAr: "بني", colorType: "exterior" },
  { nameEn: "Beige", nameAr: "بيج", colorType: "interior" },
];

export function VehicleColorsMasterPanel({ isRtl }: { isRtl: boolean }) {
  const { data, isLoading } = useListVehicleColorsQuery();
  const [createColor, { isLoading: isCreating }] = useCreateVehicleColorMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [colorType, setColorType] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [search, setSearch] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const customColors = useMemo(() => data?.data ?? [], [data?.data]);

  const allColors = useMemo(
    () =>
      customColors.map((c) => ({
        id: c.id,
        nameEn: c.nameEn,
        nameAr: c.nameAr,
        colorType: c.colorType,
      })),
    [customColors],
  );

  const filteredColors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allColors;
    return allColors.filter(
      (c) =>
        c.nameAr.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.colorType.toLowerCase().includes(q),
    );
  }, [allColors, search]);

  const openCreateModal = () => {
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const desc = nameEn.trim();
    if (!desc) {
      setErrorMsg(isRtl ? "وصف اللون مطلوب." : "Color description is required.");
      return;
    }
    try {
      await createColor({
        colorType: colorType.trim() || "exterior",
        nameEn: desc,
        nameAr: desc,
      }).unwrap();

      setColorType("");
      setNameEn("");
      setIsModalOpen(false);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err) || (isRtl ? "تعذر حفظ اللون." : "Failed to create color."));
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
            Colors
          </h1>
          <span className="rounded-md bg-revix-surface px-2 py-0.5 font-mono text-xs font-semibold text-revix-secondary">
            {filteredColors.length}
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
              placeholder={isRtl ? "بحث في الألوان..." : "Search colors..."}
              className="h-9 w-full rounded-lg border border-revix-border bg-revix-white ps-9 pe-3 text-xs text-revix-dark placeholder:text-revix-muted focus:border-revix-primary focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-revix-primary-hover"
          >
            <RevixIcon name="plus" size={14} />
            <span>{isRtl ? "إضافة لون" : "Add Color"}</span>
          </button>
        </div>
      </div>

      {/* Main 3-Column Table */}
      {isLoading ? (
        <ResourceFeedback isLoading isRtl={isRtl} />
      ) : (
        <div className="flex min-h-0 flex-initial flex-col overflow-hidden rounded-xl border border-revix-border bg-revix-white">
          <DataTable fitAvailableHeight className="text-xs">
            <thead>
              <tr className="border-b border-revix-border bg-revix-surface/75 text-[11.5px] font-semibold uppercase tracking-wide text-revix-secondary">
                <th className="px-4 py-2.5 text-start">{isRtl ? "نوع اللون" : "Color Type"}</th>
                <th className="px-4 py-2.5 text-start">{isRtl ? "الوصف" : "Description"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-revix-border/70">
              {filteredColors.length === 0 ? (
                <TableEmptyRow
                  colSpan={2}
                  title={isRtl ? "لا توجد ألوان مسجلة بعد" : "No colors added yet"}
                  description={
                    isRtl
                      ? "أضف ألوان السيارات الداخلية والخارجية المعتمدة لدى شركتك."
                      : "Add exterior and interior vehicle colors used by your company."
                  }
                  actionLabel={search.trim() ? undefined : isRtl ? "إضافة لون" : "Add Color"}
                  onAction={search.trim() ? undefined : openCreateModal}
                />
              ) : (
                filteredColors.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-revix-accent-soft/40">
                    <td className="px-4 py-2.5">
                      <span className="rounded-md bg-revix-accent-soft px-2 py-0.5 text-[11px] font-semibold text-revix-primary">
                        {c.colorType === "interior"
                          ? isRtl
                            ? "داخلي"
                            : "Interior"
                          : c.colorType === "exterior"
                            ? isRtl
                              ? "خارجي"
                              : "Exterior"
                            : c.colorType}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-bold text-revix-dark">{c.nameEn || c.nameAr}</td>
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
        title={isRtl ? "إضافة لون جديد" : "Add New Color"}
        errorMsg={errorMsg}
        isSubmitting={isCreating}
        submitLabel={isRtl ? "حفظ اللون" : "Save Color"}
      >
        <div>
          <label className={MASTER_LABEL_CLASS}>
            {isRtl ? "نوع اللون" : "Color Type"}
          </label>
          <input
            type="text"
            value={colorType}
            onChange={(e) => setColorType(e.target.value)}
            placeholder={isRtl ? "مثال: خارجي أو داخلي" : "e.g. VMS_Exterior"}
            className={MASTER_INPUT_CLASS}
          />
        </div>

        <div>
          <label className={MASTER_LABEL_CLASS}>
            {isRtl ? "الوصف *" : "Description *"}
          </label>
          <input
            type="text"
            required
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder={isRtl ? "مثال: Pearl White" : "e.g. Pearl White"}
            className={MASTER_INPUT_CLASS}
          />
        </div>
      </MasterFormModal>
    </div>
  );
}
