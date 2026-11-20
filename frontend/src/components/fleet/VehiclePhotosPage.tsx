import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  useListVehiclePhotosQuery,
  useUploadVehiclePhotoMutation,
  useDeleteVehiclePhotoMutation,
  useListVehiclesQuery,
} from "../../store/api/fleetApi";
import { resolveAssetUrl } from "../../store/api/baseApi";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixPagination } from "@/components/ui/RevixPagination";
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
  const pageSize = 20;
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: photosRes, isLoading: isPhotosLoading } = useListVehiclePhotosQuery({
    search: search.trim() || undefined,
    page,
    pageSize,
  });
  const { data: vehiclesRes } = useListVehiclesQuery();
  const [uploadPhoto, { isLoading: isUploading }] = useUploadVehiclePhotoMutation();
  const [deletePhoto, { isLoading: isDeleting }] = useDeleteVehiclePhotoMutation();

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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!vehicleName.trim()) {
      setFormError(isAr ? "يرجى إدخال اسم الصورة / السيارة" : "Image / Vehicle name is required.");
      return;
    }
    if (!selectedFile) {
      setFormError(isAr ? "يرجى اختيار صورة من الجهاز" : "Please choose an image file from your device.");
      return;
    }

    try {
      await uploadPhoto({
        vehicleName: vehicleName.trim(),
        file: selectedFile,
      }).unwrap();

      setSuccessMessage(
        isAr ? "تم رفع وحفظ الصورة بنجاح بالكتالوج!" : "Photo uploaded and saved to catalog!",
      );
      setVehicleName("");
      handleClearFile();
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setFormError(
        err?.data?.error?.message || (isAr ? "حدث خطأ أثناء رفع الصورة" : "Failed to upload photo."),
      );
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(isAr ? `هل أنت متأكد من حذف صورة ${name}؟` : `Delete photo for ${name}?`)) {
      try {
        await deletePhoto(id).unwrap();
      } catch (err: any) {
        alert(err?.data?.error?.message || "Failed to delete");
      }
    }
  };

  return (
    <div className="space-y-8 pb-16" dir={isAr ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-xs">
            <RevixIcon name="car-front" className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {isAr ? "مكتبة وصور السيارات" : "Vehicle Photos"}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isAr
                ? "رفع وإدارة صور الأسطول من الجهاز بالاسم لربطها تلقائيًا بالسيارات."
                : "Upload and manage fleet vehicle photos from your device by name."}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {isAr ? "إجمالي سيارات الأسطول" : "Total Vehicles"}
            </p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{totalVehicles}</h3>
            <p className="text-xs text-gray-500 mt-1">
              {isAr ? "مسجلة بالأصول التشغيلية" : "In active fleet assets"}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <RevixIcon name="car-front" className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
              {isAr ? "سيارات بصور معتمدة" : "With Photos"}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-extrabold text-gray-900">{vehiclesWithPhotos}</h3>
              <span className="text-xs font-semibold text-emerald-600">
                {totalVehicles > 0 ? Math.round((vehiclesWithPhotos / totalVehicles) * 100) : 100}%
              </span>
            </div>
            <p className="text-xs text-emerald-600/80 mt-1">
              {isAr ? "مربوطة تلقائيًا بالكتالوج" : "Auto-matched from catalog"}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <RevixIcon name="check-circle-2" className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
              {isAr ? "سيارات بدون صور" : "Without Photos"}
            </p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{vehiclesWithoutPhotos}</h3>
            <p className="text-xs text-amber-600/80 mt-1">
              {isAr ? "بانتظار إضافة صورة بالاسم" : "Awaiting matched model photo"}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <RevixIcon name="info" className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Upload Vehicle Photo Card (Only Name + File from Device) */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RevixIcon name="car-front" className="w-5 h-5 text-emerald-700" />
            <h2 className="font-bold text-gray-900 text-base">
              {isAr ? "رفع وحفظ صورة سيارة بالكتالوج" : "Upload Vehicle Photo"}
            </h2>
          </div>
          <span className="text-xs text-gray-400">
            {isAr ? "الصور المرفوعة تصبح متاحة لجميع فروع الشركة" : "Available company-wide"}
          </span>
        </div>

        <form onSubmit={handleUpload} className="p-6 space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 flex items-center gap-2">
              <RevixIcon name="info" className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 flex items-center gap-2">
              <RevixIcon name="check-circle-2" className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Image / Vehicle Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isAr ? "اسم الصورة (الماركة + الموديل) *" : "IMAGE / VEHICLE NAME *"}
              </label>
              <input
                type="text"
                placeholder={isAr ? "مثال: Hyundai i20 أو Toyota Yaris" : "e.g., Hyundai i20, Toyota Yaris"}
                value={vehicleName}
                onChange={(e) => setVehicleName(e.target.value)}
                className="w-full h-[46px] px-3.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                {isAr
                  ? "سيتم مطابقة هذا الاسم ديناميكيًا عند إضافة السيارة للأصول"
                  : "Matched dynamically when registering a vehicle"}
              </span>
            </div>

            {/* 2. Choose Photo File from Device */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isAr ? "اختيار الصورة من الجهاز *" : "PHOTO FILE *"}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="sr-only"
                id="vehicle-photo-file-input"
              />
              <div className="flex items-center gap-2">
                <label
                  htmlFor="vehicle-photo-file-input"
                  className="flex-1 h-[46px] px-3.5 bg-white border border-dashed border-gray-300 hover:border-emerald-700 rounded-lg text-sm flex items-center justify-between gap-2 cursor-pointer transition"
                >
                  <span className={`truncate ${selectedFile ? "text-gray-900 font-medium" : "text-gray-400"}`}>
                    {selectedFile
                      ? selectedFile.name
                      : isAr
                        ? "اضغط لاختيار صورة من الجهاز (PNG, JPG, WebP)..."
                        : "Click to choose image from device (PNG, JPG, WebP)..."}
                  </span>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold shrink-0">
                    {isAr ? "اختيار ملف" : "Choose File"}
                  </span>
                </label>

                {selectedFile && (
                  <button
                    type="button"
                    onClick={handleClearFile}
                    title={isAr ? "إزالة الملف" : "Clear file"}
                    className="h-[46px] px-3 border border-gray-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 rounded-lg text-gray-500 transition shrink-0"
                  >
                    <RevixIcon name="x" className="w-4 h-4" />
                  </button>
                )}
              </div>
              <span className="text-[11px] text-gray-400 mt-1 block">
                {isAr
                  ? "الحد الأقصى لحجم الصورة 5 ميجابايت — تُرفع وتُحفظ كملف مباشر بدون Base64"
                  : "Max 5 MB (PNG, JPG, WebP) — stored directly as static media"}
              </span>
            </div>
          </div>

          {/* Local File Preview */}
          {previewObjectUrl && selectedFile && (
            <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-4">
              <div className="w-20 h-14 bg-white border border-gray-200 rounded overflow-hidden flex items-center justify-center shrink-0">
                <img
                  src={previewObjectUrl}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-xs text-gray-600 min-w-0">
                <p className="font-semibold text-gray-800 truncate">
                  {vehicleName.trim() || selectedFile.name}
                </p>
                <p className="text-gray-400 mt-0.5">
                  {selectedFile.name} • {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUploading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <RevixIcon name="plus" className="w-4 h-4" />
              {isUploading
                ? (isAr ? "جاري الرفع والحفظ..." : "Uploading...")
                : (isAr ? "رفع وحفظ بالكتالوج" : "Upload & Save")}
            </button>
          </div>
        </form>
      </div>

      {/* Vehicle Photo Catalog Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {isAr ? "كتالوج صور السيارات المعتمدة" : "Vehicle Photo Catalog"}
            </h2>
            <p className="text-xs text-gray-500">
              {isAr
                ? `عرض ${filteredPhotos.length} صورة معتمدة بالأسطول`
                : `Showing ${filteredPhotos.length} verified photos`}
            </p>
          </div>

          {/* Search Bar */}
          <div className="w-full sm:w-72 relative">
            <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-gray-400">
              <RevixIcon name="search" className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder={isAr ? "بحث بالاسم أو الموديل..." : "Search photos by vehicle name..."}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full ps-9 pe-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
            />
          </div>
        </div>

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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {paginatedPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden flex flex-col hover:border-emerald-700/40 transition group"
                >
                  {/* Image Canvas */}
                  <div className="relative h-44 bg-gray-50/80 p-3 flex items-center justify-center border-b border-gray-100">
                    <button
                      type="button"
                      disabled={isDeleting}
                      title={isAr ? "حذف الصورة" : "Delete photo"}
                      onClick={() => handleDelete(photo.id, photo.vehicleName)}
                      className="absolute top-2.5 end-2.5 w-7 h-7 rounded bg-white/90 hover:bg-rose-50 text-gray-400 hover:text-rose-600 border border-gray-200 flex items-center justify-center shadow-2xs opacity-0 group-hover:opacity-100 transition disabled:opacity-40"
                    >
                      <RevixIcon name="trash-2" className="w-3.5 h-3.5" />
                    </button>

                    <img
                      src={resolveAssetUrl(photo.photoUrl)}
                      alt={photo.vehicleName}
                      className="max-h-full max-w-full object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>

                  {/* Card Info */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm group-hover:text-emerald-800 transition-colors">
                        {photo.vehicleName}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-emerald-700 font-medium">
                        <RevixIcon name="check-circle-2" className="w-3.5 h-3.5" />
                        <span>{isAr ? "صورة أسطول معتمدة" : "Verified fleet photo"}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400">
                      <span>{new Date(photo.createdAt).toLocaleDateString(isAr ? "ar-EG" : "en-US")}</span>
                      <span className="text-gray-300">#verified</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
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
    </div>
  );
};
