"use client";

import React, { useState, useMemo } from "react";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixPagination } from "@/components/ui/RevixPagination";
import { RevixConfirmModal } from "@/components/shared/workspace";
import { usePersistedPage } from "@/lib/workspace/usePersistedPage";
import {
  useListRentalInclusionsQuery,
  useCreateRentalInclusionMutation,
  useUpdateRentalInclusionMutation,
  useDeleteRentalInclusionMutation,
  type RentalInclusionDto,
} from "../../store/api/fleetApi";
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
  const [updateInclusion, { isLoading: isUpdating }] = useUpdateRentalInclusionMutation();
  const [deleteInclusion, { isLoading: isDeleting }] = useDeleteRentalInclusionMutation();

  const inclusions = useMemo(() => inclusionsRes?.data ?? [], [inclusionsRes?.data]);
  const totalCount = inclusionsRes?.pagination?.totalItems ?? inclusions.length;
  const filteredInclusions = inclusions;
  const paginatedInclusions = inclusions;

  const activeCount = inclusions.filter((i) => i.isActive).length;

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
    } catch (err: any) {
      setFormError(err?.data?.error?.message || (isAr ? "تعذر حفظ الميزة." : "Failed to save feature."));
    }
  };

  const handleToggleStatus = async (item: RentalInclusionDto) => {
    setFormError(null);
    try {
      await updateInclusion({
        id: item.id,
        data: { isActive: !item.isActive },
      }).unwrap();
    } catch (err: any) {
      setFormError(err?.data?.error?.message || "Failed to update status.");
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
    } catch (err: any) {
      setDeleteError(err?.data?.error?.message || "Failed to delete.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20" dir={isAr ? "rtl" : "ltr"}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <button
            type="button"
            onClick={() => dispatch(navigateToWorkspacePage({ section: "fleet", subPage: "vehicles" }))}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-emerald-800 mb-1 transition-colors"
          >
            <RevixIcon name="arrow-left" className={`w-3.5 h-3.5 ${isAr ? "rotate-180" : ""}`} />
            <span>{isAr ? "الرجوع لسجل الأسطول" : "Back to Fleet"}</span>
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {isAr ? "مزايا التأجير والعقود (What is included)" : "What is Included Features"}
            </h1>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {totalCount} {isAr ? "ميزة" : "Features"}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {isAr
              ? "تعريف وإدارة قائمة المزايا والتغطيات التأمينية المشمولة في عقود التأجير، والتي تظهر في القوائم المنسدلة عند إضافة سيارات الأسطول."
              : "Define and manage rental inclusions and insurance coverages selectable when registering vehicles."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 shadow-2xs transition hover:bg-gray-50 active:scale-95 disabled:opacity-50"
          >
            <RevixIcon
              name="refresh-cw"
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-emerald-700" : "text-gray-400"}`}
            />
            <span>{isAr ? "تحديث" : "Refresh"}</span>
          </button>

          <button
            type="button"
            onClick={() => dispatch(navigateToWorkspacePage({ section: "fleet", subPage: "add-vehicle" }))}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 px-3.5 text-xs font-semibold text-white shadow-2xs transition active:scale-95"
          >
            <RevixIcon name="plus" className="h-4 w-4" />
            <span>{isAr ? "إضافة سيارة للأصول" : "Add Vehicle to Fleet"}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {formError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-700 flex items-center gap-2.5 shadow-2xs">
          <RevixIcon name="info" className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-700 flex items-center gap-2.5 shadow-2xs">
          <RevixIcon name="check-circle-2" className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ====================================================================== */}
      {/* CARD 1: + Add New Included Feature (Matches User Screenshot Exact Design) */}
      {/* ====================================================================== */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
        <div className="p-5">
          <button
            type="button"
            onClick={() => setIsAddFormOpen(!isAddFormOpen)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100/70 rounded-lg text-xs font-bold transition mb-4"
          >
            <RevixIcon name="plus" className="w-3.5 h-3.5" />
            <span>{isAr ? "+ إضافة ميزة مشمولة جديدة" : "+ Add New Included Feature"}</span>
          </button>

          {isAddFormOpen && (
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    required
                    value={featureName}
                    onChange={(e) => setFeatureName(e.target.value)}
                    placeholder={
                      isAr
                        ? "مثال: Free Cancellation, GPS Navigation, إلغاء مجاني..."
                        : "e.g. Free Cancellation, GPS Navigation..."
                    }
                    className="w-full h-[46px] px-4 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/15 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreating || !featureName.trim()}
                  className="h-[46px] px-6 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition active:scale-95 shrink-0"
                >
                  <RevixIcon name="plus" className="w-4 h-4" />
                  <span>{isCreating ? (isAr ? "جاري الحفظ..." : "Saving...") : isAr ? "+ حفظ الميزة" : "+ Save Feature"}</span>
                </button>
              </div>

              <input
                type="text"
                value={featureDesc}
                onChange={(e) => setFeatureDesc(e.target.value)}
                placeholder={
                  isAr
                    ? "وصف توضيحي اختياري للميزة (يظهر للعميل في تفاصيل الحجز)..."
                    : "Optional feature details or terms..."
                }
                className="w-full h-[38px] px-3.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-emerald-700 transition"
              />
            </form>
          )}
        </div>
      </div>

      {/* ====================================================================== */}
      {/* CARD 2: All Included Features Table (Matches User Screenshot Exact Design) */}
      {/* ====================================================================== */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
        {/* Table Toolbar Header */}
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-gray-900 tracking-tight">
              {isAr ? "جميع المزايا والتغطيات المشمولة" : "All Included Features"}
            </h2>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 font-mono text-xs font-bold rounded-full">
              {filteredInclusions.length}
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-gray-400">
              <RevixIcon name="search" className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={isAr ? "بحث في المزايا المشمولة..." : "Search included features..."}
              className="w-full h-9 ps-9 pe-3 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-700 transition"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3.5 px-6 text-start">
                  {isAr ? "اسم الميزة والتغطية" : "Feature Name"}
                </th>
                <th className="py-3.5 px-6 text-center w-36">
                  {isAr ? "الحالة" : "Status"}
                </th>
                <th className="py-3.5 px-6 text-end w-28">
                  {isAr ? "الإجراءات" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-gray-400 text-xs">
                    <RevixIcon name="refresh-cw" className="w-6 h-6 animate-spin mx-auto text-emerald-700 mb-2" />
                    <span>{isAr ? "جاري تحميل قائمة المزايا..." : "Loading features..."}</span>
                  </td>
                </tr>
              ) : filteredInclusions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-gray-400 text-xs">
                    <p className="font-semibold text-gray-700 text-sm">
                      {isAr ? "لا توجد مزايا مطابقة لبحثك" : "No matching features found"}
                    </p>
                    <p className="mt-1">
                      {isAr ? "أضف ميزة جديدة باستخدام النموذج في الأعلى" : "Add a new feature using the form above"}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedInclusions.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/70 transition-colors group"
                  >
                    {/* Feature Name with Checkmark */}
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                            item.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-gray-100 text-gray-400 border border-gray-200"
                          }`}
                        >
                          <RevixIcon name="check" className="w-3 h-3 stroke-[2.5]" />
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                            {item.name}
                          </span>
                          {item.description && (
                            <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Status Pill Badge */}
                    <td className="py-3.5 px-6 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        title={isAr ? "اضغط لتبديل الحالة" : "Click to toggle status"}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition active:scale-95 ${
                          item.isActive
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 border border-emerald-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200/80 border border-gray-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.isActive ? "bg-emerald-500" : "bg-gray-400"
                          }`}
                        />
                        <span>{item.isActive ? (isAr ? "نشط" : "Active") : isAr ? "معطل" : "Inactive"}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-6 text-end">
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title={isAr ? "حذف الميزة" : "Delete feature"}
                      >
                        <RevixIcon name="trash-2" className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Unified Pagination */}
        <RevixPagination
          currentPage={page}
          totalItems={totalCount}
          pageSize={pageSize}
          onPageChange={setPage}
          lang={lang}
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
