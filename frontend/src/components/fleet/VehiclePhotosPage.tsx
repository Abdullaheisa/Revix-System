"use client";
import NextImage from "next/image";

import { getApiErrorMessage } from "@/lib/api/errors";
import React, { useState, useRef, useEffect } from "react";
import {
  useListVehiclePhotosQuery,
  useUploadVehiclePhotoMutation,
  useUpdateVehiclePhotoMutation,
  useReplaceVehiclePhotoMutation,
  useDeleteVehiclePhotoMutation,
  useListVehiclesQuery,
  useListVariantsQuery,
  useApplyVariantListingSetupMutation,
  type VehiclePhotoDto,
} from "../../store/api/fleetApi";
import { resolveAssetUrl } from "../../store/api/baseApi";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixPagination } from "@/components/ui/RevixPagination";
import { RevixConfirmModal, StudioModal } from "@/components/shared/workspace";
import { usePersistedPage } from "@/lib/workspace/usePersistedPage";

interface VehiclePhotosPageProps {
  lang?: "ar" | "en";
}

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const VehiclePhotosPage: React.FC<VehiclePhotosPageProps> = ({ lang = "ar" }) => {
  const isAr = lang === "ar";

  const [vehicleName, setVehicleName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = usePersistedPage("fleet/vehicle-photos");
  const pageSize = 30;
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<VehiclePhotoDto | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingDeletePhoto, setPendingDeletePhoto] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [unavailablePhotoIds, setUnavailablePhotoIds] = useState<string[]>([]);

  const { data: photosRes, isLoading: isPhotosLoading } = useListVehiclePhotosQuery({
    search: search.trim() || undefined,
    page,
    pageSize,
  });
  const { data: vehiclesRes } = useListVehiclesQuery();
  const { data: variantsRes } = useListVariantsQuery();
  const [uploadPhoto, { isLoading: isUploading }] = useUploadVehiclePhotoMutation();
  const [updatePhoto, { isLoading: isUpdating }] = useUpdateVehiclePhotoMutation();
  const [replacePhoto, { isLoading: isReplacing }] = useReplaceVehiclePhotoMutation();
  const [deletePhoto, { isLoading: isDeleting }] = useDeleteVehiclePhotoMutation();
  const [applyVariantSetup, { isLoading: isSyncingPhotos }] =
    useApplyVariantListingSetupMutation();
  const isSavingModal = isUploading || isUpdating || isReplacing;

  // Clean up object URL on change or unmount
  useEffect(() => {
    return () => {
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
      }
    };
  }, [previewObjectUrl]);

  const photos = photosRes?.data || [];
  const vehicles = vehiclesRes?.data || [];

  // KPIs
  const totalVehicles = vehicles.length;
  const vehiclesWithPhotos = vehicles.filter(
    (v) =>
      v.photoUrl ||
      photos.some((p) =>
        `${v.variant?.make} ${v.variant?.model}`.toLowerCase().includes(p.vehicleName.toLowerCase()),
      ),
  ).length;
  const vehiclesWithoutPhotos = Math.max(0, totalVehicles - vehiclesWithPhotos);

  const totalPhotos = photosRes?.pagination?.totalItems ?? photos.length;
  const filteredPhotos = photos;
  const paginatedPhotos = photos;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError(null);
    const file = e.target.files?.[0] || null;
    if (!file) {
      setSelectedFile(null);
      setPreviewObjectUrl(null);
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setFormError(
        isAr
          ? "صيغة الصورة غير مدعومة. يرجى اختيار صورة PNG أو JPG أو WebP."
          : "Unsupported image format. Please select PNG, JPG, or WebP.",
      );
      e.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFormError(
        isAr
          ? "حجم الصورة كبير جداً. الحد الأقصى المسموح به هو 5 ميجابايت."
          : "Image size exceeds the 5 MB limit.",
      );
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    setPreviewObjectUrl(URL.createObjectURL(file));
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setPreviewObjectUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openCreateModal = () => {
    setEditingPhoto(null);
    setVehicleName("");
    handleClearFile();
    setFormError(null);
    setIsUploadOpen(true);
  };

  const openEditModal = (photo: VehiclePhotoDto) => {
    setEditingPhoto(photo);
    setVehicleName(photo.vehicleName);
    handleClearFile();
    setFormError(null);
    setIsUploadOpen(true);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!vehicleName.trim()) {
      setFormError(isAr ? "يرجى إدخال اسم الصورة / السيارة" : "Image / Vehicle name is required.");
      return;
    }

    if (!editingPhoto && !selectedFile) {
      setFormError(isAr ? "يرجى اختيار صورة من الجهاز" : "Please choose an image file from your device.");
      return;
    }

    try {
      if (editingPhoto) {
        if (selectedFile) {
          await replacePhoto({
            id: editingPhoto.id,
            vehicleName: vehicleName.trim(),
            file: selectedFile,
          }).unwrap();
          setUnavailablePhotoIds((ids) => ids.filter((id) => id !== editingPhoto.id));
        } else {
          await updatePhoto({
            id: editingPhoto.id,
            vehicleName: vehicleName.trim(),
          }).unwrap();
        }
        setSuccessMessage(
          isAr ? "تم تحديث بيانات الصورة بنجاح!" : "Photo updated successfully!",
        );
      } else {
        await uploadPhoto({
          vehicleName: vehicleName.trim(),
          file: selectedFile!,
        }).unwrap();
        setSuccessMessage(
          isAr ? "تم رفع وحفظ الصورة بنجاح بالكتالوج!" : "Photo uploaded and saved to catalog!",
        );
      }

      setVehicleName("");
      setEditingPhoto(null);
      handleClearFile();
      setIsUploadOpen(false);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: unknown) {
      setFormError(
        getApiErrorMessage(err) || (isAr ? "حدث خطأ أثناء حفظ الصورة" : "Failed to save photo."),
      );
    }
  };

  const handleSyncPhotosToVehicles = async (targetPhoto?: { vehicleName: string; photoUrl: string }) => {
    setFormError(null);
    setSuccessMessage(null);
    const variantsList = variantsRes?.data ?? [];
    const sourcePhotos = targetPhoto ? [targetPhoto] : photos;
    let updatedTotal = 0;

    try {
      for (const photoItem of sourcePhotos) {
        const needle = photoItem.vehicleName.trim().toLowerCase();
        if (!needle) continue;
        const matchedVariants = variantsList.filter((v) => {
          const fullTitle = `${v.make} ${v.model} ${v.trim ?? ""} ${v.modelYear}`
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
          const makeModel = `${v.make} ${v.model}`.trim().toLowerCase();
          return (
            fullTitle === needle ||
            fullTitle.includes(needle) ||
            needle.includes(makeModel)
          );
        });
        for (const variant of matchedVariants) {
          const res = await applyVariantSetup({
            variantId: variant.id,
            photoUrl: photoItem.photoUrl,
          }).unwrap();
          updatedTotal += res.data.updatedCount;
        }
      }
      setSuccessMessage(
        updatedTotal > 0
          ? isAr
            ? `تم تحديث الصور لـ ${updatedTotal} سيارة بنجاح!`
            : `Synced photos to ${updatedTotal} vehicle(s) successfully!`
          : isAr
            ? "لم يتم العثور على سيارات مطابقة لاسم الصورة في الأسطول."
            : "No matching fleet vehicles found for the photo name.",
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setFormError(
        getApiErrorMessage(err) || (isAr ? "تعذر تحديث صور السيارات" : "Failed to sync photos."),
      );
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteError(null);
    setPendingDeletePhoto({ id, name });
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeletePhoto) return;
    setDeleteError(null);
    try {
      await deletePhoto(pendingDeletePhoto.id).unwrap();
      setPendingDeletePhoto(null);
    } catch (err: unknown) {
      setDeleteError(getApiErrorMessage(err) || "Failed to delete");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pb-8" dir={isAr ? "rtl" : "ltr"}>
      {/* Clean Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
            {isAr ? "مكتبة وصور السيارات" : "Vehicle Photos"}
          </h1>
          <span className="rounded-md bg-revix-surface px-2 py-0.5 font-mono text-xs font-semibold text-revix-secondary">
            {totalPhotos}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-56">
            <RevixIcon
              name="search"
              className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-revix-muted ltr:left-3 rtl:right-3"
            />
            <input
              type="search"
              placeholder={isAr ? "بحث بالاسم أو الموديل..." : "Search photos by vehicle name..."}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-lg border border-revix-border bg-revix-white text-xs text-revix-dark placeholder-revix-muted focus:border-revix-primary focus:outline-hidden ltr:pl-9 ltr:pr-3 rtl:pl-3 rtl:pr-9"
            />
          </div>

          <button
            type="button"
            disabled={isSyncingPhotos || photos.length === 0}
            onClick={() => void handleSyncPhotosToVehicles()}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-700/30 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
          >
            <RevixIcon name="refresh-cw" className={`w-3.5 h-3.5 ${isSyncingPhotos ? "animate-spin" : ""}`} />
            <span>{isAr ? "تحديث صور كل السيارات" : "Sync All Photos"}</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-revix-primary-hover transition-colors"
          >
            <RevixIcon name="plus" size={14} />
            <span>{isAr ? "رفع صورة جديدة" : "Upload Photo"}</span>
          </button>
        </div>
      </div>

      {formError && !isUploadOpen && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
          <RevixIcon name="info" className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
          <RevixIcon name="check-circle-2" className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Vehicle Photo Catalog Section */}
      <div className="space-y-4">
        {isPhotosLoading ? (
          <div className="p-12 text-center text-gray-400 bg-white rounded-xl border border-gray-200">
            <div className="inline-block animate-spin w-6 h-6 border-2 border-emerald-700 border-t-transparent rounded-full mb-2" />
            <p className="text-sm">{isAr ? "جاري تحميل الصور..." : "Loading photos..."}</p>
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
              <RevixIcon name="car-front" className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-800 text-sm">
              {isAr ? "لا توجد صور مطابقة" : "No photos found"}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              {isAr
                ? "قم برفع صورة سيارة من الجهاز بالاسم أعلاه لربطها بالأسطول"
                : "Upload a vehicle photo from your device above to link it with fleet assets."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {paginatedPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden flex flex-col hover:border-emerald-700/40 transition group"
                >
                  {/* Compact Image Canvas */}
                  <div className="relative h-24 bg-gray-50/80 p-2 flex items-center justify-center border-b border-gray-100">
                    <div className="absolute top-1.5 end-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        title={isAr ? "تعديل الصورة" : "Edit photo"}
                        onClick={() => openEditModal(photo)}
                        className="w-6 h-6 rounded bg-white/95 hover:bg-emerald-50 text-gray-500 hover:text-emerald-700 border border-gray-200 flex items-center justify-center shadow-2xs cursor-pointer"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        disabled={isDeleting}
                        title={isAr ? "حذف الصورة" : "Delete photo"}
                        onClick={() => handleDelete(photo.id, photo.vehicleName)}
                        className="w-6 h-6 rounded bg-white/95 hover:bg-rose-50 text-gray-500 hover:text-rose-600 border border-gray-200 flex items-center justify-center shadow-2xs disabled:opacity-40 cursor-pointer"
                      >
                        <RevixIcon name="trash-2" className="w-3 h-3" />
                      </button>
                    </div>

                    {unavailablePhotoIds.includes(photo.id) ? (
                      <div role="img" aria-label={isAr ? "الصورة غير متاحة" : "Image unavailable"} className="flex h-full w-full flex-col items-center justify-center gap-1 text-center text-[10px] text-gray-500 px-1">
                        <RevixIcon name="car-front" className="h-5 w-5 text-gray-400" />
                        <span className="line-clamp-2">{isAr ? "الصورة غير متاحة — اضغط تعديل" : "Unavailable — click Edit"}</span>
                      </div>
                    ) : (
                      <NextImage unoptimized width={320} height={240}
                        src={resolveAssetUrl(photo.photoUrl)}
                        alt={photo.vehicleName}
                        onError={() => setUnavailablePhotoIds((ids) => ids.includes(photo.id) ? ids : [...ids, photo.id])}
                        className="max-h-full max-w-full object-contain drop-shadow-xs group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    )}
                  </div>

                  {/* Compact Card Info */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between gap-2">
                    <h3
                      title={photo.vehicleName}
                      className="font-bold text-gray-900 text-xs truncate group-hover:text-emerald-800 transition-colors"
                    >
                      {photo.vehicleName}
                    </h3>

                    <div className="flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(photo)}
                        className="cursor-pointer rounded border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-600 hover:border-emerald-700/40 hover:text-emerald-800 transition-colors"
                      >
                        {isAr ? "تعديل" : "Edit"}
                      </button>
                      <button
                        type="button"
                        disabled={isSyncingPhotos}
                        onClick={() => void handleSyncPhotosToVehicles(photo)}
                        className="cursor-pointer rounded border border-emerald-700/25 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 transition-colors truncate"
                      >
                        {isAr ? "تطبيق" : "Apply"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden empty:hidden">
              <RevixPagination
                currentPage={page}
                totalItems={totalPhotos}
                pageSize={pageSize}
                onPageChange={setPage}
                lang={lang}
                itemLabel={isAr ? "صورة" : "photos"}
              />
            </div>
          </>
        )}
      </div>

      <StudioModal
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          setEditingPhoto(null);
        }}
        title={
          editingPhoto
            ? isAr
              ? "تعديل بيانات أو ملف الصورة"
              : "Edit Vehicle Photo"
            : isAr
              ? "رفع صورة سيارة جديدة"
              : "Upload Vehicle Photo"
        }
      >
        <form onSubmit={handleUpload} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
              <RevixIcon name="info" className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-revix-dark mb-1">
              {isAr ? "اسم الصورة (الماركة + الموديل) *" : "Image / Vehicle Name *"}
            </label>
            <input
              type="text"
              placeholder={isAr ? "مثال: BMW 3 Series" : "e.g., BMW 3 Series"}
              value={vehicleName}
              onChange={(e) => setVehicleName(e.target.value)}
              className="h-9 w-full rounded-lg border border-revix-border px-3"
            />
          </div>

          <div>
            <label className="block font-semibold text-revix-dark mb-1">
              {editingPhoto
                ? isAr
                  ? "استبدال ملف الصورة (اختياري — PNG, JPG, WebP)"
                  : "Replace Photo File (optional)"
                : isAr
                  ? "ملف الصورة (PNG, JPG, WebP) *"
                  : "Photo File *"}
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileChange}
                className="hidden"
                id="vehicle-photo-file-input"
              />
              <label
                htmlFor="vehicle-photo-file-input"
                className="flex-1 flex items-center justify-between h-9 px-3 bg-white border border-dashed border-revix-border hover:border-revix-primary rounded-lg text-revix-secondary cursor-pointer transition"
              >
                <span className="truncate">
                  {selectedFile
                    ? selectedFile.name
                    : editingPhoto
                      ? isAr
                        ? "اتركه فارغاً للإبقاء على الصورة الحالية..."
                        : "Leave empty to keep current image..."
                      : isAr
                        ? "اختر صورة من الجهاز..."
                        : "Choose image from device..."}
                </span>
                <span className="px-2 py-0.5 bg-emerald-50 text-revix-primary rounded text-[11px] font-semibold shrink-0 ms-2">
                  {isAr ? "استعراض" : "Browse"}
                </span>
              </label>

              {selectedFile && (
                <button
                  type="button"
                  onClick={handleClearFile}
                  className="h-9 px-2.5 text-gray-400 hover:text-rose-600 border border-revix-border rounded-lg"
                >
                  <RevixIcon name="close" className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {(previewObjectUrl && selectedFile) || (editingPhoto && !unavailablePhotoIds.includes(editingPhoto.id)) ? (
            <div className="p-2.5 bg-revix-surface border border-revix-border rounded-lg flex items-center gap-3">
              <div className="w-16 h-12 bg-white border border-revix-border rounded overflow-hidden flex items-center justify-center shrink-0">
                <NextImage
                  unoptimized
                  width={320}
                  height={240}
                  src={previewObjectUrl && selectedFile ? previewObjectUrl : resolveAssetUrl(editingPhoto!.photoUrl)}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-revix-dark truncate">
                  {vehicleName.trim() || selectedFile?.name || editingPhoto?.vehicleName}
                </p>
                <p className="text-[11px] text-revix-secondary">
                  {selectedFile
                    ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                    : isAr
                      ? "الصورة الحالية"
                      : "Current photo"}
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-revix-border pt-3">
            <button
              type="button"
              onClick={() => {
                setIsUploadOpen(false);
                setEditingPhoto(null);
              }}
              className="h-9 cursor-pointer rounded-lg border border-revix-border px-4 font-semibold text-revix-secondary hover:bg-revix-surface"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSavingModal}
              className="h-9 cursor-pointer rounded-lg bg-revix-primary px-4 font-semibold text-white hover:bg-revix-primary-hover disabled:opacity-50"
            >
              {isSavingModal
                ? isAr
                  ? "جاري الحفظ..."
                  : "Saving..."
                : editingPhoto
                  ? isAr
                    ? "حفظ التعديلات"
                    : "Save Changes"
                  : isAr
                    ? "رفع وحفظ"
                    : "Upload & Save"}
            </button>
          </div>
        </form>
      </StudioModal>

      <RevixConfirmModal
        isOpen={Boolean(pendingDeletePhoto)}
        isRtl={isAr}
        title={isAr ? "تأكيد حذف الصورة" : "Confirm Delete Photo"}
        message={
          pendingDeletePhoto
            ? isAr
              ? `هل أنت متأكد من حذف صورة "${pendingDeletePhoto.name}"؟`
              : `Are you sure you want to delete the photo for "${pendingDeletePhoto.name}"?`
            : ""
        }
        isLoading={isDeleting}
        errorMessage={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setPendingDeletePhoto(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
};
