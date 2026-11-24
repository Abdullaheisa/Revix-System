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
  useCreateVehicleMakeMutation,
  useCreateVehicleModelMutation,
  useListVehicleMakesQuery,
} from "@/store/api/fleetApi";

export function VehicleModelsMasterPanel({ isRtl }: { isRtl: boolean }) {
  const { data, isLoading } = useListVehicleMakesQuery();
  const [createMake] = useCreateVehicleMakeMutation();
  const [createModel, { isLoading: isSaving }] = useCreateVehicleModelMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [makeName, setMakeName] = useState("");
  const [modelName, setModelName] = useState("");
  const [search, setSearch] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const dbMakes = useMemo(() => data?.data ?? [], [data?.data]);

  const allRows = useMemo(() => {
    const rows: Array<{
      id: string;
      makeName: string;
      modelName: string;
    }> = [];

    for (const make of dbMakes) {
      for (const mod of make.models) {
        rows.push({
          id: mod.id,
          makeName: make.name,
          modelName: mod.name,
        });
      }
    }

    return rows;
  }, [dbMakes]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter(
      (r) =>
        r.makeName.toLowerCase().includes(q) || r.modelName.toLowerCase().includes(q),
    );
  }, [allRows, search]);

  const openCreateModal = () => {
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!makeName.trim() || !modelName.trim()) {
      setErrorMsg(
        isRtl
          ? "يرجى إدخال الشركة المصنّعة واسم الموديل."
          : "Manufacturer (Make) and Model name are required.",
      );
      return;
    }

    try {
      const existingMake = dbMakes.find(
        (m) => m.name.toLowerCase() === makeName.trim().toLowerCase(),
      );
      const makeId = existingMake
        ? existingMake.id
        : (await createMake({ name: makeName.trim() }).unwrap()).data.id;

      await createModel({ makeId, name: modelName.trim() }).unwrap();

      setModelName("");
      setIsModalOpen(false);
    } catch (err) {
      setErrorMsg(
        getApiErrorMessage(err) || (isRtl ? "تعذر حفظ الموديل." : "Failed to save model."),
      );
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
            Model
          </h1>
          <span className="rounded-md bg-revix-surface px-2 py-0.5 font-mono text-xs font-semibold text-revix-secondary">
            {filteredRows.length}
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
              placeholder={isRtl ? "بحث بالماركة أو الموديل..." : "Search make or model..."}
              className="h-9 w-full rounded-lg border border-revix-border bg-revix-white ps-9 pe-3 text-xs text-revix-dark placeholder:text-revix-muted focus:border-revix-primary focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-revix-primary-hover"
          >
            <RevixIcon name="plus" size={14} />
            <span>{isRtl ? "إضافة موديل" : "Add Model"}</span>
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
                <th className="px-4 py-2.5 text-start">{isRtl ? "الشركة المصنّعة" : "Manufacturer (Make)"}</th>
                <th className="px-4 py-2.5 text-start">{isRtl ? "الموديل" : "Model"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-revix-border/70">
              {filteredRows.length === 0 ? (
                <TableEmptyRow
                  colSpan={2}
                  title={isRtl ? "لا توجد ماركات أو موديلات مسجلة بعد" : "No models added yet"}
                  description={
                    isRtl
                      ? "ابدأ بإضافة الماركات والموديلات الخاصة بشركتك لاستخدامها في كتالوج الفريان."
                      : "Add your company's manufacturers and models to use them in the Variant catalog."
                  }
                  actionLabel={search.trim() ? undefined : isRtl ? "إضافة موديل" : "Add Model"}
                  onAction={search.trim() ? undefined : openCreateModal}
                />
              ) : (
                filteredRows.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-revix-accent-soft/40">
                    <td className="px-4 py-2.5 font-bold text-revix-dark">{r.makeName}</td>
                    <td className="px-4 py-2.5 font-semibold text-revix-primary">{r.modelName}</td>
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
        title={isRtl ? "إضافة ماركة وموديل جديد" : "Add New Model"}
        errorMsg={errorMsg}
        isSubmitting={isSaving}
        submitLabel={isRtl ? "حفظ الموديل" : "Save Model"}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={MASTER_LABEL_CLASS}>
              {isRtl ? "الشركة المصنّعة (Make) *" : "Manufacturer (Make) *"}
            </label>
            <input
              type="text"
              required
              value={makeName}
              onChange={(e) => setMakeName(e.target.value)}
              placeholder={isRtl ? "مثال: Toyota" : "e.g. Toyota"}
              className={MASTER_INPUT_CLASS}
            />
          </div>

          <div>
            <label className={MASTER_LABEL_CLASS}>
              {isRtl ? "اسم الموديل *" : "Model Name *"}
            </label>
            <input
              type="text"
              required
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder={isRtl ? "مثال: Camry" : "e.g. Camry"}
              className={MASTER_INPUT_CLASS}
            />
          </div>
        </div>
      </MasterFormModal>
    </div>
  );
}
