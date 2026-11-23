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
import { usePersistedPage } from "@/lib/workspace/usePersistedPage";
import { StudioTooltip, RevixConfirmModal } from "@/components/shared/workspace";

interface CompanyNetworkPanelProps {
  isRtl: boolean;
}

export function CompanyNetworkPanel({ isRtl }: CompanyNetworkPanelProps) {
  const { data: wsData } = useGetWorkspaceContextQuery();
  const currentCompany = wsData?.data.company;
  const currentBranches = useMemo(() => wsData?.data.branches ?? [], [wsData?.data.branches]);

  const { data: overviewData, isFetching, refetch } = useGetNetworkOverviewQuery();

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
  const [page, setPage] = usePersistedPage("network/local-companies");
  const pageSize = 15;

  const overview = overviewData?.data;
  const partners = overview?.connectedPartners;
  const isMainCompany =
    overview?.isMainCompany || currentCompany?.operatingMode === "network_main";
  const isLocalPartner =
    overview?.isLocalPartner || currentCompany?.operatingMode === "local_partner";

  const connectedPartners = useMemo(() => {
    if (!partners) return [];
    if (!searchTerm.trim()) return partners;
    const q = searchTerm.toLowerCase();
    return partners.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.legalName.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.countryCode.toLowerCase().includes(q),
    );
  }, [partners, searchTerm]);

  const paginatedPartners = useMemo(() => {
    const start = (page - 1) * pageSize;
    return connectedPartners.slice(start, start + pageSize);
  }, [connectedPartners, page, pageSize]);

  const totalSharedBranches = useMemo(() => {
    if (!partners) return 0;
    return partners.reduce(
      (acc, p) => acc + (p.permittedBranches?.length || 0),
      0,
    );
  }, [partners]);

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
    <div className="space-y-6">
      {/* Top Banner & Heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-revix-border pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[20px] sm:text-[22px] font-bold tracking-tight text-revix-dark">
              {isRtl ? "شبكة الشركات المحلية" : "Company Network"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StudioTooltip label={isRtl ? "تحديث البيانات" : "Refresh data"}>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-[6px] border border-revix-border bg-revix-white text-revix-secondary hover:border-revix-primary/40 hover:bg-revix-surface hover:text-revix-dark transition-all disabled:opacity-50"
              aria-label={isRtl ? "تحديث" : "Refresh"}
            >
              <RevixIcon
                name="refresh-cw"
                size={14}
                className={isFetching ? "animate-spin" : ""}
              />
            </button>
          </StudioTooltip>

          {isMainCompany && (
            <button
              type="button"
              onClick={handleOpenInviteModal}
              className="inline-flex h-[34px] cursor-pointer items-center gap-1.5 rounded-[6px] border border-revix-primary bg-revix-primary px-3 text-[12.5px] font-semibold text-revix-white shadow-sm hover:bg-revix-primary-hover active:scale-[0.98] transition-all"
            >
              <RevixIcon name="plus" size={14} />
              <span>{isRtl ? "دعوة شركة محلية" : "Invite Local Partner"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Network Stats Cards */}
      {isLocalPartner && !isMainCompany ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Local Stat 1: Main HQ */}
          <div className="rounded-[8px] border border-revix-border bg-revix-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-medium text-revix-secondary uppercase tracking-wider">
                {isRtl ? "الشركة الرئيسية" : "Network HQ"}
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-blue-200/80 bg-blue-50 text-blue-700">
                <RevixIcon name="network" size={15} />
              </div>
            </div>
            <div className="mt-2 truncate text-[18px] font-bold text-revix-dark">
              {overview?.parentLinks?.[0]?.mainCompany.name || "—"}
            </div>
            <p className="mt-0.5 text-[11.5px] text-revix-secondary">
              {isRtl ? "الشركة الأم المشرفة على الشبكة" : "Parent network company"}
            </p>
          </div>

          {/* Local Stat 2: My Branches */}
          <div className="rounded-[8px] border border-revix-border bg-revix-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-medium text-revix-secondary uppercase tracking-wider">
                {isRtl ? "فروعي" : "My Branches"}
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-sky-200/80 bg-sky-50 text-sky-700">
                <RevixIcon name="building-2" size={15} />
              </div>
            </div>
            <div className="mt-2 text-[24px] font-bold tabular-nums text-revix-dark">
              {currentBranches.length}
            </div>
            <p className="mt-0.5 text-[11.5px] text-revix-secondary">
              {isRtl ? "فروعك وأسطولها مرئية للرئيسية" : "Your branches visible to HQ"}
            </p>
          </div>

          {/* Local Stat 3: Countries */}
          <div className="rounded-[8px] border border-revix-border bg-revix-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-medium text-revix-secondary uppercase tracking-wider">
                {isRtl ? "الدول" : "Countries"}
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-indigo-200/80 bg-indigo-50 text-indigo-700">
                <RevixIcon name="globe-2" size={15} />
              </div>
            </div>
            <div className="mt-2 text-[24px] font-bold tabular-nums text-revix-dark">
              {localCountriesCount}
            </div>
            <p className="mt-0.5 text-[11.5px] text-revix-secondary">
              {isRtl ? "الدول التي تغطيها فروعك" : "Countries covered by your branches"}
            </p>
          </div>

          {/* Local Stat 4: Independence */}
          <div className="rounded-[8px] border border-emerald-200/80 bg-emerald-50/50 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-medium text-emerald-800 uppercase tracking-wider">
                {isRtl ? "عزل الصلاحيات" : "Access Isolation"}
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-emerald-100 text-emerald-700">
                <RevixIcon name="shield-check" size={15} />
              </div>
            </div>
            <div className="mt-2 text-[15px] font-bold text-emerald-900">
              {isRtl ? "عرض فقط (View-Only)" : "Strict View-Only"}
            </div>
            <p className="mt-0.5 text-[11.5px] text-emerald-700">
              {isRtl
                ? "فروعك وموظفيك مستقلون بالكامل عن فروع الرئيسية"
                : "Your branches & team stay isolated from HQ"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Stat 1 */}
        <div className="rounded-[8px] border border-revix-border bg-revix-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all hover:border-revix-primary/30">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-revix-secondary uppercase tracking-wider">
              {isRtl ? "الشركات الشريكة" : "Connected Partners"}
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-emerald-200/80 bg-emerald-50 text-revix-primary">
              <RevixIcon name="network" size={15} />
            </div>
          </div>
          <div className="mt-2 text-[24px] font-bold tabular-nums text-revix-dark">
            {partners?.length || 0}
          </div>
          <p className="mt-0.5 text-[11.5px] text-revix-secondary">
            {isRtl ? "شركات محلية نشطة بالشبكة" : "Active local partner firms"}
          </p>
        </div>

        {/* Stat 2 */}
        <div className="rounded-[8px] border border-revix-border bg-revix-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all hover:border-sky-300">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-revix-secondary uppercase tracking-wider">
              {isRtl ? "الفروع المشاركة" : "Shared Branches"}
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-sky-200/80 bg-sky-50 text-sky-700">
              <RevixIcon name="globe-2" size={15} />
            </div>
          </div>
          <div className="mt-2 text-[24px] font-bold tabular-nums text-revix-dark">
            {totalSharedBranches}
          </div>
          <p className="mt-0.5 text-[11.5px] text-revix-secondary">
            {isRtl ? "فروع محلية متاحة للمعاينة" : "Branches visible across network"}
          </p>
        </div>

        {/* Stat 3 */}
        <div className="rounded-[8px] border border-revix-border bg-revix-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all hover:border-amber-300">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-revix-secondary uppercase tracking-wider">
              {isRtl ? "الدعوات المعلقة" : "Pending Invites"}
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-amber-200/80 bg-amber-50 text-amber-700">
              <RevixIcon name="clock" size={15} />
            </div>
          </div>
          <div className="mt-2 text-[24px] font-bold tabular-nums text-revix-dark">
            {overview?.pendingInvitations?.length || 0}
          </div>
          <p className="mt-0.5 text-[11.5px] text-revix-secondary">
            {isRtl ? "بانتظار قبول الشركاء" : "Awaiting partner acceptance"}
          </p>
        </div>

        {/* Stat 4 - View-Only Protection */}
        <div className="rounded-[8px] border border-emerald-200/80 bg-emerald-50/50 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-emerald-800 uppercase tracking-wider">
              {isRtl ? "عزل الصلاحيات" : "Access Isolation"}
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-emerald-100 text-emerald-700">
              <RevixIcon name="shield-check" size={15} />
            </div>
          </div>
          <div className="mt-2 text-[15px] font-bold text-emerald-900">
            {isRtl ? "عرض فقط (View-Only)" : "Strict View-Only"}
          </div>
          <p className="mt-0.5 text-[11.5px] text-emerald-700">
            {isRtl
              ? "محمي برمجياً: يمنع أي تعديل على بيانات الشركاء"
              : "Engineered guard: all writes are 403 Forbidden"}
          </p>
        </div>
      </div>
      )}

      {/* VIEW AS LOCAL PARTNER: Shows Parent Company Card */}
      {isLocalPartner && overview?.parentLinks && overview.parentLinks.length > 0 && (
        <div className="rounded-[10px] border border-blue-200 bg-blue-50/40 p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 shrink-0 rounded-[8px] bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
              <RevixIcon name="network" size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-[14px] text-revix-dark">
                {isRtl ? "الشركة الرئيسية المرتبطة" : "Connected Network HQ"}
              </h3>
              <p className="text-[12px] text-revix-secondary">
                {isRtl
                  ? "ترى الشركة الرئيسية فروعك ودولك وسياراتك (عرض فقط)، بينما تظل فروعك وموظفيك مستقلين تمامًا ولا علاقة لك بفروع الشركة الرئيسية."
                  : "HQ has View-Only visibility over your branches, countries, and fleet, while your branches and team remain completely independent."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-blue-100">
            {overview.parentLinks.map((parent) => (
              <div
                key={parent.linkId}
                className="bg-revix-white rounded-[8px] border border-blue-100 p-3.5 text-[12.5px] space-y-2.5 shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[6px] border border-revix-border bg-white">
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
                        style={{ backgroundColor: parent.mainCompany.brandColor || "#2563EB" }}
                      >
                        {parent.mainCompany.name.substring(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-revix-dark truncate">
                      {parent.mainCompany.name}
                    </div>
                    <div className="text-[11.5px] text-revix-secondary truncate">
                      {parent.mainCompany.city}, {parent.mainCompany.countryCode}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-blue-50 flex items-center justify-between text-[11.5px]">
                  <span className="text-revix-secondary">
                    {isRtl ? "فروعك ودولك المرئية:" : "Your visible coverage:"}
                  </span>
                  <span className="font-semibold text-blue-700">
                    {currentBranches.length} {isRtl ? "فرع" : "branch(es)"} · {localCountriesCount} {isRtl ? "دولة" : "country(s)"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN COMPANY: Partners Directory & Pending Invites */}
      {isMainCompany && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <RevixIcon
                name="search"
                size={14}
                className={`absolute top-2.5 text-revix-disabled ${
                  isRtl ? "right-3" : "left-3"
                }`}
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
                    ? "البحث في الشركات الشريكة بالاسم، المدينة، الدولة..."
                    : "Search partners by name, city, country..."
                }
                className={`w-full h-9 rounded-[6px] border border-revix-border bg-revix-white text-[12px] text-revix-dark placeholder:text-revix-secondary/70 focus:border-revix-primary focus:outline-none transition-all ${
                  isRtl ? "pr-9 pl-3 text-right" : "pl-9 pr-3 text-left"
                }`}
              />
            </div>
            <div className="text-[12px] text-revix-secondary">
              {isRtl
                ? `عرض ${connectedPartners.length} من أصل ${
                    partners?.length || 0
                  } شركة`
                : `Showing ${connectedPartners.length} of ${
                    partners?.length || 0
                  } partners`}
            </div>
          </div>

          {/* Connected Partners Cards Grid */}
          {connectedPartners.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-revix-border bg-revix-white p-8 sm:p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-revix-primary">
                <RevixIcon name="network" size={22} />
              </div>
              <h3 className="mt-3 text-[14px] font-semibold text-revix-dark">
                {isRtl ? "لا توجد شركات محلية مرتبطة حالياً" : "No connected partners yet"}
              </h3>
              <p className="mt-1 text-[12px] text-revix-secondary max-w-sm mx-auto">
                {isRtl
                  ? "ابدأ بتوسيع شبكتك عبر دعوة شركات تأجير محلية في دول ومدن مختلفة للربط مع نظامك الرئيسي."
                  : "Start expanding your network by inviting local car rental companies to link with your HQ."}
              </p>
              <button
                type="button"
                onClick={handleOpenInviteModal}
                className="mt-4 inline-flex h-[34px] cursor-pointer items-center gap-1.5 rounded-[6px] border border-revix-primary bg-revix-primary px-3.5 text-[12.5px] font-semibold text-revix-white shadow-sm hover:bg-revix-primary-hover active:scale-[0.98] transition-all"
              >
                <RevixIcon name="plus" size={14} />
                <span>{isRtl ? "إرسال أول دعوة شراكة" : "Send First Partner Invite"}</span>
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedPartners.map((partner) => {
                const isActive = partner.status === "active";
                return (
                  <div
                    key={partner.linkId}
                    className="flex flex-col justify-between rounded-[8px] border border-revix-border bg-revix-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-revix-primary/40 transition-all"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="h-9 w-9 rounded-[7px] flex items-center justify-center font-bold text-white text-[13px] shadow-xs"
                            style={{ backgroundColor: partner.brandColor || "#059669" }}
                          >
                            {partner.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-[13.5px] text-revix-dark line-clamp-1">
                              {partner.name}
                            </h3>
                            <p className="text-[11.5px] text-revix-secondary line-clamp-1">
                              {partner.legalName}
                            </p>
                          </div>
                        </div>

                        {/* Status badge */}
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold border ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
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
                      </div>

                      {/* Partner Details */}
                      <div className="mt-3.5 space-y-1.5 border-t border-revix-border/70 pt-3 text-[12px]">
                        <div className="flex items-center justify-between text-revix-secondary">
                          <span>{isRtl ? "الموقع والعملة:" : "Location & Currency:"}</span>
                          <span className="font-medium text-revix-dark">
                            {partner.city}, {partner.countryCode} ({partner.baseCurrency})
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-revix-secondary">
                          <span>{isRtl ? "البريد الإلكتروني:" : "Email:"}</span>
                          <span className="font-medium text-revix-dark truncate max-w-[170px]">
                            {partner.email}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-revix-secondary">
                          <span>{isRtl ? "الهاتف:" : "Phone:"}</span>
                          <span className="font-medium text-revix-dark font-mono text-[11.5px]" dir="ltr">
                            {partner.phone}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-revix-secondary">
                          <span>{isRtl ? "الفروع والدول:" : "Branches & Countries:"}</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                            <RevixIcon name="building-2" size={13} />
                            {partner.permittedBranches.length} {isRtl ? "فرع" : "branch(es)"} ·{" "}
                            {new Set(partner.permittedBranches.map((b) => b.countryCode)).size ||
                              (partner.countryCode ? 1 : 0)}{" "}
                            {isRtl ? "دولة" : "country(s)"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="mt-4 pt-3 border-t border-revix-border/70 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPartnerForBranches(partner)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-[5px] border border-revix-border bg-revix-white px-2.5 py-1 text-[11.5px] font-medium text-revix-dark hover:border-revix-primary/40 hover:bg-revix-surface transition-all"
                      >
                        <RevixIcon name="eye" size={13} className="text-revix-secondary" />
                        <span>{isRtl ? "فروع الشريك" : "View Branches"}</span>
                      </button>

                      <div className="flex items-center gap-1.5">
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
                            className="inline-flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-[5px] border border-revix-border bg-revix-white text-revix-secondary hover:bg-revix-surface transition-all disabled:opacity-50"
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
                            className="inline-flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-[5px] border border-red-200 bg-revix-white text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                          >
                            <RevixIcon name="trash-2" size={14} />
                          </button>
                        </StudioTooltip>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Unified Pagination */}
            <div className="overflow-hidden rounded-[8px] border border-revix-border bg-revix-white">
              <RevixPagination
                currentPage={page}
                totalItems={connectedPartners.length}
                pageSize={pageSize}
                onPageChange={setPage}
                lang={isRtl ? "ar" : "en"}
                itemLabel={isRtl ? "شركة شريكة" : "partner companies"}
              />
            </div>
          </>
        )}

          {/* Pending Invitations Table */}
          {overview?.pendingInvitations && overview.pendingInvitations.length > 0 && (
            <div className="rounded-[8px] border border-revix-border bg-revix-white p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-[13.5px] text-revix-dark">
                    {isRtl ? "دعوات الشراكة المعلقة" : "Pending Network Invitations"}
                  </h3>
                  <p className="text-[11.5px] text-revix-secondary">
                    {isRtl
                      ? "الدعوات المرسلة إلى مسؤولي الشركات الشريكة التي لم يتم تفعيلها بعد."
                      : "Invitations sent to local company owners pending acceptance."}
                  </p>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                  {overview.pendingInvitations.length} {isRtl ? "معلقة" : "Pending"}
                </span>
              </div>

              <div className="overflow-x-auto">
                <DataTable className="w-full text-[12px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-revix-border bg-revix-surface/70 text-revix-secondary font-semibold">
                      <th className={`py-2 px-3 ${isRtl ? "text-right" : "text-left"}`}>
                        {isRtl ? "اسم الشركة الشريكة" : "Company Name"}
                      </th>
                      <th className={`py-2 px-3 ${isRtl ? "text-right" : "text-left"}`}>
                        {isRtl ? "الشخص المسؤول" : "Contact Person"}
                      </th>
                      <th className={`py-2 px-3 ${isRtl ? "text-right" : "text-left"}`}>
                        {isRtl ? "البريد الإلكتروني" : "Invitee Email"}
                      </th>
                      <th className={`py-2 px-3 ${isRtl ? "text-right" : "text-left"}`}>
                        {isRtl ? "تاريخ الصلاحية" : "Expires At"}
                      </th>
                      <th className="py-2 px-3 text-center">{isRtl ? "الحالة" : "Status"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-revix-border/70">
                    {overview.pendingInvitations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-revix-surface/40">
                        <td className="py-2.5 px-3 font-semibold text-revix-dark">
                          <div className="flex items-center gap-2">
                            {inv.logoUrl ? (
                              <NextImage unoptimized width={640} height={480}
                                src={inv.logoUrl}
                                alt={inv.localCompanyName}
                                className="h-7 w-7 rounded-[4px] border border-revix-border object-contain bg-white shrink-0"
                              />
                            ) : null}
                            <span>{inv.localCompanyName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-revix-secondary">
                          {inv.contactName || inv.contactPhone ? (
                            <div className="space-y-0.5">
                              {inv.contactName ? (
                                <p className="font-medium text-revix-dark">{inv.contactName}</p>
                              ) : null}
                              {inv.contactPhone ? (
                                <p className="font-mono text-[11px]" dir="ltr">{inv.contactPhone}</p>
                              ) : null}
                            </div>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-revix-secondary font-mono text-[11.5px]">{inv.inviteeEmail}</td>
                        <td className="py-2.5 px-3 text-revix-secondary">
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700">
                            {isRtl ? "في الانتظار" : "Pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
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
