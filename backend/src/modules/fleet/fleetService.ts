import type {
  AuthDataStore,
  CreateFleetVehicleInput,
  CreatePurchaseOrderInput,
  CreateVehicleVariantInput,
  CreateVendorInput,
  FleetVehicleFilterOptions,
  FleetVehicleRecord,
  FleetVehicleStatus,
  PurchaseOrderRecord,
  PurchaseOrderStatus,
  ReceiveVehicleFromPoInput,
  RentalInclusionRecord,
  UpdateFleetVehicleInput,
  UpdateVehicleVariantInput,
  UpdateVendorInput,
  VehicleCategory,
  VehiclePhotoRecord,
  VehicleVariantRecord,
  VendorCategory,
  VendorRecord,
} from "../../db/store.ts";
import type { TenantActor } from "../team/teamService.ts";

export class FleetServiceError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "FleetServiceError";
    this.status = status;
    this.code = code;
  }
}

export interface FleetMetrics {
  totalVehicles: number;
  availableCount: number;
  onRentCount: number;
  maintenanceCount: number;
  reservedCount: number;
  outOfServiceCount: number;
  variantsCount: number;
  activePosCount: number;
  vendorsCount: number;
}

export class FleetService {
  private readonly store: AuthDataStore;

  constructor(store: AuthDataStore) {
    this.store = store;
  }

  // ============================================================================
  // 1. Vehicle Variants
  // ============================================================================

  async createVariant(
    actor: TenantActor,
    input: Omit<CreateVehicleVariantInput, "companyId">,
  ): Promise<VehicleVariantRecord> {
    const existingVariants = await this.store.listVehicleVariants(actor.company.id);
    const normMake = input.make.trim().toLowerCase();
    const normModel = input.model.trim().toLowerCase();
    const normTrim = (input.trim?.trim() || "Standard").toLowerCase();
    const normSipp = (input.sippCode?.trim() || "ICAR").toLowerCase();

    const duplicate = existingVariants.find(
      (v) =>
        v.make.trim().toLowerCase() === normMake &&
        v.model.trim().toLowerCase() === normModel &&
        v.modelYear === input.modelYear &&
        v.trim.trim().toLowerCase() === normTrim &&
        v.category === input.category &&
        v.sippCode.trim().toLowerCase() === normSipp,
    );

    if (duplicate) {
      const codeInfo = duplicate.variantCode ? ` (${duplicate.variantCode})` : "";
      throw new FleetServiceError(
        409,
        "DUPLICATE_VARIANT",
        `Duplicate variant: ${duplicate.modelYear} ${duplicate.make} ${duplicate.model} (${duplicate.trim}, ${duplicate.category}, ${duplicate.sippCode})${codeInfo} already exists with identical specifications.`,
      );
    }

    const variant = await this.store.createVehicleVariant({
      ...input,
      companyId: actor.company.id,
    });

    await this.store.recordAuditLog({
      companyId: actor.company.id,
      actorUserId: actor.user.id,
      action: "fleet.variant_created",
      entityType: "vehicle_variant",
      entityId: variant.id,
      metadata: {
        make: variant.make,
        model: variant.model,
        year: variant.modelYear,
        trim: variant.trim,
      },
    });

    return variant;
  }

  async listVariants(
    actor: TenantActor,
    filter?: { category?: VehicleCategory; search?: string },
  ): Promise<VehicleVariantRecord[]> {
    return this.store.listVehicleVariants(actor.company.id, filter);
  }

  async getVariant(
    actor: TenantActor,
    variantId: string,
  ): Promise<VehicleVariantRecord> {
    const variant = await this.store.findVehicleVariantById(variantId);
    if (!variant || variant.companyId !== actor.company.id) {
      throw new FleetServiceError(
        404,
        "VARIANT_NOT_FOUND",
        "Vehicle variant does not exist.",
      );
    }
    return variant;
  }

  async updateVariant(
    actor: TenantActor,
    variantId: string,
    input: UpdateVehicleVariantInput,
  ): Promise<VehicleVariantRecord> {
    await this.getVariant(actor, variantId);

    const updated = await this.store.updateVehicleVariant(variantId, input);
    if (!updated) {
      throw new FleetServiceError(
        404,
        "VARIANT_NOT_FOUND",
        "Vehicle variant does not exist.",
      );
    }

    await this.store.recordAuditLog({
      companyId: actor.company.id,
      actorUserId: actor.user.id,
      action: "fleet.variant_updated",
      entityType: "vehicle_variant",
      entityId: variantId,
      metadata: { ...input },
    });

    return updated;
  }

  async deleteVariant(actor: TenantActor, variantId: string): Promise<void> {
    await this.getVariant(actor, variantId);
    await this.store.deleteVehicleVariant(variantId);

    await this.store.recordAuditLog({
      companyId: actor.company.id,
      actorUserId: actor.user.id,
      action: "fleet.variant_archived",
      entityType: "vehicle_variant",
      entityId: variantId,
    });
  }

  // ============================================================================
  // 2. Vendors Directory
  // ============================================================================

  async createVendor(
    actor: TenantActor,
    input: Omit<CreateVendorInput, "companyId">,
  ): Promise<VendorRecord> {
    const vendor = await this.store.createVendor({
      ...input,
      companyId: actor.company.id,
    });

    await this.store.recordAuditLog({
      companyId: actor.company.id,
      actorUserId: actor.user.id,
      action: "fleet.vendor_created",
      entityType: "vendor",
      entityId: vendor.id,
      metadata: { name: vendor.name, category: vendor.category },
    });

    return vendor;
  }

  async listVendors(
    actor: TenantActor,
    filter?: { category?: VendorCategory; search?: string },
  ): Promise<VendorRecord[]> {
    return this.store.listVendors(actor.company.id, filter);
  }

  async getVendor(actor: TenantActor, vendorId: string): Promise<VendorRecord> {
    const vendor = await this.store.findVendorById(vendorId);
    if (!vendor || vendor.companyId !== actor.company.id) {
      throw new FleetServiceError(
        404,
        "VENDOR_NOT_FOUND",
        "Vendor does not exist.",
      );
    }
    return vendor;
  }

  async updateVendor(
    actor: TenantActor,
    vendorId: string,
    input: UpdateVendorInput,
  ): Promise<VendorRecord> {
    await this.getVendor(actor, vendorId);

    const updated = await this.store.updateVendor(vendorId, input);
    if (!updated) {
      throw new FleetServiceError(
        404,
        "VENDOR_NOT_FOUND",
        "Vendor does not exist.",
      );
    }

    await this.store.recordAuditLog({
      companyId: actor.company.id,
      actorUserId: actor.user.id,
      action: "fleet.vendor_updated",
      entityType: "vendor",
      entityId: vendorId,
      metadata: { ...input },
    });

    return updated;
  }

  // ============================================================================
  // 3. Purchase Orders (PO)
  // ============================================================================

  async createPurchaseOrder(
    actor: TenantActor,
    input: Omit<CreatePurchaseOrderInput, "companyId" | "createdByUserId">,
  ): Promise<PurchaseOrderRecord> {
    // Branch scope check
    if (
      actor.role.scopeType === "assigned_branches" &&
      !actor.branchIds.includes(input.branchId)
    ) {
      throw new FleetServiceError(
        403,
        "BRANCH_SCOPE_DENIED",
        "You do not have permission to create purchase orders for this branch.",
      );
    }

    // Verify vendor
    await this.getVendor(actor, input.vendorId);

    // Verify all items variants
    if (!input.items || input.items.length === 0) {
      throw new FleetServiceError(
        400,
        "EMPTY_PURCHASE_ORDER",
        "Purchase order must contain at least one line item.",
      );
    }

    for (const item of input.items) {
      await this.getVariant(actor, item.variantId);
    }

    const branch = await this.store.findBranchById(input.branchId);
    const poCurrency = input.currency || branch?.currencyCode || "EGP";

    const po = await this.store.createPurchaseOrder({
      ...input,
      currency: poCurrency,
      companyId: actor.company.id,
      createdByUserId: actor.user.id,
    });

    const canApprove =
      actor.role.code === "owner" ||
      actor.role.code === "ceo" ||
      actor.role.code === "finance_manager" ||
      Boolean(actor.role.permissions.purchase_orders?.includes("approve")) ||
      Boolean(actor.role.permissions.finance?.includes("approve"));

    const initialStatus: PurchaseOrderStatus = canApprove
      ? "approved"
      : "pending_approval";
    const finalPo =
      (await this.store.updatePurchaseOrderStatus(
        po.id,
        initialStatus,
        canApprove ? actor.user.id : undefined,
      )) ?? po;

    await this.store.recordAuditLog({
      companyId: actor.company.id,
      branchId: finalPo.branchId,
      actorUserId: actor.user.id,
      action: "fleet.po_created",
      entityType: "purchase_order",
      entityId: finalPo.id,
      metadata: {
        poNumber: finalPo.poNumber,
        totalAmount: finalPo.totalAmount,
        currency: finalPo.currency,
        status: finalPo.status,
      },
    });

    return finalPo;
  }

  async listPurchaseOrders(
    actor: TenantActor,
    filter?: {
      branchId?: string;
      vendorId?: string;
      status?: PurchaseOrderStatus;
    },
  ): Promise<PurchaseOrderRecord[]> {
    let effectiveBranchId = filter?.branchId;
    if (actor.role.scopeType === "assigned_branches") {
      if (effectiveBranchId && !actor.branchIds.includes(effectiveBranchId)) {
        return [];
      }
    }

    const pos = await this.store.listPurchaseOrders(actor.company.id, {
      ...filter,
      branchId: effectiveBranchId,
    });

    if (actor.role.scopeType === "assigned_branches") {
      return pos.filter((p) => actor.branchIds.includes(p.branchId));
    }
    return pos;
  }

  async getPurchaseOrder(
    actor: TenantActor,
    poId: string,
  ): Promise<PurchaseOrderRecord> {
    const po = await this.store.findPurchaseOrderById(poId);
    if (!po || po.companyId !== actor.company.id) {
      throw new FleetServiceError(
        404,
        "PO_NOT_FOUND",
        "Purchase order does not exist.",
      );
    }
    if (
      actor.role.scopeType === "assigned_branches" &&
      !actor.branchIds.includes(po.branchId)
    ) {
      throw new FleetServiceError(
        403,
        "BRANCH_SCOPE_DENIED",
        "You do not have access to this branch purchase order.",
      );
    }
    return po;
  }

  async updatePurchaseOrderStatus(
    actor: TenantActor,
    poId: string,
    status: PurchaseOrderStatus,
  ): Promise<PurchaseOrderRecord> {
    const po = await this.getPurchaseOrder(actor, poId);

    // Approval requires finance or management authority
    if (status === "approved" || status === "cancelled") {
      const canApprove =
        actor.role.code === "owner" ||
        actor.role.code === "ceo" ||
        actor.role.code === "finance_manager" ||
        Boolean(actor.role.permissions.purchase_orders?.includes("approve")) ||
        Boolean(actor.role.permissions.finance?.includes("approve"));
      if (!canApprove) {
        throw new FleetServiceError(
          403,
          "INSUFFICIENT_APPROVAL_ROLE",
          "Only Owner, CEO, Finance Manager, or authorized approvers can approve or cancel purchase orders.",
        );
      }
    }

    const updated = await this.store.updatePurchaseOrderStatus(
      poId,
      status,
      actor.user.id,
    );
    if (!updated) {
      throw new FleetServiceError(
        404,
        "PO_NOT_FOUND",
        "Purchase order does not exist.",
      );
    }

    await this.store.recordAuditLog({
      companyId: actor.company.id,
      branchId: po.branchId,
      actorUserId: actor.user.id,
      action: `fleet.po_status_${status}`,
      entityType: "purchase_order",
      entityId: poId,
      metadata: { previousStatus: po.status, nextStatus: status },
    });

    return updated;
  }

  async receiveVehicleFromPo(
    actor: TenantActor,
    input: ReceiveVehicleFromPoInput,
  ): Promise<{ vehicle: FleetVehicleRecord; po: PurchaseOrderRecord }> {
    const po = await this.getPurchaseOrder(actor, input.purchaseOrderId);
    if (po.status !== "approved" && po.status !== "partially_received") {
      throw new FleetServiceError(
        400,
        "PO_NOT_READY_FOR_RECEIVING",
        "Vehicles can only be received from approved purchase orders.",
      );
    }

    // Branch scoping:
    // - Local partner companies keep vehicles directly in their company branch (no multi-branch movement)
    // - Branch-scoped employees automatically receive into their assigned branch
    // - Owner / company-wide on main company receives into Company Stock (branchId = null) unless specified
    const targetBranchId =
      actor.company.operatingMode === "local_partner"
        ? po.branchId
        : actor.role.scopeType === "assigned_branches"
          ? input.branchId || po.branchId
          : input.branchId || null;

    if (
      actor.role.scopeType === "assigned_branches" &&
      (!targetBranchId || !actor.branchIds.includes(targetBranchId))
    ) {
      throw new FleetServiceError(
        403,
        "BRANCH_SCOPE_DENIED",
        "You do not have permission to receive vehicles into this branch.",
      );
    }

    // Verify unique VIN in company
    const existingVin = await this.store.findFleetVehicleByVin(
      actor.company.id,
      input.vin,
    );
    if (existingVin) {
      throw new FleetServiceError(
        409,
        "DUPLICATE_VIN",
        "A vehicle with this VIN/Chassis is already registered in your company.",
      );
    }

    const existingPlate = await this.store.findFleetVehicleByLicensePlate(
      actor.company.id,
      input.licensePlate,
    );
    if (existingPlate) {
      throw new FleetServiceError(
        409,
        "DUPLICATE_LICENSE_PLATE",
        "A vehicle with this license plate is already registered in your company.",
      );
    }

    const result = await this.store.receiveVehicleFromPo({
      ...input,
      branchId: targetBranchId,
      createdByUserId: actor.user.id,
    });

    await Promise.all([
      this.store.recordAuditLog({
        companyId: actor.company.id,
        branchId: targetBranchId,
        actorUserId: actor.user.id,
        action: "fleet.vehicle_received_from_po",
        entityType: "fleet_vehicle",
        entityId: result.vehicle.id,
        metadata: {
          poId: po.id,
          poNumber: po.poNumber,
          vin: input.vin,
          licensePlate: input.licensePlate,
        },
      }),
      this.store.recordAuditLog({
        companyId: actor.company.id,
        branchId: targetBranchId,
        actorUserId: actor.user.id,
        action: "fleet.po_vehicle_received",
        entityType: "purchase_order",
        entityId: po.id,
        metadata: {
          poNumber: po.poNumber,
          vehicleId: result.vehicle.id,
          vin: input.vin,
          licensePlate: input.licensePlate,
        },
      }),
    ]);

    return result;
  }

  // ============================================================================
  // 4. Fleet Vehicles Register
  // ============================================================================

  async createVehicle(
    actor: TenantActor,
    input: Omit<CreateFleetVehicleInput, "companyId">,
  ): Promise<FleetVehicleRecord> {
    const resolvedBranchId =
      actor.role.scopeType === "assigned_branches"
        ? input.branchId || actor.branchIds[0] || ""
        : input.branchId;

    if (
      actor.role.scopeType === "assigned_branches" &&
      (!resolvedBranchId || !actor.branchIds.includes(resolvedBranchId))
    ) {
      throw new FleetServiceError(
        403,
        "BRANCH_SCOPE_DENIED",
        "You do not have permission to register vehicles in this branch.",
      );
    }
    input = { ...input, branchId: resolvedBranchId };

    // Verify variant
    await this.getVariant(actor, input.variantId);

    // Verify uniqueness
    const existingVin = await this.store.findFleetVehicleByVin(
      actor.company.id,
      input.vin,
    );
    if (existingVin) {
      throw new FleetServiceError(
        409,
        "DUPLICATE_VIN",
        "A vehicle with this VIN/Chassis is already registered in your company.",
      );
    }

    const existingPlate = await this.store.findFleetVehicleByLicensePlate(
      actor.company.id,
      input.licensePlate,
    );
    if (existingPlate) {
      throw new FleetServiceError(
        409,
        "DUPLICATE_LICENSE_PLATE",
        "A vehicle with this license plate is already registered in your company.",
      );
    }

    const vehicle = await this.store.createFleetVehicle({
      ...input,
      companyId: actor.company.id,
      createdByUserId: actor.user.id,
    });

    await this.store.recordAuditLog({
      companyId: actor.company.id,
      branchId: vehicle.branchId,
      actorUserId: actor.user.id,
      action: "fleet.vehicle_registered",
      entityType: "fleet_vehicle",
      entityId: vehicle.id,
      metadata: {
        vin: vehicle.vin,
        licensePlate: vehicle.licensePlate,
        branchId: vehicle.branchId,
      },
    });

    return vehicle;
  }

  async listVehicles(
    actor: TenantActor,
    filter?: FleetVehicleFilterOptions,
  ): Promise<FleetVehicleRecord[]> {
    const permittedBranches =
      actor.role.scopeType === "assigned_branches"
        ? actor.branchIds
        : undefined;

    return this.store.listFleetVehicles(
      actor.company.id,
      filter,
      permittedBranches,
    );
  }

  async getVehicle(
    actor: TenantActor,
    vehicleId: string,
  ): Promise<FleetVehicleRecord> {
    const vehicle = await this.store.findFleetVehicleById(vehicleId);
    if (!vehicle) {
      throw new FleetServiceError(
        404,
        "VEHICLE_NOT_FOUND",
        "Vehicle does not exist.",
      );
    }

    if (vehicle.companyId !== actor.company.id) {
      // Check if it's a permitted partner vehicle for network_main
      if (actor.company.operatingMode === "network_main") {
        const link = await this.store.findNetworkLink(
          actor.company.id,
          vehicle.companyId,
        );
        if (link && link.status === "active") {
          const permitted = await this.store.listNetworkPermittedBranches(
            link.id,
          );
          const hasBranch = permitted.some((p) => p.branchId === vehicle.branchId);
          if (hasBranch) {
            vehicle.isPartnerVehicle = true;
            return vehicle;
          }
        }
      }
      throw new FleetServiceError(
        404,
        "VEHICLE_NOT_FOUND",
        "Vehicle does not exist.",
      );
    }

    if (
      actor.role.scopeType === "assigned_branches" &&
      vehicle.branchId &&
      !actor.branchIds.includes(vehicle.branchId)
    ) {
      throw new FleetServiceError(
        403,
        "BRANCH_SCOPE_DENIED",
        "You do not have access to vehicles in this branch.",
      );
    }

    return vehicle;
  }

  async updateVehicle(
    actor: TenantActor,
    vehicleId: string,
    input: UpdateFleetVehicleInput,
  ): Promise<FleetVehicleRecord> {
    const vehicle = await this.getVehicle(actor, vehicleId);
    if (vehicle.isPartnerVehicle) {
      throw new FleetServiceError(
        403,
        "PARTNER_VEHICLE_READ_ONLY",
        "Partner company vehicles are view-only and cannot be modified.",
      );
    }

    if (
      input.branchId &&
      actor.role.scopeType === "assigned_branches" &&
      !actor.branchIds.includes(input.branchId)
    ) {
      throw new FleetServiceError(
        403,
        "BRANCH_SCOPE_DENIED",
        "You cannot move a vehicle to a branch you do not have permission for.",
      );
    }

    const updated = await this.store.updateFleetVehicle(vehicleId, input);
    if (!updated) {
      throw new FleetServiceError(
        404,
        "VEHICLE_NOT_FOUND",
        "Vehicle does not exist.",
      );
    }

    await this.store.recordAuditLog({
      companyId: actor.company.id,
      branchId: updated.branchId,
      actorUserId: actor.user.id,
      action: "fleet.vehicle_updated",
      entityType: "fleet_vehicle",
      entityId: vehicleId,
      metadata: { ...input },
    });

    return updated;
  }

  async updateVehicleStatus(
    actor: TenantActor,
    vehicleId: string,
    status: FleetVehicleStatus,
  ): Promise<FleetVehicleRecord> {
    const vehicle = await this.getVehicle(actor, vehicleId);
    if (vehicle.isPartnerVehicle) {
      throw new FleetServiceError(
        403,
        "PARTNER_VEHICLE_READ_ONLY",
        "Partner company vehicles are view-only and cannot be modified.",
      );
    }

    const updated = await this.store.updateFleetVehicleStatus(vehicleId, status);
    if (!updated) {
      throw new FleetServiceError(
        404,
        "VEHICLE_NOT_FOUND",
        "Vehicle does not exist.",
      );
    }

    await this.store.recordAuditLog({
      companyId: actor.company.id,
      branchId: updated.branchId,
      actorUserId: actor.user.id,
      action: `fleet.vehicle_status_${status}`,
      entityType: "fleet_vehicle",
      entityId: vehicleId,
      metadata: { previousStatus: vehicle.status, nextStatus: status },
    });

    return updated;
  }

  // ============================================================================
  // 5. Fleet High-Level Metrics
  // ============================================================================

  async getFleetMetrics(
    actor: TenantActor,
    branchId?: string,
  ): Promise<FleetMetrics> {
    const vehicles = await this.listVehicles(actor, { branchId });
    const variants = await this.listVariants(actor);
    const vendors = await this.listVendors(actor);
    const pos = await this.listPurchaseOrders(actor, { branchId });

    return {
      totalVehicles: vehicles.length,
      availableCount: vehicles.filter((v) => v.status === "available").length,
      onRentCount: vehicles.filter((v) => v.status === "on_rent").length,
      maintenanceCount: vehicles.filter((v) => v.status === "maintenance").length,
      reservedCount: vehicles.filter((v) => v.status === "reserved").length,
      outOfServiceCount: vehicles.filter((v) => v.status === "out_of_service").length,
      variantsCount: variants.length,
      activePosCount: pos.filter(
        (p) => p.status === "pending_approval" || p.status === "approved" || p.status === "partially_received",
      ).length,
      vendorsCount: vendors.length,
    };
  }

  // ============================================================================
  // 6. Vehicle Photos Catalog
  // ============================================================================

  async createVehiclePhoto(
    actor: TenantActor,
    input: { vehicleName: string; photoUrl: string; category?: string },
  ): Promise<VehiclePhotoRecord> {
    const photo = await this.store.createVehiclePhoto({
      companyId: actor.company.id,
      vehicleName: input.vehicleName,
      photoUrl: input.photoUrl,
      category: input.category,
    });

    await this.store.recordAuditLog({
      companyId: actor.company.id,
      actorUserId: actor.user.id,
      action: "fleet.photo_created",
      entityType: "vehicle_photo",
      entityId: photo.id,
      metadata: { vehicleName: photo.vehicleName },
    });

    return photo;
  }

  async listVehiclePhotos(
    actor: TenantActor,
    search?: string,
  ): Promise<VehiclePhotoRecord[]> {
    return this.store.listVehiclePhotos(actor.company.id, search);
  }

  async deleteVehiclePhoto(
    actor: TenantActor,
    photoId: string,
  ): Promise<boolean> {
    const deleted = await this.store.deleteVehiclePhoto(photoId);
    if (deleted) {
      await this.store.recordAuditLog({
        companyId: actor.company.id,
        actorUserId: actor.user.id,
        action: "fleet.photo_deleted",
        entityType: "vehicle_photo",
        entityId: photoId,
      });
    }
    return deleted;
  }

  // ============================================================================
  // 7. Rental Inclusions & Contract Benefits (What is Included)
  // ============================================================================

  async createRentalInclusion(
    actor: TenantActor,
    input: { name: string; description?: string; isActive?: boolean },
  ): Promise<RentalInclusionRecord> {
    const inclusion = await this.store.createRentalInclusion({
      companyId: actor.company.id,
      name: input.name,
      description: input.description,
      isActive: input.isActive ?? true,
    });

    await this.store.recordAuditLog({
      companyId: actor.company.id,
      actorUserId: actor.user.id,
      action: "fleet.inclusion_created",
      entityType: "rental_inclusion",
      entityId: inclusion.id,
      metadata: { name: inclusion.name },
    });

    return inclusion;
  }

  async listRentalInclusions(
    actor: TenantActor,
    search?: string,
    activeOnly?: boolean,
  ): Promise<RentalInclusionRecord[]> {
    return this.store.listRentalInclusions(actor.company.id, search, activeOnly);
  }

  async updateRentalInclusion(
    actor: TenantActor,
    id: string,
    input: { name?: string; description?: string; isActive?: boolean },
  ): Promise<RentalInclusionRecord> {
    const updated = await this.store.updateRentalInclusion(id, input);
    if (!updated) {
      throw new FleetServiceError(404, "NOT_FOUND", "Rental inclusion feature not found.");
    }

    await this.store.recordAuditLog({
      companyId: actor.company.id,
      actorUserId: actor.user.id,
      action: "fleet.inclusion_updated",
      entityType: "rental_inclusion",
      entityId: id,
      metadata: { name: updated.name, isActive: updated.isActive },
    });

    return updated;
  }

  async deleteRentalInclusion(
    actor: TenantActor,
    id: string,
  ): Promise<boolean> {
    const deleted = await this.store.deleteRentalInclusion(id);
    if (deleted) {
      await this.store.recordAuditLog({
        companyId: actor.company.id,
        actorUserId: actor.user.id,
        action: "fleet.inclusion_deleted",
        entityType: "rental_inclusion",
        entityId: id,
      });
    }
    return deleted;
  }

  async signPurchaseOrder(
    actor: TenantActor,
    poId: string,
    signatureDataUrl: string,
  ) {
    const existing = await this.store.findPurchaseOrderById(poId);
    if (!existing || existing.companyId !== actor.company.id) {
      throw new FleetServiceError(404, "PO_NOT_FOUND", "Purchase order not found.");
    }
    const baseName = actor.user.fullName || actor.user.email || "Authorized Signer";
    const roleObj = actor.role as { nameEn?: string; name?: string; key?: string } | undefined;
    const roleTitle =
      roleObj?.nameEn || roleObj?.name || roleObj?.key || "Authorized Signature";
    const signerName = `${baseName}|${roleTitle}`;
    const updated = await this.store.signPurchaseOrder(poId, signatureDataUrl, signerName);
    await this.store.recordAuditLog({
      companyId: actor.company.id,
      actorUserId: actor.user.id,
      action: "fleet.po_signed",
      entityType: "purchase_order",
      entityId: poId,
      metadata: { signedBy: signerName },
    });
    return updated;
  }

  async listVehicleMakes(actor: TenantActor) {
    return this.store.listVehicleMakes(actor.company.id);
  }

  async createVehicleMake(actor: TenantActor, name: string) {
    return this.store.createVehicleMake(actor.company.id, name);
  }

  async createVehicleModel(actor: TenantActor, makeId: string, name: string) {
    return this.store.createVehicleModel(actor.company.id, makeId, name);
  }

  async listInsuranceCompanies(actor: TenantActor) {
    return this.store.listInsuranceCompanies(actor.company.id);
  }

  async createInsuranceCompany(
    actor: TenantActor,
    input: {
      name: string;
      contactPerson?: string | null;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
    },
  ) {
    return this.store.createInsuranceCompany({
      companyId: actor.company.id,
      ...input,
    });
  }

  async deleteInsuranceCompany(actor: TenantActor, id: string) {
    return this.store.deleteInsuranceCompany(actor.company.id, id);
  }

  private assertVehicleScope(
    actor: TenantActor,
    vehicle: FleetVehicleRecord | null,
  ): FleetVehicleRecord {
    if (!vehicle || vehicle.companyId !== actor.company.id) {
      throw new FleetServiceError(404, "VEHICLE_NOT_FOUND", "Vehicle not found.");
    }
    if (
      actor.role.scopeType === "assigned_branches" &&
      (!vehicle.branchId || !actor.branchIds.includes(vehicle.branchId))
    ) {
      throw new FleetServiceError(
        403,
        "BRANCH_SCOPE_DENIED",
        "You do not have access to vehicles outside your assigned branch.",
      );
    }
    return vehicle;
  }

  async getVehicleLifecycleProfile(actor: TenantActor, vehicleId: string) {
    const vehicle = this.assertVehicleScope(
      actor,
      await this.store.findFleetVehicleById(vehicleId),
    );
    return this.store.getVehicleLifecycleProfile(actor.company.id, vehicle.id);
  }

  async upsertVehicleInsurancePolicy(
    actor: TenantActor,
    vehicleId: string,
    input: {
      insuranceCompanyId?: string | null;
      providerName: string;
      policyNumber: string;
      coverageType: string;
      premiumAmount: number;
      deductibleAmount: number;
      startDate: string;
      expiryDate: string;
      notes?: string | null;
    },
  ) {
    const vehicle = this.assertVehicleScope(
      actor,
      await this.store.findFleetVehicleById(vehicleId),
    );
    const policy = await this.store.upsertVehicleInsurancePolicy({
      companyId: actor.company.id,
      vehicleId,
      ...input,
    });
    await this.store.recordAuditLog({
      companyId: actor.company.id,
      branchId: vehicle.branchId,
      actorUserId: actor.user.id,
      action: "fleet.vehicle_insurance_updated",
      entityType: "fleet_vehicle",
      entityId: vehicleId,
      metadata: {
        providerName: input.providerName,
        policyNumber: input.policyNumber,
        expiryDate: input.expiryDate,
      },
    });
    return policy;
  }

  async updateVehiclePricingTiers(
    actor: TenantActor,
    vehicleId: string,
    input: {
      dailyRate1to2: number;
      dailyRate3to7: number;
      dailyRate8Plus: number;
      damageExcess: number;
      mileagePolicy: "unlimited" | "limited";
      dailyKmLimit: number;
      extraKmRate: number;
    },
  ) {
    const vehicle = this.assertVehicleScope(
      actor,
      await this.store.findFleetVehicleById(vehicleId),
    );
    const updated = await this.store.updateVehiclePricingTiers(actor.company.id, vehicleId, input);
    await this.store.recordAuditLog({
      companyId: actor.company.id,
      branchId: vehicle.branchId,
      actorUserId: actor.user.id,
      action: "fleet.vehicle_pricing_updated",
      entityType: "fleet_vehicle",
      entityId: vehicleId,
      metadata: {
        dailyRate1to2: input.dailyRate1to2,
        dailyRate3to7: input.dailyRate3to7,
        dailyRate8Plus: input.dailyRate8Plus,
      },
    });
    return updated;
  }

  async updateVariantPricingTiers(
    actor: TenantActor,
    variantId: string,
    input: {
      dailyRate1to2: number;
      dailyRate3to7: number;
      dailyRate8Plus: number;
      damageExcess: number;
      mileagePolicy?: "unlimited" | "limited";
      dailyKmLimit?: number;
      extraKmRate?: number;
      branchId?: string | null;
    },
  ) {
    let branchIds: string[] | undefined;
    let unassignedOnly = false;

    if (actor.role.scopeType === "assigned_branches") {
      if (input.branchId && !actor.branchIds.includes(input.branchId)) {
        throw new FleetServiceError(
          403,
          "BRANCH_SCOPE_DENIED",
          "You cannot modify vehicle prices outside your assigned branch.",
        );
      }
      branchIds = input.branchId ? [input.branchId] : actor.branchIds;
    } else if (input.branchId === "__unassigned__") {
      unassignedOnly = true;
    } else if (input.branchId) {
      branchIds = [input.branchId];
    }

    const result = await this.store.updateVariantPricingTiers(actor.company.id, variantId, {
      ...input,
      branchIds,
      unassignedOnly,
    });
    await this.store.recordAuditLog({
      companyId: actor.company.id,
      actorUserId: actor.user.id,
      action: "fleet.variant_pricing_updated",
      entityType: "vehicle_variant",
      entityId: variantId,
      metadata: {
        updatedCount: result.updatedCount,
        branchId: input.branchId ?? (branchIds ? branchIds.join(",") : "all"),
        dailyRate1to2: input.dailyRate1to2,
        dailyRate3to7: input.dailyRate3to7,
        dailyRate8Plus: input.dailyRate8Plus,
      },
    });
    return result;
  }

  async applyVariantListingSetup(
    actor: TenantActor,
    variantId: string,
    input: {
      photoUrl?: string | null;
      locationType?: string;
      fuelPolicy?: string;
      instantConfirmation?: boolean;
      description?: string | null;
      deliveryPolicy?: string | null;
      dailyRate1to2?: number;
      dailyRate3to7?: number;
      dailyRate8Plus?: number;
      damageExcess?: number;
      mileagePolicy?: "unlimited" | "limited";
      dailyKmLimit?: number | null;
      extraKmRate?: number | null;
      inclusions?: string[];
      seats?: number;
      doors?: number;
      airConditioning?: boolean;
      fuelType?: string;
      luggageCapacity?: string;
      transmission?: string;
      publishToFleet?: boolean;
    },
  ) {
    const branchIds =
      actor.role.scopeType === "assigned_branches" ? actor.branchIds : undefined;
    const result = await this.store.applyVariantListingSetup(
      actor.company.id,
      variantId,
      {
        ...input,
        branchIds,
      },
    );
    await this.store.recordAuditLog({
      companyId: actor.company.id,
      actorUserId: actor.user.id,
      action: "fleet.variant_listing_setup",
      entityType: "vehicle_variant",
      entityId: variantId,
      metadata: {
        updatedCount: result.updatedCount,
        publishToFleet: Boolean(input.publishToFleet),
        inclusionsCount: input.inclusions?.length ?? 0,
        hasPhoto: Boolean(input.photoUrl),
      },
    });
    return result;
  }

  async addVehicleMaintenanceLog(
    actor: TenantActor,
    vehicleId: string,
    input: {
      serviceType: string;
      workshopName?: string | null;
      odometerAtService: number;
      nextServiceKm?: number | null;
      nextServiceDate?: string | null;
      cost: number;
      status: string;
      notes?: string | null;
      serviceDate: string;
    },
  ) {
    const vehicle = this.assertVehicleScope(
      actor,
      await this.store.findFleetVehicleById(vehicleId),
    );
    const log = await this.store.addVehicleMaintenanceLog({
      companyId: actor.company.id,
      vehicleId,
      createdByUserId: actor.user.id,
      ...input,
    });
    await this.store.recordAuditLog({
      companyId: actor.company.id,
      branchId: vehicle.branchId,
      actorUserId: actor.user.id,
      action: "fleet.vehicle_maintenance_logged",
      entityType: "fleet_vehicle",
      entityId: vehicleId,
      metadata: {
        maintenanceLogId: log.id,
        serviceType: input.serviceType,
        workshopName: input.workshopName ?? null,
        cost: input.cost,
        status: input.status,
      },
    });
    return log;
  }

  async addVehicleInspection(
    actor: TenantActor,
    vehicleId: string,
    input: {
      inspectionType: string;
      bookingRef?: string | null;
      customerName?: string | null;
      odometerKm: number;
      hasAccident: boolean;
      accidentNotes?: string | null;
      damagePoints: Array<{
        zoneKey: string;
        severity: string;
        description?: string | null;
        repairCost?: number;
      }>;
    },
  ) {
    const vehicle = this.assertVehicleScope(
      actor,
      await this.store.findFleetVehicleById(vehicleId),
    );
    const inspection = await this.store.addVehicleInspection({
      companyId: actor.company.id,
      vehicleId,
      inspectedBy: actor.user.fullName || actor.user.email || "Staff",
      ...input,
    });
    await this.store.recordAuditLog({
      companyId: actor.company.id,
      branchId: vehicle.branchId,
      actorUserId: actor.user.id,
      action: "fleet.vehicle_inspected",
      entityType: "fleet_vehicle",
      entityId: vehicleId,
      metadata: {
        inspectionType: input.inspectionType,
        odometerKm: input.odometerKm,
        damageCount: input.damagePoints.length,
      },
    });
    return inspection;
  }

  // ============================================================================
  // Phase 2: Bookable Fleet, Customers & Rental Contracts
  // ============================================================================

  async toggleVehicleBookable(actor: TenantActor, vehicleId: string, isBookable: boolean) {
    this.assertVehicleScope(
      actor,
      await this.store.findFleetVehicleById(vehicleId),
    );
    const updated = await this.store.toggleFleetVehicleBookable(actor.company.id, vehicleId, isBookable);
    if (!updated) {
      throw new FleetServiceError(404, "VEHICLE_NOT_FOUND", "Vehicle not found.");
    }
    return updated;
  }

  async listCustomers(actor: TenantActor) {
    return this.store.listCustomers(actor.company.id);
  }

  async createCustomer(
    actor: TenantActor,
    input: {
      fullName: string;
      phone: string;
      secondaryPhone?: string | null;
      email?: string | null;
      nationalId?: string | null;
      driverLicenseNo?: string | null;
      licenseExpiry?: string | null;
      nationality?: string | null;
      address?: string | null;
      workAddress?: string | null;
      notes?: string | null;
    },
  ) {
    if (!input.fullName?.trim() || !input.phone?.trim()) {
      throw new FleetServiceError(400, "VALIDATION_ERROR", "Customer name and phone are required.");
    }
    return this.store.createCustomer({ companyId: actor.company.id, ...input });
  }

  async updateCustomer(
    actor: TenantActor,
    customerId: string,
    input: {
      fullName: string;
      phone: string;
      secondaryPhone?: string | null;
      email?: string | null;
      nationalId?: string | null;
      driverLicenseNo?: string | null;
      licenseExpiry?: string | null;
      nationality?: string | null;
      address?: string | null;
      workAddress?: string | null;
      notes?: string | null;
    },
  ) {
    const updated = await this.store.updateCustomer(actor.company.id, customerId, input);
    if (!updated) {
      throw new FleetServiceError(404, "CUSTOMER_NOT_FOUND", "Customer not found.");
    }
    return updated;
  }

  async deleteCustomer(actor: TenantActor, customerId: string) {
    return this.store.deleteCustomer(actor.company.id, customerId);
  }

  async listRentalContracts(actor: TenantActor) {
    const all = await this.store.listRentalContracts(actor.company.id);
    if (actor.role.scopeType === "assigned_branches") {
      return all.filter((c) => actor.branchIds.includes(c.branchId));
    }
    return all;
  }

  async createRentalContract(
    actor: TenantActor,
    input: {
      vehicleId: string;
      customerId: string;
      startDate: string;
      endDate: string;
      pickupOdometer?: number;
      dailyRate?: number;
      discount?: number;
      insuranceFee?: number;
      extraCharges?: number;
      paidAmount?: number;
      depositAmount?: number;
      notes?: string | null;
    },
  ) {
    const vehicle = this.assertVehicleScope(
      actor,
      await this.store.findFleetVehicleById(input.vehicleId),
    );
    if (vehicle.status !== "available") {
      throw new FleetServiceError(409, "VEHICLE_UNAVAILABLE", "Vehicle is not available for rental.");
    }
    if (!vehicle.branchId) {
      throw new FleetServiceError(
        400,
        "VEHICLE_NOT_IN_BRANCH",
        "Vehicle is still in company central stock. Dispatch and receive it at a branch before creating a rental contract.",
      );
    }

    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    const autoRate =
      diffDays >= 8
        ? Number(vehicle.dailyRate8Plus || vehicle.dailyRate3to7 || vehicle.dailyRate1to2 || 0)
        : diffDays >= 3
          ? Number(vehicle.dailyRate3to7 || vehicle.dailyRate1to2 || 0)
          : Number(vehicle.dailyRate1to2 || 0);

    const dailyRate = input.dailyRate !== undefined && input.dailyRate > 0 ? input.dailyRate : autoRate;
    const subtotal = dailyRate * diffDays;
    const discount = Number(input.discount ?? 0);
    const insuranceFee = Number(input.insuranceFee ?? 0);
    const extraCharges = Number(input.extraCharges ?? 0);
    const totalAmount = Math.max(0, subtotal - discount + insuranceFee + extraCharges);

    const contract = await this.store.createRentalContract({
      companyId: actor.company.id,
      branchId: vehicle.branchId,
      vehicleId: vehicle.id,
      customerId: input.customerId,
      startDate: input.startDate,
      endDate: input.endDate,
      pickupOdometer: input.pickupOdometer ?? vehicle.mileageOdometer,
      dailyRate,
      totalDays: diffDays,
      subtotal,
      discount,
      insuranceFee,
      extraCharges,
      totalAmount,
      paidAmount: Number(input.paidAmount ?? 0),
      depositAmount: Number(input.depositAmount ?? 0),
      notes: input.notes ?? null,
      createdByUserId: actor.user.id,
    });

    await Promise.all([
      this.store.recordAuditLog({
        companyId: actor.company.id,
        branchId: vehicle.branchId,
        actorUserId: actor.user.id,
        action: "fleet.rental_contract_created",
        entityType: "rental_contract",
        entityId: contract.id,
        metadata: {
          contractNumber: contract.contractNumber,
          vehicleId: vehicle.id,
          licensePlate: vehicle.licensePlate,
          totalAmount,
        },
      }),
      this.store.recordAuditLog({
        companyId: actor.company.id,
        branchId: vehicle.branchId,
        actorUserId: actor.user.id,
        action: "fleet.vehicle_booked",
        entityType: "fleet_vehicle",
        entityId: vehicle.id,
        metadata: {
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          startDate: input.startDate,
          endDate: input.endDate,
        },
      }),
    ]);

    return contract;
  }

  async completeRentalContract(
    actor: TenantActor,
    contractId: string,
    input: { returnOdometer: number; extraCharges?: number; paidAmount?: number; notes?: string | null },
  ) {
    const updated = await this.store.completeRentalContract(actor.company.id, contractId, input);
    if (!updated) {
      throw new FleetServiceError(404, "CONTRACT_NOT_FOUND", "Rental contract not found.");
    }
    await Promise.all([
      this.store.recordAuditLog({
        companyId: actor.company.id,
        branchId: updated.branchId,
        actorUserId: actor.user.id,
        action: "fleet.rental_contract_completed",
        entityType: "rental_contract",
        entityId: updated.id,
        metadata: {
          contractNumber: updated.contractNumber,
          returnOdometer: input.returnOdometer,
        },
      }),
      this.store.recordAuditLog({
        companyId: actor.company.id,
        branchId: updated.branchId,
        actorUserId: actor.user.id,
        action: "fleet.vehicle_returned",
        entityType: "fleet_vehicle",
        entityId: updated.vehicleId,
        metadata: {
          contractId: updated.id,
          contractNumber: updated.contractNumber,
          returnOdometer: input.returnOdometer,
        },
      }),
    ]);
    return updated;
  }

  async cancelRentalContract(actor: TenantActor, contractId: string) {
    const updated = await this.store.cancelRentalContract(actor.company.id, contractId);
    if (!updated) {
      throw new FleetServiceError(404, "CONTRACT_NOT_FOUND", "Rental contract not found.");
    }
    await Promise.all([
      this.store.recordAuditLog({
        companyId: actor.company.id,
        branchId: updated.branchId,
        actorUserId: actor.user.id,
        action: "fleet.rental_contract_cancelled",
        entityType: "rental_contract",
        entityId: updated.id,
        metadata: { contractNumber: updated.contractNumber },
      }),
      this.store.recordAuditLog({
        companyId: actor.company.id,
        branchId: updated.branchId,
        actorUserId: actor.user.id,
        action: "fleet.vehicle_booking_cancelled",
        entityType: "fleet_vehicle",
        entityId: updated.vehicleId,
        metadata: {
          contractId: updated.id,
          contractNumber: updated.contractNumber,
        },
      }),
    ]);
    return updated;
  }

  async listAuditLogs(
    actor: TenantActor,
    filter?: {
      entityType?: string;
      entityId?: string;
      actorUserId?: string;
      limit?: number;
    },
  ) {
    return this.store.listAuditLogs(actor.company.id, filter);
  }

  // ============================================================================
  // Phase 3: Drivers Directory & Vehicle Movements / Branch Transfers
  // ============================================================================

  async listDrivers(actor: TenantActor) {
    return this.store.listDrivers(actor.company.id);
  }

  async createDriver(
    actor: TenantActor,
    input: {
      fullName: string;
      phonePrimary: string;
      phoneSecondary?: string | null;
      email?: string | null;
      licenseNumber: string;
      licenseIssueDate: string;
      licenseExpiryDate: string;
      passportNumber?: string | null;
      nationalIdNumber?: string | null;
      idCardPhotoUrl?: string | null;
      passportPhotoUrl?: string | null;
      licensePhotoUrl?: string | null;
      address?: string | null;
      status?: "active" | "inactive";
    },
  ) {
    if (!input.fullName?.trim() || !input.phonePrimary?.trim() || !input.licenseNumber?.trim()) {
      throw new FleetServiceError(
        400,
        "VALIDATION_ERROR",
        "Driver name, primary phone, and license number are required.",
      );
    }
    const driver = await this.store.createDriver({
      companyId: actor.company.id,
      ...input,
      createdByUserId: actor.user.id,
    });
    await this.store.recordAuditLog({
      companyId: actor.company.id,
      actorUserId: actor.user.id,
      action: "fleet.driver_created",
      entityType: "driver",
      entityId: driver.id,
      metadata: { fullName: driver.fullName, licenseNumber: driver.licenseNumber },
    });
    return driver;
  }

  async updateDriver(
    actor: TenantActor,
    driverId: string,
    input: {
      fullName: string;
      phonePrimary: string;
      phoneSecondary?: string | null;
      email?: string | null;
      licenseNumber: string;
      licenseIssueDate: string;
      licenseExpiryDate: string;
      passportNumber?: string | null;
      nationalIdNumber?: string | null;
      idCardPhotoUrl?: string | null;
      passportPhotoUrl?: string | null;
      licensePhotoUrl?: string | null;
      address?: string | null;
      status?: "active" | "inactive";
    },
  ) {
    const updated = await this.store.updateDriver(actor.company.id, driverId, input);
    if (!updated) {
      throw new FleetServiceError(404, "DRIVER_NOT_FOUND", "Driver not found.");
    }
    return updated;
  }

  async deleteDriver(actor: TenantActor, driverId: string) {
    return this.store.deleteDriver(actor.company.id, driverId);
  }

  async listVehicleMovements(
    actor: TenantActor,
    filter?: { vehicleId?: string; status?: string; toBranchId?: string },
  ) {
    const list = await this.store.listVehicleMovements(actor.company.id, filter);
    if (actor.role.scopeType === "assigned_branches") {
      return list.filter(
        (m) =>
          actor.branchIds.includes(m.toBranchId) ||
          (m.fromBranchId != null && actor.branchIds.includes(m.fromBranchId)),
      );
    }
    return list;
  }

  async dispatchVehicleMovement(
    actor: TenantActor,
    input: {
      vehicleId: string;
      toBranchId: string;
      driverId: string;
      dispatchOdometerKm: number;
      notes?: string | null;
    },
  ) {
    if (actor.company.operatingMode === "local_partner") {
      throw new FleetServiceError(
        400,
        "LOCAL_PARTNER_NO_MOVEMENTS",
        "Local partner companies do not use inter-branch vehicle movements.",
      );
    }
    const vehicle = this.assertVehicleScope(
      actor,
      await this.store.findFleetVehicleById(input.vehicleId),
    );
    if (!input.toBranchId || !input.driverId) {
      throw new FleetServiceError(400, "VALIDATION_ERROR", "Destination branch and driver are required.");
    }
    if (vehicle.branchId && vehicle.branchId === input.toBranchId) {
      throw new FleetServiceError(400, "SAME_BRANCH", "Vehicle is already assigned to this branch.");
    }
    const actorName = actor.user.fullName || actor.user.email || "Staff";
    const movement = await this.store.dispatchVehicleMovement({
      companyId: actor.company.id,
      vehicleId: vehicle.id,
      fromBranchId: vehicle.branchId ?? null,
      toBranchId: input.toBranchId,
      driverId: input.driverId,
      dispatchOdometerKm: Number(input.dispatchOdometerKm ?? vehicle.mileageOdometer ?? 0),
      dispatchedByUserId: actor.user.id,
      dispatchedByName: actorName,
      notes: input.notes ?? null,
    });

    await Promise.all([
      this.store.recordAuditLog({
        companyId: actor.company.id,
        branchId: vehicle.branchId,
        actorUserId: actor.user.id,
        action: "fleet.movement_dispatched",
        entityType: "fleet_vehicle",
        entityId: vehicle.id,
        metadata: {
          movementNumber: movement.movementNumber,
          fromBranch: movement.fromBranchName,
          toBranch: movement.toBranchName,
          driverName: movement.driverName,
          dispatchOdometerKm: movement.dispatchOdometerKm,
        },
      }),
      this.store.recordAuditLog({
        companyId: actor.company.id,
        branchId: vehicle.branchId,
        actorUserId: actor.user.id,
        action: "fleet.movement_dispatched",
        entityType: "vehicle_movement",
        entityId: movement.id,
        metadata: {
          movementNumber: movement.movementNumber,
          licensePlate: vehicle.licensePlate,
          driverName: movement.driverName,
        },
      }),
    ]);

    return movement;
  }

  async receiveVehicleMovement(
    actor: TenantActor,
    movementId: string,
    input: { arrivalOdometerKm: number; notes?: string | null },
  ) {
    if (actor.role.scopeType === "assigned_branches") {
      const existingList = await this.store.listVehicleMovements(actor.company.id);
      const target = existingList.find((m) => m.id === movementId);
      if (!target) {
        throw new FleetServiceError(404, "MOVEMENT_NOT_FOUND", "Pending movement not found.");
      }
      if (!actor.branchIds.includes(target.toBranchId)) {
        throw new FleetServiceError(
          403,
          "BRANCH_SCOPE_DENIED",
          "Only employees of the destination branch can receive this vehicle.",
        );
      }
    }
    const actorName = actor.user.fullName || actor.user.email || "Staff";
    const updated = await this.store.receiveVehicleMovement(actor.company.id, movementId, {
      arrivalOdometerKm: Number(input.arrivalOdometerKm ?? 0),
      receivedByUserId: actor.user.id,
      receivedByName: actorName,
      notes: input.notes ?? null,
    });
    if (!updated) {
      throw new FleetServiceError(404, "MOVEMENT_NOT_FOUND", "Pending movement not found.");
    }

    await Promise.all([
      this.store.recordAuditLog({
        companyId: actor.company.id,
        branchId: updated.toBranchId,
        actorUserId: actor.user.id,
        action: "fleet.movement_received",
        entityType: "fleet_vehicle",
        entityId: updated.vehicleId,
        metadata: {
          movementNumber: updated.movementNumber,
          toBranch: updated.toBranchName,
          arrivalOdometerKm: updated.arrivalOdometerKm,
        },
      }),
      this.store.recordAuditLog({
        companyId: actor.company.id,
        branchId: updated.toBranchId,
        actorUserId: actor.user.id,
        action: "fleet.movement_received",
        entityType: "vehicle_movement",
        entityId: updated.id,
        metadata: {
          movementNumber: updated.movementNumber,
          arrivalOdometerKm: updated.arrivalOdometerKm,
        },
      }),
    ]);

    return updated;
  }

  async cancelVehicleMovement(actor: TenantActor, movementId: string) {
    const updated = await this.store.cancelVehicleMovement(actor.company.id, movementId);
    if (!updated) {
      throw new FleetServiceError(404, "MOVEMENT_NOT_FOUND", "Pending movement not found.");
    }
    return updated;
  }
}
