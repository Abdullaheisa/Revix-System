"use client";

import { DataTable } from "@/components/ui/DataTable";
import { TableEmptyRow } from "@/components/ui/EmptyState";
import { useMemo, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { parseFleetResourceRoute, priceListVariantHref } from "@/lib/workspace/resourceRoutes";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormField";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixSelect } from "@/components/ui/RevixSelect";
import {
  StudioModal,
  MasterFormModal,
  MASTER_INPUT_CLASS,
  MASTER_LABEL_CLASS,
} from "@/components/shared/workspace";
import { ResourceFeedback } from "@/components/shared/ResourceFeedback";
import {
  useCreateFleetPriceListMutation,
  useDeleteFleetPriceListMutation,
  useListFleetPriceListsQuery,
  useListVariantsQuery,
  useListVehiclesQuery,
  useUpdateVariantPricingMutation,
  type FleetPriceListDto,
} from "@/store/api/fleetApi";
import { useGetWorkspaceContextQuery } from "@/store/api/workspaceApi";
import { extractApiErrorCode } from "@/store/api/baseApi";
import { getApiErrorMessage } from "@/lib/api/errors";

export interface PriceListPanelProps {
  isRtl: boolean;
  branchId?: string;
  baseCurrency?: string;
}

interface BranchPriceRow {
  branchKey: string;
  branchName: string;
  branchCurrency: string;
  totalCount: number;
  availableCount: number;
  dailyRate1to2: number;
  dailyRate3to7: number;
  dailyRate8Plus: number;
  damageExcess: number;
  vehicleCodes: string[];
}

interface VariantPriceRow {
  variantId: string;
  title: string;
  sippCode: string;
  totalCount: number;
  availableCount: number;
  vehicleCodes: string[];
  dailyRate1to2: number;
  dailyRate3to7: number;
  dailyRate8Plus: number;
  damageExcess: number;
  minRate1to2: number;
  maxRate1to2: number;
  minRate3to7: number;
  maxRate3to7: number;
  minRate8Plus: number;
  maxRate8Plus: number;
  minDamageExcess: number;
  maxDamageExcess: number;
  branches: BranchPriceRow[];
}

interface EditingTarget {
  variantId: string;
  title: string;
  totalCount: number;
  branchKey?: string;
  branchLabel?: string;
  currency: string;
  dailyRate1to2: number;
  dailyRate3to7: number;
  dailyRate8Plus: number;
  damageExcess: number;
}

function formatPriceOrRange(minVal: number, maxVal: number, curr: string) {
  if (minVal === maxVal) {
    return `${minVal.toLocaleString()} ${curr}`;
  }
  return `${minVal.toLocaleString()} – ${maxVal.toLocaleString()} ${curr}`;
}

function formatDisplayDate(iso: string | null): string {
  if (!iso) return "—";
  const parts = iso.slice(0, 10).split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

export function PriceListPanel({
  isRtl,
  branchId,
  baseCurrency,
}: PriceListPanelProps) {
  const { data: ctxData } = useGetWorkspaceContextQuery();
  const company = ctxData?.data?.company ?? null;
  const workspaceBranches = useMemo(
    () => ctxData?.data?.branches ?? [],
    [ctxData?.data?.branches],
  );
  const scopeType = ctxData?.data?.membership?.scopeType ?? "all_branches";
  const isAllBranchesViewer =
    scopeType !== "assigned_branches" && company?.operatingMode !== "local_partner";
  const defaultCurrency = company?.baseCurrency || baseCurrency || "EGP";

  // Master Price Lists Queries & Mutations
  const { data: priceListsResp, isLoading: isLoadingPriceLists } = useListFleetPriceListsQuery();
  const [createPriceList, { isLoading: isCreatingList }] = useCreateFleetPriceListMutation();
  const [deletePriceList] = useDeleteFleetPriceListMutation();

  // Mode: "lists" | "rates" — open directly on Price List rates
  const [mode, setMode] = useState<"lists" | "rates">("rates");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [openedList, setOpenedList] = useState<FleetPriceListDto | null>(null);
  const [listSearch, setListSearch] = useState("");

  // Create Price List Form State
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const nextYearIso = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 5);
    return d.toISOString().slice(0, 10);
  }, []);
  const [plName, setPlName] = useState("");
  const [plType, setPlType] = useState("spot");
  const [plCurrency, setPlCurrency] = useState("");
  const effectivePlCurrency = plCurrency || defaultCurrency;
  const [plFrom, setPlFrom] = useState(todayIso);
  const [plTo, setPlTo] = useState(nextYearIso);
  const [plPriceType, setPlPriceType] = useState("daily_bands");
  const [plError, setPlError] = useState<string | null>(null);

  // Variant Rates Matrix Queries & State
  const { data: vehiclesResp, isLoading: isLoadingVehicles } = useListVehiclesQuery(
    branchId ? { branchId, pageSize: 500 } : { pageSize: 500 },
  );
  const { data: variantsResp, isLoading: isLoadingVariants } = useListVariantsQuery();
  const [updateVariantPricing, { isLoading: isUpdating }] =
    useUpdateVariantPricingMutation();

  const router = useRouter();
  const pathname = usePathname();
  const resourceRoute = parseFleetResourceRoute(pathname);
  const selectedVariantId =
    resourceRoute?.resource === "price-list" ? resourceRoute.id : null;
  const setSelectedVariantId = (id: string | null) => {
    router.push(priceListVariantHref(id));
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [editingTarget, setEditingTarget] = useState<EditingTarget | null>(null);
  const [dailyRate1to2, setDailyRate1to2] = useState<number>(0);
  const [dailyRate3to7, setDailyRate3to7] = useState<number>(0);
  const [dailyRate8to30, setDailyRate8to30] = useState<number>(0);
  const [damageExcess, setDamageExcess] = useState<number>(0);
  const [formError, setFormError] = useState<string | undefined>();

  const priceLists = useMemo(() => {
    const saved = priceListsResp?.data ?? [];
    if (saved.length > 0) return saved;
    return [
      {
        id: "__default_spot__",
        companyId: company?.id ?? "",
        name: "Price List",
        priceListType: "spot",
        currencyCode: defaultCurrency,
        effectiveFrom: todayIso,
        effectiveTo: nextYearIso,
        priceType: "daily_bands",
        isActive: true,
        createdAt: todayIso,
        updatedAt: todayIso,
      },
    ];
  }, [priceListsResp?.data, company?.id, isRtl, defaultCurrency, todayIso, nextYearIso]);

  const filteredPriceLists = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return priceLists;
    return priceLists.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.currencyCode.toLowerCase().includes(q),
    );
  }, [priceLists, listSearch]);

  const vehicles = useMemo(
    () => (vehiclesResp?.data ?? []).filter((v) => !v.isPartnerVehicle),
    [vehiclesResp?.data],
  );
  const variants = useMemo(() => variantsResp?.data ?? [], [variantsResp?.data]);

  const branchCurrencyById = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of workspaceBranches) {
      map.set(b.id, b.currencyCode || defaultCurrency);
    }
    return map;
  }, [workspaceBranches, defaultCurrency]);

  const variantRows = useMemo<VariantPriceRow[]>(() => {
    const map = new Map<
      string,
      {
        variantId: string;
        title: string;
        sippCode: string;
        totalCount: number;
        availableCount: number;
        vehicleCodes: string[];
        branchesMap: Map<string, BranchPriceRow>;
      }
    >();

    for (const v of vehicles) {
      const vid = v.variantId;
      const vr = v.variant || variants.find((x) => x.id === vid);
      const title = vr
        ? `${vr.make} ${vr.model} ${vr.trim} ${vr.modelYear}`.replace(/\s+/g, " ").trim()
        : isRtl
          ? "فئة غير محددة"
          : "Unknown Variant";

      let group = map.get(vid);
      if (!group) {
        group = {
          variantId: vid,
          title,
          sippCode: vr?.sippCode || "—",
          totalCount: 0,
          availableCount: 0,
          vehicleCodes: [],
          branchesMap: new Map<string, BranchPriceRow>(),
        };
        map.set(vid, group);
      }

      group.totalCount += 1;
      if (v.status === "available") group.availableCount += 1;
      if (v.assetCode && !group.vehicleCodes.includes(v.assetCode)) {
        group.vehicleCodes.push(v.assetCode);
      }

      const bKey = v.branchId || "__unassigned__";
      const bName =
        v.branchName || (isRtl ? "مخزون الشركة (غير منقول)" : "Company Stock");
      const bCurr =
        (v.branchId ? branchCurrencyById.get(v.branchId) : undefined) || defaultCurrency;

      const r1 = Number(v.dailyRate1to2 ?? 0);
      const r3 = Number(v.dailyRate3to7 ?? 0);
      const r8 = Number(v.dailyRate8Plus ?? 0);
      const dmg = Number(v.damageExcess ?? 0);

      let bRow = group.branchesMap.get(bKey);
      if (!bRow) {
        bRow = {
          branchKey: bKey,
          branchName: bName,
          branchCurrency: bCurr,
          totalCount: 1,
          availableCount: v.status === "available" ? 1 : 0,
          dailyRate1to2: r1,
          dailyRate3to7: r3,
          dailyRate8Plus: r8,
          damageExcess: dmg,
          vehicleCodes: v.assetCode ? [v.assetCode] : [],
        };
        group.branchesMap.set(bKey, bRow);
      } else {
        bRow.totalCount += 1;
        if (v.status === "available") bRow.availableCount += 1;
        if (v.assetCode && !bRow.vehicleCodes.includes(v.assetCode)) {
          bRow.vehicleCodes.push(v.assetCode);
        }
        if (bRow.dailyRate1to2 === 0 && r1 > 0) {
          bRow.dailyRate1to2 = r1;
          bRow.dailyRate3to7 = r3;
          bRow.dailyRate8Plus = r8;
          bRow.damageExcess = dmg;
        }
      }
    }

    const result: VariantPriceRow[] = [];
    for (const g of map.values()) {
      const branches = Array.from(g.branchesMap.values()).sort((a, b) =>
        a.branchName.localeCompare(b.branchName),
      );
      const r1Vals = branches.map((b) => b.dailyRate1to2);
      const r3Vals = branches.map((b) => b.dailyRate3to7);
      const r8Vals = branches.map((b) => b.dailyRate8Plus);
      const dmgVals = branches.map((b) => b.damageExcess);

      result.push({
        variantId: g.variantId,
        title: g.title,
        sippCode: g.sippCode,
        totalCount: g.totalCount,
        availableCount: g.availableCount,
        vehicleCodes: g.vehicleCodes,
        dailyRate1to2: branches[0]?.dailyRate1to2 ?? 0,
        dailyRate3to7: branches[0]?.dailyRate3to7 ?? 0,
        dailyRate8Plus: branches[0]?.dailyRate8Plus ?? 0,
        damageExcess: branches[0]?.damageExcess ?? 0,
        minRate1to2: Math.min(...r1Vals),
        maxRate1to2: Math.max(...r1Vals),
        minRate3to7: Math.min(...r3Vals),
        maxRate3to7: Math.max(...r3Vals),
        minRate8Plus: Math.min(...r8Vals),
        maxRate8Plus: Math.max(...r8Vals),
        minDamageExcess: Math.min(...dmgVals),
        maxDamageExcess: Math.max(...dmgVals),
        branches,
      });
    }

    return result.sort((a, b) => a.title.localeCompare(b.title));
  }, [vehicles, variants, branchCurrencyById, defaultCurrency, isRtl]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return variantRows;
    return variantRows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.sippCode.toLowerCase().includes(q) ||
        r.vehicleCodes.some((c) => c.toLowerCase().includes(q)) ||
        r.branches.some((b) => b.branchName.toLowerCase().includes(q)),
    );
  }, [variantRows, searchQuery]);

  const selectedVariantRow = useMemo(
    () =>
      selectedVariantId
        ? variantRows.find((r) => r.variantId === selectedVariantId) ?? null
        : null,
    [variantRows, selectedVariantId],
  );

  function openEditModal(target: EditingTarget) {
    setEditingTarget(target);
    setDailyRate1to2(target.dailyRate1to2);
    setDailyRate3to7(target.dailyRate3to7);
    setDailyRate8to30(target.dailyRate8Plus);
    setDamageExcess(target.damageExcess);
    setFormError(undefined);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!editingTarget) return;
    setFormError(undefined);
    try {
      await updateVariantPricing({
        variantId: editingTarget.variantId,
        dailyRate1to2: Number(dailyRate1to2) || 0,
        dailyRate3to7: Number(dailyRate3to7) || 0,
        dailyRate8Plus: Number(dailyRate8to30) || 0,
        damageExcess: Number(damageExcess) || 0,
        branchId: editingTarget.branchKey,
      }).unwrap();
      setEditingTarget(null);
    } catch (err) {
      setFormError(
        extractApiErrorCode(err) ??
          (isRtl ? "تعذر حفظ الأسعار" : "Failed to save prices"),
      );
    }
  }

  async function handleCreatePriceList(e: FormEvent) {
    e.preventDefault();
    setPlError(null);

    if (!plName.trim() || !effectivePlCurrency.trim()) {
      setPlError(
        isRtl
          ? "اسم قائمة الأسعار وكود العملة مطلوبان."
          : "Price list name and currency code are required.",
      );
      return;
    }

    try {
      await createPriceList({
        name: plName.trim(),
        priceListType: plType,
        currencyCode: effectivePlCurrency.trim().toUpperCase(),
        effectiveFrom: plFrom || null,
        effectiveTo: plTo || null,
        priceType: plPriceType,
      }).unwrap();

      setPlName("");
      setIsCreateModalOpen(false);
    } catch (err) {
      setPlError(
        getApiErrorMessage(err) ||
          (isRtl ? "تعذر إنشاء قائمة الأسعار." : "Failed to create price list."),
      );
    }
  }

  const isLoading = isLoadingVehicles || isLoadingVariants;

  // =========================================================================
  // VIEW 1: SPOT PRICE LISTS MASTER TABLE + POPUP CREATE MODAL
  // =========================================================================
  if (mode === "lists") {
    return (
      <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
        <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
              Price List
            </h1>
            <span className="rounded-md bg-revix-surface px-2 py-0.5 font-mono text-xs font-semibold text-revix-secondary">
              {filteredPriceLists.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-60">
              <RevixIcon
                name="search"
                size={14}
                className="pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-revix-secondary"
              />
              <input
                type="search"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder={isRtl ? "بحث باسم القائمة أو العملة..." : "Search price lists..."}
                className="h-9 w-full rounded-lg border border-revix-border bg-revix-white ps-9 pe-3 text-xs text-revix-dark placeholder:text-revix-muted focus:border-revix-primary focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setOpenedList(null);
                setMode("rates");
              }}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-revix-border bg-revix-white px-3 text-xs font-semibold text-revix-dark hover:border-revix-primary/40 hover:bg-revix-accent-soft/60 hover:text-revix-primary transition-colors"
            >
              <RevixIcon name="wallet" size={14} />
              <span>{isRtl ? "أسعار فئات الأسطول" : "Fleet Rates"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPlError(null);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 text-xs font-bold text-white shadow-xs hover:bg-revix-primary-hover transition-colors"
            >
              <RevixIcon name="plus" size={14} />
              <span>{isRtl ? "إنشاء قائمة أسعار" : "New Price List"}</span>
            </button>
          </div>
        </div>

        {isLoadingPriceLists ? (
          <ResourceFeedback isLoading isRtl={isRtl} />
        ) : (
          <div className="flex min-h-0 flex-initial flex-col overflow-hidden rounded-xl border border-revix-border bg-revix-white">
            <DataTable fitAvailableHeight className="text-xs">
              <thead>
                <tr className="border-b border-revix-border bg-revix-surface/75 text-[11.5px] font-semibold uppercase tracking-wide text-revix-secondary">
                  <th className="px-4 py-2.5 text-start">{isRtl ? "فتح" : "Link"}</th>
                  <th className="px-4 py-2.5 text-start">{isRtl ? "اسم قائمة الأسعار" : "PriceListName"}</th>
                  <th className="px-4 py-2.5 text-start">{isRtl ? "العملة" : "CurrencyCode"}</th>
                  <th className="px-4 py-2.5 text-start">{isRtl ? "تاريخ البداية" : "EffectiveFrom"}</th>
                  <th className="px-4 py-2.5 text-start">{isRtl ? "تاريخ النهاية" : "EffectiveTo"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-revix-border/75">
                {filteredPriceLists.map((pl) => (
                  <tr
                    key={pl.id}
                    onClick={() => {
                      setOpenedList(pl);
                      setMode("rates");
                    }}
                    className="cursor-pointer transition-colors hover:bg-revix-accent-soft/50"
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenedList(pl);
                          setMode("rates");
                        }}
                        className="cursor-pointer font-bold text-revix-primary hover:underline"
                      >
                        {isRtl ? "فتح" : "Open"}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-semibold text-revix-dark">{pl.name}</td>
                    <td className="px-4 py-3 font-mono font-bold text-revix-dark">
                      {pl.currencyCode}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-revix-dark" dir="ltr">
                      {formatDisplayDate(pl.effectiveFrom)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-revix-dark" dir="ltr">
                      {formatDisplayDate(pl.effectiveTo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        )}

        {/* Popup Create Price List Modal */}
        <MasterFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreatePriceList}
          isRtl={isRtl}
          maxWidthClass="max-w-2xl"
          title={isRtl ? "إنشاء قائمة أسعار جديدة" : "Create Price List"}
          errorMsg={plError}
          isSubmitting={isCreatingList}
          submitLabel={isRtl ? "حفظ القائمة" : "Save Price List"}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={MASTER_LABEL_CLASS}>
                {isRtl ? "اسم قائمة الأسعار *" : "Price List Name *"}
              </label>
              <input
                type="text"
                required
                value={plName}
                onChange={(e) => setPlName(e.target.value)}
                placeholder={
                  isRtl ? "مثال: تسعيرة المطار أو عقود الشركات" : "e.g. Spot Price List Airport"
                }
                className={MASTER_INPUT_CLASS}
              />
            </div>

            <div>
              <label className={MASTER_LABEL_CLASS}>
                {isRtl ? "نوع القائمة" : "Price List Type"}
              </label>
              <RevixSelect
                isRtl={isRtl}
                value={plType}
                onChange={(e) => setPlType(e.target.value)}
                options={[
                  { value: "spot", label: isRtl ? "تأجير فوري (Spot)" : "Spot Price List" },
                  { value: "airport", label: isRtl ? "تسعيرة المطار (Airport)" : "Airport Price List" },
                  { value: "leasing", label: isRtl ? "تأجير طويل الأجل (Leasing)" : "Leasing Price List" },
                  { value: "corporate", label: isRtl ? "شركات وتعاقدات (Corporate)" : "Corporate Price List" },
                ]}
                buttonClassName="h-10 w-full rounded-lg text-[13px]"
              />
            </div>

            <div>
              <label className={MASTER_LABEL_CLASS}>
                {isRtl ? "كود العملة *" : "Currency Code *"}
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={effectivePlCurrency}
                onChange={(e) => setPlCurrency(e.target.value.toUpperCase())}
                className={`${MASTER_INPUT_CLASS} font-mono font-bold uppercase`}
              />
            </div>

            <div>
              <label className={MASTER_LABEL_CLASS}>
                {isRtl ? "تاريخ البداية" : "Effective From"}
              </label>
              <input
                type="date"
                value={plFrom}
                onChange={(e) => setPlFrom(e.target.value)}
                className={MASTER_INPUT_CLASS}
              />
            </div>

            <div>
              <label className={MASTER_LABEL_CLASS}>
                {isRtl ? "تاريخ النهاية" : "Effective To"}
              </label>
              <input
                type="date"
                value={plTo}
                onChange={(e) => setPlTo(e.target.value)}
                className={MASTER_INPUT_CLASS}
              />
            </div>

            <div>
              <label className={MASTER_LABEL_CLASS}>
                {isRtl ? "طريقة التسعير *" : "Price Type *"}
              </label>
              <RevixSelect
                isRtl={isRtl}
                value={plPriceType}
                onChange={(e) => setPlPriceType(e.target.value)}
                options={[
                  {
                    value: "daily_bands",
                    label: isRtl
                      ? "شرائح أيام (1-2 / 3-7 / 8+ أيام)"
                      : "Daily Duration Bands (1-2 / 3-7 / 8+)",
                  },
                  { value: "flat_daily", label: isRtl ? "يومي ثابت (Flat Daily)" : "Flat Daily Rate" },
                  { value: "monthly", label: isRtl ? "تأجير شهري (Monthly)" : "Monthly Rate" },
                ]}
                buttonClassName="h-10 w-full rounded-lg text-[13px]"
              />
            </div>
          </div>
        </MasterFormModal>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: OPENED PRICE LIST — VARIANT & BRANCH RATES MATRIX
  // =========================================================================
  if (selectedVariantRow) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
        <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedVariantId(null)}
              title={isRtl ? "قائمة الأسعار" : "Price List"}
              className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-revix-border bg-white text-revix-secondary hover:bg-revix-surface transition-colors"
            >
              <RevixIcon name={isRtl ? "arrow-right" : "arrow-left"} size={14} />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-revix-dark">
                {selectedVariantRow.title}
              </h1>
              <p className="text-xs text-revix-secondary">
                {isRtl
                  ? `${selectedVariantRow.totalCount} سيارة — ${selectedVariantRow.branches.length} ${selectedVariantRow.branches.length === 1 ? "فرع" : "فروع"}`
                  : `${selectedVariantRow.totalCount} units — ${selectedVariantRow.branches.length} branch(es)`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              openEditModal({
                variantId: selectedVariantRow.variantId,
                title: selectedVariantRow.title,
                totalCount: selectedVariantRow.totalCount,
                branchKey: undefined,
                branchLabel: isRtl ? "جميع الفروع" : "All Branches",
                currency: openedList?.currencyCode || defaultCurrency,
                dailyRate1to2: selectedVariantRow.dailyRate1to2,
                dailyRate3to7: selectedVariantRow.dailyRate3to7,
                dailyRate8Plus: selectedVariantRow.dailyRate8Plus,
                damageExcess: selectedVariantRow.damageExcess,
              })
            }
            className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-revix-primary px-3.5 text-xs font-semibold text-white hover:bg-revix-primary-hover transition-colors"
          >
            {isRtl ? "توحيد السعر لكل الفروع" : "Set Price for All Branches"}
          </button>
        </div>

        <div className="flex min-h-0 flex-initial flex-col overflow-hidden rounded-xl border border-revix-border bg-revix-white">
          <DataTable fitAvailableHeight className="text-xs">
            <thead>
              <tr className="border-b border-revix-border bg-revix-surface/75 text-[11.5px] font-semibold uppercase tracking-wide text-revix-secondary">
                <th className="w-[1%] whitespace-nowrap px-4 py-2.5 text-start">Vehicle ID</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-start">{isRtl ? "الفرع / الموقع" : "Branch / Location"}</th>
                <th className="w-[1%] whitespace-nowrap px-4 py-2.5 text-center">{isRtl ? "عدد السيارات" : "Units"}</th>
                <th className="w-[1%] whitespace-nowrap px-4 py-2.5 text-center">{isRtl ? "1 - 2 يوم" : "1 - 2 Days"}</th>
                <th className="w-[1%] whitespace-nowrap px-4 py-2.5 text-center">{isRtl ? "3 - 7 أيام" : "3 - 7 Days"}</th>
                <th className="w-[1%] whitespace-nowrap px-4 py-2.5 text-center">{isRtl ? "8+ أيام" : "8+ Days"}</th>
                <th className="w-[1%] whitespace-nowrap px-4 py-2.5 text-center">{isRtl ? "تحمل الأضرار" : "Damage Excess"}</th>
                <th className="w-[1%] whitespace-nowrap px-4 py-2.5 text-end">{isRtl ? "إجراء" : "Action"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-revix-border/80">
              {selectedVariantRow.branches.map((br) => (
                <tr key={br.branchKey} className="transition-colors hover:bg-revix-accent-soft/40">
                  <td className="whitespace-nowrap px-4 py-3 text-start">
                    {br.vehicleCodes.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1" dir="ltr">
                        {br.vehicleCodes.map((code) => (
                          <span
                            key={code}
                            className="rounded bg-revix-accent-soft px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-revix-primary"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-revix-muted">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-start font-semibold text-revix-dark">
                    {br.branchName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    <span className="font-mono font-bold text-revix-dark">{br.totalCount}</span>
                    <span className="ms-1.5 text-[11px] text-emerald-700">
                      ({isRtl ? `متاح ${br.availableCount}` : `${br.availableCount} avail`})
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center font-mono font-semibold text-revix-dark">
                    <span dir="ltr" className="inline-block">
                      {br.dailyRate1to2.toLocaleString()} {br.branchCurrency}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center font-mono text-revix-dark">
                    <span dir="ltr" className="inline-block">
                      {br.dailyRate3to7.toLocaleString()} {br.branchCurrency}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center font-mono text-revix-dark">
                    <span dir="ltr" className="inline-block">
                      {br.dailyRate8Plus.toLocaleString()} {br.branchCurrency}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center font-mono text-revix-secondary">
                    <span dir="ltr" className="inline-block">
                      {br.damageExcess.toLocaleString()} {br.branchCurrency}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end">
                    <button
                      type="button"
                      onClick={() =>
                        openEditModal({
                          variantId: selectedVariantRow.variantId,
                          title: selectedVariantRow.title,
                          totalCount: br.totalCount,
                          branchKey: br.branchKey,
                          branchLabel: br.branchName,
                          currency: br.branchCurrency,
                          dailyRate1to2: br.dailyRate1to2,
                          dailyRate3to7: br.dailyRate3to7,
                          dailyRate8Plus: br.dailyRate8Plus,
                          damageExcess: br.damageExcess,
                        })
                      }
                      className="cursor-pointer rounded-[6px] border border-revix-border bg-revix-white px-2.5 py-1 text-[12px] font-medium text-revix-dark transition-colors hover:border-revix-primary/40 hover:bg-revix-accent-soft hover:text-revix-primary"
                    >
                      {isRtl ? "تعديل سعر الفرع" : "Edit Branch Price"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>

        <StudioModal
          isOpen={Boolean(editingTarget)}
          onClose={() => setEditingTarget(null)}
          maxWidthClass="max-w-3xl"
          title={
            editingTarget
              ? `${editingTarget.title} — ${editingTarget.branchLabel} (${editingTarget.totalCount} ${isRtl ? "سيارة" : "units"})`
              : isRtl
                ? "تعديل الأسعار"
                : "Edit Price"
          }
        >
          {formError ? (
            <div className="mb-4">
              <Alert
                variant="error"
                title={isRtl ? "تعذّر الحفظ" : "Unable to save"}
                message={formError}
                onClose={() => setFormError(undefined)}
              />
            </div>
          ) : null}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <FormInput
                type="number"
                min={0}
                label={isRtl ? `1 - 2 يوم (${editingTarget?.currency ?? defaultCurrency})` : `1 - 2 Days (${editingTarget?.currency ?? defaultCurrency})`}
                value={dailyRate1to2 || ""}
                onChange={(e) => setDailyRate1to2(Number(e.target.value) || 0)}
                required
              />
              <FormInput
                type="number"
                min={0}
                label={isRtl ? `3 - 7 أيام (${editingTarget?.currency ?? defaultCurrency})` : `3 - 7 Days (${editingTarget?.currency ?? defaultCurrency})`}
                value={dailyRate3to7 || ""}
                onChange={(e) => setDailyRate3to7(Number(e.target.value) || 0)}
              />
              <FormInput
                type="number"
                min={0}
                label={isRtl ? `8+ أيام (${editingTarget?.currency ?? defaultCurrency})` : `8+ Days (${editingTarget?.currency ?? defaultCurrency})`}
                value={dailyRate8to30 || ""}
                onChange={(e) => setDailyRate8to30(Number(e.target.value) || 0)}
              />
              <FormInput
                type="number"
                min={0}
                label={isRtl ? `تحمل الأضرار (${editingTarget?.currency ?? defaultCurrency})` : `Damage Excess (${editingTarget?.currency ?? defaultCurrency})`}
                value={damageExcess || ""}
                onChange={(e) => setDamageExcess(Number(e.target.value) || 0)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditingTarget(null)}>
                {isRtl ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" isLoading={isUpdating}>
                {isRtl ? "حفظ الأسعار" : "Save Prices"}
              </Button>
            </div>
          </form>
        </StudioModal>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
            {openedList ? openedList.name : "Price List"}
          </h1>
          <span className="rounded-md bg-revix-surface px-2 py-0.5 font-mono text-xs font-semibold text-revix-secondary">
            {filteredRows.length}
          </span>
        </div>
        <div className="relative w-56">
          <RevixIcon
            name="search"
            className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-revix-muted ltr:left-3 rtl:right-3"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRtl ? "بحث بالفريانت أو الفرع..." : "Search variant or branch..."}
            className="h-9 w-full rounded-lg border border-revix-border bg-revix-white text-xs text-revix-dark placeholder-revix-muted focus:border-revix-primary focus:outline-hidden ltr:pl-9 ltr:pr-3 rtl:pl-3 rtl:pr-9"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-initial flex-col overflow-hidden rounded-xl border border-revix-border bg-revix-white">
        <DataTable fitAvailableHeight className="text-xs">
          <thead>
            <tr className="border-b border-revix-border bg-revix-surface/75 text-[11.5px] font-semibold uppercase tracking-wide text-revix-secondary">
              <th className="whitespace-nowrap px-4 py-2.5 text-start">{isRtl ? "الفريانت / الفئة" : "Model Variant"}</th>
              <th className="w-[1%] whitespace-nowrap px-4 py-2.5 text-center">{isRtl ? "إجمالي السيارات" : "Total Units"}</th>
              <th className="w-[1%] whitespace-nowrap px-4 py-2.5 text-center">{isRtl ? "1 - 2 يوم" : "1 - 2 Days"}</th>
              <th className="w-[1%] whitespace-nowrap px-4 py-2.5 text-center">{isRtl ? "3 - 7 أيام" : "3 - 7 Days"}</th>
              <th className="w-[1%] whitespace-nowrap px-4 py-2.5 text-center">{isRtl ? "8+ أيام" : "8+ Days"}</th>
              <th className="w-[1%] whitespace-nowrap px-4 py-2.5 text-center">{isRtl ? "تحمل الأضرار" : "Damage Excess"}</th>
              <th className="w-[1%] whitespace-nowrap px-4 py-2.5 text-end">{isRtl ? "إجراء" : "Action"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-revix-border/80">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[13px] text-revix-secondary">
                  {isRtl ? "جاري التحميل..." : "Loading..."}
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <TableEmptyRow
                colSpan={7}
                title={isRtl ? "لا توجد فئات سيارات مسجلة بعد" : "No variants found"}
                description={
                  isRtl
                    ? "ستظهر فئات السيارات هنا لتحديد أسعارها اليومية حسب المدة والفرع."
                    : "Vehicle variants will appear here to configure daily rates by tier and branch."
                }
              />
            ) : (
              filteredRows.map((row) => {
                const hasMultipleBranches = isAllBranchesViewer && row.branches.length > 1;
                const rowCurrency =
                  openedList?.currencyCode || row.branches[0]?.branchCurrency || defaultCurrency;
                return (
                  <tr
                    key={row.variantId}
                    onClick={() => {
                      if (isAllBranchesViewer) setSelectedVariantId(row.variantId);
                    }}
                    className={`transition-colors hover:bg-revix-accent-soft/40 ${
                      isAllBranchesViewer ? "cursor-pointer" : ""
                    }`}
                  >
                    <td className="whitespace-nowrap px-3.5 py-3 text-start">
                      <span className="font-semibold text-revix-dark">{row.title}</span>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-3 text-center">
                      <span className="font-mono font-bold text-revix-dark">{row.totalCount}</span>
                      <span className="ms-1.5 text-[11px] text-emerald-700">
                        ({isRtl ? `متاح ${row.availableCount}` : `${row.availableCount} avail`})
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-3 text-center font-mono font-semibold text-revix-dark">
                      <span dir="ltr" className="inline-block">
                        {formatPriceOrRange(row.minRate1to2, row.maxRate1to2, rowCurrency)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-3 text-center font-mono text-revix-dark">
                      <span dir="ltr" className="inline-block">
                        {formatPriceOrRange(row.minRate3to7, row.maxRate3to7, rowCurrency)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-3 text-center font-mono text-revix-dark">
                      <span dir="ltr" className="inline-block">
                        {formatPriceOrRange(row.minRate8Plus, row.maxRate8Plus, rowCurrency)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-3 text-center font-mono text-revix-secondary">
                      <span dir="ltr" className="inline-block">
                        {formatPriceOrRange(row.minDamageExcess, row.maxDamageExcess, rowCurrency)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-3 text-end" onClick={(e) => e.stopPropagation()}>
                      {hasMultipleBranches || isAllBranchesViewer ? (
                        <button
                          type="button"
                          onClick={() => setSelectedVariantId(row.variantId)}
                          className="cursor-pointer whitespace-nowrap rounded-[6px] border border-revix-border bg-revix-white px-2.5 py-1 text-[12px] font-medium text-revix-dark transition-colors hover:border-revix-primary/40 hover:bg-revix-accent-soft hover:text-revix-primary"
                        >
                          {isRtl ? "أسعار الفروع" : "Branch Prices"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            openEditModal({
                              variantId: row.variantId,
                              title: row.title,
                              totalCount: row.totalCount,
                              branchKey: undefined,
                              branchLabel: row.branches[0]?.branchName,
                              currency: rowCurrency,
                              dailyRate1to2: row.dailyRate1to2,
                              dailyRate3to7: row.dailyRate3to7,
                              dailyRate8Plus: row.dailyRate8Plus,
                              damageExcess: row.damageExcess,
                            })
                          }
                          className="cursor-pointer whitespace-nowrap rounded-[6px] border border-revix-border bg-revix-white px-2.5 py-1 text-[12px] font-medium text-revix-dark transition-colors hover:border-revix-primary/40 hover:bg-revix-accent-soft hover:text-revix-primary"
                        >
                          {isRtl ? "تعديل السعر" : "Edit Price"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </DataTable>
      </div>

      <StudioModal
        isOpen={Boolean(editingTarget)}
        onClose={() => setEditingTarget(null)}
        maxWidthClass="max-w-3xl"
        title={
          editingTarget
            ? `${editingTarget.title}${editingTarget.branchLabel ? ` — ${editingTarget.branchLabel}` : ""} (${editingTarget.totalCount} ${isRtl ? "سيارة" : "units"})`
            : isRtl
              ? "تعديل الأسعار"
              : "Edit Price"
        }
      >
        {formError ? (
          <div className="mb-4">
            <Alert
              variant="error"
              title={isRtl ? "تعذّر الحفظ" : "Unable to save"}
              message={formError}
              onClose={() => setFormError(undefined)}
            />
          </div>
        ) : null}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FormInput
              type="number"
              min={0}
              label={isRtl ? `1 - 2 يوم (${editingTarget?.currency ?? defaultCurrency})` : `1 - 2 Days (${editingTarget?.currency ?? defaultCurrency})`}
              value={dailyRate1to2 || ""}
              onChange={(e) => setDailyRate1to2(Number(e.target.value) || 0)}
              required
            />
            <FormInput
              type="number"
              min={0}
              label={isRtl ? `3 - 7 أيام (${editingTarget?.currency ?? defaultCurrency})` : `3 - 7 Days (${editingTarget?.currency ?? defaultCurrency})`}
              value={dailyRate3to7 || ""}
              onChange={(e) => setDailyRate3to7(Number(e.target.value) || 0)}
            />
            <FormInput
              type="number"
              min={0}
              label={isRtl ? `8+ أيام (${editingTarget?.currency ?? defaultCurrency})` : `8+ Days (${editingTarget?.currency ?? defaultCurrency})`}
              value={dailyRate8to30 || ""}
              onChange={(e) => setDailyRate8to30(Number(e.target.value) || 0)}
            />
            <FormInput
              type="number"
              min={0}
              label={isRtl ? `تحمل الأضرار (${editingTarget?.currency ?? defaultCurrency})` : `Damage Excess (${editingTarget?.currency ?? defaultCurrency})`}
              value={damageExcess || ""}
              onChange={(e) => setDamageExcess(Number(e.target.value) || 0)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditingTarget(null)}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="submit" isLoading={isUpdating}>
              {isRtl ? "حفظ الأسعار" : "Save Prices"}
            </Button>
          </div>
        </form>
      </StudioModal>
    </div>
  );
}
