"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormInput, FormSelect } from "@/components/ui/FormField";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { StudioBadge, StudioModal } from "@/components/shared/workspace";
import { RevixPagination } from "@/components/ui/RevixPagination";
import { extractApiErrorCode } from "@/store/api/baseApi";
import {
  useCreateInvitationMutation,
  useGetTeamOverviewQuery,
  useRevokeInvitationMutation,
  useUpdateMemberMutation,
  type MembershipStatus,
  type TeamMemberDto,
} from "@/store/api/teamApi";
import type { WorkspaceMembershipDto } from "@/store/api/workspaceApi";

export interface TeamMembersPanelProps {
  isRtl: boolean;
  membership: WorkspaceMembershipDto | null;
}

export function TeamMembersPanel({ isRtl, membership }: TeamMembersPanelProps) {
  const { data, isLoading, isFetching, error, refetch } =
    useGetTeamOverviewQuery();
  const [createInvitation, { isLoading: isInviting }] =
    useCreateInvitationMutation();
  const [revokeInvitation, { isLoading: isRevoking }] =
    useRevokeInvitationMutation();
  const [updateMember, { isLoading: isUpdatingMember }] =
    useUpdateMemberMutation();

  const roles = useMemo(() => data?.data.roles ?? [], [data?.data.roles]);
  const members = useMemo(() => data?.data.members ?? [], [data?.data.members]);
  const invitations = useMemo(
    () => data?.data.invitations ?? [],
    [data?.data.invitations],
  );
  const branches = useMemo(
    () => data?.data.branches ?? [],
    [data?.data.branches],
  );

  const branchById = useMemo(
    () => new Map(branches.map((b) => [b.id, b])),
    [branches],
  );

  const invitableRoles = useMemo(
    () => roles.filter((r) => r.code !== "owner"),
    [roles],
  );

  const canInvite =
    !membership ||
    Boolean(membership.permissions.team?.includes("invite"));
  const canManageMembers =
    !membership ||
    Boolean(membership.permissions.team?.includes("manage_members"));

  const [searchQuery, setSearchQuery] = useState("");
  const [memberPage, setMemberPage] = useState(1);
  const pageSize = 8;
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMemberDto | null>(
    null,
  );

  // Invite modal state
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [inviteBranchIds, setInviteBranchIds] = useState<string[]>([]);
  const [inviteError, setInviteError] = useState<string | undefined>();
  const [latestInviteLink, setLatestInviteLink] = useState<
    { email: string; url: string } | undefined
  >();
  const [copiedLink, setCopiedLink] = useState(false);

  // Edit member modal state
  const [editRoleId, setEditRoleId] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState<MembershipStatus>("active");
  const [editBranchIds, setEditBranchIds] = useState<string[]>([]);
  const [editError, setEditError] = useState<string | undefined>();

  const selectedInviteRole = useMemo(
    () => invitableRoles.find((r) => r.id === inviteRoleId) ?? invitableRoles[0],
    [invitableRoles, inviteRoleId],
  );

  const selectedEditRole = useMemo(
    () => invitableRoles.find((r) => r.id === editRoleId) ?? invitableRoles[0],
    [invitableRoles, editRoleId],
  );

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.roleNameEn.toLowerCase().includes(q) ||
        m.roleNameAr.toLowerCase().includes(q),
    );
  }, [members, searchQuery]);

  const paginatedMembers = useMemo(() => {
    const start = (memberPage - 1) * pageSize;
    return filteredMembers.slice(start, start + pageSize);
  }, [filteredMembers, memberPage, pageSize]);

  const pendingInvitations = useMemo(
    () => invitations.filter((inv) => inv.status === "pending"),
    [invitations],
  );

  function openInviteModal() {
    setInviteName("");
    setInviteEmail("");
    setInvitePhone("");
    const defaultRole = invitableRoles[0];
    setInviteRoleId(defaultRole?.id ?? "");
    setInviteBranchIds(
      defaultRole?.scopeType === "assigned_branches" && branches[0]
        ? [branches[0].id]
        : [],
    );
    setInviteError(undefined);
    setIsInviteOpen(true);
  }

  function openEditModal(member: TeamMemberDto) {
    setEditingMember(member);
    setEditRoleId(member.roleId);
    setEditPhone(member.phone);
    setEditStatus(member.status);
    setEditBranchIds([...member.branchIds]);
    setEditError(undefined);
  }

  function toggleBranchSelection(
    current: string[],
    branchId: string,
    setter: (next: string[]) => void,
  ) {
    if (current.includes(branchId)) {
      setter(current.filter((id) => id !== branchId));
    } else {
      setter([...current, branchId]);
    }
  }

  async function handleInviteSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setInviteError(undefined);

    const roleId = selectedInviteRole?.id;
    if (!roleId) return;

    const needsBranches = selectedInviteRole.scopeType === "assigned_branches";
    if (needsBranches && inviteBranchIds.length === 0) {
      setInviteError(
        isRtl
          ? "يرجى اختيار فرع واحد على الأقل لهذا الدور."
          : "Please assign at least one branch for this role.",
      );
      return;
    }

    try {
      const res = await createInvitation({
        fullName: inviteName.trim(),
        email: inviteEmail.trim(),
        phone: invitePhone.trim(),
        roleId,
        branchIds: needsBranches ? inviteBranchIds : [],
        locale: isRtl ? "ar" : "en",
      }).unwrap();

      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      setLatestInviteLink({
        email: res.data.invitation.email,
        url: `${origin}${res.data.invitePath}`,
      });
      setCopiedLink(false);
      setIsInviteOpen(false);
    } catch (err) {
      const code = extractApiErrorCode(err);
      if (code === "EMAIL_ALREADY_IN_COMPANY") {
        setInviteError(
          isRtl
            ? "هذا البريد الإلكتروني مسجل بالفعل في شركة أخرى على النظام (إيميل واحد = شركة واحدة فقط)."
            : "This email already belongs to a company on Revix System (1 company per email).",
        );
      } else if (code === "INVALID_BRANCH_SCOPE") {
        setInviteError(
          isRtl
            ? "يرجى اختيار فرع صحيح تابع لشركتك."
            : "Please select valid branches belonging to your company.",
        );
      } else {
        setInviteError(
          isRtl
            ? "تعذّر إرسال الدعوة. يرجى مراجعة البيانات والمحاولة مرة أخرى."
            : "Unable to create invitation. Please check details and try again.",
        );
      }
    }
  }

  async function handleEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingMember || !selectedEditRole) return;
    setEditError(undefined);

    const needsBranches = selectedEditRole.scopeType === "assigned_branches";
    if (needsBranches && editBranchIds.length === 0) {
      setEditError(
        isRtl
          ? "يرجى اختيار فرع واحد على الأقل لهذا الدور."
          : "Please assign at least one branch for this role.",
      );
      return;
    }

    try {
      await updateMember({
        membershipId: editingMember.id,
        roleId: selectedEditRole.id,
        phone: editPhone.trim(),
        status: editStatus,
        branchIds: needsBranches ? editBranchIds : [],
      }).unwrap();
      setEditingMember(null);
    } catch {
      setEditError(
        isRtl
          ? "تعذّر تحديث بيانات الموظف."
          : "Unable to update team member.",
      );
    }
  }

  async function handleCopyInviteLink() {
    if (!latestInviteLink) return;
    try {
      await navigator.clipboard.writeText(latestInviteLink.url);
      setCopiedLink(true);
    } catch {
      setCopiedLink(false);
    }
  }

  if (error) {
    const code = extractApiErrorCode(error);
    return (
      <div className="max-w-[720px]">
        <Alert
          variant="error"
          title={isRtl ? "صلاحيات غير كافية" : "Access restricted"}
          message={
            code === "FORBIDDEN"
              ? isRtl
                ? "دورك الحالي لا يملك صلاحية استعراض فريق العمل."
                : "Your current role does not have permission to view team members."
              : isRtl
                ? "تعذّر تحميل بيانات الفريق. يرجى المحاولة مرة أخرى."
                : "Unable to load team overview. Please try again."
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.015em] text-revix-dark">
            {isRtl ? "الموظفون والدعوات" : "Employees & Invitations"}
          </h1>
          <p className="mt-0.5 text-[13px] text-revix-secondary">
            {isRtl
              ? "إدارة أعضاء فريق شركتك بدور واحد لكل موظف ونطاق فروع محدد، مع تطبيق قاعدة شركة واحدة لكل بريد إلكتروني."
              : "Manage your company team with one role per employee, scoped branch access, and strict single-company email isolation."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex h-[34px] cursor-pointer items-center gap-1.5 rounded-[6px] border border-revix-border bg-revix-white px-3 text-[12.5px] font-medium text-revix-secondary transition-colors hover:bg-revix-surface hover:text-revix-dark disabled:opacity-60"
          >
            <RevixIcon name="refresh-cw" size={14} />
            <span>{isRtl ? "تحديث" : "Refresh"}</span>
          </button>

          {canInvite ? (
            <Button
              type="button"
              className="!min-h-[34px] !px-3 !py-1.5 text-[12.5px]"
              onClick={openInviteModal}
            >
              <RevixIcon name="plus" size={14} />
              <span>{isRtl ? "دعوة موظف" : "Invite employee"}</span>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Latest Invite Link Banner */}
      {latestInviteLink ? (
        <div className="rounded-[8px] border border-emerald-200 bg-revix-tint p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-revix-primary">
                {isRtl
                  ? `تم إنشاء دعوة الموظف (${latestInviteLink.email})`
                  : `Employee invitation created for ${latestInviteLink.email}`}
              </p>
              <p className="mt-0.5 text-[12px] text-revix-secondary">
                {isRtl
                  ? "انسخ رابط الدعوة لمرة واحدة وأرسله للموظف لتعيين كلمة المرور والانضمام فورًا (صالح لمدة 72 ساعة):"
                  : "Copy this single-use invite link and share it with the employee to set their password (valid for 72 hours):"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLatestInviteLink(undefined)}
              aria-label={isRtl ? "إغلاق" : "Dismiss"}
              className="cursor-pointer rounded p-1 text-revix-secondary hover:bg-revix-white"
            >
              <RevixIcon name="x" size={15} />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="text"
              readOnly
              dir="ltr"
              value={latestInviteLink.url}
              className="h-[36px] min-w-[260px] flex-1 rounded-[6px] border border-emerald-200 bg-revix-white px-3 font-mono text-[12px] text-revix-dark focus:outline-none"
            />
            <Button
              type="button"
              className="!min-h-[36px] !px-3.5 !py-1.5 text-[12.5px]"
              onClick={handleCopyInviteLink}
            >
              {copiedLink
                ? isRtl
                  ? "تم النسخ ✓"
                  : "Copied ✓"
                : isRtl
                  ? "نسخ الرابط"
                  : "Copy invite link"}
            </Button>
          </div>
        </div>
      ) : null}

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-[8px] border border-revix-border bg-revix-white p-4">
          <p className="text-[12px] font-medium text-revix-secondary">
            {isRtl ? "الموظفون النشطون" : "Active members"}
          </p>
          <p className="mt-1 text-[22px] font-bold text-revix-dark">
            {members.filter((m) => m.status === "active").length}
          </p>
        </div>
        <div className="rounded-[8px] border border-revix-border bg-revix-white p-4">
          <p className="text-[12px] font-medium text-revix-secondary">
            {isRtl ? "دعوات قيد الانتظار" : "Pending invitations"}
          </p>
          <p className="mt-1 text-[22px] font-bold text-revix-dark">
            {pendingInvitations.length}
          </p>
        </div>
        <div className="rounded-[8px] border border-revix-border bg-revix-white p-4">
          <p className="text-[12px] font-medium text-revix-secondary">
            {isRtl ? "الأدوار المهيأة" : "Configured roles"}
          </p>
          <p className="mt-1 text-[22px] font-bold text-revix-dark">
            {roles.length}
          </p>
        </div>
      </div>

      {/* Employees Table */}
      <section className="rounded-[8px] border border-revix-border bg-revix-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-revix-border px-4 py-3">
          <h2 className="text-[14px] font-semibold text-revix-dark">
            {isRtl ? "أعضاء الفريق" : "Team directory"}
          </h2>
          <div className="relative w-full sm:w-[260px]">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setMemberPage(1);
              }}
              placeholder={
                isRtl ? "بحث بالاسم أو البريد أو الدور..." : "Search name, email, or role..."
              }
              className="h-[34px] w-full rounded-[6px] border border-revix-border bg-revix-surface px-3 text-[12.5px] text-revix-dark placeholder:text-revix-disabled focus:border-revix-primary focus:bg-revix-white focus:outline-none"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-[13px] text-revix-secondary">
            {isRtl ? "جاري تحميل أعضاء الفريق..." : "Loading team directory..."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-[13px]">
              <thead>
                <tr className="border-b border-revix-border bg-revix-surface text-[11.5px] font-semibold uppercase tracking-wide text-revix-secondary">
                  <th className="px-4 py-2.5 text-start">
                    {isRtl ? "الموظف" : "Employee"}
                  </th>
                  <th className="px-4 py-2.5 text-start">
                    {isRtl ? "الدور" : "Role"}
                  </th>
                  <th className="px-4 py-2.5 text-start">
                    {isRtl ? "نطاق الفروع" : "Branch scope"}
                  </th>
                  <th className="px-4 py-2.5 text-start">
                    {isRtl ? "الحالة" : "Status"}
                  </th>
                  {canManageMembers ? (
                    <th className="px-4 py-2.5 text-end">
                      {isRtl ? "إدارة" : "Actions"}
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-revix-border">
                {paginatedMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="transition-colors hover:bg-revix-surface/60"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-revix-dark">
                        {member.fullName}
                      </div>
                      <div dir="ltr" className="text-[12px] text-revix-secondary">
                        {member.email}
                      </div>
                      {member.phone ? (
                        <div dir="ltr" className="text-[11.5px] text-revix-disabled">
                          {member.phone}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <StudioBadge
                        variant={member.isOwner ? "primary" : "neutral"}
                      >
                        {isRtl ? member.roleNameAr : member.roleNameEn}
                      </StudioBadge>
                    </td>
                    <td className="px-4 py-3">
                      {member.scopeType === "company_wide" ? (
                        <StudioBadge variant="success">
                          {isRtl ? "جميع فروع الشركة" : "All company branches"}
                        </StudioBadge>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {member.branchIds.map((id) => {
                            const branch = branchById.get(id);
                            return (
                              <StudioBadge key={id} variant="amber">
                                {branch
                                  ? `${branch.name} (${branch.code})`
                                  : id.slice(0, 8)}
                              </StudioBadge>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StudioBadge
                        variant={
                          member.status === "active" ? "success" : "neutral"
                        }
                      >
                        {member.status === "active"
                          ? isRtl
                            ? "نشط"
                            : "Active"
                          : isRtl
                            ? "موقوف"
                            : "Suspended"}
                      </StudioBadge>
                    </td>
                    {canManageMembers ? (
                      <td className="px-4 py-3 text-end">
                        {member.isOwner ? (
                          <span className="text-[12px] text-revix-disabled">
                            {isRtl ? "مالك الشركة" : "Owner"}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEditModal(member)}
                            className="inline-flex h-[30px] cursor-pointer items-center gap-1 rounded-[6px] border border-revix-border px-2.5 text-[12px] font-medium text-revix-dark transition-colors hover:border-revix-primary hover:bg-revix-tint hover:text-revix-primary"
                          >
                            <RevixIcon name="settings" size={12} />
                            <span>{isRtl ? "تعديل" : "Edit"}</span>
                          </button>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Unified Pagination */}
        <RevixPagination
          currentPage={memberPage}
          totalItems={filteredMembers.length}
          pageSize={pageSize}
          onPageChange={setMemberPage}
          lang={isRtl ? "ar" : "en"}
          itemLabel={isRtl ? "موظف" : "employees"}
        />
      </section>

      {/* Invitations History */}
      <section className="rounded-[8px] border border-revix-border bg-revix-white">
        <div className="border-b border-revix-border px-4 py-3">
          <h2 className="text-[14px] font-semibold text-revix-dark">
            {isRtl ? "الدعوات المرسلة" : "Employee invitations"}
          </h2>
        </div>

        {invitations.length === 0 ? (
          <div className="p-6 text-center text-[13px] text-revix-secondary">
            {isRtl
              ? "لا توجد دعوات موظفين بعد. اضغط «دعوة موظف» لإضافة أول عضو في فريقك."
              : "No invitations yet. Click “Invite employee” to onboard your first team member."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-[13px]">
              <thead>
                <tr className="border-b border-revix-border bg-revix-surface text-[11.5px] font-semibold uppercase tracking-wide text-revix-secondary">
                  <th className="px-4 py-2.5 text-start">
                    {isRtl ? "المدعو" : "Invitee"}
                  </th>
                  <th className="px-4 py-2.5 text-start">
                    {isRtl ? "الدور والنطاق" : "Role & scope"}
                  </th>
                  <th className="px-4 py-2.5 text-start">
                    {isRtl ? "الحالة" : "Status"}
                  </th>
                  {canInvite ? (
                    <th className="px-4 py-2.5 text-end">
                      {isRtl ? "إجراء" : "Action"}
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-revix-border">
                {invitations.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-revix-dark">
                        {inv.fullName}
                      </div>
                      <div dir="ltr" className="text-[12px] text-revix-secondary">
                        {inv.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StudioBadge variant="neutral">
                          {isRtl ? inv.roleNameAr : inv.roleNameEn}
                        </StudioBadge>
                        {inv.scopeType === "company_wide" ? (
                          <span className="text-[11.5px] text-revix-secondary">
                            {isRtl ? "كل الفروع" : "All branches"}
                          </span>
                        ) : (
                          inv.branchIds.map((id) => {
                            const branch = branchById.get(id);
                            return (
                              <StudioBadge key={id} variant="amber">
                                {branch ? branch.code : id.slice(0, 6)}
                              </StudioBadge>
                            );
                          })
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StudioBadge
                        variant={
                          inv.status === "accepted"
                            ? "success"
                            : inv.status === "pending"
                              ? "amber"
                              : "neutral"
                        }
                      >
                        {inv.status === "pending"
                          ? isRtl
                            ? "قيد الانتظار"
                            : "Pending"
                          : inv.status === "accepted"
                            ? isRtl
                              ? "تم القبول"
                              : "Accepted"
                            : inv.status === "revoked"
                              ? isRtl
                                ? "ملغاة"
                                : "Revoked"
                              : isRtl
                                ? "منتهية"
                                : "Expired"}
                      </StudioBadge>
                    </td>
                    {canInvite ? (
                      <td className="px-4 py-3 text-end">
                        {inv.status === "pending" ? (
                          <button
                            type="button"
                            disabled={isRevoking}
                            onClick={() => void revokeInvitation(inv.id)}
                            className="inline-flex h-[30px] cursor-pointer items-center rounded-[6px] border border-red-200 px-2.5 text-[12px] font-medium text-revix-error transition-colors hover:bg-red-50 disabled:opacity-60"
                          >
                            {isRtl ? "إلغاء الدعوة" : "Revoke"}
                          </button>
                        ) : (
                          <span className="text-[12px] text-revix-disabled">
                            —
                          </span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Invite Employee Modal */}
      <StudioModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title={isRtl ? "دعوة موظف جديد" : "Invite new employee"}
        subtitle={
          isRtl
            ? "سيحصل الموظف على رابط دعوة خاص لتعيين كلمة المرور والانضمام لشركتك."
            : "The employee will receive a single-use invite link to set their password and join your workspace."
        }
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          {inviteError ? (
            <Alert
              variant="error"
              title={isRtl ? "تعذّر إرسال الدعوة" : "Invitation failed"}
              message={inviteError}
              onClose={() => setInviteError(undefined)}
            />
          ) : null}

          <FormInput
            label={isRtl ? "الاسم الكامل" : "Full name"}
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            placeholder={isRtl ? "مثال: أحمد منصور" : "e.g., Ahmed Mansour"}
            required
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label={isRtl ? "البريد الإلكتروني" : "Work email"}
              type="email"
              dir="ltr"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="employee@company.com"
              required
            />
            <FormInput
              label={isRtl ? "رقم الهاتف (اختياري)" : "Phone (optional)"}
              dir="ltr"
              value={invitePhone}
              onChange={(e) => setInvitePhone(e.target.value)}
              placeholder="+966 50 000 0000"
            />
          </div>

          <FormSelect
            isRtl={isRtl}
            label={isRtl ? "الدور الوظيفي (دور واحد)" : "Role (single role)"}
            value={selectedInviteRole?.id ?? ""}
            onChange={(e) => {
              const nextId = e.target.value;
              setInviteRoleId(nextId);
              const nextRole = invitableRoles.find((r) => r.id === nextId);
              if (nextRole?.scopeType === "company_wide") {
                setInviteBranchIds([]);
              } else if (inviteBranchIds.length === 0 && branches[0]) {
                setInviteBranchIds([branches[0].id]);
              }
            }}
            helperText={
              selectedInviteRole
                ? isRtl
                  ? selectedInviteRole.descriptionAr
                  : selectedInviteRole.descriptionEn
                : undefined
            }
            options={invitableRoles.map((role) => ({
              value: role.id,
              label: `${isRtl ? role.nameAr : role.nameEn} · ${
                role.scopeType === "company_wide"
                  ? isRtl
                    ? "جميع الفروع"
                    : "Company-wide"
                  : isRtl
                    ? "فروع محددة"
                    : "Assigned branches"
              }`,
            }))}
          />

          {selectedInviteRole?.scopeType === "assigned_branches" ? (
            <div className="space-y-2 rounded-[8px] border border-revix-border bg-revix-surface p-3.5">
              <p className="text-[13px] font-semibold text-revix-dark">
                {isRtl ? "الفروع المسموحة للموظف" : "Permitted branches"}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {branches.map((branch) => {
                  const checked = inviteBranchIds.includes(branch.id);
                  return (
                    <label
                      key={branch.id}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-[6px] border px-3 py-2 text-[12.5px] transition-colors ${
                        checked
                          ? "border-revix-primary bg-revix-tint text-revix-dark"
                          : "border-revix-border bg-revix-white text-revix-secondary"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          toggleBranchSelection(
                            inviteBranchIds,
                            branch.id,
                            setInviteBranchIds,
                          )
                        }
                        className="h-4 w-4 accent-revix-primary"
                      />
                      <span className="truncate font-medium">
                        {branch.name} ({branch.code})
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-revix-border pt-4">
            <Button
              type="button"
              variant="secondary"
              className="!min-h-[36px] !px-3.5 !py-1.5 text-[13px]"
              onClick={() => setIsInviteOpen(false)}
            >
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              type="submit"
              className="!min-h-[36px] !px-3.5 !py-1.5 text-[13px]"
              isLoading={isInviting}
            >
              {isRtl ? "إنشاء الدعوة" : "Create invitation"}
            </Button>
          </div>
        </form>
      </StudioModal>

      {/* Edit Member Modal */}
      <StudioModal
        isOpen={Boolean(editingMember)}
        onClose={() => setEditingMember(null)}
        title={
          editingMember
            ? isRtl
              ? `تعديل صلاحيات ${editingMember.fullName}`
              : `Edit ${editingMember.fullName}`
            : ""
        }
        subtitle={
          isRtl
            ? "تحديث الدور الوظيفي أو الفروع المسموحة أو إيقاف الوصول (يُنهي الجلسات النشطة فورًا)."
            : "Update role, branch scope, or suspend access (immediately revokes active sessions)."
        }
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editError ? (
            <Alert
              variant="error"
              title={isRtl ? "خطأ في التحديث" : "Update failed"}
              message={editError}
              onClose={() => setEditError(undefined)}
            />
          ) : null}

          <FormInput
            label={isRtl ? "رقم الهاتف" : "Phone"}
            dir="ltr"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormSelect
              isRtl={isRtl}
              label={isRtl ? "الدور" : "Role"}
              value={selectedEditRole?.id ?? ""}
              onChange={(e) => {
                const nextId = e.target.value;
                setEditRoleId(nextId);
                const nextRole = invitableRoles.find((r) => r.id === nextId);
                if (nextRole?.scopeType === "company_wide") {
                  setEditBranchIds([]);
                } else if (editBranchIds.length === 0 && branches[0]) {
                  setEditBranchIds([branches[0].id]);
                }
              }}
              options={invitableRoles.map((role) => ({
                value: role.id,
                label: isRtl ? role.nameAr : role.nameEn,
              }))}
            />

            <FormSelect
              isRtl={isRtl}
              label={isRtl ? "حالة الحساب" : "Account status"}
              value={editStatus}
              onChange={(e) =>
                setEditStatus(e.target.value as MembershipStatus)
              }
              options={[
                { value: "active", label: isRtl ? "نشط" : "Active" },
                {
                  value: "suspended",
                  label: isRtl
                    ? "موقوف (إلغاء الدخول)"
                    : "Suspended (revoke access)",
                },
              ]}
            />
          </div>

          {selectedEditRole?.scopeType === "assigned_branches" ? (
            <div className="space-y-2 rounded-[8px] border border-revix-border bg-revix-surface p-3.5">
              <p className="text-[13px] font-semibold text-revix-dark">
                {isRtl ? "الفروع المسموحة" : "Permitted branches"}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {branches.map((branch) => {
                  const checked = editBranchIds.includes(branch.id);
                  return (
                    <label
                      key={branch.id}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-[6px] border px-3 py-2 text-[12.5px] transition-colors ${
                        checked
                          ? "border-revix-primary bg-revix-tint text-revix-dark"
                          : "border-revix-border bg-revix-white text-revix-secondary"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          toggleBranchSelection(
                            editBranchIds,
                            branch.id,
                            setEditBranchIds,
                          )
                        }
                        className="h-4 w-4 accent-revix-primary"
                      />
                      <span className="truncate font-medium">
                        {branch.name} ({branch.code})
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-revix-border pt-4">
            <Button
              type="button"
              variant="secondary"
              className="!min-h-[36px] !px-3.5 !py-1.5 text-[13px]"
              onClick={() => setEditingMember(null)}
            >
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              type="submit"
              className="!min-h-[36px] !px-3.5 !py-1.5 text-[13px]"
              isLoading={isUpdatingMember}
            >
              {isRtl ? "حفظ التغييرات" : "Save changes"}
            </Button>
          </div>
        </form>
      </StudioModal>
    </div>
  );
}
