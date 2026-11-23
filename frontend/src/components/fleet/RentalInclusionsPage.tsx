"use client";

import { DataTable } from "@/components/ui/DataTable";
import { getApiErrorMessage } from "@/lib/api/errors";

import React, { useState, useMemo } from "react";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixPagination } from "@/components/ui/RevixPagination";
import { RevixConfirmModal } from "@/components/shared/workspace";
import { usePersistedPage } from "@/lib/workspace/usePersistedPage";
import { useListRentalInclusionsQuery, useCreateRentalInclusionMutation, useUpdateRentalInclusionMutation, useDeleteRentalInclusionMutation, type RentalInclusionDto } from "../../store/api/fleetApi";
import { useAppDispatch } from "../../store/hooks";
import { navigateToWorkspacePage } from "../../store/slices/workspaceSlice";

interface RentalInclusionsPageProps {
  lang?: "ar" | "en";
}

export const RentalInclusionsPage: React.FC<RentalInclusionsPageProps> = ({ lang = "ar" }) => {
  const isAr = lang === "ar";
  const dispatch = useAppDispatch();

  const [featureName, setFeatureName] = useState("");
  const [featureDesc, setFeatureDesc] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = usePersistedPage("fleet/rental-inclusions");
  const pageSize = 15;
  const [isAddFormOpen, setIsAddFormOpen] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<RentalInclusionDto | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: inclusionsRes, isLoading, refetch, isFetching } = useListRentalInclusionsQuery({
    search: search.trim() || undefined,
    page,
    pageSize,
  });
  const [createInclusion, { isLoading: isCreating }] = useCreateRentalInclusionMutation();
  const [updateInclusion, {  }] = useUpdateRentalInclusionMutation();
  const [deleteInclusion, { isLoading: isDeleting }] = useDeleteRentalInclusionMutation();

  const inclusions = useMemo(() => inclusionsRes?.data ?? [], [inclusionsRes?.data]);
  const totalCount = inclusionsRes?.pagination?.totalItems ?? inclusions.length;
  const filteredInclusions = inclusions;
  const paginatedInclusions = inclusions;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!featureName.trim()) {
      setFormError(isAr ? "يرجى إدخال اسم الميزة أو التغطية التأمينية." : "Feature name is required.");
      return;
    }

    try {
      await createInclusion({
        name: featureName.trim(),
        description: featureDesc.trim() || undefined,
        isActive: true,
      }).unwrap();

      setFeatureName("");
      setFeatureDesc("");
      setSuccessMessage(
        isAr ? "تمت إضافة الميزة بنجاح إلى قائمة المزايا المعتمدة!" : "Feature added successfully!",
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err) || (isAr ? "تعذر حفظ الميزة." : "Failed to save feature."));
    }
  };

  const handleToggleStatus = async (item: RentalInclusionDto) => {
    setFormError(null);
    try {
      await updateInclusion({
        id: item.id,
        data: { isActive: !item.isActive },
      }).unwrap();
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err) || "Failed to update status.");
    }
  };

  const handleDelete = (item: RentalInclusionDto) => {
    setDeleteError(null);
    setPendingDeleteItem(item);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteItem) return;
    setDeleteError(null);
    try {
      await deleteInclusion(pendingDeleteItem.id).unwrap();
      setPendingDeleteItem(null);
    } catch (err: unknown) {
      setDeleteError(getApiErrorMessage(err) || "Failed to delete.");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden" dir={isAr ? "rtl" : "ltr"}>
      {/* Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold text-revix-dark tracking-tight sm:text-2xl">
            {isAr ? "مزايا وتغطيات العقود" : "Rental Inclusions"}
          </h1>
          <span className="rounded-md bg-revix-surface px-2 py-0.5 font-mono text-xs font-semibold text-revix-secondary">
            {totalCount}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-52">
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
              placeholder={isAr ? "بحث في المزايا..." : "Search inclusions..."}
              className="h-9 w-full rounded-lg border border-revix-border bg-revix-white text-xs text-revix-dark placeholder-revix-muted focus:border-revix-primary focus:outline-hidden ltr:pl-9 ltr:pr-3 rtl:pl-3 rtl:pr-9"
            />
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label={isAr ? "تحديث" : "Refresh"}
            title={isAr ? "تحديث" : "Refresh"}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-revix-border bg-revix-white text-xs text-revix-dark shadow-xs transition hover:bg-revix-surface disabled:opacity-50"
          >
            <RevixIcon
              name="refresh-cw"
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-revix-primary" : "text-revix-secondary"}`}
            />
          </button>

          <button
            type="button"
            onClick={() => setIsAddFormOpen(!isAddFormOpen)}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 text-xs font-semibold text-white shadow-xs transition hover:bg-revix-primary-hover"
          >
            <RevixIcon name="plus" className="h-4 w-4" />
            <span>{isAr ? "إضافة ميزة" : "Add Feature"}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {formError && (
        <div className="shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 flex items-center gap-2">
          <RevixIcon name="info" className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {successMessage && (
        <div className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-700 flex items-center gap-2">
          <RevixIcon name="check-circle-2" className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {isAddFormOpen && (
        <form onSubmit={handleCreate} className="shrink-0 rounded-xl border border-revix-border bg-revix-white p-3.5 space-y-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <input
              type="text"
              required
              value={featureName}
              onChange={(e) => setFeatureName(e.target.value)}
              placeholder={
                isAr
                  ? "اسم الميزة (مثال: إلغاء مجاني، تأمين شامل، GPS)..."
                  : "Feature name (e.g. Free Cancellation, GPS)..."
              }
              className="h-9 flex-1 rounded-lg border border-revix-border bg-white px-3 text-xs text-revix-dark focus:border-revix-primary focus:outline-hidden"
            />
            <input
              type="text"
              value={featureDesc}
              onChange={(e) => setFeatureDesc(e.target.value)}
              placeholder={isAr ? "وصف اختياري..." : "Optional description..."}
              className="h-9 flex-1 rounded-lg border border-revix-border bg-white px-3 text-xs text-revix-dark focus:border-revix-primary focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={isCreating || !featureName.trim()}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-revix-primary px-4 text-xs font-semibold text-white hover:bg-revix-primary-hover disabled:opacity-50"
            >
              <RevixIcon name="check" className="w-3.5 h-3.5" />
              <span>{isCreating ? (isAr ? "جاري الحفظ..." : "Saving...") : isAr ? "حفظ" : "Save"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Table Card */}
      <div className="flex min-h-0 flex-initial flex-col overflow-hidden rounded-xl border border-revix-border bg-revix-white">
        <DataTable fitAvailableHeight className="text-xs">
          <thead>
            <tr className="border-b border-revix-border bg-revix-surface/70 text-revix-secondary font-semibold">
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">
                {isAr ? "اسم الميزة والتغطية" : "Feature Name"}
              </th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-center font-semibold w-36">
                {isAr ? "الحالة" : "Status"}
              </th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-center font-semibold w-24">
                {isAr ? "إجراءات" : "Actions"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-revix-border/60">
            {isLoading ? (
              <tr>
                <td colSpan={3} className="h-48 text-center text-xs text-revix-secondary">
                  {isAr ? "جاري التحميل..." : "Loading..."}
                </td>
              </tr>
            ) : filteredInclusions.length === 0 ? (
              <tr>
                <td colSpan={3} className="h-48 text-center text-sm text-revix-secondary">
                  {isAr ? "لا توجد مزايا مسجلة" : "No inclusions found"}
                </td>
              </tr>
            ) : (
              paginatedInclusions.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-revix-surface/60">
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-revix-dark">{item.name}</div>
                    {item.description && (
                      <div className="text-[11px] text-revix-secondary mt-0.5 line-clamp-1">
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition ${
                        item.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-revix-border bg-revix-surface text-revix-muted"
                      }`}
                    >
                      {item.isActive ? (isAr ? "نشط" : "Active") : isAr ? "معطل" : "Inactive"}
                    </button>
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50 transition"
                      title={isAr ? "حذف الميزة" : "Delete feature"}
                    >
                      <RevixIcon name="trash-2" className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>
      </div>

      {/* Unified Compact Pagination */}
      <div className="shrink-0 overflow-hidden rounded-lg border border-revix-border bg-revix-white empty:hidden">
        <RevixPagination compact
          currentPage={page}
          totalItems={totalCount}
          pageSize={pageSize}
          onPageChange={setPage}
          lang={lang}
          itemLabel={isAr ? "ميزة" : "features"}
        />
      </div>

      <RevixConfirmModal
        isOpen={Boolean(pendingDeleteItem)}
        isRtl={isAr}
        title={isAr ? "تأكيد الحذف" : "Confirm Delete"}
        message={
          pendingDeleteItem
            ? isAr
              ? `هل أنت متأكد من حذف "${pendingDeleteItem.name}"؟`
              : `Are you sure you want to delete "${pendingDeleteItem.name}"?`
            : ""
        }
        isLoading={isDeleting}
        errorMessage={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setPendingDeleteItem(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
};
