"use client";

import { getApiErrorMessage } from "@/lib/api/errors";

import { useEffect, useMemo, useRef, useState } from "react";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { RevixPagination } from "@/components/ui/RevixPagination";
import { RevixConfirmModal } from "@/components/shared/workspace";
import { usePersistedPage } from "@/lib/workspace/usePersistedPage";
import { useCreateVehicleMakeMutation, useCreateVehicleModelMutation, useCreateVariantMutation, useDeleteVariantMutation, useListVehicleMakesQuery, useListVariantsQuery, useUpdateVariantMutation, type VehicleCategory, type VehicleVariantDto } from "@/store/api/fleetApi";

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

const DEFAULT_VEHICLE_CATALOG: Record<string, string[]> = {
  Toyota: ["Camry", "Corolla", "RAV4", "Land Cruiser", "Hilux", "Yaris", "Prado"],
  Hyundai: ["Elantra", "Sonata", "Tucson", "Santa Fe", "Accent", "Creta"],
  Nissan: ["Sunny", "Altima", "Patrol", "X-Trail", "Kicks", "Sentra"],
  Kia: ["Cerato", "K5", "Sportage", "Sorento", "Pegas", "Carnival"],
  Chevrolet: ["Malibu", "Tahoe", "Suburban", "Captiva", "Spark"],
  Ford: ["Taurus", "Explorer", "Expedition", "Territory", "F-150"],
  Mercedes: ["C-Class", "E-Class", "S-Class", "GLC", "GLE"],
  BMW: ["3 Series", "5 Series", "7 Series", "X3", "X5"],
  Honda: ["Civic", "Accord", "CR-V", "HR-V", "Pilot"],
  Mitsubishi: ["Attrage", "Lancer", "Outlander", "Pajero", "L200"],
};

interface CatalogComboboxProps {
  value: string;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  isRtl: boolean;
  onChange: (val: string) => void;
  onAddNew: (val: string) => void;
  addNewLabel: (val: string) => string;
}

function CatalogCombobox({ value, options, placeholder, disabled = false, isRtl, onChange, onAddNew, addNewLabel }: CatalogComboboxProps) {
  const [open, setOpen] = useState(false);
  const [queryOverride, setQuery] = useState<string | null>(null);
  const query = open ? (queryOverride ?? value) : value;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, query]);

  const trimmedQuery = query.trim();
  const exactMatch = options.some(
    (opt) => opt.toLowerCase() === trimmedQuery.toLowerCase(),
  );

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          disabled={disabled}
          value={query}
          onFocus={() => !disabled && setOpen(true)}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            onChange(next);
            setOpen(true);
          }}
          placeholder={placeholder}
          className="h-9 w-full rounded-lg border border-revix-border bg-revix-white px-3 pe-8 text-xs text-revix-dark placeholder-revix-muted focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors disabled:bg-revix-surface/60 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          tabIndex={-1}
          className="absolute inset-y-0 end-0 flex items-center px-2.5 text-revix-muted hover:text-revix-dark disabled:opacity-50"
        >
          <RevixIcon name="chevron-down" className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && !disabled && (
        <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-revix-border bg-revix-white py-1 shadow-lg">
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setQuery(opt);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors ${
                opt.toLowerCase() === value.toLowerCase()
                  ? "bg-revix-primary/10 font-semibold text-revix-primary"
                  : "text-revix-dark hover:bg-revix-surface"
              }`}
            >
              <span>{opt}</span>
              {opt.toLowerCase() === value.toLowerCase() && (
                <RevixIcon name="check" className="h-3.5 w-3.5" />
              )}
            </button>
          ))}

          {trimmedQuery && !exactMatch && (
            <button
              type="button"
              onClick={() => {
                onAddNew(trimmedQuery);
                onChange(trimmedQuery);
                setQuery(trimmedQuery);
                setOpen(false);
              }}
              className="flex w-full items-center gap-1.5 border-t border-revix-border/60 px-3 py-2 text-xs font-semibold text-revix-primary hover:bg-revix-primary/10 transition-colors"
            >
              <RevixIcon name="plus" className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{addNewLabel(trimmedQuery)}</span>
            </button>
          )}

          {filtered.length === 0 && !trimmedQuery && (
            <div className="px-3 py-2 text-xs text-revix-muted">
              {isRtl ? "اكتب اسم للبحث أو الإضافة" : "Type to search or add new"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [formYear, setFormYear] = useState(new Date().getFullYear());
  const [formTrim, setFormTrim] = useState("Standard");
  const [customDisplayName, setFormDisplayName] = useState("");
  const [isDisplayNameCustom, setIsDisplayNameCustom] = useState(false);
  const [formCategory, setFormCategory] = useState<VehicleCategory>("sedan");
  const [formSipp, setFormSipp] = useState("ICAR");
  const [formError, setFormError] = useState<string | null>(null);

  // Database-backed Manufacturers & Models Catalog
  const { data: makesResponse } = useListVehicleMakesQuery();
  const [createVehicleMake] = useCreateVehicleMakeMutation();
  const [createVehicleModel] = useCreateVehicleModelMutation();
  const dbMakes = useMemo(() => makesResponse?.data ?? [], [makesResponse?.data]);

  const handleStoreManufacturer = async (make: string) => {
    const clean = make.trim();
    if (!clean) return;
    try {
      await createVehicleMake({ name: clean }).unwrap();
    } catch {
      // Handled by RTK Query
    }
  };

  const handleStoreModel = async (make: string, model: string) => {
    const cleanMake = make.trim();
    const cleanModel = model.trim();
    if (!cleanMake || !cleanModel) return;
    try {
      let makeRecord = dbMakes.find(
        (m) => m.name.toLowerCase() === cleanMake.toLowerCase(),
      );
      if (!makeRecord) {
        const res = await createVehicleMake({ name: cleanMake }).unwrap();
        makeRecord = res.data;
      }
      await createVehicleModel({ makeId: makeRecord.id, name: cleanModel }).unwrap();
    } catch {
      // Handled by RTK Query
    }
  };

  const variants = useMemo(() => data?.data ?? [], [data?.data]);

  const catalogMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const addPair = (make: string, model?: string) => {
      const m = make.trim();
      if (!m) return;
      const existingKey = Array.from(map.keys()).find(
        (k) => k.toLowerCase() === m.toLowerCase(),
      );
      const key = existingKey ?? m;
      if (!map.has(key)) map.set(key, new Set());
      if (model?.trim()) {
        map.get(key)!.add(model.trim());
      }
    };

    Object.entries(DEFAULT_VEHICLE_CATALOG).forEach(([make, models]) => {
      addPair(make);
      models.forEach((model) => addPair(make, model));
    });
    dbMakes.forEach((make) => {
      addPair(make.name);
      make.models.forEach((model) => addPair(make.name, model.name));
    });
    variants.forEach((v) => addPair(v.make, v.model));

    return map;
  }, [dbMakes, variants]);

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
    setFormYear(new Date().getFullYear());
    setFormTrim("Standard");
    setFormDisplayName("");
    setIsDisplayNameCustom(false);
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

    const normMake = formMake.trim().toLowerCase();
    const normModel = formModel.trim().toLowerCase();
    const normTrim = (formTrim.trim() || "Standard").toLowerCase();
    const normSipp = (formSipp.trim() || "ICAR").toLowerCase();

    const duplicate = variants.find(
      (v) =>
        v.id !== editingVariant?.id &&
        v.make.trim().toLowerCase() === normMake &&
        v.model.trim().toLowerCase() === normModel &&
        v.modelYear === formYear &&
        v.trim.trim().toLowerCase() === normTrim &&
        v.category === formCategory &&
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
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
              {isRtl ? "موديل فريانت" : "Model Variant"}
            </h1>
          </div>
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
          <div className="overflow-hidden rounded-[8px] border border-revix-border bg-revix-white">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-start text-[13px]">
                <thead>
                  <tr className="border-b border-revix-border bg-revix-surface/75 text-[11.5px] font-semibold uppercase tracking-wide text-revix-secondary">
                    <th className="px-4 py-2.5 text-start">Variant ID</th>
                    <th className="px-4 py-2.5 text-start">
                      {isRtl ? "الاسم الكامل" : "Variant full name"}
                    </th>
                    <th className="px-4 py-2.5 text-start">
                      {isRtl ? "الشركة المصنعة" : "Manufacturer"}
                    </th>
                    <th className="px-4 py-2.5 text-start">
                      {isRtl ? "الموديل" : "Model name"}
                    </th>
                    <th className="px-4 py-2.5 text-start">
                      {isRtl ? "السنة" : "Model Year"}
                    </th>
                    <th className="px-4 py-2.5 text-start">
                      {isRtl ? "الفئة" : "Body Style"}
                    </th>
                    <th className="px-4 py-2.5 text-start">SIPP</th>
                    <th className="px-4 py-2.5 text-end">
                      {isRtl ? "إجراء" : "Action"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-revix-border/80">
                  {paginatedVariants.map((v) => (
                    <tr
                      key={v.id}
                      className="transition-colors hover:bg-revix-surface/60"
                    >
                      <td className="px-4 py-3 font-mono text-[12px] font-semibold text-revix-secondary">
                        {v.variantCode ??
                          (() => {
                            let hash = 0;
                            for (let i = 0; i < v.id.length; i++) {
                              hash = (hash * 31 + v.id.charCodeAt(i)) >>> 0;
                            }
                            return `V${100 + (hash % 900)}`;
                          })()}
                      </td>
                      <td className="px-4 py-3 font-semibold text-revix-dark">
                        {v.make} {v.model}{" "}
                        {v.trim && v.trim.toLowerCase() !== "standard"
                          ? `${v.trim}${v.modelYear}`
                          : v.modelYear}
                      </td>
                      <td className="px-4 py-3 text-revix-dark">{v.make}</td>
                      <td className="px-4 py-3 text-revix-dark">{v.model}</td>
                      <td className="px-4 py-3 font-mono text-revix-dark">
                        {v.modelYear}
                      </td>
                      <td className="px-4 py-3 text-revix-secondary">
                        {CATEGORY_LABELS[v.category]?.[isRtl ? "ar" : "en"] ??
                          v.category}
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] font-semibold text-revix-primary">
                        {v.sippCode}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(v)}
                            className="cursor-pointer rounded-md border border-revix-border bg-revix-white px-2.5 py-1 text-xs font-medium text-revix-dark transition hover:bg-revix-surface"
                          >
                            {isRtl ? "تعديل" : "Edit Specs"}
                          </button>
                          {v.status === "active" && (
                            <button
                              type="button"
                              onClick={() => setPendingArchiveVariant(v)}
                              className="cursor-pointer rounded-md px-2 py-1 text-xs text-revix-muted transition hover:bg-revix-alert-soft hover:text-revix-alert"
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
              </table>
            </div>
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
                    <CatalogCombobox
                      value={formMake}
                      options={availableMakes}
                      isRtl={isRtl}
                      placeholder={isRtl ? "اختر أو أضف شركة..." : "Select or add make..."}
                      onChange={(val) => {
                        setFormMake(val);
                        if (val.trim().toLowerCase() !== formMake.trim().toLowerCase()) {
                          setFormModel("");
                        }
                      }}
                      onAddNew={(val) => handleStoreManufacturer(val)}
                      addNewLabel={(val) =>
                        isRtl ? `حفظ شركة "${val}"` : `Store "${val}"`
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-revix-dark mb-1">
                      {isRtl ? "الموديل" : "Model"} *
                    </label>
                    <CatalogCombobox
                      value={formModel}
                      options={availableModels}
                      disabled={!formMake.trim()}
                      isRtl={isRtl}
                      placeholder={
                        !formMake.trim()
                          ? isRtl
                            ? "اختر الشركة أولاً"
                            : "Select make first"
                          : isRtl
                            ? "اختر أو أضف موديل..."
                            : "Select or add model..."
                      }
                      onChange={(val) => setFormModel(val)}
                      onAddNew={(val) => handleStoreModel(formMake, val)}
                      addNewLabel={(val) =>
                        isRtl ? `حفظ موديل "${val}"` : `Store "${val}"`
                      }
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
                      onChange={(e) => setFormYear(Number(e.target.value))}
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
                      isRtl={isRtl}
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as VehicleCategory)}
                      buttonClassName="h-9 rounded-lg text-xs"
                      options={[
                        { value: "sedan", label: isRtl ? "سيدان (Sedan)" : "Sedan" },
                        { value: "suv", label: isRtl ? "SUV" : "SUV" },
                        { value: "commercial", label: isRtl ? "بيك أب (Pickup)" : "Pickup" },
                        { value: "van", label: isRtl ? "فان (Van)" : "Van" },
                        { value: "luxury", label: isRtl ? "باص (Bus)" : "Bus" },
                      ]}
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
