"use client";

import { DataTable } from "@/components/ui/DataTable";
import { TableEmptyRow } from "@/components/ui/EmptyState";
import { getApiErrorMessage } from "@/lib/api/errors";

import { useEffect, useMemo, useState } from "react";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { RevixPagination } from "@/components/ui/RevixPagination";
import { RevixConfirmModal } from "@/components/shared/workspace";
import { usePersistedPage } from "@/lib/workspace/usePersistedPage";
import { useCreateVariantMutation, useDeleteVariantMutation, useListVehicleBodyStylesQuery, useListVehicleMakesQuery, useListVariantsQuery, useUpdateVariantMutation, type VehicleCategory, type VehicleVariantDto } from "@/store/api/fleetApi";

interface VehicleVariantsPanelProps {
  isRtl: boolean;
  baseCurrency?: string;
  onGoFleetVehicles?: () => void;
}

const CATEGORY_LABELS: Record<VehicleCategory, { en: string; ar: string }> = {
  mini: { en: "Mini (M)", ar: "ميني / صغيرة جداً" },
  economy: { en: "Economy (E)", ar: "اقتصادية" },
  compact: { en: "Compact (C)", ar: "مدمجة (Compact)" },
  intermediate: { en: "Intermediate (I)", ar: "متوسطة (Intermediate)" },
  standard: { en: "Standard (S)", ar: "قياسية (Standard)" },
  fullsize: { en: "Full-size (F)", ar: "كبيرة (Full-size)" },
  sedan: { en: "Sedan", ar: "سيدان" },
  suv: { en: "SUV / 4x4", ar: "دفع رباعي / SUV" },
  crossover: { en: "Crossover", ar: "كروس أوفر" },
  luxury: { en: "Luxury (L)", ar: "فاخرة" },
  premium: { en: "Premium (P)", ar: "بريميوم / فئة عليا" },
  convertible: { en: "Convertible (T)", ar: "مكشوفة (كابورليه)" },
  coupe: { en: "Coupe / Sport", ar: "كوبيه / رياضية" },
  van: { en: "Van / Minivan (V)", ar: "فان / ميني فان" },
  pickup: { en: "Pickup Truck", ar: "بيك أب / نقل خفيف" },
  commercial: { en: "Commercial", ar: "تجاري" },
};

export function VehicleVariantsPanel({ isRtl }: VehicleVariantsPanelProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory] = useState<string>("all");
  const [page, setPage] = usePersistedPage("fleet/variants");
  const pageSize = 15;
  const { data, isLoading, refetch, isFetching } = useListVariantsQuery({
    category: selectedCategory !== "all" ? (selectedCategory as VehicleCategory) : undefined,
    search: search.trim() || undefined,
    page,
    pageSize,
  });
  const [createVariant, { isLoading: isCreating }] = useCreateVariantMutation();
  const [updateVariant, { isLoading: isUpdating }] = useUpdateVariantMutation();
  const [deleteVariant, { isLoading: isArchivingVariant }] = useDeleteVariantMutation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<VehicleVariantDto | null>(null);
  const [pendingArchiveVariant, setPendingArchiveVariant] = useState<VehicleVariantDto | null>(null);

  // Form State - Pure Catalog Specs (Zero Pricing & Zero Physical Specs)
  const [formMake, setFormMake] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formYear, setFormYear] = useState("");
  const [formTrim, setFormTrim] = useState("");
  const [customDisplayName, setFormDisplayName] = useState("");
  const [isDisplayNameCustom, setIsDisplayNameCustom] = useState(false);
  const [formCategory, setFormCategory] = useState("");
  const [formSipp, setFormSipp] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Database-backed Manufacturers, Models & Body Styles Catalog (Company-Owned Master)
  const { data: makesResponse } = useListVehicleMakesQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const { data: bodyStylesResponse } = useListVehicleBodyStylesQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const dbMakes = useMemo(() => makesResponse?.data ?? [], [makesResponse?.data]);
  const bodyStyleOptions = useMemo(
    () =>
      (bodyStylesResponse?.data ?? []).map((s) => ({
        value: s.code,
        label: isRtl ? s.nameAr : s.nameEn,
      })),
    [isRtl, bodyStylesResponse?.data],
  );

  const variants = useMemo(() => data?.data ?? [], [data?.data]);

  const catalogMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    dbMakes.forEach((make) => {
      const m = make.name.trim();
      if (!m || make.models.length === 0) return;
      make.models.forEach((model) => {
        const modName = model.name.trim();
        if (!modName) return;
        if (!map.has(m)) map.set(m, new Set());
        map.get(m)!.add(modName);
      });
    });
    return map;
  }, [dbMakes]);

  const availableMakes = useMemo(
    () => Array.from(catalogMap.keys()).sort((a, b) => a.localeCompare(b)),
    [catalogMap],
  );

  const availableModels = useMemo(() => {
    const cleanMake = formMake.trim().toLowerCase();
    if (!cleanMake) return [];
    const matchedKey = Array.from(catalogMap.keys()).find(
      (k) => k.toLowerCase() === cleanMake,
    );
    if (!matchedKey) return [];
    return Array.from(catalogMap.get(matchedKey) ?? []).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [catalogMap, formMake]);

  const autoDisplayName = useMemo(() => {
    return [formYear || "", formMake.trim(), formModel.trim(), formTrim.trim()]
      .filter(Boolean)
      .join(" ");
  }, [formYear, formMake, formModel, formTrim]);

  const formDisplayName = isDisplayNameCustom ? customDisplayName : autoDisplayName;
  const totalVariants = data?.pagination?.totalItems ?? variants.length;
  const filteredVariants = variants;
  const paginatedVariants = variants;

  const stats = useMemo(() => {
    const total = variants.length;
    const sedans = variants.filter((v) => v.category === "sedan").length;
    const suvs = variants.filter((v) => v.category === "suv").length;
    const others = variants.filter(
      (v) => v.category !== "sedan" && v.category !== "suv",
    ).length;
    return { total, sedans, suvs, others };
  }, [variants]);

  function handleOpenCreateModal() {
    setEditingVariant(null);
    setFormMake("");
    setFormModel("");
    setFormYear("");
    setFormTrim("");
    setFormDisplayName("");
    setIsDisplayNameCustom(false);
    setFormCategory("");
    setFormSipp("");
    setFormError(null);
    setIsModalOpen(true);
  }

  function handleOpenEditModal(variant: VehicleVariantDto) {
    setEditingVariant(variant);
    setFormMake(variant.make);
    setFormModel(variant.model);
    setFormYear(String(variant.modelYear));
    setFormTrim(variant.trim);
    setFormDisplayName(
      [variant.modelYear, variant.make, variant.model, variant.trim]
        .filter(Boolean)
        .join(" "),
    );
    setIsDisplayNameCustom(false);
    setFormCategory(variant.category);
    setFormSipp(variant.sippCode);
    setFormError(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!formMake.trim() || !formModel.trim()) {
      setFormError(
        isRtl
          ? "برجاء كتابة الماركة والموديل بدقة."
          : "Please specify both vehicle make and model.",
      );
      return;
    }

    const parsedYear = Number(formYear);
    if (!formYear.trim() || Number.isNaN(parsedYear) || parsedYear < 1990 || parsedYear > 2040) {
      setFormError(
        isRtl
          ? "برجاء إدخال سنة صنع صحيحة (1990 - 2040)."
          : "Please enter a valid model year (1990 - 2040).",
      );
      return;
    }

    const normMake = formMake.trim().toLowerCase();
    const normModel = formModel.trim().toLowerCase();
    const normTrim = (formTrim.trim() || "Standard").toLowerCase();
    const normCategory = (formCategory.trim() || "sedan") as VehicleCategory;
    const normSipp = (formSipp.trim() || "ICAR").toLowerCase();

    const duplicate = variants.find(
      (v) =>
        v.id !== editingVariant?.id &&
        v.make.trim().toLowerCase() === normMake &&
        v.model.trim().toLowerCase() === normModel &&
        v.modelYear === parsedYear &&
        v.trim.trim().toLowerCase() === normTrim &&
        v.category === normCategory &&
        v.sippCode.trim().toLowerCase() === normSipp,
    );

    if (duplicate) {
      const existingCode = duplicate.variantCode ? ` (${duplicate.variantCode})` : "";
      const summary = `${duplicate.modelYear} ${duplicate.make} ${duplicate.model} · ${duplicate.trim} · ${duplicate.category} · ${duplicate.sippCode}`;
      setFormError(
        isRtl
          ? `لا يمكن إضافة هذا الفريان لأنه مكرر: يوجد بالفعل فريان مطابق تماماً${existingCode} [${summary}]. لإضافته كفريان جديد، يجب تغيير أي مواصفة (مثل الفئة أو السنة أو نوع الهيكل أو SIPP).`
          : `Duplicate variant rejected: an identical variant${existingCode} [${summary}] already exists. To add a different variant, change at least one specification (Trim, Year, Body Style, or SIPP).`,
      );
      return;
    }

    try {
      if (editingVariant) {
        await updateVariant({
          id: editingVariant.id,
          data: {
            make: formMake.trim(),
            model: formModel.trim(),
            modelYear: parsedYear,
            trim: formTrim.trim() || "Standard",
            category: normCategory,
            transmission: "automatic",
            fuelType: "petrol",
            seatingCapacity: 5,
            sippCode: (formSipp.trim() || "ICAR").toUpperCase(),
          },
        }).unwrap();
      } else {
        await createVariant({
          make: formMake.trim(),
          model: formModel.trim(),
          modelYear: parsedYear,
          trim: formTrim.trim() || "Standard",
          category: normCategory,
          transmission: "automatic",
          fuelType: "petrol",
          seatingCapacity: 5,
          sippCode: (formSipp.trim() || "ICAR").toUpperCase(),
        }).unwrap();
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      setFormError(
        getApiErrorMessage(err) ||
          (isRtl
            ? "تعذر حفظ فئة السيارة، برجاء التحقق من البيانات."
            : "Failed to save vehicle variant."),
      );
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
      {/* Clean Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
            {isRtl ? "موديل فريانت" : "Model Variant"}
          </h1>
          <span className="rounded-md bg-revix-surface px-2 py-0.5 font-mono text-xs font-semibold text-revix-secondary">
            {totalVariants}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-56">
            <RevixIcon
              name="search"
              className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-revix-muted ltr:left-3 rtl:right-3"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={
                isRtl
                  ? "بحث بالماركة، الموديل، SIPP..."
                  : "Search make, model, SIPP..."
              }
              className="h-9 w-full rounded-lg border border-revix-border bg-revix-white text-xs text-revix-dark placeholder-revix-muted focus:border-revix-primary focus:outline-hidden ltr:pl-9 ltr:pr-3 rtl:pl-3 rtl:pr-9"
            />
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label={isRtl ? "تحديث" : "Refresh"}
            title={isRtl ? "تحديث" : "Refresh"}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-revix-border bg-revix-white text-xs text-revix-dark shadow-xs transition hover:bg-revix-surface disabled:opacity-50"
          >
            <RevixIcon
              name="refresh-cw"
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-revix-primary" : "text-revix-secondary"}`}
            />
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 text-xs font-semibold text-revix-white shadow-xs transition hover:bg-revix-primary-hover"
          >
            <RevixIcon name="plus" className="h-4 w-4" />
            <span>{isRtl ? "تعريف موديل جديد" : "Define Model"}</span>
          </button>
        </div>
      </div>

      {/* Variants Table */}
      {isLoading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-revix-border bg-revix-white text-xs text-revix-secondary">
          <RevixIcon name="refresh-cw" className="mr-2 h-4 w-4 animate-spin text-revix-primary" />
          {isRtl ? "جاري التحميل..." : "Loading..."}
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-initial flex-col overflow-hidden rounded-xl border border-revix-border bg-revix-white">
            <DataTable fitAvailableHeight className="text-xs">
              <thead>
                <tr className="border-b border-revix-border bg-revix-surface/70 text-revix-secondary font-semibold">
                  <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">Variant ID</th>
                  <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "الاسم الكامل" : "Variant full name"}</th>
                  <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "الشركة المصنعة" : "Manufacturer"}</th>
                  <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "الموديل" : "Model name"}</th>
                  <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "السنة" : "Year"}</th>
                  <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "الفئة" : "Body Style"}</th>
                  <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">SIPP</th>
                  <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-center font-semibold">{isRtl ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-revix-border/60">
                {paginatedVariants.length === 0 ? (
                  <TableEmptyRow
                    colSpan={8}
                    title={isRtl ? "لا توجد موديلات سيارات مطابقة" : "No vehicle models found"}
                    description={
                      isRtl
                        ? "أضف فئة جديدة في الكتالوج أو عدّل شروط البحث الحالية."
                        : "Add a new variant to the catalog or adjust your search filter."
                    }
                  />
                ) : paginatedVariants.map((v) => (
                  <tr
                    key={v.id}
                    className="transition-colors hover:bg-revix-surface/60"
                  >
                    <td className="py-2.5 px-3 font-mono font-semibold text-revix-secondary whitespace-nowrap">
                      {v.variantCode ??
                        (() => {
                          let hash = 0;
                          for (let i = 0; i < v.id.length; i++) {
                            hash = (hash * 31 + v.id.charCodeAt(i)) >>> 0;
                          }
                          return `V${100 + (hash % 900)}`;
                        })()}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-revix-dark whitespace-nowrap">
                      {v.make} {v.model}{" "}
                      {v.trim && v.trim.toLowerCase() !== "standard"
                        ? `${v.trim} ${v.modelYear}`
                        : v.modelYear}
                    </td>
                    <td className="py-2.5 px-3 text-revix-dark whitespace-nowrap">{v.make}</td>
                    <td className="py-2.5 px-3 text-revix-dark whitespace-nowrap">{v.model}</td>
                    <td className="py-2.5 px-3 font-mono text-revix-dark whitespace-nowrap">{v.modelYear}</td>
                    <td className="py-2.5 px-3 text-revix-secondary whitespace-nowrap">
                      {CATEGORY_LABELS[v.category]?.[isRtl ? "ar" : "en"] ?? v.category}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-revix-primary whitespace-nowrap">
                      {v.sippCode}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(v)}
                          className="h-8 cursor-pointer rounded-md border border-revix-border bg-revix-white px-2.5 text-[11px] font-semibold text-revix-dark transition hover:bg-revix-surface"
                        >
                          {isRtl ? "تعديل" : "Edit"}
                        </button>
                        {v.status === "active" && (
                          <button
                            type="button"
                            onClick={() => setPendingArchiveVariant(v)}
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-red-200 bg-white text-red-600 transition hover:bg-red-50"
                            title={isRtl ? "أرشفة الموديل" : "Archive Variant"}
                          >
                            <RevixIcon name="trash-2" className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>

          {/* Unified Compact Pagination */}
          <div className="shrink-0 overflow-hidden rounded-lg border border-revix-border bg-revix-white empty:hidden">
            <RevixPagination compact
              currentPage={page}
              totalItems={totalVariants}
              pageSize={pageSize}
              onPageChange={setPage}
              lang={isRtl ? "ar" : "en"}
              itemLabel={isRtl ? "موديل" : "models"}
            />
          </div>
        </>
      )}

      {/* Create / Edit Modal (Zero Pricing, Pure Specs) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          dir={isRtl ? "rtl" : "ltr"}
        >
          <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-revix-border bg-revix-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-revix-border bg-revix-surface/30 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-revix-dark">
                  {editingVariant
                    ? isRtl
                      ? "تعديل مواصفات الموديل (الفريان)"
                      : "Edit Vehicle Model Specs"
                    : isRtl
                      ? "تعريف موديل جديد بالكتالوج (الفريان)"
                      : "Define New Vehicle Model (Variant)"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-revix-muted hover:bg-revix-surface hover:text-revix-dark transition-colors"
              >
                <RevixIcon name="x" className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
              <div className="flex-1 space-y-4 p-6">
                {formError && (
                  <div className="rounded-lg border border-revix-alert/30 bg-revix-alert-soft p-3 text-xs text-revix-alert">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-revix-dark mb-1">
                      {isRtl ? "الشركة المصنعة" : "Manufacturer (Make)"} *
                    </label>
                    <RevixSelect
                      size="sm"
                      searchable
                      isRtl={isRtl}
                      value={formMake}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormMake(val);
                        if (val.trim().toLowerCase() !== formMake.trim().toLowerCase()) {
                          setFormModel("");
                        }
                      }}
                      placeholder={
                        availableMakes.length === 0
                          ? isRtl
                            ? "أضف شركة من صفحة Model أولاً"
                            : "Add makes in Model page first"
                          : isRtl
                            ? "اختر الشركة المصنعة..."
                            : "Select manufacturer..."
                      }
                      buttonClassName="h-9 rounded-lg text-xs"
                      options={availableMakes.map((m) => ({ value: m, label: m }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-revix-dark mb-1">
                      {isRtl ? "الموديل" : "Model"} *
                    </label>
                    <RevixSelect
                      size="sm"
                      searchable
                      disabled={!formMake.trim()}
                      isRtl={isRtl}
                      value={formModel}
                      onChange={(e) => setFormModel(e.target.value)}
                      placeholder={
                        !formMake.trim()
                          ? isRtl
                            ? "اختر الشركة أولاً"
                            : "Select make first"
                          : availableModels.length === 0
                            ? isRtl
                              ? "أضف موديل من صفحة Model"
                              : "Add models in Model page"
                            : isRtl
                              ? "اختر الموديل..."
                              : "Select model..."
                      }
                      buttonClassName="h-9 rounded-lg text-xs"
                      options={availableModels.map((m) => ({ value: m, label: m }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-revix-dark mb-1">
                      {isRtl ? "سنة الصنع" : "Model Year"} *
                    </label>
                    <input
                      type="number"
                      required
                      min={1990}
                      max={2040}
                      value={formYear}
                      onChange={(e) => setFormYear(e.target.value)}
                      placeholder={String(new Date().getFullYear())}
                      className="h-9 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-revix-dark mb-1">
                      {isRtl ? "الفئة (Trim / Variant)" : "Trim / Variant Name"}
                    </label>
                    <input
                      type="text"
                      value={formTrim}
                      onChange={(e) => setFormTrim(e.target.value)}
                      placeholder="LE, SE, Hybrid, Standard"
                      className="h-9 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-revix-dark mb-1">
                      {isRtl ? "نوع الهيكل" : "Body Style"}
                    </label>
                    <RevixSelect
                      size="sm"
                      searchable
                      isRtl={isRtl}
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as VehicleCategory)}
                      placeholder={
                        bodyStyleOptions.length === 0
                          ? isRtl
                            ? "أضف هيكل من صفحة Body Style"
                            : "Add in Body Style page"
                          : isRtl
                            ? "اختر نوع الهيكل..."
                            : "Select body style..."
                      }
                      buttonClassName="h-9 rounded-lg text-xs"
                      options={bodyStyleOptions}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-revix-dark mb-1">
                      {isRtl ? "SIPP" : "SIPP"}
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={formSipp}
                      onChange={(e) => setFormSipp(e.target.value.toUpperCase())}
                      placeholder="ICAR"
                      className="h-9 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs font-mono uppercase text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-revix-dark">
                      {isRtl
                        ? "الاسم الكامل للعرض (يتولّد تلقائياً)"
                        : "Display / Full Name (Auto-generated)"}
                    </label>
                    {isDisplayNameCustom && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsDisplayNameCustom(false);
                          setFormDisplayName(autoDisplayName);
                        }}
                        className="text-[11px] font-medium text-revix-primary hover:underline"
                      >
                        {isRtl ? "إعادة للتوليد التلقائي" : "Reset to auto"}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formDisplayName}
                    onChange={(e) => {
                      setIsDisplayNameCustom(true);
                      setFormDisplayName(e.target.value);
                    }}
                    placeholder="2026 Toyota Camry SE"
                    className="h-9 w-full rounded-lg border border-revix-border bg-revix-surface/40 px-3 text-xs font-medium text-revix-dark focus:border-revix-primary focus:bg-revix-white focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
                  />
                </div>
              </div>

              {/* Fixed Sticky Footer */}
              <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-revix-border bg-revix-surface/40 px-6 py-3.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-revix-border bg-revix-white px-4 py-2 text-xs font-semibold text-revix-secondary hover:bg-revix-surface hover:text-revix-dark active:scale-95 transition-all"
                >
                  {isRtl ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-revix-primary px-4 py-2 text-xs font-semibold text-revix-white shadow-xs hover:bg-revix-primary-hover active:scale-95 disabled:opacity-50 transition-all"
                >
                  {(isCreating || isUpdating) && (
                    <RevixIcon name="refresh-cw" className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>
                    {editingVariant
                      ? isRtl
                        ? "حفظ التعديلات"
                        : "Save Changes"
                      : isRtl
                        ? "إضافة الموديل للكتالوج"
                        : "Add to Catalog"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <RevixConfirmModal
        isOpen={Boolean(pendingArchiveVariant)}
        isRtl={isRtl}
        title={isRtl ? "تأكيد أرشفة الموديل" : "Confirm Archive Variant"}
        message={
          pendingArchiveVariant
            ? isRtl
              ? `هل أنت متأكد من أرشفة موديل "${pendingArchiveVariant.make} ${pendingArchiveVariant.model}"؟`
              : `Are you sure you want to archive "${pendingArchiveVariant.make} ${pendingArchiveVariant.model}"?`
            : ""
        }
        confirmLabel={isRtl ? "تأكيد الأرشفة" : "Archive"}
        isLoading={isArchivingVariant}
        onConfirm={async () => {
          if (!pendingArchiveVariant) return;
          await deleteVariant(pendingArchiveVariant.id);
          setPendingArchiveVariant(null);
        }}
        onCancel={() => setPendingArchiveVariant(null)}
      />
    </div>
  );
}
