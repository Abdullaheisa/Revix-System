"use client";

import { useMemo, useState } from "react";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { RevixPagination } from "@/components/ui/RevixPagination";
import { RevixConfirmModal } from "@/components/shared/workspace";
import { usePersistedPage } from "@/lib/workspace/usePersistedPage";
import {
  useCreateVariantMutation,
  useDeleteVariantMutation,
  useListVariantsQuery,
  useUpdateVariantMutation,
  type VehicleCategory,
  type VehicleVariantDto,
} from "@/store/api/fleetApi";

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

export function VehicleVariantsPanel({
  isRtl,
  onGoFleetVehicles,
}: VehicleVariantsPanelProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
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
  const [formYear, setFormYear] = useState(new Date().getFullYear());
  const [formTrim, setFormTrim] = useState("Standard");
  const [formCategory, setFormCategory] = useState<VehicleCategory>("sedan");
  const [formSipp, setFormSipp] = useState("ICAR");
  const [formError, setFormError] = useState<string | null>(null);

  const variants = useMemo(() => data?.data ?? [], [data?.data]);
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
    setFormYear(new Date().getFullYear());
    setFormTrim("Standard");
    setFormCategory("sedan");
    setFormSipp("ICAR");
    setFormError(null);
    setIsModalOpen(true);
  }

  function handleOpenEditModal(variant: VehicleVariantDto) {
    setEditingVariant(variant);
    setFormMake(variant.make);
    setFormModel(variant.model);
    setFormYear(variant.modelYear);
    setFormTrim(variant.trim);
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

    try {
      if (editingVariant) {
        await updateVariant({
          id: editingVariant.id,
          data: {
            make: formMake.trim(),
            model: formModel.trim(),
            modelYear: formYear,
            trim: formTrim.trim(),
            category: formCategory,
            transmission: "automatic",
            fuelType: "petrol",
            seatingCapacity: 5,
            sippCode: formSipp.trim().toUpperCase(),
          },
        }).unwrap();
      } else {
        await createVariant({
          make: formMake.trim(),
          model: formModel.trim(),
          modelYear: formYear,
          trim: formTrim.trim(),
          category: formCategory,
          transmission: "automatic",
          fuelType: "petrol",
          seatingCapacity: 5,
          sippCode: formSipp.trim().toUpperCase(),
        }).unwrap();
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(
        err?.data?.error?.message ||
          (isRtl
            ? "تعذر حفظ فئة السيارة، برجاء التحقق من البيانات."
            : "Failed to save vehicle variant."),
      );
    }
  }

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
              {isRtl ? "كتالوج فئات وموديلات السيارات (الفريان)" : "Vehicle Models Catalog (Variants)"}
            </h1>
          </div>
          <p className="mt-1 text-xs text-revix-secondary sm:text-sm">
            {isRtl
              ? "كتالوج مواصفات الموديلات وكود SIPP الدولي. تُستخدم هذه النماذج كقوالب في أوامر الشراء وعند استلام السيارات للأسطول."
              : "Vehicle models and SIPP specification catalog. Used as templates for purchase orders and fleet receiving."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-revix-border bg-revix-white px-3 text-xs font-medium text-revix-dark shadow-xs transition hover:bg-revix-surface active:scale-95 disabled:opacity-50"
          >
            <RevixIcon
              name="refresh-cw"
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-revix-primary" : "text-revix-secondary"}`}
            />
            <span>{isRtl ? "تحديث" : "Refresh"}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 text-xs font-semibold text-revix-white shadow-xs transition hover:bg-revix-primary-hover active:scale-95"
          >
            <RevixIcon name="plus" className="h-4 w-4" />
            <span>{isRtl ? "تعريف موديل جديد" : "Define Vehicle Model"}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-revix-border bg-revix-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-revix-secondary">
              {isRtl ? "إجمالي الموديلات" : "Total Models"}
            </span>
            <div className="rounded-md bg-revix-surface p-1.5 text-revix-primary">
              <RevixIcon name="layers" className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-revix-dark">
            {stats.total}
          </p>
        </div>

        <div className="rounded-xl border border-revix-border bg-revix-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-revix-secondary">
              {isRtl ? "فئات السيدان" : "Sedan Models"}
            </span>
            <div className="rounded-md bg-revix-accent-soft p-1.5 text-revix-accent">
              <RevixIcon name="car-front" className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-revix-dark">
            {stats.sedans}
          </p>
        </div>

        <div className="rounded-xl border border-revix-border bg-revix-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-revix-secondary">
              {isRtl ? "فئات الدفع الرباعي" : "SUV Models"}
            </span>
            <div className="rounded-md bg-revix-info-soft p-1.5 text-revix-info">
              <RevixIcon name="zap" className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-revix-dark">
            {stats.suvs}
          </p>
        </div>

        <div className="rounded-xl border border-revix-border bg-revix-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-revix-secondary">
              {isRtl ? "فئات أخرى" : "Other Categories"}
            </span>
            <div className="rounded-md bg-revix-warning-soft p-1.5 text-revix-warning">
              <RevixIcon name="sparkles" className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-revix-dark">
            {stats.others}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-revix-border bg-revix-surface/60 p-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
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
                ? "بحث بالماركة، الموديل، الفئة، أو كود SIPP..."
                : "Search by make, model, trim, SIPP..."
            }
            className="h-9 w-full rounded-lg border border-revix-border bg-revix-white text-xs text-revix-dark placeholder-revix-muted transition focus:border-revix-primary focus:outline-hidden focus:ring-1 focus:ring-revix-primary ltr:pl-9 ltr:pr-3 rtl:pl-3 rtl:pr-9"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory("all");
              setPage(1);
            }}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              selectedCategory === "all"
                ? "bg-revix-primary text-revix-white"
                : "border border-revix-border bg-revix-white text-revix-secondary hover:bg-revix-surface"
            }`}
          >
            {isRtl ? "الكل" : "All"} ({variants.length})
          </button>
          {(
            ["sedan", "suv", "luxury", "compact", "commercial", "van"] as VehicleCategory[]
          ).map((cat) => {
            const count = variants.filter((v) => v.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setPage(1);
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  selectedCategory === cat
                    ? "bg-revix-primary text-revix-white"
                    : "border border-revix-border bg-revix-white text-revix-secondary hover:bg-revix-surface"
                }`}
              >
                {isRtl ? CATEGORY_LABELS[cat].ar : CATEGORY_LABELS[cat].en}{" "}
                {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Variants List / Grid */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-revix-border bg-revix-white text-xs text-revix-secondary">
          <RevixIcon name="refresh-cw" className="mr-2 h-4 w-4 animate-spin text-revix-primary" />
          {isRtl ? "جاري تحميل كتالوج الموديلات..." : "Loading vehicle models catalog..."}
        </div>
      ) : filteredVariants.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-revix-border bg-revix-white p-10 text-center">
          <div className="rounded-full bg-revix-surface p-3 text-revix-secondary">
            <RevixIcon name="car-front" className="h-8 w-8" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-revix-dark">
            {isRtl ? "لا توجد موديلات سيارات مطابقة" : "No vehicle models found"}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-revix-secondary">
            {isRtl
              ? "ابدأ بتعريف أول موديل في الكتالوج ليتم استخدامه في أوامر الشراء وإدارة الأسطول."
              : "Get started by defining your first vehicle model template."}
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 py-1.5 text-xs font-semibold text-revix-white shadow-xs hover:bg-revix-primary-hover"
          >
            <RevixIcon name="plus" className="h-3.5 w-3.5" />
            <span>{isRtl ? "تعريف موديل جديد" : "Define Model Now"}</span>
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedVariants.map((v) => (
              <div
                key={v.id}
                className="flex flex-col justify-between rounded-xl border border-revix-border bg-revix-white p-4 shadow-xs transition hover:border-revix-primary/40 hover:shadow-sm"
              >
                <div>
                  {/* Variant Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-md bg-revix-surface px-1.5 py-0.5 font-mono text-[11px] font-semibold text-revix-primary border border-revix-border">
                          {v.sippCode}
                        </span>
                        <span className="text-[11px] font-medium text-revix-secondary">
                          {CATEGORY_LABELS[v.category]?.[isRtl ? "ar" : "en"] ?? v.category}
                        </span>
                      </div>
                      <h3 className="mt-1 text-base font-bold text-revix-dark">
                        {v.make} {v.model} <span className="font-normal text-revix-secondary">{v.modelYear}</span>
                      </h3>
                      <p className="text-xs text-revix-secondary">
                        {v.trim}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        v.status === "active"
                          ? "bg-revix-accent-soft text-revix-accent"
                          : "bg-revix-surface text-revix-muted"
                      }`}
                    >
                      {v.status === "active" ? (isRtl ? "نشط بالكتالوج" : "Active") : (isRtl ? "مؤرشف" : "Archived")}
                    </span>
                  </div>

                  {/* Technical Specifications Badge Summary */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="rounded-md bg-revix-surface px-2 py-1 font-mono text-[11px] font-semibold text-revix-primary border border-revix-border">
                      SIPP: {v.sippCode}
                    </span>
                    <span className="rounded-md bg-revix-surface px-2 py-1 text-[11px] font-medium text-revix-secondary border border-revix-border">
                      {CATEGORY_LABELS[v.category]?.[isRtl ? "ar" : "en"] ?? v.category}
                    </span>
                    <span className="rounded-md bg-revix-surface px-2 py-1 text-[11px] font-medium text-revix-muted border border-revix-border">
                      {v.modelYear}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex items-center justify-between border-t border-revix-border/60 pt-3">
                  <span className="text-[11px] text-revix-muted">
                    {isRtl ? "قالب فئة معتمد" : "Catalog Template"}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(v)}
                      className="rounded-md border border-revix-border bg-revix-white px-2.5 py-1 text-xs font-medium text-revix-dark transition hover:bg-revix-surface"
                    >
                      {isRtl ? "تعديل المواصفات" : "Edit Specs"}
                    </button>
                    {v.status === "active" && (
                      <button
                        type="button"
                        onClick={() => setPendingArchiveVariant(v)}
                        className="rounded-md px-2 py-1 text-xs text-revix-muted transition hover:bg-revix-alert-soft hover:text-revix-alert"
                        title={isRtl ? "أرشفة الموديل" : "Archive Variant"}
                      >
                        <RevixIcon name="trash-2" className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Unified Pagination */}
          <div className="overflow-hidden rounded-xl border border-revix-border bg-revix-white shadow-2xs">
            <RevixPagination
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
                <p className="mt-0.5 text-xs text-revix-secondary">
                  {isRtl
                    ? "توثيق المواصفات الفنية للسيارة بدون أي أسعار أو أرقام شاسيه."
                    : "Record technical specifications without pricing or chassis data."}
                </p>
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

                {/* Make & Model */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-revix-dark mb-1">
                      {isRtl ? "الماركة / الشركة المصنعة" : "Make"} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formMake}
                      onChange={(e) => setFormMake(e.target.value)}
                      placeholder={isRtl ? "Toyota, Hyundai, Nissan..." : "Toyota, Hyundai..."}
                      className="h-9 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs text-revix-dark placeholder-revix-muted focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-revix-dark mb-1">
                      {isRtl ? "الموديل" : "Model"} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formModel}
                      onChange={(e) => setFormModel(e.target.value)}
                      placeholder={isRtl ? "Camry, Elantra, Sunny..." : "Camry, Elantra..."}
                      className="h-9 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs text-revix-dark placeholder-revix-muted focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                </div>

                {/* Year, Trim, Category & SIPP */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-revix-dark mb-1">
                      {isRtl ? "سنة الصنع" : "Year"} *
                    </label>
                    <input
                      type="number"
                      required
                      min={1990}
                      max={2040}
                      value={formYear}
                      onChange={(e) => setFormYear(Number(e.target.value))}
                      className="h-9 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-revix-dark mb-1">
                      {isRtl ? "الفئة / Trim" : "Trim"}
                    </label>
                    <input
                      type="text"
                      value={formTrim}
                      onChange={(e) => setFormTrim(e.target.value)}
                      placeholder="GLX, Standard, Executive"
                      className="h-9 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-revix-dark mb-1">
                      {isRtl ? "التصنيف" : "Category"}
                    </label>
                    <RevixSelect
                      size="sm"
                      isRtl={isRtl}
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as any)}
                      buttonClassName="h-9 rounded-lg text-xs"
                      options={[
                        { value: "sedan", label: isRtl ? "سيدان" : "Sedan" },
                        { value: "suv", label: isRtl ? "دفع رباعي / SUV" : "SUV" },
                        { value: "luxury", label: isRtl ? "فاخرة" : "Luxury" },
                        { value: "compact", label: isRtl ? "اقتصادية" : "Compact" },
                        { value: "commercial", label: isRtl ? "تجاري" : "Commercial" },
                        { value: "van", label: isRtl ? "فان / عائلي" : "Van" },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-revix-dark mb-1">
                      {isRtl ? "كود SIPP" : "SIPP Code"}
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
