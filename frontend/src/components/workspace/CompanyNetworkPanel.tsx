"use client";
import { DataTable } from "@/components/ui/DataTable";
import NextImage from "next/image";

import { CountrySelectField } from "@/components/shared/workspace";

import React, { useState, useMemo } from "react";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { useGetNetworkOverviewQuery, useInviteLocalPartnerMutation, useUpdateLinkStatusMutation, useUpdatePermittedBranchesMutation, useTerminateLinkMutation, type ConnectedLocalPartnerDto, type ParentLinkDto } from "@/store/api/networkApi";
import { useGetWorkspaceContextQuery } from "@/store/api/workspaceApi";
import { extractApiErrorCode, resolveAssetUrl } from "@/store/api/baseApi";
import { FormInput } from "@/components/ui/FormField";
import { CompanyLogoUploader } from "@/components/shared/workspace/CompanyLogoUploader";
import { RevixPagination } from "@/components/ui/RevixPagination";
import { ResourceFeedback } from "@/components/shared/ResourceFeedback";
import { usePersistedPage } from "@/lib/workspace/usePersistedPage";
import { StudioTooltip, RevixConfirmModal } from "@/components/shared/workspace";

interface CompanyNetworkPanelProps {
  isRtl: boolean;
}

export function CompanyNetworkPanel({ isRtl }: CompanyNetworkPanelProps) {
  const { data: wsData } = useGetWorkspaceContextQuery();
  const currentCompany = wsData?.data.company;
  const currentBranches = useMemo(() => wsData?.data.branches ?? [], [wsData?.data.branches]);

  const { data: overviewData, isLoading, isFetching, refetch } = useGetNetworkOverviewQuery();

  const [inviteLocalPartner, { isLoading: isInviting }] = useInviteLocalPartnerMutation();
  const [updateLinkStatus, { isLoading: isUpdatingStatus }] = useUpdateLinkStatusMutation();
  const [updatePermittedBranches, { isLoading: isUpdatingBranches }] = useUpdatePermittedBranchesMutation();
  const [terminateLink, { isLoading: isTerminating }] = useTerminateLinkMutation();

  // Modal states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCompanyName, setInviteCompanyName] = useState("");
  const [inviteContactName, setInviteContactName] = useState("");
  const [inviteContactPhone, setInviteContactPhone] = useState("");
  const [inviteCountryCode, setInviteCountryCode] = useState("EG");
  const [inviteLogoUrl, setInviteLogoUrl] = useState("");
  const [sentInviteRecipient, setSentInviteRecipient] = useState<{
    email: string;
    companyName: string;
  } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // View partner branches modal
  const [selectedPartnerForBranches, setSelectedPartnerForBranches] =
    useState<ConnectedLocalPartnerDto | null>(null);

  // Manage shared branches (for local partner)
  const [isManageBranchesModalOpen, setIsManageBranchesModalOpen] = useState(false);
  const [editingParentLink, setEditingParentLink] = useState<ParentLinkDto | null>(null);
  const [selectedBranchIdsToShare, setSelectedBranchIdsToShare] = useState<string[]>([]);

  // Search / filter partners
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");
  const [activeTab, setActiveTab] = useState<"partners" | "invitations">("partners");
  const [page, setPage] = usePersistedPage("network/local-companies");
  const pageSize = 15;

  const overview = overviewData?.data;
  const partners = overview?.connectedPartners;
  const pendingInvitations = overview?.pendingInvitations ?? [];
  const isMainCompany =
    overview?.isMainCompany || currentCompany?.operatingMode === "network_main";
  const isLocalPartner =
    overview?.isLocalPartner || currentCompany?.operatingMode === "local_partner";

  const connectedPartners = useMemo(() => {
    if (!partners) return [];
    let list = partners;
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }
    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.legalName.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.countryCode.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q),
    );
  }, [partners, searchTerm, statusFilter]);

  const paginatedPartners = useMemo(() => {
    const start = (page - 1) * pageSize;
    return connectedPartners.slice(start, start + pageSize);
  }, [connectedPartners, page, pageSize]);

  const localCountriesCount = useMemo(() => {
    return new Set(currentBranches.map((b) => b.countryCode).filter(Boolean)).size;
  }, [currentBranches]);

  const handleOpenInviteModal = () => {
    setInviteEmail("");
    setInviteCompanyName("");
    setInviteContactName("");
    setInviteContactPhone("");
    setInviteLogoUrl("");
    setSentInviteRecipient(null);
    setInviteError(null);
    setIsInviteModalOpen(true);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);

    if (
      !inviteEmail.trim() ||
      !inviteCompanyName.trim() ||
      !inviteContactName.trim() ||
      !inviteContactPhone.trim()
    ) {
      setInviteError(
        isRtl
          ? "يرجى إدخال اسم الشركة واسم الشخص المسؤول ورقم الهاتف والبريد الإلكتروني."
          : "Please enter the company name, contact person, phone number, and email.",
      );
      return;
    }

    try {
      await inviteLocalPartner({
        inviteeEmail: inviteEmail.trim(),
        localCompanyName: inviteCompanyName.trim(),
        contactName: inviteContactName.trim(),
        contactPhone: inviteContactPhone.trim(),
        countryCode: inviteCountryCode,
        logoUrl: inviteLogoUrl || null,
        locale: "en",
      }).unwrap();

      setSentInviteRecipient({
        email: inviteEmail.trim(),
        companyName: inviteCompanyName.trim(),
      });
    } catch (err) {
      const code = extractApiErrorCode(err);
      if (code === "NOT_MAIN_COMPANY") {
        setInviteError(
          isRtl
            ? "فقط الشركات الرئيسية للشبكة يمكنها إرسال دعوات الشراكة."
            : "Only main network companies can invite partners.",
        );
      } else {
        setInviteError(
          isRtl
            ? "تعذر إرسال الدعوة، يرجى التحقق من البيانات والمحاولة مجددًا."
            : "Failed to send invitation. Please try again.",
        );
      }
    }
  };

  const handleToggleStatus = async (
    linkId: string,
    currentStatus: "active" | "paused",
  ) => {
    const nextStatus = currentStatus === "active" ? "paused" : "active";
    try {
      await updateLinkStatus({ linkId, status: nextStatus }).unwrap();
    } catch (err) {
      console.error("Failed to update link status:", err);
    }
  };

  const [pendingTerminateLink, setPendingTerminateLink] = useState<{
    linkId: string;
    partnerName: string;
  } | null>(null);

  const handleTerminate = (linkId: string, partnerName: string) => {
    setPendingTerminateLink({ linkId, partnerName });
  };

  const handleConfirmTerminate = async () => {
    if (!pendingTerminateLink) return;
    try {
      await terminateLink(pendingTerminateLink.linkId).unwrap();
      setPendingTerminateLink(null);
    } catch (err) {
      console.error("Failed to terminate link:", err);
    }
  };

  const handleSavePermittedBranches = async () => {
    if (!editingParentLink) return;
    try {
      await updatePermittedBranches({
        linkId: editingParentLink.linkId,
        branchIds: selectedBranchIdsToShare,
      }).unwrap();
      setIsManageBranchesModalOpen(false);
    } catch (err) {
      console.error("Failed to update permitted branches:", err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Clean Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
            {isRtl ? "شبكة الشركات المحلية" : "Company Network"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <StudioTooltip label={isRtl ? "تحديث البيانات" : "Refresh data"}>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-revix-border bg-revix-white text-revix-secondary shadow-xs hover:bg-revix-surface hover:text-revix-dark transition-all disabled:opacity-50"
              aria-label={isRtl ? "تحديث" : "Refresh"}
            >
              <RevixIcon
                name="refresh-cw"
                size={14}
                className={isFetching ? "animate-spin text-revix-primary" : ""}
              />
            </button>
          </StudioTooltip>

          {isMainCompany && (
            <button
              type="button"
              onClick={handleOpenInviteModal}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 text-xs font-semibold text-revix-white shadow-xs hover:bg-revix-primary-hover transition-all"
            >
              <RevixIcon name="plus" size={14} />
              <span>{isRtl ? "دعوة شركة محلية" : "Invite Local Partner"}</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW AS LOCAL PARTNER: Parent Company Card */}
      {isLocalPartner && overview?.parentLinks && overview.parentLinks.length > 0 && (
        <div className="rounded-xl border border-revix-border bg-revix-white p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-revix-accent-soft text-revix-primary">
              <RevixIcon name="network" size={18} />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-revix-dark">
                {isRtl ? "الشركة الرئيسية المرتبطة" : "Connected Network HQ"}
              </h3>
              <p className="text-[12px] text-revix-secondary">
                {isRtl
                  ? "ترى الشركة الرئيسية فروعك ودولك وسياراتك (عرض فقط)، بينما تظل فروعك وموظفيك مستقلين تماماً."
                  : "HQ has View-Only visibility over your branches and fleet, while your branches and team remain independent."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-revix-border/70 pt-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {overview.parentLinks.map((parent) => (
              <div
                key={parent.linkId}
                className="space-y-2.5 rounded-xl border border-revix-border bg-revix-surface/35 p-3.5 text-[12.5px]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-revix-border bg-white">
                    {parent.mainCompany.logoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <NextImage unoptimized width={640} height={480}
                        src={resolveAssetUrl(parent.mainCompany.logoUrl)}
                        alt={parent.mainCompany.name}
                        className="h-full w-full object-contain p-0.5"
                      />
                    ) : (
                      <span
                        className="flex h-full w-full items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: parent.mainCompany.brandColor || "#0F5132" }}
                      >
                        {parent.mainCompany.name.substring(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-revix-dark">
                      {parent.mainCompany.name}
                    </div>
                    <div className="truncate text-[11.5px] text-revix-secondary">
                      {parent.mainCompany.city}, {parent.mainCompany.countryCode}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-revix-border/60 pt-2 text-[11.5px]">
                  <span className="text-revix-secondary">
                    {isRtl ? "فروعك ودولك المرئية:" : "Your visible coverage:"}
                  </span>
                  <span className="font-semibold text-revix-primary">
                    {currentBranches.length} {isRtl ? "فرع" : "branch(es)"} · {localCountriesCount} {isRtl ? "دولة" : "country(s)"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN COMPANY: Unified Modern Table Directory */}
      {isMainCompany && (
        <div className="space-y-4">
          {/* Clean Toolbar: Tabs (when pending invites exist) + Search + Status Filter */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {pendingInvitations.length > 0 && (
                <div className="inline-flex rounded-lg border border-revix-border bg-revix-surface/60 p-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab("partners")}
                    className={`cursor-pointer rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-all ${
                      activeTab === "partners"
                        ? "bg-revix-primary text-white shadow-xs"
                        : "text-revix-secondary hover:text-revix-dark"
                    }`}
                  >
                    {isRtl ? `الشركات الشريكة (${partners?.length || 0})` : `Partners (${partners?.length || 0})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("invitations")}
                    className={`cursor-pointer rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-all ${
                      activeTab === "invitations"
                        ? "bg-revix-primary text-white shadow-xs"
                        : "text-revix-secondary hover:text-revix-dark"
                    }`}
                  >
                    {isRtl ? `الدعوات المعلقة (${pendingInvitations.length})` : `Pending Invites (${pendingInvitations.length})`}
                  </button>
                </div>
              )}

              {activeTab === "partners" && (
                <div className="relative w-full sm:w-80">
                  <RevixIcon
                    name="search"
                    size={14}
                    className="pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-revix-secondary"
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    placeholder={
                      isRtl
                        ? "ابحث بالاسم، المدينة، الهاتف، البريد..."
                        : "Search by name, city, phone, email..."
                    }
                    className="h-9 w-full rounded-lg border border-revix-border bg-revix-white ps-9 pe-3 text-[12.5px] text-revix-dark placeholder:text-revix-secondary/75 focus:border-revix-primary focus:outline-none focus:ring-2 focus:ring-revix-primary/15"
                  />
                </div>
              )}
            </div>

            {activeTab === "partners" && (
              <div className="inline-flex items-center gap-1 rounded-lg border border-revix-border bg-revix-surface/50 p-0.5">
                {(
                  [
                    { id: "all", labelAr: "الكل", labelEn: "All" },
                    { id: "active", labelAr: "نشط", labelEn: "Active" },
                    { id: "paused", labelAr: "موقوف", labelEn: "Paused" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(opt.id);
                      setPage(1);
                    }}
                    className={`cursor-pointer rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                      statusFilter === opt.id
                        ? "bg-revix-white text-revix-dark shadow-xs"
                        : "text-revix-secondary hover:text-revix-dark"
                    }`}
                  >
                    {isRtl ? opt.labelAr : opt.labelEn}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isLoading ? (
            <ResourceFeedback
              isLoading
              isRtl={isRtl}
              loadingTitle={isRtl ? "جاري تحميل شبكة الشركات..." : "Loading partner network..."}
            />
          ) : activeTab === "invitations" && pendingInvitations.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-revix-border bg-revix-white">
              <div className="overflow-x-auto">
                <DataTable className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="border-b border-revix-border bg-revix-surface/70 text-[12px] font-semibold text-revix-secondary">
                      <th className="px-4 py-3 text-start">{isRtl ? "الشركة الشريكة" : "Partner Company"}</th>
                      <th className="px-4 py-3 text-start">{isRtl ? "الشخص المسؤول" : "Contact Person"}</th>
                      <th className="px-4 py-3 text-start">{isRtl ? "البريد الإلكتروني" : "Invitee Email"}</th>
                      <th className="px-4 py-3 text-start">{isRtl ? "تاريخ الصلاحية" : "Expires At"}</th>
                      <th className="px-4 py-3 text-start">{isRtl ? "الحالة" : "Status"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-revix-border/70">
                    {pendingInvitations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-revix-surface/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-revix-dark">
                          <div className="flex items-center gap-2.5">
                            {inv.logoUrl ? (
                              <NextImage
                                unoptimized
                                width={640}
                                height={480}
                                src={inv.logoUrl}
                                alt={inv.localCompanyName}
                                className="h-8 w-8 shrink-0 rounded-lg border border-revix-border bg-white object-contain p-0.5"
                              />
                            ) : (
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-revix-accent-soft text-[11px] font-bold text-revix-primary">
                                {inv.localCompanyName.substring(0, 2).toUpperCase()}
                              </span>
                            )}
                            <span>{inv.localCompanyName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-revix-secondary">
                          {inv.contactName || inv.contactPhone ? (
                            <div className="space-y-0.5">
                              {inv.contactName ? (
                                <p className="font-medium text-revix-dark">{inv.contactName}</p>
                              ) : null}
                              {inv.contactPhone ? (
                                <p className="font-mono text-[11.5px]" dir="ltr">{inv.contactPhone}</p>
                              ) : null}
                            </div>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-[12px] text-revix-secondary">{inv.inviteeEmail}</td>
                        <td className="px-4 py-3 text-revix-secondary">
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                            <span className="size-1.5 rounded-full bg-amber-500" />
                            {isRtl ? "في الانتظار" : "Pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </div>
            </div>
          ) : connectedPartners.length === 0 ? (
            <div className="rounded-xl border border-dashed border-revix-border bg-revix-white p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-revix-accent-soft text-revix-primary">
                <RevixIcon name="network" size={22} />
              </div>
              <h3 className="mt-3 text-[14.5px] font-bold text-revix-dark">
                {searchTerm.trim() || statusFilter !== "all"
                  ? isRtl
                    ? "لا توجد شركات مطابقة للبحث"
                    : "No matching partner companies"
                  : isRtl
                    ? "لا توجد شركات محلية مرتبطة حالياً"
                    : "No connected partners yet"}
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-revix-secondary">
                {searchTerm.trim() || statusFilter !== "all"
                  ? isRtl
                    ? "جرّب تعديل كلمة البحث أو الفلتر."
                    : "Try adjusting your search or status filter."
                  : isRtl
                    ? "ابدأ بتوسيع شبكتك عبر دعوة شركات تأجير محلية للربط مع نظامك."
                    : "Start expanding your network by inviting local rental partners."}
              </p>
              {!searchTerm.trim() && statusFilter === "all" && (
                <button
                  type="button"
                  onClick={handleOpenInviteModal}
                  className="mt-4 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-4 text-[12.5px] font-semibold text-white shadow-xs transition-colors hover:bg-revix-primary-hover"
                >
                  <RevixIcon name="plus" size={14} />
                  <span>{isRtl ? "دعوة شركة محلية" : "Invite Local Partner"}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-revix-border bg-revix-white">
              <div className="overflow-x-auto">
                <DataTable className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="border-b border-revix-border bg-revix-surface/70 text-[12px] font-semibold text-revix-secondary">
                      <th className="px-4 py-3 text-start">{isRtl ? "الشركة الشريكة" : "Partner Company"}</th>
                      <th className="px-4 py-3 text-start">{isRtl ? "الموقع والعملة" : "Location & Currency"}</th>
                      <th className="px-4 py-3 text-start">{isRtl ? "البريد الإلكتروني" : "Email"}</th>
                      <th className="px-4 py-3 text-start">{isRtl ? "الهاتف" : "Phone"}</th>
                      <th className="px-4 py-3 text-start">{isRtl ? "الفروع والدول" : "Branches"}</th>
                      <th className="px-4 py-3 text-start">{isRtl ? "الحالة" : "Status"}</th>
                      <th className="px-4 py-3 text-end">{isRtl ? "إجراءات" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-revix-border/70">
                    {paginatedPartners.map((partner) => {
                      const isActive = partner.status === "active";
                      const countriesCount =
                        new Set(partner.permittedBranches.map((b) => b.countryCode)).size ||
                        (partner.countryCode ? 1 : 0);

                      return (
                        <tr
                          key={partner.linkId}
                          onClick={() => setSelectedPartnerForBranches(partner)}
                          className="cursor-pointer transition-colors hover:bg-revix-accent-soft/40"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold text-white shadow-xs"
                                style={{ backgroundColor: partner.brandColor || "#0F5132" }}
                              >
                                {partner.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-revix-dark">
                                  {partner.name}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-revix-dark">
                            <span>{partner.city}</span>
                            <span className="mx-1 text-revix-secondary">·</span>
                            <span className="font-mono text-[12px] text-revix-secondary">
                              {partner.countryCode} ({partner.baseCurrency})
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[12px] text-revix-secondary">
                            {partner.email}
                          </td>
                          <td className="px-4 py-3 font-mono text-[12px] text-revix-dark" dir="ltr">
                            {partner.phone}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-revix-accent-soft/70 px-2 py-0.5 text-[12px] font-semibold text-revix-primary">
                              <RevixIcon name="building-2" size={12} />
                              {partner.permittedBranches.length} {isRtl ? "فرع" : "br."} · {countriesCount}{" "}
                              {isRtl ? "دولة" : "co."}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                                isActive
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700"
                              }`}
                            >
                              <span
                                className={`size-1.5 rounded-full ${
                                  isActive ? "bg-emerald-600" : "bg-amber-600"
                                }`}
                              />
                              {isActive
                                ? isRtl
                                  ? "نشط"
                                  : "Active"
                                : isRtl
                                  ? "موقوف مؤقتاً"
                                  : "Paused"}
                            </span>
                          </td>
                          <td
                            className="px-4 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedPartnerForBranches(partner)}
                                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-revix-border bg-revix-white px-2.5 text-[12px] font-semibold text-revix-dark transition-colors hover:border-revix-primary/40 hover:bg-revix-accent-soft/60 hover:text-revix-primary"
                              >
                                <RevixIcon name="eye" size={13} />
                                <span>{isRtl ? "فروع الشريك" : "Branches"}</span>
                              </button>

                              <StudioTooltip
                                label={
                                  isActive
                                    ? isRtl
                                      ? "إيقاف مؤقت للربط"
                                      : "Pause link"
                                    : isRtl
                                      ? "استئناف الربط"
                                      : "Resume link"
                                }
                              >
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(partner.linkId, partner.status)}
                                  disabled={isUpdatingStatus}
                                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-revix-border bg-revix-white text-revix-secondary transition-colors hover:bg-revix-surface disabled:opacity-50"
                                >
                                  <RevixIcon
                                    name={isActive ? "pause-circle" : "play-circle"}
                                    size={15}
                                    className={isActive ? "text-amber-600" : "text-emerald-600"}
                                  />
                                </button>
                              </StudioTooltip>

                              <StudioTooltip label={isRtl ? "إنهاء الربط بالشريك" : "Terminate link"}>
                                <button
                                  type="button"
                                  onClick={() => handleTerminate(partner.linkId, partner.name)}
                                  disabled={isTerminating}
                                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-red-200 bg-revix-white text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                                >
                                  <RevixIcon name="trash-2" size={14} />
                                </button>
                              </StudioTooltip>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </DataTable>
              </div>

              {/* Unified Auto-Hide Pagination */}
              <div className="border-t border-revix-border/70 empty:hidden">
                <RevixPagination
                  currentPage={page}
                  totalItems={connectedPartners.length}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  lang={isRtl ? "ar" : "en"}
                  itemLabel={isRtl ? "شركة شريكة" : "partner companies"}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Invite Local Partner */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[10px] border border-revix-border bg-white p-5 sm:p-6 shadow-dialog space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-revix-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-emerald-50 text-revix-primary">
                  <RevixIcon name="network" size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-[15px] text-revix-dark">
                    {isRtl ? "دعوة شركة محلية للانضمام للشبكة" : "Invite Local Partner to Network"}
                  </h3>
                  <p className="text-[11.5px] text-revix-secondary">
                    {isRtl
                      ? "سيتم إرسال رسالة الدعوة مباشرة إلى البريد الإلكتروني لمدير الشركة المحلية"
                      : "An invitation email will be sent directly to the local partner manager"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="cursor-pointer rounded-[5px] p-1 text-revix-disabled hover:bg-revix-surface hover:text-revix-dark transition-all"
              >
                <RevixIcon name="close" size={16} />
              </button>
            </div>

            {inviteError && (
              <div className="flex items-center gap-2 rounded-[6px] bg-red-50 p-2.5 text-[12px] font-medium text-red-700 border border-red-200">
                <RevixIcon name="info" size={15} className="shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            {!sentInviteRecipient ? (
              <form onSubmit={handleSendInvite} className="space-y-3.5">
                <CompanyLogoUploader
                  isRtl={isRtl}
                  value={inviteLogoUrl}
                  companyName={inviteCompanyName}
                  onChange={setInviteLogoUrl}
                />

                <FormInput
                  label={isRtl ? "اسم الشركة المحلية الشريكة" : "Local Partner Company Name"}
                  required
                  value={inviteCompanyName}
                  onChange={(e) => setInviteCompanyName(e.target.value)}
                  placeholder={
                    isRtl ? "مثال: شركة الخليج لتأجير السيارات" : "e.g. Gulf Rent A Car"
                  }
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormInput
                    label={isRtl ? "اسم الشخص المسؤول" : "Contact Person Name"}
                    required
                    value={inviteContactName}
                    onChange={(e) => setInviteContactName(e.target.value)}
                    placeholder={isRtl ? "مثال: محمد العتيبي" : "e.g. Mohammed Ali"}
                  />

                  <FormInput
                    label={isRtl ? "رقم الهاتف" : "Phone Number"}
                    type="tel"
                    dir="ltr"
                    required
                    value={inviteContactPhone}
                    onChange={(e) => setInviteContactPhone(e.target.value)}
                    placeholder="+966 50 000 0000"
                  />
                  <CountrySelectField
                    isRtl={isRtl}
                    label={isRtl ? "الدولة" : "Country"}
                    countryCode={inviteCountryCode}
                    onChange={setInviteCountryCode}
                  />
                </div>

                <FormInput
                  label={isRtl ? "البريد الإلكتروني لمدير الشركة" : "Manager / Admin Email"}
                  type="email"
                  dir="ltr"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="partner-admin@company.com"
                />

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-revix-border">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="inline-flex h-[32px] cursor-pointer items-center rounded-[6px] border border-revix-border bg-revix-white px-3 text-[12px] font-medium text-revix-dark hover:bg-revix-surface transition-all"
                  >
                    {isRtl ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={isInviting}
                    className="inline-flex h-[32px] cursor-pointer items-center gap-1.5 rounded-[6px] border border-revix-primary bg-revix-primary px-3.5 text-[12px] font-semibold text-revix-white shadow-sm hover:bg-revix-primary-hover active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {isInviting && <RevixIcon name="refresh-cw" size={13} className="animate-spin" />}
                    <span>{isRtl ? "إرسال الدعوة عبر البريد" : "Send Invitation Email"}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 py-2">
                <div className="flex items-start gap-2.5 rounded-[6px] bg-emerald-50 p-3 text-[12.5px] text-emerald-900 border border-emerald-200">
                  <RevixIcon name="check-circle-2" size={17} className="shrink-0 text-emerald-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {isRtl
                        ? `تم إرسال الدعوة بنجاح إلى ${sentInviteRecipient.email}`
                        : `Invitation email sent to ${sentInviteRecipient.email}`}
                    </p>
                    <p className="text-[11.5px] leading-relaxed text-emerald-800">
                      {isRtl
                        ? `تم إرسال رسالة الدعوة تلقائيًا إلى البريد الإلكتروني لمدير شركة "${sentInviteRecipient.companyName}" لإتمام الانضمام للشبكة.`
                        : `An email invitation has been delivered directly to the manager of "${sentInviteRecipient.companyName}" to join the network.`}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-revix-border">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="inline-flex h-[32px] cursor-pointer items-center rounded-[6px] border border-revix-border bg-revix-white px-3.5 text-[12px] font-semibold text-revix-dark hover:bg-revix-surface transition-all"
                  >
                    {isRtl ? "إغلاق النافذة" : "Done"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: View Partner Shared Branches */}
      {selectedPartnerForBranches && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-[10px] border border-revix-border bg-white p-5 sm:p-6 shadow-dialog space-y-4 animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-revix-border pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-[7px] font-bold text-white text-[13px]"
                  style={{ backgroundColor: selectedPartnerForBranches.brandColor || "#059669" }}
                >
                  {selectedPartnerForBranches.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-[15px] text-revix-dark flex items-center gap-2">
                    <span>{selectedPartnerForBranches.name}</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.2 text-[10.5px] font-bold text-emerald-800 border border-emerald-200">
                      {isRtl ? "عرض فقط (View-Only)" : "View-Only"}
                    </span>
                  </h3>
                  <p className="text-[11.5px] text-revix-secondary">
                    {isRtl
                      ? `فروع الشركة المسموح بها في الشبكة (${selectedPartnerForBranches.permittedBranches.length} فرع)`
                      : `Permitted shared branches (${selectedPartnerForBranches.permittedBranches.length} branch(es))`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPartnerForBranches(null)}
                className="cursor-pointer rounded-[5px] p-1 text-revix-disabled hover:bg-revix-surface hover:text-revix-dark transition-all"
              >
                <RevixIcon name="close" size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {selectedPartnerForBranches.permittedBranches.length === 0 ? (
                <div className="rounded-[8px] border border-dashed border-revix-border p-8 text-center text-[12px] text-revix-secondary">
                  {isRtl
                    ? "لم تقم الشركة المحلية بتحديد فروع مشاركة حتى الآن."
                    : "No branches shared by this partner yet."}
                </div>
              ) : (
                selectedPartnerForBranches.permittedBranches.map((branch) => (
                  <div
                    key={branch.id}
                    className="rounded-[8px] border border-revix-border bg-revix-surface/60 p-3.5 space-y-2 text-[12px]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[13px] text-revix-dark">
                          {branch.name}
                        </span>
                        <span className="rounded bg-revix-white border border-revix-border px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-revix-secondary">
                          {branch.code}
                        </span>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-800">
                        {branch.currencyCode || selectedPartnerForBranches.baseCurrency}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-revix-secondary pt-1 border-t border-revix-border/60">
                      <div>
                        <span className="text-revix-disabled">{isRtl ? "المدينة:" : "City:"} </span>
                        {branch.city}, {branch.countryCode}
                      </div>
                      <div>
                        <span className="text-revix-disabled">{isRtl ? "العنوان:" : "Address:"} </span>
                        {branch.address}
                      </div>
                      <div>
                        <span className="text-revix-disabled">{isRtl ? "الهاتف:" : "Phone:"} </span>
                        <span dir="ltr" className="font-mono">{branch.phone}</span>
                      </div>
                      <div>
                        <span className="text-revix-disabled">{isRtl ? "مواعيد العمل:" : "Hours:"} </span>
                        {branch.workingDays} ({branch.workingHours})
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-revix-border shrink-0">
              <button
                type="button"
                onClick={() => setSelectedPartnerForBranches(null)}
                className="inline-flex h-[32px] cursor-pointer items-center rounded-[6px] border border-revix-border bg-revix-white px-3 text-[12px] font-semibold text-revix-dark hover:bg-revix-surface transition-all"
              >
                {isRtl ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Manage Shared Branches (For Local Partner) */}
      {isManageBranchesModalOpen && editingParentLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-[10px] border border-revix-border bg-white p-5 sm:p-6 shadow-dialog space-y-4 animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-revix-border pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-blue-50 text-blue-600">
                  <RevixIcon name="building-2" size={17} />
                </div>
                <div>
                  <h3 className="font-bold text-[15px] text-revix-dark">
                    {isRtl ? "تحديد الفروع المشاركة مع الشبكة" : "Select Branches to Share"}
                  </h3>
                  <p className="text-[11.5px] text-revix-secondary">
                    {isRtl
                      ? `مشاركة الفروع المختارة مع "${editingParentLink.mainCompany.name}" (عرض فقط)`
                      : `Share selected branches with "${editingParentLink.mainCompany.name}" (View-only)`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManageBranchesModalOpen(false)}
                className="cursor-pointer rounded-[5px] p-1 text-revix-disabled hover:bg-revix-surface hover:text-revix-dark transition-all"
              >
                <RevixIcon name="close" size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <p className="text-[12px] text-revix-secondary">
                {isRtl
                  ? "حدد الفروع التي ترغب في إتاحة معاينتها للشبكة الرئيسية. الفروع غير المحددة ستظل سرية تماماً داخل مساحة عملك الخاصة."
                  : "Choose which branches can be viewed by HQ. Unselected branches remain strictly confidential to your workspace."}
              </p>

              <div className="space-y-2 pt-1">
                {currentBranches.map((branch) => {
                  const isChecked = selectedBranchIdsToShare.includes(branch.id);
                  return (
                    <label
                      key={branch.id}
                      className={`flex items-center justify-between p-3 rounded-[8px] border transition-all cursor-pointer ${
                        isChecked
                          ? "border-revix-primary bg-emerald-50/40"
                          : "border-revix-border bg-revix-white hover:bg-revix-surface"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBranchIdsToShare((prev) => [...prev, branch.id]);
                            } else {
                              setSelectedBranchIdsToShare((prev) =>
                                prev.filter((id) => id !== branch.id),
                              );
                            }
                          }}
                          className="h-4 w-4 rounded border-revix-border text-revix-primary focus:ring-revix-primary accent-emerald-800"
                        />
                        <div>
                          <div className="font-semibold text-[12.5px] text-revix-dark">
                            {branch.name}
                          </div>
                          <div className="text-[11px] text-revix-secondary">
                            {branch.code} • {branch.city}, {branch.countryCode}
                          </div>
                        </div>
                      </div>

                      <span className="rounded bg-revix-white border border-revix-border px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-revix-secondary">
                        {branch.currencyCode}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-revix-border shrink-0">
              <button
                type="button"
                onClick={() => setIsManageBranchesModalOpen(false)}
                className="inline-flex h-[32px] cursor-pointer items-center rounded-[6px] border border-revix-border bg-revix-white px-3 text-[12px] font-medium text-revix-dark hover:bg-revix-surface transition-all"
              >
                {isRtl ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleSavePermittedBranches}
                disabled={isUpdatingBranches}
                className="inline-flex h-[32px] cursor-pointer items-center gap-1.5 rounded-[6px] border border-revix-primary bg-revix-primary px-3.5 text-[12px] font-semibold text-revix-white shadow-sm hover:bg-revix-primary-hover active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isUpdatingBranches && <RevixIcon name="refresh-cw" size={13} className="animate-spin" />}
                <span>{isRtl ? "حفظ التغييرات" : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <RevixConfirmModal
        isOpen={Boolean(pendingTerminateLink)}
        isRtl={isRtl}
        title={isRtl ? "إنهاء الربط الشبكي" : "Terminate Network Link"}
        message={
          pendingTerminateLink
            ? isRtl
              ? `هل أنت متأكد من إنهاء الربط الشبكي مع "${pendingTerminateLink.partnerName}"؟`
              : `Are you sure you want to terminate the network link with "${pendingTerminateLink.partnerName}"?`
            : ""
        }
        confirmLabel={isRtl ? "إنهاء الربط" : "Terminate Link"}
        isLoading={isTerminating}
        onConfirm={handleConfirmTerminate}
        onCancel={() => setPendingTerminateLink(null)}
      />
    </div>
  );
}
