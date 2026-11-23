"use client";
import NextImage from "next/image";

import { getApiErrorMessage } from "@/lib/api/errors";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { navigateToWorkspacePage, clearPendingFleetReceiveContext, clearPendingVariantSetupContext } from "../../store/slices/workspaceSlice";
import { useListVariantsQuery, useCreateVariantMutation, useListVehiclePhotosQuery, useListRentalInclusionsQuery, useCreateVehicleMutation, useReceiveVehicleMutation, useListPurchaseOrdersQuery, useListVehiclesQuery, useApplyVariantListingSetupMutation, type CreateVehicleVariantInput } from "../../store/api/fleetApi";
import { useGetWorkspaceContextQuery, type BranchDto } from "../../store/api/workspaceApi";
import { resolveAssetUrl } from "../../store/api/baseApi";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixSelect, type SelectOption } from "@/components/ui/RevixSelect";
import { decodeSipp } from "../../lib/fleet/sippDecoder";

interface AddFleetVehiclePageProps {
  lang?: "ar" | "en";
}

export const AddFleetVehiclePage: React.FC<AddFleetVehiclePageProps> = ({ lang = "ar" }) => {
  const isAr = lang === "ar";
  const dispatch = useAppDispatch();

  // Redux state
  const pendingReceive = useAppSelector((state) => state.workspace.pendingFleetReceiveContext);
  const pendingVariantSetup = useAppSelector((state) => state.workspace.pendingVariantSetupContext);
  const isVariantSetupMode = Boolean(pendingVariantSetup);
  const selectedBranchId = useAppSelector((state) => state.workspace.selectedBranchId);

  // API Queries
  const { data: variantsRes } = useListVariantsQuery();
  const { data: workspaceCtx } = useGetWorkspaceContextQuery();
  const { data: photosRes } = useListVehiclePhotosQuery();
  const { data: posRes } = useListPurchaseOrdersQuery();
  const { data: inclusionsRes } = useListRentalInclusionsQuery({ activeOnly: true });
  const { data: batchVehiclesRes } = useListVehiclesQuery(
    { variantId: pendingVariantSetup?.variantId, pageSize: 500 },
    { skip: !pendingVariantSetup },
  );

  // Mutations
  const [createVehicle, { isLoading: isCreating }] = useCreateVehicleMutation();
  const [receiveVehicle, { isLoading: isReceiving }] = useReceiveVehicleMutation();
  const [applyVariantListingSetup, { isLoading: isApplyingVariantSetup }] =
    useApplyVariantListingSetupMutation();
  const [createVariant] = useCreateVariantMutation();

  const variants = useMemo(() => variantsRes?.data ?? [], [variantsRes?.data]);
  const branches: BranchDto[] = useMemo(() => workspaceCtx?.data?.branches ?? [], [workspaceCtx?.data?.branches]);
  const photos = useMemo(() => photosRes?.data ?? [], [photosRes?.data]);
  const purchaseOrders = useMemo(() => posRes?.data ?? [], [posRes?.data]);
  const availableInclusions = useMemo(() => inclusionsRes?.data ?? [], [inclusionsRes?.data]);
  const batchVehicles = useMemo(() => {
    if (!pendingVariantSetup) return [];
    return (batchVehiclesRes?.data ?? []).filter(
      (v) => v.variantId === pendingVariantSetup.variantId && !v.isPartnerVehicle,
    );
  }, [batchVehiclesRes?.data, pendingVariantSetup]);
  const batchBranchSummary = useMemo(() => {
    const names = Array.from(
      new Set(
        batchVehicles
          .map((v) => v.branchName || (isAr ? "مخزون الشركة" : "Company Stock"))
          .filter(Boolean),
      ),
    );
    return names.length > 0 ? names.join("، ") : isAr ? "موزع على الفروع" : "Assigned Branches";
  }, [batchVehicles, isAr]);

  // Active PO and Line Item if arriving from PO


  // Form States
  const [vehicleName, setVehicleName] = useState<string>(pendingVariantSetup?.variantTitle || "");
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    pendingVariantSetup?.variantId || pendingReceive?.variantId || "",
  );
  const [branchOverride, setBranchId] = useState<string>(pendingReceive?.branchId || "");
  const branchId = branchOverride || selectedBranchId || branches[0]?.id || "";

  // Section 1: Identification & Physical
  const [vin, setVin] = useState(pendingReceive?.vin || "");
  const [licensePlate, setLicensePlate] = useState("");
  const [keyNumber, setKeyNumber] = useState("");
  const [color, setColor] = useState(pendingReceive?.color || "White");
  const [customColor, setCustomColor] = useState("");
  const [mileageOdometer, setMileageOdometer] = useState<number>(0);

  // Section 2: Photo & Car Details
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false);
  const [photoSearch, setPhotoSearch] = useState("");
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
  const [dailyRate1to2, setDailyRate1to2] = useState<number>(0);
  const [dailyRate3to7, setDailyRate3to7] = useState<number>(0);
  const [dailyRate8Plus, setDailyRate8Plus] = useState<number>(0);
  const [damageExcess, setDamageExcess] = useState<number>(0);

  // Section 5: Mileage Policy
  const [mileagePolicy, setMileagePolicy] = useState<"unlimited" | "limited">("unlimited");
  const [dailyKmLimit, setDailyKmLimit] = useState<number>(200);
  const [extraKmRate, setExtraKmRate] = useState<number>(0.35);

  // Section 6: Inclusions
  const [selectedInclusions, setSelectedInclusions] = useState<string[]>([]);
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
  const [step, setStep] = useState<number>(1);

  const wizardSteps = useMemo(
    () =>
      isVariantSetupMode
        ? [
            { num: 1, key: "details", ar: "الصورة والمواصفات", en: "Photo & Specs" },
            { num: 2, key: "pricing", ar: "التسعير والمزايا", en: "Pricing & Inclusions" },
          ]
        : [
            { num: 1, key: "details", ar: "البيانات والمواصفات", en: "Details & Specs" },
            { num: 2, key: "registration", ar: "بيانات التسجيل", en: "Registration" },
            { num: 3, key: "pricing", ar: "التسعير والمزايا", en: "Pricing & Inclusions" },
          ],
    [isVariantSetupMode],
  );
  const currentStepKey = wizardSteps[step - 1]?.key ?? "details";
  const isLastStep = step === wizardSteps.length;

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


  // When variant changes: Auto decode SIPP, set car name, and Auto-match photo!
  const [appliedVariantId, setAppliedVariantId] = useState<string | null>(null);
  if (selectedVariant && appliedVariantId !== selectedVariant.id) {
    setAppliedVariantId(selectedVariant.id);

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

  }

  // Hydrate existing batch pricing, photo, inclusions & policies in Bulk Variant Setup mode
  const [hydratedBatchVariantId, setHydratedBatchVariantId] = useState<string>("");
  useEffect(() => {
    if (!pendingVariantSetup || batchVehicles.length === 0) return;
    if (hydratedBatchVariantId === pendingVariantSetup.variantId) return;

    const sample =
      batchVehicles.find((v) => Number(v.dailyRate1to2 ?? 0) > 0) ||
      batchVehicles[0]!;
    const withPhoto = batchVehicles.find((v) => Boolean(v.photoUrl));
    const withInclusions = batchVehicles.find(
      (v) => Array.isArray(v.inclusions) && v.inclusions.length > 0,
    );

    if (Number(sample.dailyRate1to2 ?? 0) > 0) {
      setDailyRate1to2(Number(sample.dailyRate1to2));
      setDailyRate3to7(Number(sample.dailyRate3to7 ?? 0));
      setDailyRate8Plus(Number(sample.dailyRate8Plus ?? 0));
      setDamageExcess(Number(sample.damageExcess ?? 0));
    }
    if (sample.mileagePolicy) setMileagePolicy(sample.mileagePolicy);
    if (sample.dailyKmLimit != null) setDailyKmLimit(Number(sample.dailyKmLimit));
    if (sample.extraKmRate != null) setExtraKmRate(Number(sample.extraKmRate));
    if (sample.locationType) setLocationType(sample.locationType);
    if (sample.fuelPolicy) setFuelPolicy(sample.fuelPolicy);
    if (sample.deliveryPolicy) setDeliveryPolicy(sample.deliveryPolicy);
    if (sample.description) setDescription(sample.description);
    if (sample.instantConfirmation !== undefined) {
      setInstantConfirmation(Boolean(sample.instantConfirmation));
    }
    if (sample.seats) setSeats(Number(sample.seats));
    if (sample.doors) setDoors(Number(sample.doors));
    if (sample.luggageCapacity) setLuggageCapacity(sample.luggageCapacity);
    if (sample.transmission) setTransmission(sample.transmission.toLowerCase());
    if (sample.fuelType) setFuelType(sample.fuelType.toLowerCase());
    if (sample.airConditioning !== undefined) {
      setAirConditioning(Boolean(sample.airConditioning));
    }
    if (withPhoto?.photoUrl) {
      setPhotoUrl(withPhoto.photoUrl);
    }
    if (withInclusions?.inclusions) {
      setSelectedInclusions(withInclusions.inclusions);
    }
    setHydratedBatchVariantId(pendingVariantSetup.variantId);
  }, [pendingVariantSetup, batchVehicles, hydratedBatchVariantId]);

  // Auto-match photo by name once photos catalog finishes loading
  useEffect(() => {
    if (photoUrl || photos.length === 0) return;
    const candidateName = selectedVariant
      ? `${selectedVariant.make} ${selectedVariant.model}`.toLowerCase()
      : vehicleName.trim().toLowerCase();
    if (!candidateName) return;

    const matched = photos.find((p) => {
      const pName = p.vehicleName.toLowerCase();
      return (
        candidateName.includes(pName) ||
        pName.includes(candidateName) ||
        (selectedVariant ? pName.includes(selectedVariant.model.toLowerCase()) : false)
      );
    });
    if (matched) {
      setPhotoUrl(matched.photoUrl);
    }
  }, [photos, photoUrl, selectedVariant, vehicleName]);

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
      { value: "sedan", label: isAr ? "سيدان" : "Sedan" },
      { value: "suv", label: isAr ? "دفع رباعي" : "SUV" },
      { value: "compact", label: isAr ? "مدمجة" : "Compact" },
      { value: "economy", label: isAr ? "اقتصادية" : "Economy" },
      { value: "luxury", label: isAr ? "فاخرة" : "Luxury" },
      { value: "van", label: isAr ? "فان عائلي" : "Van" },
      { value: "commercial", label: isAr ? "تجارية" : "Commercial" },
    ],
    [isAr],
  );

  const locationTypeOptions: SelectOption[] = useMemo(
    () => [
      { value: "airport_terminal", label: isAr ? "صالة المطار" : "Airport Terminal" },
      { value: "airport_shuttle", label: isAr ? "باص المطار" : "Airport Shuttle" },
      { value: "city_branch", label: isAr ? "فرع داخل المدينة" : "City Branch" },
      { value: "railway_station", label: isAr ? "محطة القطار" : "Railway Station" },
      { value: "hotel_delivery", label: isAr ? "توصيل للفندق" : "Hotel Delivery" },
      { value: "meet_and_greet", label: isAr ? "استقبال شخصي" : "Meet & Greet" },
    ],
    [isAr],
  );

  const fuelPolicyOptions: SelectOption[] = useMemo(
    () => [
      { value: "full_to_full", label: isAr ? "ممتلئ إلى ممتلئ" : "Full to Full" },
      { value: "same_to_same", label: isAr ? "نفس المستوى" : "Same to Same" },
      { value: "free_tank", label: isAr ? "خزان مجاني" : "Free Tank" },
      { value: "pre_purchase", label: isAr ? "شراء مسبق" : "Pre-purchase" },
    ],
    [isAr],
  );

  const deliveryPolicyOptions: SelectOption[] = useMemo(
    () => [
      { value: "branch_pickup", label: isAr ? "استلام من الفرع فقط" : "Branch Pickup Only" },
      { value: "airport_delivery", label: isAr ? "توصيل واستلام من المطار" : "Airport Delivery" },
      { value: "city_delivery", label: isAr ? "توصيل داخل المدينة" : "City Wide Delivery" },
      { value: "flexible", label: isAr ? "تسليم واستلام مرن" : "Flexible Delivery" },
    ],
    [isAr],
  );

  const colorOptions: SelectOption[] = useMemo(
    () => [
      { value: "White", label: isAr ? "أبيض" : "White", description: "#FFFFFF" },
      { value: "Black", label: isAr ? "أسود" : "Black", description: "#111827" },
      { value: "Silver", label: isAr ? "فضي" : "Silver", description: "#E5E7EB" },
      { value: "Gray", label: isAr ? "رمادي" : "Gray", description: "#6B7280" },
      { value: "Blue", label: isAr ? "أزرق" : "Blue", description: "#1E40AF" },
      { value: "Red", label: isAr ? "أحمر" : "Red", description: "#DC2626" },
      { value: "Brown", label: isAr ? "بني" : "Brown", description: "#78350F" },
      { value: "Gold", label: isAr ? "ذهبي" : "Gold", description: "#D97706" },
      { value: "Custom", label: isAr ? "لون مخصص..." : "Custom Color..." },
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
      { value: "yes", label: isAr ? "تكييف" : "A/C" },
      { value: "no", label: isAr ? "بدون تكييف" : "No A/C" },
    ],
    [isAr],
  );

  const fuelTypeOptions: SelectOption[] = useMemo(
    () => [
      { value: "petrol", label: isAr ? "بنزين" : "Petrol" },
      { value: "diesel", label: isAr ? "ديزل" : "Diesel" },
      { value: "hybrid", label: isAr ? "هايبرد" : "Hybrid" },
      { value: "electric", label: isAr ? "كهرباء" : "Electric" },
    ],
    [isAr],
  );

  const luggageOptions: SelectOption[] = useMemo(
    () => [
      { value: "1 Small Bag", label: isAr ? "1 حقيبة" : "1 Small Bag" },
      { value: "2 Bags", label: isAr ? "2 حقائب" : "2 Bags" },
      { value: "3 Bags", label: isAr ? "3 حقائب" : "3 Bags" },
      { value: "4+ Bags", label: isAr ? "4+ حقائب" : "4+ Large Bags" },
    ],
    [isAr],
  );

  const transmissionOptions: SelectOption[] = useMemo(
    () => [
      { value: "automatic", label: isAr ? "أوتوماتيك" : "Automatic" },
      { value: "manual", label: isAr ? "مانيوال" : "Manual" },
    ],
    [isAr],
  );

  const handleInclusionToggle = (id: string) => {
    setSelectedInclusions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCancel = () => {
    const wasVariantSetup = Boolean(pendingVariantSetup);
    dispatch(clearPendingFleetReceiveContext());
    dispatch(clearPendingVariantSetupContext());
    dispatch(
      navigateToWorkspacePage({
        section: "fleet",
        subPage: wasVariantSetup ? "fleet-live" : "vehicles",
      }),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Mode 0: Bulk Variant Booking Setup (applies photo, inclusions, specs, policies & pricing to ALL cars of this variant)
    if (pendingVariantSetup) {
      if (Number(dailyRate1to2) <= 0) {
        setErrorMessage(
          isAr
            ? "أدخل سعر التأجير اليومي (١–٢ يوم) قبل نشر السيارات للحجز."
            : "Enter a daily rate for 1–2 days before publishing this variant for booking.",
        );
        return;
      }
      try {
        const res = await applyVariantListingSetup({
          variantId: pendingVariantSetup.variantId,
          photoUrl: photoUrl.trim() || null,
          locationType,
          fuelPolicy,
          instantConfirmation,
          description: description.trim() ? description.trim().slice(0, 1000) : null,
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
          publishToFleet: true,
        }).unwrap();

        setSuccessMessage(
          isAr
            ? `تم تجهيز ونشر ${res.data.updatedCount} سيارة من (${pendingVariantSetup.variantTitle}) في الأسطول الجاهز للحجز بنجاح!`
            : `Configured and published ${res.data.updatedCount} vehicles of (${pendingVariantSetup.variantTitle}) to Bookable Fleet!`,
        );
        dispatch(clearPendingVariantSetupContext());
        setTimeout(() => {
          dispatch(navigateToWorkspacePage({ section: "fleet", subPage: "fleet-live" }));
        }, 1200);
      } catch (err: unknown) {
        setErrorMessage(
          getApiErrorMessage(err) ||
            (isAr
              ? "تعذر تطبيق إعدادات الحجز على دفعة السيارات."
              : "Failed to apply booking setup to variant batch."),
        );
      }
      return;
    }

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
    if (Number(dailyRate1to2) <= 0) {
      setErrorMessage(isAr ? "أدخل سعر التأجير اليومي (١–٢ يوم) قبل نشر السيارة للحجز." : "Enter a daily rate for 1–2 days before publishing this vehicle for booking.");
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
      isBookable: true,
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
            category: (category as CreateVehicleVariantInput["category"]) || "sedan",
            transmission: (transmission as CreateVehicleVariantInput["transmission"]) || "automatic",
            fuelType: (fuelType as CreateVehicleVariantInput["fuelType"]) || "petrol",
            seatingCapacity: Number(seats) || 5,
            sippCode: "ICAR",
          }).unwrap();
          effectiveVariantId = created.data.id;
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
    } catch (err: unknown) {
      setErrorMessage(
        getApiErrorMessage(err) ||
          (isAr ? "حدث خطأ أثناء حفظ السيارة. تأكد من عدم تكرار رقم الشاسيه أو اللوحة." : "Failed to register vehicle.")
      );
    }
  };

  const isSubmitting = isCreating || isReceiving || isApplyingVariantSetup;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden" dir={isAr ? "rtl" : "ltr"}>
      {/* Clean Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 py-1">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={handleCancel}
            title={isAr ? "رجوع" : "Back"}
            aria-label={isAr ? "رجوع" : "Back"}
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-revix-border bg-white text-revix-secondary hover:bg-revix-surface transition-colors"
          >
            <RevixIcon name={isAr ? "arrow-right" : "arrow-left"} size={14} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-revix-dark sm:text-xl truncate">
              {pendingVariantSetup
                ? isAr
                  ? `تجهيز دفعة للحجز: ${pendingVariantSetup.variantTitle}`
                  : `Bulk Booking Setup: ${pendingVariantSetup.variantTitle}`
                : isAr
                  ? "إضافة سيارة للأصول"
                  : "Add Fleet Vehicle"}
            </h1>
            {pendingVariantSetup && (
              <p className="mt-0.5 text-xs text-revix-secondary">
                {isAr
                  ? `${batchVehicles.length || pendingVariantSetup.totalUnits} سيارة — تطبق الصورة والمواصفات والمزايا والأسعار على الدفعة بالكامل`
                  : `${batchVehicles.length || pendingVariantSetup.totalUnits} vehicles — photo, specs, inclusions & pricing apply to the whole batch`}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => dispatch(navigateToWorkspacePage({ section: "fleet", subPage: "vehicle-photos" }))}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-revix-border bg-white px-3 text-xs font-semibold text-revix-dark hover:bg-revix-surface transition"
          >
            <RevixIcon name="car-front" className="w-3.5 h-3.5 text-revix-primary" />
            <span>{isAr ? "مكتبة الصور" : "Photo Library"}</span>
          </button>
        </div>
      </div>

      {/* Clean Wizard Stepper Bar */}
      <nav
        aria-label={isAr ? "خطوات الإضافة" : "Setup steps"}
        className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-revix-border"
      >
        {wizardSteps.map((s) => {
          const active = step === s.num;
          const completed = step > s.num;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setStep(s.num);
              }}
              className={`inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-xs transition-colors ${
                active
                  ? "border-revix-primary font-semibold text-revix-primary"
                  : "border-transparent font-medium text-revix-secondary hover:text-revix-dark"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-[11px] font-bold ${
                  active
                    ? "bg-revix-primary text-white"
                    : completed
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-revix-surface text-revix-muted"
                }`}
              >
                {completed ? "✓" : s.num}
              </span>
              <span>{isAr ? s.ar : s.en}</span>
            </button>
          );
        })}
      </nav>

      {/* Notifications */}
      {errorMessage && (
        <div className="shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 flex items-center gap-2">
          <RevixIcon name="info" className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-700 flex items-center gap-2">
          <RevixIcon name="check-circle-2" className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto space-y-5 pe-0.5 pb-4">
        {/* ====================================================================== */}
        {/* STEP 1: CAR DETAILS & SPECS */}
        {/* ====================================================================== */}
        {currentStepKey === "details" && (
        <div className="rounded-xl border border-revix-border bg-revix-white p-5 space-y-5 text-[13px]">
            {/* Row 1: All Core Details Side-by-Side across Full Width */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3.5 ${pendingReceive ? "lg:grid-cols-4" : "lg:grid-cols-6"}`}>
              {/* 1. Vehicle Name / Model */}
              <div>
                <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                  {isAr ? "اسم السيارة *" : "Vehicle Name *"}
                </label>
                <input
                  type="text"
                  placeholder={isAr ? "مثال: تويوتا كامري" : "e.g. Toyota Camry"}
                  value={vehicleName}
                  onChange={(e) => handleVehicleNameChange(e.target.value)}
                  className="h-10 w-full rounded-lg border border-revix-border bg-white px-3 text-[13px] font-medium text-revix-dark placeholder:text-revix-muted focus:border-revix-primary focus:outline-hidden"
                />
              </div>

              {/* 2. Catalog Variant (only shown when converting from a Purchase Order) */}
              {pendingReceive && (
                <div>
                  <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                    {isAr ? "الفئة والموديل *" : "Model Variant *"}
                  </label>
                  <RevixSelect
                    size="sm"
                    isRtl={isAr}
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    disabled={Boolean(pendingReceive?.variantId)}
                    options={variantOptions}
                    placeholder={isAr ? "اختر الفئة والموديل..." : "Select variant..."}
                    searchable
                    buttonClassName="w-full h-10 rounded-lg text-[13px]"
                  />
                </div>
              )}

              {/* 3. Branch / Pickup Location */}
              <div>
                <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                  {isVariantSetupMode
                    ? isAr
                      ? "فروع تواجد الدفعة"
                      : "Assigned Branches"
                    : isAr
                      ? "فرع الاستلام *"
                      : "Pickup Branch *"}
                </label>
                {isVariantSetupMode ? (
                  <div className="flex h-10 items-center rounded-lg border border-revix-border bg-revix-surface/60 px-3 text-[13px] font-medium text-revix-dark truncate">
                    {batchBranchSummary}
                  </div>
                ) : (
                  <RevixSelect
                    size="sm"
                    isRtl={isAr}
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    options={branchOptions}
                    placeholder={isAr ? "اختر الفرع..." : "Select branch..."}
                    searchable
                    buttonClassName="w-full h-10 rounded-lg text-[13px]"
                  />
                )}
              </div>

              {/* 4. Vehicle Photo */}
              <div ref={photoPickerRef} className="relative">
                <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                  {isAr ? "صورة السيارة" : "Vehicle Photo"}
                </label>

                <div className="flex items-center gap-2">
                  <div className="relative min-w-0 flex-1">
                    <input
                      type="text"
                      placeholder={isAr ? "اختر صورة..." : "Choose photo..."}
                      value={
                        photos.find((p) => p.photoUrl === photoUrl)?.vehicleName ??
                        photoUrl
                      }
                      onClick={() => setPhotoPickerOpen(true)}
                      onFocus={() => setPhotoPickerOpen(true)}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      className="h-10 w-full rounded-lg border border-revix-border bg-white px-3 pe-8 text-[13px] text-revix-dark cursor-pointer focus:cursor-text focus:border-revix-primary focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoPickerOpen((prev) => !prev)}
                      aria-label={isAr ? "فتح مكتبة الصور" : "Toggle photo library"}
                      className="absolute inset-y-0 end-0 px-2.5 flex items-center text-revix-muted hover:text-revix-dark transition"
                    >
                      <RevixIcon
                        name="chevron-down"
                        className={`w-4 h-4 transition-transform duration-200 ${
                          photoPickerOpen ? "rotate-180 text-revix-primary" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {photoUrl && (
                    <div className="h-10 w-12 shrink-0 overflow-hidden rounded-lg border border-revix-border bg-revix-surface flex items-center justify-center">
                      <NextImage unoptimized width={640} height={480}
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
                  <div className="absolute end-0 top-full mt-1.5 w-[min(92vw,34rem)] p-3 bg-white border border-gray-200 rounded-xl shadow-xl space-y-3 z-[60]">
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                      <h4 className="text-xs font-bold text-gray-800">
                        {isAr ? "مكتبة الصور" : "Photo library"}
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
                          ? "لا توجد صور مطابقة في مكتبة الصور."
                          : "No matching photos found."}
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
                            <div className="w-full h-14 bg-gray-50 rounded flex items-center justify-center overflow-hidden">
                              <NextImage unoptimized width={640} height={480} src={resolveAssetUrl(p.photoUrl)} alt={p.vehicleName} className="max-h-full max-w-full object-contain" />
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

              {/* 5. Category */}
              <div>
                <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                  {isAr ? "التصنيف *" : "Category *"}
                </label>
                <RevixSelect
                  size="sm"
                  isRtl={isAr}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  options={categoryOptions}
                  buttonClassName="w-full h-10 rounded-lg text-[13px]"
                />
              </div>

              {/* 6. Location Type */}
              <div>
                <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                  {isAr ? "نوع الموقع *" : "Location Type *"}
                </label>
                <RevixSelect
                  size="sm"
                  isRtl={isAr}
                  value={locationType}
                  onChange={(e) => setLocationType(e.target.value)}
                  options={locationTypeOptions}
                  buttonClassName="w-full h-10 rounded-lg text-[13px]"
                />
              </div>

              {/* 7. Fuel Policy */}
              <div>
                <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                  {isAr ? "سياسة الوقود *" : "Fuel Policy *"}
                </label>
                <RevixSelect
                  size="sm"
                  isRtl={isAr}
                  value={fuelPolicy}
                  onChange={(e) => setFuelPolicy(e.target.value)}
                  options={fuelPolicyOptions}
                  buttonClassName="w-full h-10 rounded-lg text-[13px]"
                />
              </div>
            </div>

            {/* Technical Specs Row */}
            <div className="border-t border-revix-border/70 pt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                  {isAr ? "المقاعد" : "Seats"}
                </label>
                <RevixSelect
                  size="sm"
                  isRtl={isAr}
                  value={String(seats)}
                  onChange={(e) => setSeats(Number(e.target.value))}
                  options={seatsOptions}
                  buttonClassName="w-full h-10 rounded-lg text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                  {isAr ? "الأبواب" : "Doors"}
                </label>
                <RevixSelect
                  size="sm"
                  isRtl={isAr}
                  value={String(doors)}
                  onChange={(e) => setDoors(Number(e.target.value))}
                  options={doorsOptions}
                  buttonClassName="w-full h-10 rounded-lg text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                  {isAr ? "التكييف" : "A/C"}
                </label>
                <RevixSelect
                  size="sm"
                  isRtl={isAr}
                  value={airConditioning ? "yes" : "no"}
                  onChange={(e) => setAirConditioning(e.target.value === "yes")}
                  options={acOptions}
                  buttonClassName="w-full h-10 rounded-lg text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                  {isAr ? "الوقود" : "Fuel"}
                </label>
                <RevixSelect
                  size="sm"
                  isRtl={isAr}
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                  options={fuelTypeOptions}
                  buttonClassName="w-full h-10 rounded-lg text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                  {isAr ? "الشنط" : "Luggage"}
                </label>
                <RevixSelect
                  size="sm"
                  isRtl={isAr}
                  value={luggageCapacity}
                  onChange={(e) => setLuggageCapacity(e.target.value)}
                  options={luggageOptions}
                  buttonClassName="w-full h-10 rounded-lg text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                  {isAr ? "الفتيس" : "Transmission"}
                </label>
                <RevixSelect
                  size="sm"
                  isRtl={isAr}
                  value={transmission}
                  onChange={(e) => setTransmission(e.target.value)}
                  options={transmissionOptions}
                  buttonClassName="w-full h-10 rounded-lg text-[13px]"
                />
              </div>
            </div>

            {/* Compact Notes + Instant Confirmation Side-by-Side */}
            <div className="border-t border-revix-border/70 pt-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
              <div className="lg:col-span-9">
                <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                  {isAr ? "ملاحظات (اختياري)" : "Notes (optional)"}
                </label>
                <input
                  type="text"
                  placeholder={isAr ? "أضف ملاحظة..." : "Add a note..."}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-10 w-full rounded-lg border border-revix-border bg-white px-3.5 text-[13px] text-revix-dark focus:border-revix-primary focus:outline-hidden"
                />
              </div>

              <div className="lg:col-span-3 flex h-10 items-center">
                <label className="inline-flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={instantConfirmation}
                    onChange={(e) => setInstantConfirmation(e.target.checked)}
                    className="h-4 w-4 rounded border-revix-border accent-revix-primary"
                  />
                  <span className="text-[13px] font-medium text-revix-dark">
                    {isAr ? "تأكيد الحجز تلقائيًا" : "Confirm bookings automatically"}
                  </span>
                </label>
              </div>
            </div>
        </div>
        )}

        {/* ====================================================================== */}
        {/* STEP 2: REGISTRATION */}
        {/* ====================================================================== */}
        {!isVariantSetupMode && currentStepKey === "registration" && (
        <div className="rounded-xl border border-revix-border bg-revix-white p-5 text-[13px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
            <div>
              <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                {isAr ? "رقم اللوحة *" : "License Plate *"}
              </label>
              <input
                type="text"
                placeholder={isAr ? "مثال: أ ب ج 1234" : "e.g. 12-34567"}
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                className="h-10 w-full rounded-lg border border-revix-border bg-white px-3 text-[13px] font-medium text-revix-dark focus:border-revix-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                {isAr ? "رقم الشاصي *" : "Chassis Number *"}
              </label>
              <input
                type="text"
                placeholder="1HGCR2F83HA001234"
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
                className="h-10 w-full rounded-lg border border-revix-border bg-white px-3 font-mono text-[13px] font-medium text-revix-dark focus:border-revix-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                {isAr ? "رقم المفتاح" : "Key Number"}
              </label>
              <input
                type="text"
                placeholder="K-102"
                value={keyNumber}
                onChange={(e) => setKeyNumber(e.target.value)}
                className="h-10 w-full rounded-lg border border-revix-border bg-white px-3 text-[13px] font-medium text-revix-dark focus:border-revix-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                {isAr ? "اللون *" : "Color *"}
              </label>
              <RevixSelect
                size="sm"
                isRtl={isAr}
                value={color}
                onChange={(e) => setColor(e.target.value)}
                options={colorOptions}
                buttonClassName="w-full h-10 rounded-lg text-[13px]"
              />
              {color === "Custom" && (
                <input
                  type="text"
                  placeholder={isAr ? "اكتب اللون..." : "Custom color..."}
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="mt-2 h-10 w-full rounded-lg border border-revix-border bg-white px-3 text-[13px] text-revix-dark focus:border-revix-primary focus:outline-hidden"
                  autoFocus
                />
              )}
            </div>

            <div>
              <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                {isAr ? "قراءة العداد *" : "Odometer *"}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={mileageOdometer}
                  onChange={(e) => setMileageOdometer(Number(e.target.value))}
                  className="h-10 w-full rounded-lg border border-revix-border bg-white px-3 pe-11 text-[13px] font-medium text-revix-dark focus:border-revix-primary focus:outline-hidden"
                />
                <span className="pointer-events-none absolute inset-y-0 end-2 flex items-center">
                  <span className="rounded bg-revix-surface px-1.5 py-0.5 text-[11px] font-medium text-revix-secondary">
                    {isAr ? "كم" : "KM"}
                  </span>
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                {isAr ? "سياسة التسليم" : "Delivery Policy"}
              </label>
              <RevixSelect
                size="sm"
                isRtl={isAr}
                value={deliveryPolicy}
                onChange={(e) => setDeliveryPolicy(e.target.value)}
                options={deliveryPolicyOptions}
                buttonClassName="w-full h-10 rounded-lg text-[13px]"
              />
            </div>
          </div>
        </div>
        )}

        {/* ====================================================================== */}
        {/* STEP 3: PRICING, MILEAGE & INCLUSIONS (Single Unified Sheet) */}
        {/* ====================================================================== */}
        {currentStepKey === "pricing" && (
        <div className="rounded-xl border border-revix-border bg-revix-white p-6 divide-y divide-revix-border/70 text-[13px]">
          {/* 1. Rental Rates */}
          <div className="pb-5 space-y-3">
            <h2 className="text-sm font-semibold text-revix-dark">
              {isAr ? "أسعار التأجير" : "Rental Rates"}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: isAr ? "سعر اليوم (١–٢ يوم) *" : "Daily rate (1–2 days) *", value: dailyRate1to2, setter: setDailyRate1to2, required: true },
                { label: isAr ? "سعر اليوم (٣–٧ أيام)" : "Daily rate (3–7 days)", value: dailyRate3to7, setter: setDailyRate3to7, required: false },
                { label: isAr ? "سعر اليوم (٨+ أيام)" : "Daily rate (8+ days)", value: dailyRate8Plus, setter: setDailyRate8Plus, required: false },
                { label: isAr ? "تحمل الأضرار" : "Damage Excess", value: damageExcess, setter: setDamageExcess, required: false },
              ].map((rate) => (
                <label key={rate.label} className="block text-[13px] font-medium text-revix-dark">
                  {rate.label}
                  <div className="mt-1.5 flex h-10 items-center overflow-hidden rounded-lg border border-revix-border bg-white focus-within:border-revix-primary">
                    <input type="number" min="0" step="0.01" required={rate.required} value={rate.value} onChange={(event) => rate.setter(Math.max(0, Number(event.target.value) || 0))} className="h-full min-w-0 flex-1 px-3 text-[13px] text-revix-dark outline-none" />
                    <span className="px-2.5 text-[11px] font-medium text-revix-secondary">{currencySymbol}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 2 & 3. Mileage Policy + Contract Inclusions — All Aligned on One Row */}
          <div className="pt-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            <div className="lg:col-span-7 flex flex-wrap items-end gap-3">
              <div>
                <span className="block text-[13px] font-medium text-revix-dark mb-1.5">
                  {isAr ? "سياسة الكيلومترات" : "Mileage Policy"}
                </span>
                <div className="inline-flex h-10 items-center gap-1 rounded-lg border border-revix-border bg-revix-surface p-1">
                  <button
                    type="button"
                    onClick={() => setMileagePolicy("unlimited")}
                    className={`h-8 cursor-pointer rounded-md px-3.5 text-[13px] font-semibold transition-all ${
                      mileagePolicy === "unlimited"
                        ? "bg-revix-primary text-white shadow-xs"
                        : "text-revix-secondary hover:bg-white hover:text-revix-dark"
                    }`}
                  >
                    {isAr ? "كيلومترات مفتوحة" : "Unlimited"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMileagePolicy("limited")}
                    className={`h-8 cursor-pointer rounded-md px-3.5 text-[13px] font-semibold transition-all ${
                      mileagePolicy === "limited"
                        ? "bg-revix-primary text-white shadow-xs"
                        : "text-revix-secondary hover:bg-white hover:text-revix-dark"
                    }`}
                  >
                    {isAr ? "حد يومي محدد" : "Limited daily"}
                  </button>
                </div>
              </div>

              {mileagePolicy === "limited" && (
                <>
                  <label className="block w-36 text-[13px] font-medium text-revix-dark">
                    {isAr ? "الحد اليومي *" : "Daily limit *"}
                    <div className="mt-1.5 flex h-10 items-center overflow-hidden rounded-lg border border-revix-border bg-white focus-within:border-revix-primary">
                      <input
                        type="number"
                        min="1"
                        value={dailyKmLimit}
                        onChange={(e) => setDailyKmLimit(Number(e.target.value))}
                        className="h-full min-w-0 flex-1 px-3 text-[13px] text-revix-dark outline-none"
                      />
                      <span className="px-2.5 text-[11px] font-medium text-revix-secondary">
                        {isAr ? "كم" : "KM"}
                      </span>
                    </div>
                  </label>

                  <label className="block w-40 text-[13px] font-medium text-revix-dark">
                    {isAr ? "سعر الكم الإضافي *" : "Extra KM rate *"}
                    <div className="mt-1.5 flex h-10 items-center overflow-hidden rounded-lg border border-revix-border bg-white focus-within:border-revix-primary">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={extraKmRate}
                        onChange={(e) => setExtraKmRate(Number(e.target.value))}
                        className="h-full min-w-0 flex-1 px-3 text-[13px] text-revix-dark outline-none"
                      />
                      <span className="px-2.5 text-[11px] font-medium text-revix-secondary">
                        {currencySymbol}
                      </span>
                    </div>
                  </label>
                </>
              )}
            </div>

            <div className="lg:col-span-5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-revix-dark">
                    {isAr ? "مزايا العقد" : "Contract Inclusions"}
                  </span>
                  <span className="rounded bg-revix-surface px-1.5 py-0.5 font-mono text-[11px] font-semibold text-revix-secondary">
                    {selectedInclusions.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch(navigateToWorkspacePage({ section: "fleet", subPage: "rental-inclusions" }))}
                  className="cursor-pointer text-xs font-medium text-revix-primary hover:underline"
                >
                  {isAr ? "إدارة الكتالوج" : "Manage Catalog"}
                </button>
              </div>

              {/* Multi-Select Dropdown Field */}
              <div ref={inclusionsRef} className="relative">
              <button
                type="button"
                onClick={() => setInclusionsDropdownOpen(!inclusionsDropdownOpen)}
                className="flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-revix-border bg-white px-3.5 text-start text-[13px] transition hover:border-revix-muted focus:border-revix-primary focus:outline-hidden"
              >
                <div className="flex items-center gap-2 truncate">
                  <RevixIcon name="check-circle-2" className="h-4 w-4 shrink-0 text-revix-primary" />
                  <span className={selectedInclusions.length > 0 ? "font-medium text-revix-dark" : "text-revix-muted"}>
                    {selectedInclusions.length > 0
                      ? isAr
                        ? `تم تحديد ${selectedInclusions.length} مزايا`
                        : `${selectedInclusions.length} features selected`
                      : isAr
                      ? "اختر المزايا..."
                      : "Select features..."}
                  </span>
                </div>
                <RevixIcon
                  name="chevron-down"
                  className={`h-4 w-4 text-revix-muted transition-transform ${
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
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {selectedInclusions.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 rounded-md border border-revix-primary/20 bg-revix-primary-subtle px-2.5 py-1 text-xs font-medium text-revix-primary"
                  >
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => handleInclusionToggle(name)}
                      className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-revix-primary/80 transition hover:bg-revix-primary/15"
                      title={isAr ? "إزالة" : "Remove"}
                    >
                      <RevixIcon name="x" className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>
        )}
        </div>

        {/* Clean Pinned Wizard Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-revix-border bg-revix-white pt-3">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setStep((s) => Math.max(1, s - 1));
                }}
                disabled={isSubmitting}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-revix-border bg-white px-4 text-xs font-semibold text-revix-dark hover:bg-revix-surface transition"
              >
                <RevixIcon name={isAr ? "arrow-right" : "arrow-left"} size={14} />
                <span>{isAr ? "السابق" : "Back"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-revix-border bg-white px-4 text-xs font-semibold text-revix-secondary hover:bg-revix-surface transition"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {!isLastStep ? (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setStep((s) => Math.min(wizardSteps.length, s + 1));
                }}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-5 text-xs font-semibold text-white shadow-xs hover:bg-revix-primary-hover transition"
              >
                <span>{isAr ? "التالي" : "Next"}</span>
                <RevixIcon name={isAr ? "arrow-left" : "arrow-right"} size={14} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-5 text-xs font-semibold text-white shadow-xs hover:bg-revix-primary-hover transition disabled:opacity-50"
              >
                <RevixIcon name="check" className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? (isAr ? "جارٍ الحفظ..." : "Saving...")
                    : pendingVariantSetup
                    ? (isAr
                        ? `تطبيق على جميع السيارات (${batchVehicles.length || pendingVariantSetup.totalUnits}) ونشر للحجز`
                        : `Apply to all ${batchVehicles.length || pendingVariantSetup.totalUnits} cars & Publish`)
                    : pendingReceive
                    ? (isAr ? "حفظ واستلام وتحويل للأصول" : "Confirm Receiving & Register Asset")
                    : (isAr ? "حفظ السيارة" : "Save vehicle")}
                </span>
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
