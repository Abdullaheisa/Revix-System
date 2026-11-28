import { Router, type Response } from "express";
import { type AuthenticatedTenantRequest } from "../../team/rbacMiddleware.ts";
import type { FleetRouteContext } from "../fleetRouteContext.ts";
import { handleFleetError } from "../fleetHttp.ts";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function registerContractsRoutes(router: Router, { guards, fleetService }: FleetRouteContext): void {
router.get(
    "/contracts",
    guards.requirePermission("sales", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const contracts = await fleetService.listRentalContracts(req.tenantActor!);
        res.status(200).json({ ok: true, data: contracts });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.get(
    "/contracts/:id",
    guards.requirePermission("sales", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !UUID_REGEX.test(id)) {
        res.status(400).json({ ok: false, error: { code: "INVALID_CONTRACT_ID", message: "Invalid contract ID." } });
        return;
      }
      try {
        const contracts = await fleetService.listRentalContracts(req.tenantActor!);
        const contract = contracts.find((c) => c.id === id);
        if (!contract) {
          res.status(404).json({ ok: false, error: { code: "CONTRACT_NOT_FOUND", message: "Contract not found." } });
          return;
        }
        res.status(200).json({ ok: true, data: contract });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.get(
    "/contracts/:id/details",
    guards.requirePermission("sales", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !UUID_REGEX.test(id)) {
        res.status(400).json({ ok: false, error: { code: "INVALID_CONTRACT_ID", message: "Invalid contract ID." } });
        return;
      }
      try {
        const details = await fleetService.getRentalContractDetails(req.tenantActor!, id!);
        res.status(200).json({ ok: true, data: details });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.post(
    "/contracts",
    guards.requirePermission("sales", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const created = await fleetService.createRentalContract(req.tenantActor!, {
          vehicleId: String(req.body?.vehicleId ?? ""),
          customerId: String(req.body?.customerId ?? ""),
          startDate: String(req.body?.startDate ?? ""),
          endDate: String(req.body?.endDate ?? ""),
          pickupOdometer: req.body?.pickupOdometer != null ? Number(req.body.pickupOdometer) : undefined,
          dailyRate: req.body?.dailyRate != null ? Number(req.body.dailyRate) : undefined,
          discount: req.body?.discount != null ? Number(req.body.discount) : 0,
          insuranceFee: req.body?.insuranceFee != null ? Number(req.body.insuranceFee) : 0,
          extraCharges: req.body?.extraCharges != null ? Number(req.body.extraCharges) : 0,
          paidAmount: req.body?.paidAmount != null ? Number(req.body.paidAmount) : 0,
          depositAmount: req.body?.depositAmount != null ? Number(req.body.depositAmount) : 0,
          notes: req.body?.notes ?? null,
          secondDriverName: typeof req.body?.secondDriverName === "string" ? req.body.secondDriverName.trim() || null : null,
          secondDriverLicenseNo: typeof req.body?.secondDriverLicenseNo === "string" ? req.body.secondDriverLicenseNo.trim() || null : null,
          sponsorName: typeof req.body?.sponsorName === "string" ? req.body.sponsorName.trim() || null : null,
          sponsorNationalId: typeof req.body?.sponsorNationalId === "string" ? req.body.sponsorNationalId.trim() || null : null,
          sponsorPhone: typeof req.body?.sponsorPhone === "string" ? req.body.sponsorPhone.trim() || null : null,
          customerSignatureDataUrl:
            typeof req.body?.customerSignatureDataUrl === "string" && req.body.customerSignatureDataUrl.trim()
              ? req.body.customerSignatureDataUrl.trim()
              : null,
          reservationId:
            typeof req.body?.reservationId === "string" && req.body.reservationId.trim()
              ? req.body.reservationId.trim()
              : null,
        });
        res.status(201).json({ ok: true, data: created });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.post(
    "/contracts/:id/sign",
    guards.requirePermission("sales", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !UUID_REGEX.test(id)) {
        res.status(400).json({ ok: false, error: { code: "INVALID_CONTRACT_ID", message: "Invalid contract ID." } });
        return;
      }
      const sig = typeof req.body?.signatureDataUrl === "string" ? req.body.signatureDataUrl.trim() : "";
      if (!sig) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Signature is required." } });
        return;
      }
      try {
        const updated = await fleetService.signRentalContract(req.tenantActor!, id!, sig);
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.post(
    "/contracts/:id/complete",
    guards.requirePermission("sales", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !UUID_REGEX.test(id)) {
        res.status(400).json({ ok: false, error: { code: "INVALID_CONTRACT_ID", message: "Invalid contract ID." } });
        return;
      }
      try {
        const updated = await fleetService.completeRentalContract(req.tenantActor!, id!, {
          returnOdometer: Number(req.body?.returnOdometer ?? 0),
          returnedAt: typeof req.body?.returnedAt === "string" ? req.body.returnedAt.trim() || null : null,
          actualDays: req.body?.actualDays != null ? Number(req.body.actualDays) : undefined,
          extraCharges: req.body?.extraCharges != null ? Number(req.body.extraCharges) : undefined,
          paidAmount: req.body?.paidAmount != null ? Number(req.body.paidAmount) : undefined,
          returnCondition: typeof req.body?.returnCondition === "string" ? req.body.returnCondition.trim() : null,
          notes: req.body?.notes ?? null,
          returnContractImageUrl:
            typeof req.body?.returnContractImageUrl === "string" && req.body.returnContractImageUrl.trim()
              ? req.body.returnContractImageUrl.trim()
              : null,
        });
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.post(
    "/contracts/:id/cancel",
    guards.requirePermission("sales", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !UUID_REGEX.test(id)) {
        res.status(400).json({ ok: false, error: { code: "INVALID_CONTRACT_ID", message: "Invalid contract ID." } });
        return;
      }
      try {
        const updated = await fleetService.cancelRentalContract(req.tenantActor!, id!);
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.post(
    "/contracts/:id/extend",
    guards.requirePermission("sales", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !UUID_REGEX.test(id)) {
        res.status(400).json({ ok: false, error: { code: "INVALID_CONTRACT_ID", message: "Invalid contract ID." } });
        return;
      }
      try {
        const updated = await fleetService.extendRentalContract(req.tenantActor!, id!, {
          newEndDate: String(req.body?.newEndDate ?? ""),
          notes: typeof req.body?.notes === "string" ? req.body.notes.trim() || null : undefined,
        });
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.get(
    "/contracts/:id/vouchers",
    guards.requirePermission("sales", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !UUID_REGEX.test(id)) {
        res.status(400).json({ ok: false, error: { code: "INVALID_CONTRACT_ID", message: "Invalid contract ID." } });
        return;
      }
      try {
        const vouchers = await fleetService.listContractVouchers(req.tenantActor!, id!);
        res.status(200).json({ ok: true, data: vouchers });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.post(
    "/contracts/:id/vouchers",
    guards.requirePermission("sales", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !UUID_REGEX.test(id)) {
        res.status(400).json({ ok: false, error: { code: "INVALID_CONTRACT_ID", message: "Invalid contract ID." } });
        return;
      }
      const voucherType = req.body?.voucherType;
      const paymentMethod = req.body?.paymentMethod;
      if (voucherType !== "receipt" && voucherType !== "payment" && voucherType !== "refund") {
        res.status(400).json({ ok: false, error: { code: "INVALID_VOUCHER_TYPE", message: "Invalid voucher type." } });
        return;
      }
      if (
        paymentMethod !== "cash" &&
        paymentMethod !== "knet" &&
        paymentMethod !== "link" &&
        paymentMethod !== "bank_transfer" &&
        paymentMethod !== "cheque"
      ) {
        res.status(400).json({ ok: false, error: { code: "INVALID_PAYMENT_METHOD", message: "Invalid payment method." } });
        return;
      }
      try {
        const created = await fleetService.createContractVoucher(req.tenantActor!, id!, {
          voucherType,
          amount: Number(req.body?.amount ?? 0),
          paymentMethod,
          paymentDate: String(req.body?.paymentDate ?? new Date().toISOString().slice(0, 10)),
          referenceNo: typeof req.body?.referenceNo === "string" ? req.body.referenceNo.trim() || null : null,
          bankName: typeof req.body?.bankName === "string" ? req.body.bankName.trim() || null : null,
          description: typeof req.body?.description === "string" ? req.body.description.trim() || null : null,
        });
        res.status(201).json({ ok: true, data: created });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );
}

