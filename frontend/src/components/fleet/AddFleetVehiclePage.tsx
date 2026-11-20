import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  navigateToWorkspacePage,
  clearPendingFleetReceiveContext,
} from "../../store/slices/workspaceSlice";
import {
  useListVariantsQuery,
  useCreateVariantMutation,
  useListVehiclePhotosQuery,
  useListRentalInclusionsQuery,
  useCreateVehicleMutation,
  useReceiveVehicleMutation,
  useListPurchaseOrdersQuery,
  type VehicleVariantDto,
} from "../../store/api/fleetApi";
import { useGetWorkspaceContextQuery, type BranchDto } from "../../store/api/workspaceApi";
import { resolveAssetUrl } from "../../store/api/baseApi";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixSelect, type SelectOption } from "@/components/ui/RevixSelect";
import { RevixDatePicker } from "@/components/ui/RevixDatePicker";
import { decodeSipp } from "../../lib/fleet/sippDecoder";

interface AddFleetVehiclePageProps {
  lang?: "ar" | "en";
}

export const AddFleetVehiclePage: React.FC<AddFleetVehiclePageProps> = ({ lang = "ar" }) => {
  const isAr = lang === "ar";
  const dispatch = useAppDispatch();

  // Redux state
  const pendingReceive = useAppSelector((state) => state.workspace.pendingFleetReceiveContext);
  const selectedBranchId = useAppSelector((state) => state.workspace.selectedBranchId);

  // API Queries
  const { data: variantsRes, isLoading: isVariantsLoading } = useListVariantsQuery();
  const { data: workspaceCtx } = useGetWorkspaceContextQuery();
  const { data: photosRes } = useListVehiclePhotosQuery();
  const { data: posRes } = useListPurchaseOrdersQuery();
  const { data: inclusionsRes } = useListRentalInclusionsQuery({ activeOnly: true });

  // Mutations
  const [createVehicle, { isLoading: isCreating }] = useCreateVehicleMutation();
  const [receiveVehicle, { isLoading: isReceiving }] = useReceiveVehicleMutation();
  const [createVariant] = useCreateVariantMutation();

  const variants = variantsRes?.data || [];
  const branches: BranchDto[] = workspaceCtx?.data?.branches || [];
  const photos = photosRes?.data || [];
  const purchaseOrders = posRes?.data || [];
  const availableInclusions = inclusionsRes?.data || [];

  // Active PO and Line Item if arriving from PO
  const activePo = useMemo(() => {
    if (!pendingReceive?.purchaseOrderId) return null;
    return purchaseOrders.find((p) => p.id === pendingReceive.purchaseOrderId) || null;
  }, [purchaseOrders, pendingReceive]);

  // Form States
  const [vehicleName, setVehicleName] = useState<string>("");
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [branchId, setBranchId] = useState<string>("");

  // Section 1: Identification & Physical
  const [vin, setVin] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [keyNumber, setKeyNumber] = useState("");
  const [color, setColor] = useState("White");
  const [customColor, setCustomColor] = useState("");
  const [mileageOdometer, setMileageOdometer] = useState<number>(0);
  const [registrationExpiry, setRegistrationExpiry] = useState("");
  const [insuranceExpiry, setInsuranceExpiry] = useState("");

  // Section 2: Photo & Car Details
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false);
  const [photoSearch, setPhotoSearch] = useState("");
  const [fleetCompany, setFleetCompany] = useState("Revix Fleet");
  const [category, setCategory] = useState<string>("sedan");
  const [locationType, setLocationType] = useState("airport_terminal");
  const [fuelPolicy, setFuelPolicy] = useState("full_to_full");
  const [instantConfirmation, setInstantConfirmation] = useState(true);
  const [description, setDescription] = useState("");
  const [deliveryPolicy, setDeliveryPolicy] = useState("branch_pickup");

  // Section 3: Technical Specifications (Auto-decoded from SIPP with manual override)
  const [seats, setSeats] = useState<number>(5);
  const [doors, setDoors] = useState<number>(4);
  const [airConditioning, setAirConditioning] = useState<boolean>(true);
  const [fuelType, setFuelType] = useState<string>("petrol");
  const [luggageCapacity, setLuggageCapacity] = useState<string>("2 Bags");
  const [transmission, setTransmission] = useState<string>("automatic");

  // Section 4: Daily Rental Pricing Tiers
  const [dailyRate1to2, setDailyRate1to2] = useState<number>(100);
  const [dailyRate3to7, setDailyRate3to7] = useState<number>(85);
  const [dailyRate8Plus, setDailyRate8Plus] = useState<number>(70);
  const [damageExcess, setDamageExcess] = useState<number>(500);

  // Section 5: Mileage Policy
  const [mileagePolicy, setMileagePolicy] = useState<"unlimited" | "limited">("unlimited");
  const [dailyKmLimit, setDailyKmLimit] = useState<number>(200);
  const [extraKmRate, setExtraKmRate] = useState<number>(0.35);

  // Section 6: Inclusions
  const [selectedInclusions, setSelectedInclusions] = useState<string[]>([
    "Free Cancellation (24)",
    "Third Party Liability (TPL)",
    "Collision Damage Waiver (CDW)",
    "Sanitized & Clean Vehicle",
  ]);
  const [inclusionsDropdownOpen, setInclusionsDropdownOpen] = useState(false);
  const [inclusionSearch, setInclusionSearch] = useState("");
  const photoPickerRef = useRef<HTMLDivElement | null>(null);
  const inclusionsRef = useRef<HTMLDivElement | null>(null);

  // Close photo picker / inclusions dropdown when clicking outside or pressing Escape
  useEffect(() => {
    if (!photoPickerOpen && !inclusionsDropdownOpen) return;

    function handlePointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (photoPickerOpen && photoPickerRef.current && !photoPickerRef.current.contains(target)) {
        setPhotoPickerOpen(false);
      }
      if (inclusionsDropdownOpen && inclusionsRef.current && !inclusionsRef.current.contains(target)) {
        setInclusionsDropdownOpen(false);
      }
    }

    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        setPhotoPickerOpen(false);
        setInclusionsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [photoPickerOpen, inclusionsDropdownOpen]);

  // Status & Feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Selected Variant object
  const selectedVariant = useMemo(() => {
    return variants.find((v) => v.id === selectedVariantId) || null;
  }, [variants, selectedVariantId]);

  // Selected Branch object
  const selectedBranch = useMemo(() => {
    return branches.find((b) => b.id === branchId) || null;
  }, [branches, branchId]);

  const currencySymbol = selectedBranch?.currencyCode || "JOD";

  // Initialize from PO Context or Defaults
  useEffect(() => {
    if (pendingReceive) {
      if (pendingReceive.variantId) {
        setSelectedVariantId(pendingReceive.variantId);
      }
      if (pendingReceive.branchId) {
        setBranchId(pendingReceive.branchId);
      } else if (selectedBranchId) {
        setBranchId(selectedBranchId);
      }
    } else if (selectedBranchId && !branchId) {
      setBranchId(selectedBranchId);
    }
  }, [pendingReceive, selectedBranchId]);

  // When variant changes: Auto decode SIPP, set car name, and Auto-match photo!
  useEffect(() => {
    if (selectedVariant) {
      // 1. Auto-decode SIPP
      const decoded = decodeSipp(selectedVariant.sippCode);
      setCategory(decoded.category);
      setSeats(decoded.seats);
      setDoors(decoded.doors);
      setAirConditioning(decoded.airConditioning);
      setFuelType(decoded.fuelType);
      setLuggageCapacity(decoded.luggageCapacity);
      setTransmission(decoded.transmission);

      // 2. Auto-set Vehicle Name based on make, model, year
      const fullCarName = `${selectedVariant.make} ${selectedVariant.model} ${selectedVariant.modelYear || ""}`.trim();
      setVehicleName(fullCarName);

      // 3. Auto-match photo from verified library by name
      const variantFullName = `${selectedVariant.make} ${selectedVariant.model}`.toLowerCase();
      const matchedPhoto = photos.find(
        (p) =>
          variantFullName.includes(p.vehicleName.toLowerCase()) ||
          p.vehicleName.toLowerCase().includes(variantFullName) ||
          p.vehicleName.toLowerCase().includes(selectedVariant.model.toLowerCase())
      );

      if (matchedPhoto) {
        setPhotoUrl(matchedPhoto.photoUrl);
      }
    }
  }, [selectedVariant, photos]);

  // Handler: When user selects a photo from the verified library
  // (As user requested: "ولو اختارت صوره الاسم بيكون اسم الصوره")
  const handleSelectPhoto = (selectedPhoto: {
    vehicleName: string;
    photoUrl: string;
    category?: string;
  }) => {
    setPhotoUrl(selectedPhoto.photoUrl);
    setVehicleName(selectedPhoto.vehicleName);

    // If photo category is known, auto-set category
    if (selectedPhoto.category && selectedPhoto.category.toLowerCase() !== "general") {
      const catLower = selectedPhoto.category.toLowerCase();
      if (["sedan", "suv", "compact", "luxury", "van", "commercial"].includes(catLower)) {
        setCategory(catLower);
      }
    }

    // Auto-match variant from catalog if available and not locked by PO
    if (!pendingReceive?.variantId) {
      const pName = selectedPhoto.vehicleName.toLowerCase();
      const matchedVariant = variants.find((v) => {
        const full = `${v.make} ${v.model}`.toLowerCase();
        return (
          pName.includes(full) ||
          full.includes(pName) ||
          pName.includes(v.model.toLowerCase())
        );
      });
      if (matchedVariant) {
        setSelectedVariantId(matchedVariant.id);
      }
    }

    setPhotoPickerOpen(false);
  };

  // Handler: When user types or edits the vehicle name manually
  const handleVehicleNameChange = (val: string) => {
    setVehicleName(val);

    if (val.trim()) {
      const q = val.trim().toLowerCase();

      // Check if photo exists in library matching this name
      const matchedPhoto = photos.find(
        (p) =>
          p.vehicleName.toLowerCase().includes(q) ||
          q.includes(p.vehicleName.toLowerCase())
      );
      if (matchedPhoto) {
        setPhotoUrl(matchedPhoto.photoUrl);
      }

      // Check if variant exists in catalog matching this name (if not locked by PO)
      if (!pendingReceive?.variantId) {
        const matchedVariant = variants.find((v) => {
          const full = `${v.make} ${v.model}`.toLowerCase();
          return q.includes(full) || full.includes(q) || q.includes(v.model.toLowerCase());
        });
        if (matchedVariant) {
          setSelectedVariantId(matchedVariant.id);
        }
      }
    }
  };

  // Filtered photos for picker
  const filteredPhotos = useMemo(() => {
    if (!photoSearch.trim()) return photos;
    const q = photoSearch.trim().toLowerCase();
    return photos.filter((p) => p.vehicleName.toLowerCase().includes(q));
  }, [photos, photoSearch]);

  const filteredAvailableInclusions = useMemo(() => {
    if (!inclusionSearch.trim()) return availableInclusions;
    const q = inclusionSearch.trim().toLowerCase();
    return availableInclusions.filter((i) => i.name.toLowerCase().includes(q));
  }, [availableInclusions, inclusionSearch]);

  // Select Options for RevixSelect
  const variantOptions: SelectOption[] = useMemo(() => {
    return variants.map((v) => ({
      value: v.id,
      label: `${v.make} ${v.model} (${v.modelYear}) - ${v.trim || "Standard"} [SIPP: ${v.sippCode}]`,
      description: `${v.category.toUpperCase()} • SIPP ${v.sippCode}`,
    }));
  }, [variants]);

  const branchOptions: SelectOption[] = useMemo(() => {
    return branches.map((b) => ({
      value: b.id,
      label: `${b.name} (${b.countryCode} - ${b.city}) [${b.currencyCode}]`,
      description: `${b.city}, ${b.countryCode} • ${b.currencyCode}`,
    }));
  }, [branches]);

  const categoryOptions: SelectOption[] = useMemo(
    () => [
      { value: "sedan", label: isAr ? "سيدان (Sedan)" : "Sedan" },
      { value: "suv", label: isAr ? "دفع رباعي (SUV)" : "SUV" },
      { value: "compact", label: isAr ? "مدمجة (Compact)" : "Compact" },
      { value: "economy", label: isAr ? "اقتصادية (Economy)" : "Economy" },
      { value: "luxury", label: isAr ? "فاخرة (Luxury)" : "Luxury" },
      { value: "van", label: isAr ? "فان عائلي (Van)" : "Van" },
      { value: "commercial", label: isAr ? "تجارية (Commercial)" : "Commercial" },
    ],
    [isAr],
  );

  const locationTypeOptions: SelectOption[] = useMemo(
    () => [
      { value: "airport_terminal", label: isAr ? "صالة المطار (Airport Terminal)" : "Airport Terminal" },
      { value: "airport_shuttle", label: isAr ? "باص المطار (Airport Shuttle)" : "Airport Shuttle" },
      { value: "city_branch", label: isAr ? "فرع داخل المدينة (City Branch)" : "City Branch" },
      { value: "railway_station", label: isAr ? "محطة القطار (Railway Station)" : "Railway Station" },
      { value: "hotel_delivery", label: isAr ? "توصيل للفندق (Hotel Delivery)" : "Hotel Delivery" },
      { value: "meet_and_greet", label: isAr ? "استقبال شخصي (Meet & Greet)" : "Meet & Greet" },
    ],
    [isAr],
  );

  const fuelPolicyOptions: SelectOption[] = useMemo(
    () => [
      { value: "full_to_full", label: isAr ? "Full to Full (ممتلئ إلى ممتلئ)" : "Full to Full" },
      { value: "same_to_same", label: isAr ? "Same to Same (نفس المستوى)" : "Same to Same" },
      { value: "free_tank", label: isAr ? "Free Tank (خزان مجاني)" : "Free Tank" },
      { value: "pre_purchase", label: isAr ? "Pre-purchase (شراء مسبق)" : "Pre-purchase" },
    ],
    [isAr],
  );

  const deliveryPolicyOptions: SelectOption[] = useMemo(
    () => [
      { value: "branch_pickup", label: isAr ? "استلام من الفرع فقط (Branch Pickup Only)" : "Branch Pickup Only" },
      { value: "airport_delivery", label: isAr ? "توصيل واستلام من المطار (Airport Delivery)" : "Airport Delivery" },
      { value: "city_delivery", label: isAr ? "توصيل داخل المدينة (City Wide Delivery)" : "City Wide Delivery" },
      { value: "flexible", label: isAr ? "مرن / تسليم واستلام حر (Flexible Delivery)" : "Flexible Delivery" },
    ],
    [isAr],
  );

  const colorOptions: SelectOption[] = useMemo(
    () => [
      { value: "White", label: isAr ? "⚪ أبيض (White)" : "⚪ White", description: "#FFFFFF" },
      { value: "Black", label: isAr ? "⚫ أسود (Black)" : "⚫ Black", description: "#111827" },
      { value: "Silver", label: isAr ? "🔘 فضي (Silver)" : "🔘 Silver", description: "#E5E7EB" },
      { value: "Gray", label: isAr ? "🔘 رمادي (Gray)" : "🔘 Gray", description: "#6B7280" },
      { value: "Blue", label: isAr ? "🔵 أزرق / كحلي (Blue)" : "🔵 Blue", description: "#1E40AF" },
      { value: "Red", label: isAr ? "🔴 أحمر (Red)" : "🔴 Red", description: "#DC2626" },
      { value: "Brown", label: isAr ? "🟤 بني (Brown)" : "🟤 Brown", description: "#78350F" },
      { value: "Gold", label: isAr ? "🟡 ذهبي (Gold / Bronze)" : "🟡 Gold", description: "#D97706" },
      { value: "Custom", label: isAr ? "🎨 لون مخصص آخر..." : "🎨 Custom Color..." },
    ],
    [isAr],
  );

  const seatsOptions: SelectOption[] = useMemo(
    () =>
      [2, 4, 5, 7, 8, 9, 12, 15].map((n) => ({
        value: String(n),
        label: `${n} ${isAr ? "مقاعد" : "Seats"}`,
      })),
    [isAr],
  );

  const doorsOptions: SelectOption[] = useMemo(
    () =>
      [2, 3, 4, 5].map((n) => ({
        value: String(n),
        label: `${n} ${isAr ? "أبواب" : "Doors"}`,
      })),
    [isAr],
  );

  const acOptions: SelectOption[] = useMemo(
    () => [
      { value: "yes", label: isAr ? "نعم (مكيف)" : "Yes (A/C)" },
      { value: "no", label: isAr ? "لا (بدون تكييف)" : "No A/C" },
    ],
    [isAr],
  );

  const fuelTypeOptions: SelectOption[] = useMemo(
    () => [
      { value: "petrol", label: isAr ? "بنزين (Petrol)" : "Petrol" },
      { value: "diesel", label: isAr ? "ديزل (Diesel)" : "Diesel" },
      { value: "hybrid", label: isAr ? "هايبرد (Hybrid)" : "Hybrid" },
      { value: "electric", label: isAr ? "كهرباء (Electric)" : "Electric" },
    ],
    [isAr],
  );

  const luggageOptions: SelectOption[] = useMemo(
    () => [
      { value: "1 Small Bag", label: isAr ? "1 حقيبة صغيرة" : "1 Small Bag" },
      { value: "2 Bags", label: isAr ? "2 حقائب" : "2 Bags" },
      { value: "3 Bags", label: isAr ? "3 حقائب" : "3 Bags" },
      { value: "4+ Bags", label: isAr ? "4+ حقائب كبيرة" : "4+ Large Bags" },
    ],
    [isAr],
  );

  const transmissionOptions: SelectOption[] = useMemo(
    () => [
      { value: "automatic", label: isAr ? "أوتوماتيك (Auto)" : "Automatic" },
      { value: "manual", label: isAr ? "يدوي (Manual)" : "Manual" },
    ],
    [isAr],
  );

  const handleInclusionToggle = (id: string) => {
    setSelectedInclusions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCancel = () => {
    dispatch(clearPendingFleetReceiveContext());
    dispatch(navigateToWorkspacePage({ section: "fleet", subPage: "vehicles" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Synchronous field validation BEFORE any network mutation
    if (!selectedVariantId && !vehicleName.trim()) {
      setErrorMessage(
        isAr
          ? "يرجى إدخال اسم السيارة أو اختيار فئة من الكتالوج"
          : "Vehicle name or variant is required."
      );
      return;
    }

    if (!branchId) {
      setErrorMessage(isAr ? "يرجى تحديد فرع استلام وتمركز السيارة" : "Pickup location / branch is required.");
      return;
    }
    if (!vin.trim() || vin.trim().length < 4) {
      setErrorMessage(isAr ? "يرجى إدخال رقم الشاسيه (VIN) بحد أدنى 4 أحرف" : "VIN (Chassis Number, min 4 chars) is required.");
      return;
    }
    if (!licensePlate.trim()) {
      setErrorMessage(isAr ? "يرجى إدخال رقم اللوحة المعدنية" : "License plate is required.");
      return;
    }

    const finalColor = color === "Custom" ? customColor.trim() || "White" : color;
    const finalDescription = vehicleName.trim()
      ? (description.trim() ? `${vehicleName.trim()} • ${description.trim()}` : vehicleName.trim())
      : description.trim();

    const payloadData = {
      branchId,
      vin: vin.trim().toUpperCase(),
      licensePlate: licensePlate.trim().toUpperCase(),
      keyNumber: keyNumber.trim() || null,
      color: finalColor,
      mileageOdometer: Number(mileageOdometer) || 0,
      registrationExpiry: registrationExpiry || null,
      insuranceExpiry: insuranceExpiry || null,
      notes: finalDescription ? finalDescription.slice(0, 300) : null,
      photoUrl: photoUrl.trim() || null,
      locationType,
      fuelPolicy,
      instantConfirmation,
      description: finalDescription ? finalDescription.slice(0, 1000) : null,
      deliveryPolicy,
      dailyRate1to2: Number(dailyRate1to2) || 0,
      dailyRate3to7: Number(dailyRate3to7) || 0,
      dailyRate8Plus: Number(dailyRate8Plus) || 0,
      damageExcess: Number(damageExcess) || 0,
      mileagePolicy,
      dailyKmLimit: mileagePolicy === "limited" ? Number(dailyKmLimit) || 0 : 0,
      extraKmRate: mileagePolicy === "limited" ? Number(extraKmRate) || 0 : 0,
      inclusions: selectedInclusions,
      seats: Number(seats) || 5,
      doors: Number(doors) || 4,
      airConditioning,
      fuelType,
      luggageCapacity,
      transmission,
    };

    try {
      let effectiveVariantId = selectedVariantId;
      if (!effectiveVariantId && vehicleName.trim()) {
        const q = vehicleName.trim().toLowerCase();
        const matched = variants.find((v) => {
          const full = `${v.make} ${v.model}`.toLowerCase();
          return q.includes(full) || full.includes(q) || q.includes(v.model.toLowerCase());
        });
        if (matched) {
          effectiveVariantId = matched.id;
        } else {
          // Auto-create variant in catalog so direct entry without prior PO is completely frictionless
          const parts = vehicleName.trim().split(/\s+/);
          const make = parts[0] || "General";
          const model = parts.slice(1).join(" ") || parts[0] || "Model";
          const created = await createVariant({
            make,
            model,
            modelYear: new Date().getFullYear(),
            trim: "Standard",
            category: (category as any) || "sedan",
            transmission: (transmission as any) || "automatic",
            fuelType: (fuelType as any) || "petrol",
            seatingCapacity: Number(seats) || 5,
            sippCode: "ICAR",
          }).unwrap();
          effectiveVariantId = (created as any)?.data?.id || (created as any)?.id;
        }
      }

      if (pendingReceive?.purchaseOrderId && pendingReceive.itemId) {
        // Mode A: Receive from Purchase Order
        await receiveVehicle({
          purchaseOrderId: pendingReceive.purchaseOrderId,
          itemId: pendingReceive.itemId,
          ...payloadData,
        }).unwrap();

        setSuccessMessage(
          isAr
            ? "تم استلام وتحويل السيارة بنجاح من أمر الشراء وإضافتها للأصول التشغيلية!"
            : "Vehicle successfully received and added to active fleet assets!"
        );
      } else {
        // Mode B: Direct Creation
        await createVehicle({
          variantId: effectiveVariantId,
          ...payloadData,
        }).unwrap();

        setSuccessMessage(
          isAr
            ? "تم تسجيل وإضافة السيارة بنجاح إلى سجل أصول الأسطول!"
            : "Vehicle successfully created and added to fleet register!"
        );
      }

      dispatch(clearPendingFleetReceiveContext());
      setTimeout(() => {
        dispatch(navigateToWorkspacePage({ section: "fleet", subPage: "vehicles" }));
      }, 1500);
    } catch (err: any) {
      setErrorMessage(
        err?.data?.error?.message ||
          (isAr ? "حدث خطأ أثناء حفظ السيارة. تأكد من عدم تكرار رقم الشاسيه أو اللوحة." : "Failed to register vehicle.")
      );
    }
  };

  const isSubmitting = isCreating || isReceiving;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20" dir={isAr ? "rtl" : "ltr"}>
      {/* Top Banner if in Receiving Mode */}
      {pendingReceive && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <RevixIcon name="car-front" className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-emerald-900 text-sm">
                {isAr ? "تحويل واستلام سيارة من أمر شراء وارد" : "Receiving Vehicle from Purchase Order"}
              </h2>
              <p className="text-xs text-emerald-700 mt-0.5">
                {isAr
                  ? `أمر الشراء: ${pendingReceive.poNumber || "PO"} | تم تجهيز بيانات الموديل والفرع تلقائيًا لإكمال الاستلام`
                  : `PO: ${pendingReceive.poNumber || "PO"} | Variant and Branch pre-filled for asset receiving`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => dispatch(clearPendingFleetReceiveContext())}
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline self-end sm:self-auto"
          >
            {isAr ? "التبديل إلى إضافة مباشرة بدون أمر شراء" : "Switch to Direct Entry"}
          </button>
        </div>
      )}

      {/* Page Title & Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-emerald-800 mb-1 transition-colors"
          >
            <RevixIcon name="arrow-left" className={`w-3.5 h-3.5 ${isAr ? "rotate-180" : ""}`} />
            <span>{isAr ? "الرجوع لسجل الأسطول" : "Back to Fleet Register"}</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isAr ? "إضافة سيارة للأصول" : "Add Fleet Vehicle"}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {isAr
              ? "تسجيل سيارة في أصول الأسطول، تحديد الهوية والفرع والمواصفات، والتعريفة التشغيلية للتأجير."
              : "Register vehicle into fleet assets, specify identifiers, branch, rental pricing, and operational policies."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => dispatch(navigateToWorkspacePage({ section: "fleet", subPage: "vehicle-photos" }))}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold shadow-2xs transition"
          >
            <RevixIcon name="car-front" className="w-3.5 h-3.5 text-emerald-700" />
            <span>{isAr ? "مكتبة صور السيارات" : "Photo Library"}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center gap-2.5 shadow-2xs">
          <RevixIcon name="info" className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2.5 shadow-2xs">
          <RevixIcon name="check-circle-2" className="w-5 h-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ====================================================================== */}
        {/* SECTION 1: CAR DETAILS (Matches Screenshot 1) */}
        {/* ====================================================================== */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100/60 text-emerald-800 flex items-center justify-center">
                <RevixIcon name="car-front" className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-gray-900 text-sm">
                {isAr ? "بيانات وهوية السيارة (Car Details)" : "Car Details"}
              </h2>
            </div>
            <span className="text-[11px] text-gray-400">
              {isAr ? "الحقول المميزة بـ * مطلوبة" : "* required"}
            </span>
          </div>

          <div className="p-6 space-y-5">
            {/* Vehicle Name, Catalog Variant, and Branch */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Vehicle Name / Model */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700">
                    {isAr ? "اسم السيارة / الموديل المعتمد *" : "CAR / VEHICLE NAME *"}
                  </label>
                  {selectedVariant && (
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {isAr ? "تلقائي من الكتالوج" : "Auto from Variant"}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-gray-400">
                    <RevixIcon name="car-front" className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder={isAr ? "مثال: Toyota Camry أو اختر صورة..." : "e.g. Toyota Camry 2026..."}
                    value={vehicleName}
                    onChange={(e) => handleVehicleNameChange(e.target.value)}
                    className="w-full h-[46px] ps-9 pe-3.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 font-medium focus:outline-none focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/15 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  {isAr
                    ? "يُحدد تلقائياً عند اختيار صورة أو أمر شراء، أو يمكنك كتابته يدوياً."
                    : "Auto-fills when choosing photo or PO, or type manually."}
                </p>
              </div>

              {/* 2. Catalog Variant */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {isAr ? "فئة وموديل الشراء (الفريان) *" : "PURCHASE VARIANT (CATALOG) *"}
                </label>
                <RevixSelect
                  size="md"
                  isRtl={isAr}
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  disabled={Boolean(pendingReceive?.variantId)}
                  options={variantOptions}
                  placeholder={isAr ? "-- اختر الفئة والموديل من الكتالوج --" : "-- Select Variant --"}
                  searchable
                  buttonClassName="w-full h-[46px] rounded-lg"
                />
                {selectedVariant && (
                  <p className="text-[11px] text-emerald-700 mt-1.5 flex items-center gap-1 font-medium">
                    <RevixIcon name="check-circle-2" className="w-3.5 h-3.5" />
                    <span>{decodeSipp(selectedVariant.sippCode).summaryAr}</span>
                  </p>
                )}
              </div>

              {/* 3. Branch / Pickup Location */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {isAr ? "فرع وموقع الاستلام والتمركز *" : "PICKUP LOCATION (AIRPORT/STATION/BRANCH) *"}
                </label>
                <RevixSelect
                  size="md"
                  isRtl={isAr}
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  options={branchOptions}
                  placeholder={isAr ? "-- اختر الفرع --" : "-- Select Branch --"}
                  searchable
                  buttonClassName="w-full h-[46px] rounded-lg"
                />
              </div>
            </div>

            {/* Vehicle Photo with Dynamic Auto-Selection */}
            <div ref={photoPickerRef} className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700">
                  {isAr ? "صورة السيارة المعتمدة *" : "VEHICLE PHOTO *"}
                </label>
                <span className="text-[11px] text-gray-400">
                  {photoUrl
                    ? (isAr ? "(تم ربط الصورة باسم السيارة ومواصفات الأسطول)" : "(photo linked to vehicle name)")
                    : (isAr ? "(اختر صورة من المكتبة لتعبئة الاسم والمواصفات تلقائياً)" : "(select from library to auto-fill name)")}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-gray-400">
                    <RevixIcon name="car-front" className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder={isAr ? "اضغط لاختيار صورة من المكتبة أو ألصق الرابط..." : "Click to choose from library or paste URL..."}
                    value={photoUrl}
                    onClick={() => setPhotoPickerOpen(true)}
                    onFocus={() => setPhotoPickerOpen(true)}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className={`w-full h-[46px] ps-9 pe-10 bg-white border rounded-lg text-sm text-gray-900 cursor-pointer focus:cursor-text focus:outline-none transition-colors ${
                      photoPickerOpen
                        ? "border-emerald-700 ring-3 ring-emerald-700/15"
                        : "border-gray-200 hover:border-gray-300 focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/15"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setPhotoPickerOpen((prev) => !prev)}
                    aria-label={isAr ? "فتح مكتبة الصور" : "Toggle photo library"}
                    className="absolute inset-y-0 end-0 px-3 flex items-center text-gray-400 hover:text-gray-700 transition"
                  >
                    <RevixIcon
                      name="chevron-down"
                      className={`w-4 h-4 transition-transform duration-200 ${
                        photoPickerOpen ? "rotate-180 text-emerald-700" : ""
                      }`}
                    />
                  </button>
                </div>

                {/* Thumbnail Preview */}
                {photoUrl && (
                  <div className="w-20 h-[46px] bg-gray-50 border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                    <img
                      src={resolveAssetUrl(photoUrl)}
                      alt="Selected car"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Photo Picker Dropdown */}
              {photoPickerOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 p-3 bg-white border border-gray-200 rounded-xl shadow-xl space-y-3 z-[60]">
                  <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                    <h4 className="text-xs font-bold text-gray-800">
                      {isAr ? "اختر من مكتبة الصور المعتمدة:" : "Choose from verified photo library:"}
                    </h4>
                    <input
                      type="text"
                      placeholder={isAr ? "بحث بالاسم..." : "Filter by model..."}
                      value={photoSearch}
                      onChange={(e) => setPhotoSearch(e.target.value)}
                      className="px-2.5 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:border-emerald-700"
                    />
                  </div>

                  {filteredPhotos.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-400">
                      {isAr
                        ? "لا توجد صور مطابقة في مكتبة الصور المعتمدة."
                        : "No matching photos found in verified library."}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto overscroll-contain p-1">
                      {filteredPhotos.map((p) => (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => {
                            handleSelectPhoto(p);
                          }}
                          className={`p-2 border rounded-lg flex flex-col items-center gap-1.5 transition text-start hover:border-emerald-700 ${
                            photoUrl === p.photoUrl ? "border-emerald-700 bg-emerald-50/50" : "border-gray-200 bg-white"
                          }`}
                        >
                          <div className="w-full h-16 bg-gray-50 rounded flex items-center justify-center overflow-hidden">
                            <img src={resolveAssetUrl(p.photoUrl)} alt={p.vehicleName} className="max-h-full max-w-full object-contain" />
                          </div>
                          <span className="text-[11px] font-semibold text-gray-800 truncate w-full text-center">
                            {p.vehicleName}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Row: Fleet Company, Category, Location Type, Fuel Policy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {isAr ? "الشركة المشغلة *" : "FLEET COMPANY *"}
                </label>
                <input
                  type="text"
                  value={fleetCompany}
                  onChange={(e) => setFleetCompany(e.target.value)}
                  className="w-full h-[46px] px-3.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/15 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {isAr ? "التصنيف *" : "CATEGORY *"}
                </label>
                <RevixSelect
                  size="md"
                  isRtl={isAr}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  options={categoryOptions}
                  buttonClassName="w-full h-[46px] rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {isAr ? "نوع الموقع *" : "LOCATION TYPE *"}
                </label>
                <RevixSelect
                  size="md"
                  isRtl={isAr}
                  value={locationType}
                  onChange={(e) => setLocationType(e.target.value)}
                  options={locationTypeOptions}
                  buttonClassName="w-full h-[46px] rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {isAr ? "سياسة الوقود *" : "FUEL POLICY *"}
                </label>
                <RevixSelect
                  size="md"
                  isRtl={isAr}
                  value={fuelPolicy}
                  onChange={(e) => setFuelPolicy(e.target.value)}
                  options={fuelPolicyOptions}
                  buttonClassName="w-full h-[46px] rounded-lg"
                />
              </div>
            </div>

            {/* Instant Confirmation Toggle */}
            <div className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
              <div>
                <h4 className="text-sm font-bold text-gray-900">
                  {isAr ? "تأكيد فوري للحجز (Instant Confirmation / Auto-Accept)" : "Instant Confirmation (Auto-Accept)"}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isAr
                    ? "الحجز المباشر بدون الحاجة لموافقة يدوية. يتم تأكيد طلبات التأجير لهذه السيارة فورًا."
                    : "Reserve without manual confirmation. Bookings for this vehicle are confirmed immediately."}
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={instantConfirmation}
                  onChange={(e) => setInstantConfirmation(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-700" />
              </label>
            </div>

            {/* Vehicle Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isAr ? "وصف وملاحظات السيارة (VEHICLE DESCRIPTION)" : "VEHICLE DESCRIPTION"}
              </label>
              <textarea
                rows={3}
                placeholder={isAr ? "أضف ملاحظات عن مواصفات السيارة، حالتها التشغيلية، أو شروط الاستلام..." : "Tell customers more about this vehicle, features, condition, or rental guidelines..."}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
              />
            </div>
          </div>
        </div>

        {/* ====================================================================== */}
        {/* SECTION 2: ASSET IDENTIFIERS (VIN, Plate, Key, Color, Mileage, Expiries) */}
        {/* ====================================================================== */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100/60 text-emerald-800 flex items-center justify-center">
                <RevixIcon name="file-text" className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-sm">
                  {isAr ? "بيانات الهوية ورقم الشاسيه واللوحة (Asset Identifiers)" : "Asset Identifiers & Physical Specs"}
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {isAr
                    ? "تحديد هوية السيارة، واللوحات، والعداد، وتواريخ صلاحية الوثائق والتراخيص"
                    : "Vehicle identification, license plates, odometer, and document expiration"}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              {isAr ? "أصل أسطول معتمد" : "Verified Fleet Asset"}
            </span>
          </div>

          <div className="p-6 space-y-5">
            {/* Row 1: Identifiers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {isAr ? "رقم الشاسيه (VIN) *" : "VIN (CHASSIS NUMBER) *"}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. 1HGCR2F83HA001234"
                    value={vin}
                    onChange={(e) => setVin(e.target.value.toUpperCase())}
                    className="w-full h-[46px] px-3.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 font-mono tracking-wider focus:outline-none focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/15 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {isAr ? "رقم اللوحة المعدنية *" : "LICENSE PLATE *"}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={isAr ? "مثال: 12-34567 أو أ ب ج 1234" : "e.g. 12-34567"}
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                    className="w-full h-[46px] px-3.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 font-mono tracking-wider focus:outline-none focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/15 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {isAr ? "رقم المفتاح / كود التعليقة" : "KEY NUMBER / TAG"}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. K-102"
                    value={keyNumber}
                    onChange={(e) => setKeyNumber(e.target.value)}
                    className="w-full h-[46px] px-3.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/15 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Color, Current Odometer, Delivery Policy (Equal 46px Height Across All 3 Columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {isAr ? "لون السيارة *" : "COLOR *"}
                </label>
                <RevixSelect
                  size="md"
                  isRtl={isAr}
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  options={colorOptions}
                  buttonClassName="w-full h-[46px] rounded-lg"
                />
                {color === "Custom" && (
                  <input
                    type="text"
                    placeholder={isAr ? "اكتب اسم اللون المخصص..." : "Enter custom color name..."}
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="mt-2 w-full h-[42px] px-3.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/15 transition-colors"
                    autoFocus
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {isAr ? "قراءة العداد الحالية (كم) *" : "CURRENT ODOMETER (KM) *"}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={mileageOdometer}
                    onChange={(e) => setMileageOdometer(Number(e.target.value))}
                    className="w-full h-[46px] px-3.5 pe-16 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/15 transition-colors"
                  />
                  <div className="absolute inset-y-0 end-0 pe-3 flex items-center pointer-events-none">
                    <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded border border-gray-200">
                      {isAr ? "كم" : "KM"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {isAr ? "سياسة التسليم والاستلام" : "DELIVERY POLICY"}
                </label>
                <RevixSelect
                  size="md"
                  isRtl={isAr}
                  value={deliveryPolicy}
                  onChange={(e) => setDeliveryPolicy(e.target.value)}
                  options={deliveryPolicyOptions}
                  buttonClassName="w-full h-[46px] rounded-lg"
                />
              </div>
            </div>

            {/* Row 3: Document Expiries with RevixDatePicker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {isAr ? "تاريخ انتهاء رخصة السير / الاستمارة" : "REGISTRATION EXPIRY DATE"}
                </label>
                <RevixDatePicker
                  size="md"
                  isRtl={isAr}
                  value={registrationExpiry}
                  onChange={(val) => setRegistrationExpiry(val)}
                  placeholder={isAr ? "اختر تاريخ انتهاء الرخصة..." : "Select registration expiry..."}
                  buttonClassName="w-full h-[46px] rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {isAr ? "تاريخ انتهاء وثيقة التأمين" : "INSURANCE POLICY EXPIRY"}
                </label>
                <RevixDatePicker
                  size="md"
                  isRtl={isAr}
                  value={insuranceExpiry}
                  onChange={(val) => setInsuranceExpiry(val)}
                  placeholder={isAr ? "اختر تاريخ انتهاء التأمين..." : "Select insurance expiry..."}
                  buttonClassName="w-full h-[46px] rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================================== */}
        {/* SECTION 3: SPECIFICATIONS (Auto-populated from SIPP with override) */}
        {/* ====================================================================== */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100/60 text-indigo-800 flex items-center justify-center">
                <RevixIcon name="wrench" className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-sm">
                  {isAr ? "المواصفات الفنية للسيارة (Technical Specifications)" : "Specifications"}
                </h2>
                <p className="text-[11px] text-gray-400">
                  {isAr ? "تم تعبئة الحقول تلقائيًا بناءً على كود SIPP للموديل ويمكنك التعديل عليها" : "Auto-filled from SIPP code with manual edit support"}
                </p>
              </div>
            </div>
            {selectedVariant && (
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-mono text-xs font-bold rounded border border-indigo-200">
                SIPP: {selectedVariant.sippCode}
              </span>
            )}
          </div>

          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isAr ? "عدد المقاعد" : "SEATS"}
              </label>
              <RevixSelect
                size="md"
                isRtl={isAr}
                value={String(seats)}
                onChange={(e) => setSeats(Number(e.target.value))}
                options={seatsOptions}
                buttonClassName="w-full h-[46px] rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isAr ? "عدد الأبواب" : "DOORS"}
              </label>
              <RevixSelect
                size="md"
                isRtl={isAr}
                value={String(doors)}
                onChange={(e) => setDoors(Number(e.target.value))}
                options={doorsOptions}
                buttonClassName="w-full h-[46px] rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isAr ? "التكييف" : "AIR CONDITION"}
              </label>
              <RevixSelect
                size="md"
                isRtl={isAr}
                value={airConditioning ? "yes" : "no"}
                onChange={(e) => setAirConditioning(e.target.value === "yes")}
                options={acOptions}
                buttonClassName="w-full h-[46px] rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isAr ? "نوع الوقود" : "FUEL TYPE"}
              </label>
              <RevixSelect
                size="md"
                isRtl={isAr}
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
                options={fuelTypeOptions}
                buttonClassName="w-full h-[46px] rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isAr ? "حجم الشنطة" : "LUGGAGE"}
              </label>
              <RevixSelect
                size="md"
                isRtl={isAr}
                value={luggageCapacity}
                onChange={(e) => setLuggageCapacity(e.target.value)}
                options={luggageOptions}
                buttonClassName="w-full h-[46px] rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isAr ? "ناقل الحركة" : "TRANSMISSION"}
              </label>
              <RevixSelect
                size="md"
                isRtl={isAr}
                value={transmission}
                onChange={(e) => setTransmission(e.target.value)}
                options={transmissionOptions}
                buttonClassName="w-full h-[46px] rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* ====================================================================== */}
        {/* SECTION 4: PRICES SECTION (Matches Screenshot 2) */}
        {/* ====================================================================== */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100/60 text-emerald-800 flex items-center justify-center">
                <RevixIcon name="file-text" className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-gray-900 text-sm">
                {isAr ? `قسم الأسعار والتعريفة اليومية (${currencySymbol})` : `Prices Section (${currencySymbol})`}
              </h2>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
              {currencySymbol}
            </span>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-xs text-gray-500">
              {isAr
                ? `الأسعار لليوم الواحد بعملة فرع الاستلام والتمركز (${currencySymbol}). يتم تطبيق الشريحة المناسبة لمدة الإيجار بالكامل.`
                : `Rates are per day in the pickup branch currency (${currencySymbol}). One tier applies to the entire rental.`}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {isAr ? "سعر اليوم لإيجار 1 – 2 يوم *" : "1 – 2 DAYS DAILY RATE *"}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={dailyRate1to2}
                    onChange={(e) => setDailyRate1to2(Number(e.target.value))}
                    className="w-full h-[46px] px-3.5 pe-20 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 font-semibold focus:outline-none focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/15 transition-colors"
                  />
                  <span className="absolute inset-y-0 end-0 pe-3 flex items-center text-xs font-bold text-gray-400 pointer-events-none">
                    {currencySymbol}/day
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {isAr ? "سعر اليوم لإيجار 3 – 7 أيام" : "3 – 7 DAYS DAILY RATE"}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={dailyRate3to7}
                    onChange={(e) => setDailyRate3to7(Number(e.target.value))}
                    className="w-full h-[46px] px-3.5 pe-20 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 font-semibold focus:outline-none focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/15 transition-colors"
                  />
                  <span className="absolute inset-y-0 end-0 pe-3 flex items-center text-xs font-bold text-gray-400 pointer-events-none">
                    {currencySymbol}/day
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {isAr ? "سعر اليوم لإيجار 8 – 30+ يوم" : "8 – 30 DAYS DAILY RATE"}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={dailyRate8Plus}
                    onChange={(e) => setDailyRate8Plus(Number(e.target.value))}
                    className="w-full h-[46px] px-3.5 pe-20 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 font-semibold focus:outline-none focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/15 transition-colors"
                  />
                  <span className="absolute inset-y-0 end-0 pe-3 flex items-center text-xs font-bold text-gray-400 pointer-events-none">
                    {currencySymbol}/day
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isAr ? "مبلغ التحمل والتأمين ضد الحوادث (DAMAGE EXCESS)" : "DAMAGE EXCESS"}
              </label>
              <div className="relative max-w-sm">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 500 or 0 for zero excess"
                  value={damageExcess}
                  onChange={(e) => setDamageExcess(Number(e.target.value))}
                  className="w-full h-[46px] px-3.5 pe-16 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 font-semibold focus:outline-none focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/15 transition-colors"
                />
                <span className="absolute inset-y-0 end-0 pe-3 flex items-center text-xs font-bold text-gray-400 pointer-events-none">
                  {currencySymbol}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                {isAr
                  ? "الحد الأقصى للمسؤولية المالية التي يدفعها المستأجر عند وقوع حادث مغطى تأمينيًا."
                  : "Maximum liability amount paid by customer for damages. Appears in What's Included on the vehicle card."}
              </p>
            </div>
          </div>
        </div>

        {/* ====================================================================== */}
        {/* SECTION 5: MILEAGE ALLOWANCE & EXTRA KM RATE (Matches Screenshot 3) */}
        {/* ====================================================================== */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100/60 text-emerald-800 flex items-center justify-center">
                <RevixIcon name="activity" className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-gray-900 text-sm">
                {isAr
                  ? `سياسة الكيلومترات ورسوم الزيادة (${currencySymbol})`
                  : `Mileage Allowance & Extra KM Rate (${currencySymbol})`}
              </h2>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-xs text-gray-500">
              {isAr
                ? "تحديد سقف الكيلومترات اليومي. إذا كان محددًا، فسيتم احتساب إجمالي الكيلومترات المسموحة بناءً على مدة الحجز، ويظهر سعر الكيلومتر الإضافي في العقد والفاتورة."
                : "Define daily mileage allowance. If limited (e.g. 120 km/day), the total allowance for the booking duration and the extra kilometer surcharge will appear on the car card, inclusions, and invoice."}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                  mileagePolicy === "unlimited"
                    ? "border-emerald-700 bg-emerald-50/40 ring-1 ring-emerald-700"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="mileagePolicy"
                  value="unlimited"
                  checked={mileagePolicy === "unlimited"}
                  onChange={() => setMileagePolicy("unlimited")}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    mileagePolicy === "unlimited" ? "border-emerald-700" : "border-gray-400"
                  }`}
                >
                  {mileagePolicy === "unlimited" && <div className="w-2 h-2 rounded-full bg-emerald-700" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">
                    {isAr ? "كيلومترات غير محدودة (Unlimited Mileage)" : "Unlimited Mileage"}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isAr ? "بدون حد أقصى يومي أو رسوم كيلومتر إضافي" : "No daily limits or extra kilometer charges"}
                  </p>
                </div>
              </label>

              <label
                className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                  mileagePolicy === "limited"
                    ? "border-emerald-700 bg-emerald-50/40 ring-1 ring-emerald-700"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="mileagePolicy"
                  value="limited"
                  checked={mileagePolicy === "limited"}
                  onChange={() => setMileagePolicy("limited")}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    mileagePolicy === "limited" ? "border-emerald-700" : "border-gray-400"
                  }`}
                >
                  {mileagePolicy === "limited" && <div className="w-2 h-2 rounded-full bg-emerald-700" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">
                    {isAr ? "كيلومترات محددة (Limited Allowance)" : "Limited Mileage Allowance"}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isAr ? "تحديد حد مجاني يومي وسعر لكل كم إضافي" : "Set free daily km limit and price per extra km"}
                  </p>
                </div>
              </label>
            </div>

            {mileagePolicy === "limited" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 bg-gray-50/80 p-4 rounded-xl border border-gray-200">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {isAr ? "الحد اليومي المجاني (كم / يوم) *" : "DAILY KM LIMIT (KM/DAY) *"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={dailyKmLimit}
                    onChange={(e) => setDailyKmLimit(Number(e.target.value))}
                    className="w-full h-[46px] px-3.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 font-semibold focus:outline-none focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/15 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {isAr ? `سعر كل كم إضافي (${currencySymbol}) *` : `EXTRA KM SURCHARGE (${currencySymbol}) *`}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={extraKmRate}
                    onChange={(e) => setExtraKmRate(Number(e.target.value))}
                    className="w-full h-[46px] px-3.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 font-semibold focus:outline-none focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/15 transition-colors"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ====================================================================== */}
        {/* SECTION 6: WHAT IS INCLUDED? (Matches Screenshot 4) */}
        {/* ====================================================================== */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100/60 text-emerald-800 flex items-center justify-center">
                <RevixIcon name="shield-check" className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-sm">
                  {isAr ? "ماذا يشمل العقد والإيجار؟ (What is included?)" : "What is included?"}
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {isAr
                    ? "اختر المزايا والتغطيات المعتمدة التي تظهر في بطاقة السيارة وفاتورة الحجز"
                    : "Select verified inclusions that appear on vehicle cards and rental invoices"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => dispatch(navigateToWorkspacePage({ section: "fleet", subPage: "rental-inclusions" }))}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1.5"
            >
              <RevixIcon name="shield-check" className="w-3.5 h-3.5 text-emerald-700" />
              <span>{isAr ? "إدارة مزايا العقود بالكتالوج" : "Manage Inclusions"}</span>
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                {isAr ? "المزايا والتغطيات التأمينية المشمولة" : "RENTAL INCLUSIONS & BENEFITS"}
              </label>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                {selectedInclusions.length} {isAr ? "مزايا محددة" : "ITEMS SELECTED"}
              </span>
            </div>

            {/* Multi-Select Dropdown Field */}
            <div ref={inclusionsRef} className="relative">
              <button
                type="button"
                onClick={() => setInclusionsDropdownOpen(!inclusionsDropdownOpen)}
                className="w-full h-[46px] px-3.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-sm text-start flex items-center justify-between transition focus:outline-none focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/15"
              >
                <div className="flex items-center gap-2 truncate">
                  <RevixIcon name="check-circle-2" className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className={selectedInclusions.length > 0 ? "text-gray-900 font-semibold" : "text-gray-400"}>
                    {selectedInclusions.length > 0
                      ? isAr
                        ? `تم تحديد ${selectedInclusions.length} مزايا من القائمة`
                        : `${selectedInclusions.length} features selected`
                      : isAr
                      ? "اختر المزايا والتغطيات المشمولة في العقد..."
                      : "Select included rental features..."}
                  </span>
                </div>
                <RevixIcon
                  name="chevron-down"
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    inclusionsDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Multi-Select Dropdown Menu */}
              {inclusionsDropdownOpen && (
                <div className="absolute top-full start-0 end-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-30 p-3 space-y-2">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <div className="relative flex-1 me-2">
                      <input
                        type="text"
                        placeholder={isAr ? "بحث في المزايا المتاحة..." : "Search features..."}
                        value={inclusionSearch}
                        onChange={(e) => setInclusionSearch(e.target.value)}
                        className="w-full h-8 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-700"
                        autoFocus
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setSelectedInclusions(availableInclusions.map((i) => i.name))}
                        className="text-emerald-700 hover:underline font-semibold"
                      >
                        {isAr ? "تحديد الكل" : "Select All"}
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedInclusions([])}
                        className="text-gray-500 hover:underline"
                      >
                        {isAr ? "مسح" : "Clear"}
                      </button>
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto overscroll-contain space-y-1 p-1">
                    {filteredAvailableInclusions.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">
                        {isAr ? "لا توجد مزايا مطابقة" : "No features found"}
                      </p>
                    ) : (
                      filteredAvailableInclusions.map((inc) => {
                        const isChecked = selectedInclusions.includes(inc.name);
                        return (
                          <label
                            key={inc.id}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition text-xs ${
                              isChecked
                                ? "bg-emerald-50 text-emerald-950 font-semibold"
                                : "hover:bg-gray-50 text-gray-700"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleInclusionToggle(inc.name)}
                                className="w-4 h-4 text-emerald-700 rounded border-gray-300 focus:ring-emerald-700"
                              />
                              <span>{inc.name}</span>
                            </div>
                            {inc.description && (
                              <span className="text-[10px] text-gray-400 truncate max-w-xs ms-2">
                                {inc.description}
                              </span>
                            )}
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Selected Inclusions Badges / Chips */}
            {selectedInclusions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {selectedInclusions.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200/90 rounded-full text-xs font-semibold shadow-2xs"
                  >
                    <RevixIcon name="check" className="w-3 h-3 text-emerald-700" />
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => handleInclusionToggle(name)}
                      className="w-4 h-4 rounded-full hover:bg-emerald-200/60 flex items-center justify-center text-emerald-700 ms-0.5 transition"
                      title={isAr ? "إزالة" : "Remove"}
                    >
                      <RevixIcon name="x" className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Notifications (visible without scrolling back to top) */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center gap-2.5 shadow-2xs">
            <RevixIcon name="info" className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2.5 shadow-2xs">
            <RevixIcon name="check-circle-2" className="w-5 h-5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-lg transition"
          >
            {isAr ? "إلغاء والرجوع" : "Cancel"}
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-8 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <RevixIcon name="check" className="w-4 h-4" />
            {isSubmitting
              ? (isAr ? "جاري الحفظ والتسجيل..." : "Registering...")
              : pendingReceive
              ? (isAr ? "حفظ واستلام وتحويل للأصول" : "Confirm Receiving & Register Asset")
              : (isAr ? "حفظ وإضافة للأصول" : "Add Vehicle to Fleet Assets")}
          </button>
        </div>
      </form>
    </div>
  );
};
