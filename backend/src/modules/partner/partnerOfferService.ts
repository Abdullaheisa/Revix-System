import crypto from "node:crypto";
import type { AuthDataStore } from "../../db/store.ts";
import type { CompanyRecord, PartnerApiKeyRecord } from "../../db/contracts/workspace.ts";
import type { FleetVehicleRecord } from "../../db/contracts/fleet.ts";
import type { ReservationRecord } from "../../db/contracts/rentals.ts";

export class PartnerApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface PartnerLocationDto {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  city: string;
  country: string;
  currency: string;
  type: string;
  category: string;
  companyName: string;
  _ownerCompanyId: string;
}

export interface PartnerOfferInternal {
  vehicleId: string;
  ownerCompanyId: string;
  variantId: string;
  branchIds: Set<string>;
  country: string;
  currency: string;
  displayName: string;
  category: string;
  imageUrl: string | null;
  companyName: string;
  specifications: {
    seats: number;
    doors: number;
    bags: number;
    transmission: string;
    fuel: string;
    fuelTypes: string[];
    airConditioning: boolean;
  };
  mileagePolicy: string;
  mileage: number;
  includedKmPerDay: number;
  extraKmPrice: number;
  excess: number;
  fuelPolicy: string;
  deliveryPolicy: string;
  instantConfirmation: boolean;
  securityDeposit: {
    amount: number;
    currency: string;
    required: boolean;
    refundable: boolean;
    collectedAt: "PICKUP";
    policy: string;
  };
  dailyRate1to2: number;
  dailyRate3to7: number;
  dailyRate8Plus: number;
  vehicles: FleetVehicleRecord[];
}

function deterministicUuid(seed: string): string {
  const hex = crypto.createHash("sha256").update(seed).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function computeRateForDays(offer: PartnerOfferInternal, days: number): number {
  if (days >= 8) {
    return Number(offer.dailyRate8Plus || offer.dailyRate3to7 || offer.dailyRate1to2 || 0);
  }
  if (days >= 3) {
    return Number(offer.dailyRate3to7 || offer.dailyRate1to2 || 0);
  }
  return Number(offer.dailyRate1to2 || offer.dailyRate3to7 || offer.dailyRate8Plus || 0);
}

function parseDateRangeDays(pickupDate: string, returnDate: string): number {
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRe.test(pickupDate) || !dateRe.test(returnDate)) {
    throw new PartnerApiError(400, "INVALID_RENTAL_PERIOD", "Dates must use YYYY-MM-DD format.");
  }
  const startMs = new Date(`${pickupDate}T00:00:00Z`).getTime();
  const endMs = new Date(`${returnDate}T00:00:00Z`).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    throw new PartnerApiError(
      400,
      "INVALID_RENTAL_PERIOD",
      "return_date must be on or after pickup_date.",
    );
  }
  return Math.max(1, Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)));
}

function buildRateCard(offer: PartnerOfferInternal) {
  const rates: Array<{
    unit: "DAY";
    unitDays: number;
    amount: number;
    dailyEquivalent: number;
    minRentalDays: number;
    maxRentalDays: number | null;
  }> = [];

  if (offer.dailyRate1to2 > 0) {
    rates.push({
      unit: "DAY",
      unitDays: 1,
      amount: offer.dailyRate1to2,
      dailyEquivalent: offer.dailyRate1to2,
      minRentalDays: 1,
      maxRentalDays: 2,
    });
  }
  if (offer.dailyRate3to7 > 0) {
    rates.push({
      unit: "DAY",
      unitDays: 1,
      amount: offer.dailyRate3to7,
      dailyEquivalent: offer.dailyRate3to7,
      minRentalDays: 3,
      maxRentalDays: 7,
    });
  }
  if (offer.dailyRate8Plus > 0) {
    rates.push({
      unit: "DAY",
      unitDays: 1,
      amount: offer.dailyRate8Plus,
      dailyEquivalent: offer.dailyRate8Plus,
      minRentalDays: 8,
      maxRentalDays: null,
    });
  }

  return {
    currency: offer.currency,
    schema: "REVIX_RATE_CARD_V1",
    quoteRequiredForExactRental: true,
    taxesIncluded: null,
    rates,
  };
}

export class PartnerOfferService {
  private readonly store: AuthDataStore;

  constructor(store: AuthDataStore) {
    this.store = store;
  }

  async getLocations(parentCompany: CompanyRecord): Promise<PartnerLocationDto[]> {
    const locations: PartnerLocationDto[] = [];
    const ownBranches = await this.store.listBranchesByCompanyId(parentCompany.id);
    for (const b of ownBranches) {
      if (!b.isActive) continue;
      locations.push({
        id: b.id,
        code: b.code,
        name: b.name,
        nameAr: b.name,
        city: b.city || b.name,
        country: (b.countryCode || parentCompany.countryCode || "SA").trim().toUpperCase(),
        currency: (parentCompany.baseCurrency || "SAR").trim().toUpperCase(),
        type: "branch",
        category: "Branch",
        companyName: parentCompany.name,
        _ownerCompanyId: parentCompany.id,
      });
    }

    const links = await this.store.listNetworkLinksForMain(parentCompany.id);
    for (const link of links) {
      if (link.status !== "active") continue;
      const localCompany = await this.store.findCompanyById(link.localCompanyId);
      if (!localCompany) continue;
      const [localBranches, permitted] = await Promise.all([
        this.store.listBranchesByCompanyId(localCompany.id),
        this.store.listNetworkPermittedBranches(link.id),
      ]);
      const permittedIds = new Set(permitted.map((p) => p.branchId));
      for (const b of localBranches) {
        if (!b.isActive) continue;
        if (permittedIds.size > 0 && !permittedIds.has(b.id)) continue;
        locations.push({
          id: b.id,
          code: b.code,
          name: b.name,
          nameAr: b.name,
          city: b.city || b.name,
          country: (b.countryCode || localCompany.countryCode || "SA").trim().toUpperCase(),
          currency: (localCompany.baseCurrency || "SAR").trim().toUpperCase(),
          type: "branch",
          category: "Branch",
          companyName: parentCompany.name,
          _ownerCompanyId: localCompany.id,
        });
      }
    }

    return locations;
  }

  private resolveLocation(
    locations: PartnerLocationDto[],
    identifier: string,
    codeOnError = "INVALID_LOCATION",
  ): PartnerLocationDto {
    const q = identifier.trim().toLowerCase();
    const match = locations.find(
      (l) => l.id.toLowerCase() === q || l.code.toLowerCase() === q,
    );
    if (!match) {
      throw new PartnerApiError(400, codeOnError, `Unknown location identifier: ${identifier}`);
    }
    return match;
  }

  async buildOffers(parentCompany: CompanyRecord): Promise<{
    locations: PartnerLocationDto[];
    offers: PartnerOfferInternal[];
  }> {
    const [locations, allVehicles, photos] = await Promise.all([
      this.getLocations(parentCompany),
      this.store.listFleetVehicles(parentCompany.id, { includeNetwork: true }),
      this.store.listVehiclePhotos(parentCompany.id),
    ]);

    const locationById = new Map(locations.map((l) => [l.id, l]));
    const photoByNameMap = new Map<string, string>();
    for (const p of photos) {
      const key = p.vehicleName.trim().toLowerCase();
      if (p.photoUrl && key && !photoByNameMap.has(key)) {
        photoByNameMap.set(key, p.photoUrl);
      }
    }

    const offersMap = new Map<string, PartnerOfferInternal>();

    for (const v of allVehicles) {
      if (!v.branchId) continue;
      const loc = locationById.get(v.branchId);
      if (!loc) continue;
      if (v.status === "maintenance" || v.status === "out_of_service") continue;

      const variant = v.variant;
      if (!variant) continue;

      // Strict completeness check: photo + specifications + pricing required
      const fullVariantName = `${variant.make} ${variant.model}${variant.trim ? ` ${variant.trim}` : ""} ${variant.modelYear}`.toLowerCase();
      const shortVariantName = `${variant.make} ${variant.model} ${variant.modelYear}`.toLowerCase();
      const imageUrl =
        v.photoUrl ||
        photoByNameMap.get(fullVariantName) ||
        photoByNameMap.get(shortVariantName) ||
        null;
      if (!imageUrl) continue;

      const seats = Number(variant.seatingCapacity ?? 0);
      const transmission = (variant.transmission || "").toUpperCase();
      const fuel = (variant.fuelType || "").toUpperCase();
      if (seats <= 0 || !transmission || !fuel) continue;

      const r1 = Number(v.dailyRate1to2 || 0);
      const r2 = Number(v.dailyRate3to7 || 0);
      const r3 = Number(v.dailyRate8Plus || 0);
      if (r1 <= 0 && r2 <= 0 && r3 <= 0) continue;

      const ownerCompanyId = v.companyId || loc._ownerCompanyId;
      const country = loc.country;
      const currency = loc.currency;
      const groupKey = `${ownerCompanyId}|${v.variantId}|${country}|${currency}|${r1}|${r2}|${r3}`;
      const vehicleId = deterministicUuid(groupKey);

      const existing = offersMap.get(groupKey);
      if (existing) {
        existing.branchIds.add(v.branchId);
        existing.vehicles.push(v);
        continue;
      }

      const displayName = `${variant.make} ${variant.model}${variant.trim ? ` ${variant.trim}` : ""} ${variant.modelYear}`;
      const category = (variant.category || "SEDAN").toUpperCase();
      const depositAmt = Number(v.securityDeposit ?? 0);
      const kmLimit = Number(v.dailyKmLimit || 250);
      const mileagePolicy =
        v.mileagePolicy === "unlimited" ? "Unlimited" : `Limited ${kmLimit} km/day`;

      offersMap.set(groupKey, {
        vehicleId,
        ownerCompanyId,
        variantId: v.variantId,
        branchIds: new Set([v.branchId]),
        country,
        currency,
        displayName,
        category,
        imageUrl,
        companyName: parentCompany.name,
        specifications: {
          seats,
          doors: 4,
          bags: seats >= 7 ? 4 : 2,
          transmission,
          fuel,
          fuelTypes: [fuel],
          airConditioning: true,
        },
        mileagePolicy,
        mileage: v.mileagePolicy === "unlimited" ? 0 : kmLimit,
        includedKmPerDay: v.mileagePolicy === "unlimited" ? 0 : kmLimit,
        extraKmPrice: Number(v.extraKmRate || 0),
        excess: Number(v.damageExcess || 0),
        fuelPolicy: v.fuelPolicy || "Same to same",
        deliveryPolicy: v.deliveryPolicy || "Counter pickup at branch",
        instantConfirmation: Boolean(v.instantConfirmation),
        securityDeposit: {
          amount: depositAmt,
          currency,
          required: depositAmt > 0,
          refundable: true,
          collectedAt: "PICKUP",
          policy:
            depositAmt > 0
              ? "Refundable card hold collected at pickup and released after return under the rental terms."
              : "No security deposit hold is required.",
        },
        dailyRate1to2: r1,
        dailyRate3to7: r2,
        dailyRate8Plus: r3,
        vehicles: [v],
      });
    }

    return { locations, offers: Array.from(offersMap.values()) };
  }

  async getCatalog(
    parentCompany: CompanyRecord,
    query: { limit?: number; cursor?: string; category?: string; transmission?: string },
  ) {
    const { offers } = await this.buildOffers(parentCompany);
    let filtered = offers;
    if (query.category) {
      const c = query.category.trim().toUpperCase();
      filtered = filtered.filter((o) => o.category === c);
    }
    if (query.transmission) {
      const t = query.transmission.trim().toUpperCase();
      filtered = filtered.filter((o) => o.specifications.transmission === t);
    }

    const limit = Math.min(50, Math.max(1, Number(query.limit || 20)));
    const offset = query.cursor ? Math.max(0, Number.parseInt(query.cursor, 10) || 0) : 0;
    const slice = filtered.slice(offset, offset + limit);
    const hasMore = offset + limit < filtered.length;

    return {
      data: slice.map((o) => ({
        vehicleId: o.vehicleId,
        displayName: o.displayName,
        category: o.category,
        imageUrl: o.imageUrl,
        companyName: o.companyName,
        specifications: o.specifications,
        mileagePolicy: o.mileagePolicy,
        mileage: o.mileage,
        includedKmPerDay: o.includedKmPerDay,
        extraKmPrice: o.extraKmPrice,
        excess: o.excess,
        securityDeposit: o.securityDeposit,
        pricing: buildRateCard(o),
      })),
      pagination: {
        nextCursor: hasMore ? String(offset + limit) : null,
        hasMore,
      },
    };
  }

  private async countAvailableUnitsForOffer(
    offer: PartnerOfferInternal,
    branchId: string,
    pickupDate: string,
    returnDate: string,
  ): Promise<number> {
    const branchVehicles = offer.vehicles.filter(
      (v) => v.branchId === branchId && v.status === "available",
    );
    if (branchVehicles.length === 0) return 0;

    const [contracts, reservations] = await Promise.all([
      this.store.listRentalContracts(offer.ownerCompanyId),
      this.store.listReservations(offer.ownerCompanyId),
    ]);

    const busyVehicleIds = new Set(
      contracts
        .filter(
          (c) =>
            c.status === "active" &&
            c.startDate <= returnDate &&
            c.endDate >= pickupDate,
        )
        .map((c) => c.vehicleId),
    );

    const freePhysical = branchVehicles.filter((v) => !busyVehicleIds.has(v.id)).length;
    const overlappingReservations = reservations.filter(
      (r) =>
        (r.status === "pending" || r.status === "confirmed") &&
        r.branchId === branchId &&
        r.variantId === offer.variantId &&
        r.pickupDate <= returnDate &&
        r.returnDate >= pickupDate,
    ).length;

    return Math.max(0, freePhysical - overlappingReservations);
  }

  async searchAvailability(
    parentCompany: CompanyRecord,
    params: {
      pickup_location: string;
      return_location?: string;
      pickup_date: string;
      return_date: string;
      pickup_time?: string;
      return_time?: string;
      driver_age: number;
      page?: number;
      limit?: number;
      vehicle_id?: string;
      category?: string;
      transmission?: string;
    },
  ) {
    const durationDays = parseDateRangeDays(params.pickup_date, params.return_date);
    if (!Number.isInteger(params.driver_age) || params.driver_age < 18 || params.driver_age > 120) {
      throw new PartnerApiError(400, "VALIDATION_ERROR", "driver_age must be an integer between 18 and 120.");
    }

    const { locations, offers } = await this.buildOffers(parentCompany);
    const pickupLoc = this.resolveLocation(locations, params.pickup_location, "INVALID_LOCATION");
    if (params.return_location) {
      this.resolveLocation(locations, params.return_location, "INVALID_LOCATION");
    }

    let candidates = offers.filter(
      (o) => o.ownerCompanyId === pickupLoc._ownerCompanyId && o.branchIds.has(pickupLoc.id),
    );
    if (params.vehicle_id) {
      candidates = candidates.filter((o) => o.vehicleId === params.vehicle_id);
    }
    if (params.category) {
      const c = params.category.trim().toUpperCase();
      candidates = candidates.filter((o) => o.category === c);
    }
    if (params.transmission) {
      const t = params.transmission.trim().toUpperCase();
      candidates = candidates.filter((o) => o.specifications.transmission === t);
    }

    const availableItems = [];
    for (const offer of candidates) {
      const avail = await this.countAvailableUnitsForOffer(
        offer,
        pickupLoc.id,
        params.pickup_date,
        params.return_date,
      );
      if (avail <= 0) continue;
      const dailyRate = computeRateForDays(offer, durationDays);
      const totalPrice = Number((dailyRate * durationDays).toFixed(3));
      availableItems.push({
        vehicleId: offer.vehicleId,
        displayName: offer.displayName,
        category: offer.category,
        imageUrl: offer.imageUrl,
        companyName: offer.companyName,
        specifications: {
          seats: offer.specifications.seats,
          doors: offer.specifications.doors,
          fuel: offer.specifications.fuel,
          transmission: offer.specifications.transmission,
          airConditioning: offer.specifications.airConditioning,
          suitcases: offer.specifications.bags,
        },
        includedFeatures: ["Basic Insurance", offer.mileagePolicy],
        fuelPolicy: offer.fuelPolicy,
        deliveryPolicy: offer.deliveryPolicy,
        mileagePolicy: offer.mileagePolicy,
        mileage: offer.mileage,
        includedKmPerDay: offer.includedKmPerDay,
        extraKmPrice: offer.extraKmPrice,
        excess: offer.excess,
        freeCancellation: true,
        instantConfirmation: offer.instantConfirmation,
        pricing: {
          currency: offer.currency,
          durationDays,
          dailyRate,
          totalPrice,
        },
        securityDeposit: offer.securityDeposit,
        availableExtras: [],
      });
    }

    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.min(50, Math.max(1, Number(params.limit || 20)));
    const start = (page - 1) * limit;
    const paged = availableItems.slice(start, start + limit);

    return {
      data: paged,
      pagination: {
        page,
        limit,
        totalCount: availableItems.length,
        hasNextPage: start + limit < availableItems.length,
      },
    };
  }

  async quoteOffer(
    parentCompany: CompanyRecord,
    body: {
      pickup_location: string;
      return_location?: string;
      pickup_date: string;
      return_date: string;
      driver_age: number;
      vehicle_id: string;
      selected_extras?: Array<{ id: string; quantity: number }>;
    },
  ) {
    const durationDays = parseDateRangeDays(body.pickup_date, body.return_date);
    if (!Number.isInteger(body.driver_age) || body.driver_age < 18 || body.driver_age > 120) {
      throw new PartnerApiError(400, "VALIDATION_ERROR", "driver_age must be an integer between 18 and 120.");
    }

    const { locations, offers } = await this.buildOffers(parentCompany);
    const pickupLoc = this.resolveLocation(locations, body.pickup_location, "INVALID_LOCATION");
    if (body.return_location) {
      this.resolveLocation(locations, body.return_location, "INVALID_LOCATION");
    }

    const offer = offers.find(
      (o) =>
        o.vehicleId === body.vehicle_id &&
        o.ownerCompanyId === pickupLoc._ownerCompanyId &&
        o.branchIds.has(pickupLoc.id),
    );
    if (!offer) {
      throw new PartnerApiError(404, "VEHICLE_NOT_FOUND", "Vehicle offer not found at pickup location.");
    }

    const avail = await this.countAvailableUnitsForOffer(
      offer,
      pickupLoc.id,
      body.pickup_date,
      body.return_date,
    );
    if (avail <= 0) {
      throw new PartnerApiError(409, "VEHICLE_UNAVAILABLE", "Selected vehicle offer is no longer available.");
    }

    const dailyRate = computeRateForDays(offer, durationDays);
    const vehicleOnlyTotal = Number((dailyRate * durationDays).toFixed(3));

    return {
      vehicleId: offer.vehicleId,
      durationDays,
      selectedExtras: [],
      pricing: {
        currency: offer.currency,
        dailyRate,
        vehicleOnlyTotal,
        paidExtrasTotal: 0,
        totalPrice: vehicleOnlyTotal,
        grandTotal: vehicleOnlyTotal,
      },
      securityDeposit: offer.securityDeposit,
    };
  }

  private formatBookingResponse(
    r: ReservationRecord,
    parentCompany: CompanyRecord,
    vehicleId: string,
    pickupLocationCode: string,
    securityDeposit: PartnerOfferInternal["securityDeposit"],
  ) {
    const statusMap: Record<string, string> = {
      confirmed: "CONFIRMED",
      pending: "AWAITING_SUPPLIER",
      converted: "CONFIRMED",
      cancelled: "CANCELLED",
      no_show: "CANCELLED",
    };

    return {
      bookingReference: r.reservationNumber,
      externalBookingId: r.externalBookingRef,
      status: statusMap[r.status] ?? "CONFIRMED",
      companyName: parentCompany.name,
      vehicleId,
      pickupLocation: pickupLocationCode,
      rentalDurationDays: r.totalDays,
      pricing: {
        currency: r.currencyCode || parentCompany.baseCurrency || "SAR",
        dailyRate: r.dailyRate,
        vehicleOnlyTotal: r.estimatedTotal,
        paidExtrasTotal: 0,
        totalPrice: r.estimatedTotal,
        grandTotal: r.estimatedTotal,
      },
      securityDeposit,
      selectedExtras: [],
      cancelledAt: r.cancelledAt ? r.cancelledAt.toISOString() : null,
    };
  }

  async createBooking(
    parentCompany: CompanyRecord,
    partnerKey: PartnerApiKeyRecord,
    idempotencyKeyHeader: string | undefined,
    body: {
      pickup_location: string;
      return_location?: string;
      pickup_date: string;
      return_date: string;
      pickup_time?: string;
      return_time?: string;
      driver_age: number;
      vehicle_id: string;
      selected_extras?: Array<{ id: string; quantity: number }>;
      external_booking_id: string;
      expected_total: number;
      currency: string;
      notes?: string;
      customer: {
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
        country_of_residence: string;
        flight_number?: string;
      };
    },
  ) {
    const extId = body.external_booking_id?.trim();
    if (!extId) {
      throw new PartnerApiError(400, "VALIDATION_ERROR", "external_booking_id is required.");
    }
    if (
      idempotencyKeyHeader &&
      idempotencyKeyHeader.trim().toLowerCase() !== extId.toLowerCase()
    ) {
      throw new PartnerApiError(
        400,
        "IDEMPOTENCY_KEY_MISMATCH",
        "Idempotency-Key header does not match external_booking_id.",
      );
    }
    if (body.expected_total == null || Number.isNaN(Number(body.expected_total))) {
      throw new PartnerApiError(400, "EXPECTED_PRICE_REQUIRED", "expected_total is required.");
    }

    const durationDays = parseDateRangeDays(body.pickup_date, body.return_date);
    const { locations, offers } = await this.buildOffers(parentCompany);
    const pickupLoc = this.resolveLocation(locations, body.pickup_location, "INVALID_LOCATION");
    const returnLoc = body.return_location
      ? this.resolveLocation(locations, body.return_location, "INVALID_LOCATION")
      : pickupLoc;

    const offer = offers.find(
      (o) =>
        o.vehicleId === body.vehicle_id &&
        o.ownerCompanyId === pickupLoc._ownerCompanyId &&
        o.branchIds.has(pickupLoc.id),
    );
    if (!offer) {
      throw new PartnerApiError(404, "VEHICLE_NOT_FOUND", "Vehicle offer not found.");
    }

    // Check idempotency across existing reservations in ownerCompanyId
    const existingReservations = await this.store.listReservations(offer.ownerCompanyId);
    const duplicate = existingReservations.find(
      (r) => r.externalBookingRef?.toLowerCase() === extId.toLowerCase(),
    );
    if (duplicate) {
      if (
        duplicate.partnerKeyId &&
        duplicate.partnerKeyId !== partnerKey.id
      ) {
        throw new PartnerApiError(
          409,
          "IDEMPOTENCY_KEY_REUSED",
          "external_booking_id is already in use.",
        );
      }
      if (
        duplicate.variantId !== offer.variantId ||
        duplicate.branchId !== pickupLoc.id ||
        duplicate.pickupDate !== body.pickup_date ||
        duplicate.returnDate !== body.return_date
      ) {
        throw new PartnerApiError(
          409,
          "IDEMPOTENCY_KEY_REUSED",
          "external_booking_id was reused with different booking details.",
        );
      }
      return {
        isReplay: true,
        booking: this.formatBookingResponse(
          duplicate,
          parentCompany,
          offer.vehicleId,
          pickupLoc.code,
          offer.securityDeposit,
        ),
      };
    }

    const avail = await this.countAvailableUnitsForOffer(
      offer,
      pickupLoc.id,
      body.pickup_date,
      body.return_date,
    );
    if (avail <= 0) {
      throw new PartnerApiError(409, "VEHICLE_UNAVAILABLE", "Vehicle offer is no longer available.");
    }

    const dailyRate = computeRateForDays(offer, durationDays);
    const grandTotal = Number((dailyRate * durationDays).toFixed(3));
    if (
      Math.abs(Number(body.expected_total) - grandTotal) > 0.01 ||
      (body.currency || "").trim().toUpperCase() !== offer.currency
    ) {
      throw new PartnerApiError(
        409,
        "PRICE_CHANGED",
        "The retail total or currency changed. Refresh availability and get customer approval before retrying.",
      );
    }

    // Find or create customer under ownerCompanyId (and mark website + partnerName)
    const fullName = `${body.customer.first_name.trim()} ${body.customer.last_name.trim()}`.trim();
    const customers = await this.store.listCustomers(offer.ownerCompanyId);
    let customer = customers.find(
      (c) =>
        c.phone.trim() === body.customer.phone.trim() ||
        (c.email && c.email.toLowerCase() === body.customer.email.trim().toLowerCase()),
    );
    if (!customer) {
      customer = await this.store.createCustomer({
        companyId: offer.ownerCompanyId,
        fullName,
        phone: body.customer.phone.trim(),
        email: body.customer.email.trim(),
        nationality: body.customer.country_of_residence.trim().toUpperCase(),
        notes: `Partner booking via ${partnerKey.partnerName}`,
        source: "website",
        partnerKeyId: partnerKey.id,
        partnerName: partnerKey.partnerName,
      });
    }

    const reservation = await this.store.createReservation({
      companyId: offer.ownerCompanyId,
      branchId: pickupLoc.id,
      returnBranchId: returnLoc.id,
      customerId: customer.id,
      variantId: offer.variantId,
      allowSimilar: true,
      source: "website",
      partnerKeyId: partnerKey.id,
      partnerName: partnerKey.partnerName,
      externalBookingRef: extId,
      externalMetadata: {
        offerId: offer.vehicleId,
        pickupLocationCode: pickupLoc.code,
        flightNumber: body.customer.flight_number || null,
        driverAge: body.driver_age,
        customerEmail: body.customer.email,
        countryOfResidence: body.customer.country_of_residence,
        partnerWebsiteUrl: partnerKey.partnerWebsiteUrl,
      },
      status: "confirmed",
      pickupDate: body.pickup_date,
      pickupTime: body.pickup_time || "10:00",
      returnDate: body.return_date,
      returnTime: body.return_time || "10:00",
      dailyRate,
      totalDays: durationDays,
      estimatedTotal: grandTotal,
      notes: body.notes?.trim() || `Booked via ${partnerKey.partnerName}`,
    });

    return {
      isReplay: false,
      booking: this.formatBookingResponse(
        reservation,
        parentCompany,
        offer.vehicleId,
        pickupLoc.code,
        offer.securityDeposit,
      ),
    };
  }

  private async findPartnerReservation(
    parentCompany: CompanyRecord,
    partnerKey: PartnerApiKeyRecord,
    externalBookingId: string,
  ): Promise<{ reservation: ReservationRecord; ownerCompanyId: string }> {
    const extLower = externalBookingId.trim().toLowerCase();
    const companyIds = [parentCompany.id];
    const links = await this.store.listNetworkLinksForMain(parentCompany.id);
    for (const l of links) {
      if (l.status === "active") companyIds.push(l.localCompanyId);
    }

    for (const cid of companyIds) {
      const list = await this.store.listReservations(cid);
      const match = list.find(
        (r) =>
          r.externalBookingRef?.toLowerCase() === extLower &&
          (!r.partnerKeyId || r.partnerKeyId === partnerKey.id),
      );
      if (match) return { reservation: match, ownerCompanyId: cid };
    }

    throw new PartnerApiError(404, "PARTNER_BOOKING_NOT_FOUND", "Booking not found.");
  }

  async getBooking(
    parentCompany: CompanyRecord,
    partnerKey: PartnerApiKeyRecord,
    externalBookingId: string,
  ) {
    const { reservation } = await this.findPartnerReservation(
      parentCompany,
      partnerKey,
      externalBookingId,
    );
    const meta = (reservation.externalMetadata ?? {}) as Record<string, unknown>;
    const offerId = String(meta.offerId || reservation.variantId);
    const pickupCode = String(meta.pickupLocationCode || reservation.branchId);
    const currency = reservation.currencyCode || parentCompany.baseCurrency || "SAR";

    return this.formatBookingResponse(
      reservation,
      parentCompany,
      offerId,
      pickupCode,
      {
        amount: 0,
        currency,
        required: false,
        refundable: true,
        collectedAt: "PICKUP",
        policy: "Refundable card hold collected at pickup and released after return under the rental terms.",
      },
    );
  }

  async cancelBooking(
    parentCompany: CompanyRecord,
    partnerKey: PartnerApiKeyRecord,
    externalBookingId: string,
    reason?: string,
  ) {
    const { reservation, ownerCompanyId } = await this.findPartnerReservation(
      parentCompany,
      partnerKey,
      externalBookingId,
    );

    if (reservation.status !== "cancelled") {
      await this.store.updateReservationStatus(ownerCompanyId, reservation.id, "cancelled");
      await this.store.recordAuditLog({
        companyId: ownerCompanyId,
        branchId: reservation.branchId,
        actorUserId: null,
        action: "fleet.partner_booking_cancelled",
        entityType: "reservation",
        entityId: reservation.id,
        metadata: {
          reservationNumber: reservation.reservationNumber,
          partnerName: partnerKey.partnerName,
          reason: reason || null,
        },
      });
    }

    return this.getBooking(parentCompany, partnerKey, externalBookingId);
  }
}
