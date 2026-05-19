import { useEffect, useMemo, useRef, useState } from "react";

function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleString();
}

function getStatusBadgeClass(status) {
  if (status === "active") return "bg-emerald-100 text-emerald-700";
  if (status === "pending") return "bg-amber-100 text-amber-700";
  if (status === "suspended") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

function toCsvCell(value) {
  const normalized = String(value ?? "").replace(/"/g, '""');
  return `"${normalized}"`;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(toCsvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function SuperAdminInstituteWorkspace({
  approvalMutation,
  instituteDetailQuery,
  institutesQuery,
  onSelectInstitute,
  resendInviteMutation,
  selectedInstituteId,
  hierarchyForm,
  subscriptionForm,
  suspendMutation,
  updateHierarchyMutation,
  updateSubscriptionMutation,
  onHierarchyChange,
  onHierarchySubmit,
  onSubscriptionChange,
  onSubscriptionSubmit
}) {
  const [hierarchyFilter, setHierarchyFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const workspaceRef = useRef(null);
  const institutions = institutesQuery.data || [];

  const metrics = useMemo(() => {
    const total = institutions.length;
    const active = institutions.filter((item) => item.status === "active").length;
    const pending = institutions.filter((item) => item.status === "pending").length;
    const suspended = institutions.filter((item) => item.status === "suspended").length;
    const groupLeads = institutions.filter((item) => item.hierarchyType === "group_lead").length;

    return { total, active, pending, suspended, groupLeads };
  }, [institutions]);

  const filteredInstitutions = useMemo(
    () =>
      institutions.filter((institute) => {
        const matchesPlan =
          planFilter === "all" ? true : (institute.subscriptionPlan || "basic") === planFilter;
        const matchesStatus = statusFilter === "all" ? true : institute.status === statusFilter;
        const matchesHierarchy = hierarchyFilter === "all" ? true : (institute.hierarchyType || "standalone") === hierarchyFilter;
        return matchesPlan && matchesStatus && matchesHierarchy;
      }),
    [hierarchyFilter, institutions, planFilter, statusFilter]
  );

  const pageSize = 10;
  const totalPages = Math.max(Math.ceil(filteredInstitutions.length / pageSize), 1);
  const paginatedInstitutions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInstitutions.slice(start, start + pageSize);
  }, [filteredInstitutions, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const currentInstitute = instituteDetailQuery.data?.institute;

  function inferTotalUsers(institute) {
    return institute?.memberCount || institute?.activeUsers || institute?.alumniCount || 0;
  }

  function handlePlanFilterChange(value) {
    setPlanFilter(value);
    setCurrentPage(1);
  }

  function handleStatusFilterChange(value) {
    setStatusFilter(value);
    setCurrentPage(1);
  }

  function handleHierarchyFilterChange(value) {
    setHierarchyFilter(value);
    setCurrentPage(1);
  }

  function hierarchyLabel(type) {
    if (type === "group_lead") return "Group Lead";
    if (type === "group_member") return "Member";
    return "Standalone";
  }

  function hierarchyBadgeClass(type) {
    if (type === "group_lead") return "bg-indigo-100 text-indigo-700";
    if (type === "group_member") return "bg-cyan-100 text-cyan-700";
    return "bg-slate-100 text-slate-600";
  }

  function statusDotClass(status) {
    if (status === "active") return "bg-green-500";
    if (status === "pending") return "bg-amber-500";
    if (status === "suspended") return "bg-red-500";
    return "bg-slate-400";
  }

  function statusTextClass(status) {
    if (status === "active") return "text-green-600";
    if (status === "pending") return "text-amber-600";
    if (status === "suspended") return "text-red-600";
    return "text-slate-500";
  }

  function actionLabelForStatus(status) {
    if (status === "active") return "Suspend";
    if (status === "suspended") return "Restore";
    return "Approve";
  }

  function actionIconForStatus(status) {
    if (status === "active") return "block";
    if (status === "suspended") return "replay";
    return "check_circle";
  }

  function actionButtonClassForStatus(status) {
    if (status === "active") {
      return "rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50";
    }

    if (status === "suspended") {
      return "rounded-lg p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50";
    }

    return "rounded-lg p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50";
  }

  function handleStatusAction(institute) {
    if (institute.status === "active") {
      suspendMutation.mutate(institute._id);
      return;
    }

    approvalMutation.mutate({
      id: institute._id,
      subscriptionPlan: institute.subscriptionPlan || "basic"
    });
  }

  function handleOpenInstitute(instituteId) {
    onSelectInstitute(instituteId);
    window.setTimeout(() => {
      workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  function handleExportCsv() {
    if (!filteredInstitutions.length) {
      return;
    }

    const rows = [
      ["Institution Name", "Admin Email", "Subdomain / Domain", "Total Users", "Plan", "Status", "Created At"],
      ...filteredInstitutions.map((institute) => [
        institute.name,
        institute.primaryContactEmail || "",
        institute.subdomain || institute.domain || "",
        inferTotalUsers(institute),
        institute.subscriptionPlan || "basic",
        institute.status || "pending",
        institute.createdAt ? formatDate(institute.createdAt) : ""
      ])
    ];

    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`institutions-export-${stamp}.csv`, rows);
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Manage Institutions</h2>
          <p className="text-slate-500">Monitor and manage all educational and corporate entities.</p>
        </div>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-2 rounded-lg border border-[#1152d4]/20 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-[#1152d4]/5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!filteredInstitutions.length}
            onClick={handleExportCsv}
            type="button"
          >
            <span className="material-symbols-outlined text-lg">file_download</span>
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-[#1152d4]/10 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="material-symbols-outlined rounded-lg bg-[#1152d4]/10 p-2 text-[#1152d4]">apartment</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live</span>
          </div>
          <p className="text-sm font-medium uppercase tracking-wider text-slate-500">Total Institutions</p>
          <h3 className="mt-1 text-2xl font-bold">{metrics.total.toLocaleString()}</h3>
        </article>

        <article className="rounded-xl border border-[#1152d4]/10 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="material-symbols-outlined rounded-lg bg-green-100 p-2 text-green-600">verified</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live</span>
          </div>
          <p className="text-sm font-medium uppercase tracking-wider text-slate-500">Active Institutions</p>
          <h3 className="mt-1 text-2xl font-bold">{metrics.active.toLocaleString()}</h3>
        </article>

        <article className="rounded-xl border border-[#1152d4]/10 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="material-symbols-outlined rounded-lg bg-amber-100 p-2 text-amber-600">pending_actions</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live</span>
          </div>
          <p className="text-sm font-medium uppercase tracking-wider text-slate-500">Pending Setup</p>
          <h3 className="mt-1 text-2xl font-bold">{metrics.pending.toLocaleString()}</h3>
        </article>

        <article className="rounded-xl border border-[#1152d4]/10 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="material-symbols-outlined rounded-lg bg-red-100 p-2 text-red-600">block</span>
            <span className="text-sm font-medium text-slate-500">Stable</span>
          </div>
          <p className="text-sm font-medium uppercase tracking-wider text-slate-500">Group Leads</p>
          <h3 className="mt-1 text-2xl font-bold">{metrics.groupLeads.toLocaleString()}</h3>
        </article>
      </div>

      <section className="overflow-hidden rounded-xl border border-[#1152d4]/10 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#1152d4]/10 p-4">
          <div className="flex gap-2">
            <select
              className="cursor-pointer appearance-none rounded-lg border-none bg-[#f6f6f8] px-4 py-2 pr-10 text-sm focus:ring-2 focus:ring-[#1152d4]"
              onChange={(event) => handlePlanFilterChange(event.target.value)}
              value={planFilter}
            >
              <option value="all">All Plans</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <select
              className="cursor-pointer appearance-none rounded-lg border-none bg-[#f6f6f8] px-4 py-2 pr-10 text-sm focus:ring-2 focus:ring-[#1152d4]"
              onChange={(event) => handleStatusFilterChange(event.target.value)}
              value={statusFilter}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
            <select
              className="cursor-pointer appearance-none rounded-lg border-none bg-[#f6f6f8] px-4 py-2 pr-10 text-sm focus:ring-2 focus:ring-[#1152d4]"
              onChange={(event) => handleHierarchyFilterChange(event.target.value)}
              value={hierarchyFilter}
            >
              <option value="all">All Hierarchies</option>
              <option value="standalone">Standalone</option>
              <option value="group_lead">Group Lead</option>
              <option value="group_member">Group Member</option>
            </select>
          </div>
          <div className="flex-1" />
          <p className="text-xs font-medium text-slate-500">
            Showing {paginatedInstitutions.length} of {filteredInstitutions.length} institutions
          </p>
        </div>

        {institutesQuery.isLoading ? <p className="px-6 py-6 text-sm text-slate-500">Loading requests...</p> : null}
        {institutesQuery.isError ? <p className="px-6 py-6 text-sm font-semibold text-rose-600">{institutesQuery.error.message}</p> : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-200 border-collapse text-left">
            <thead>
              <tr className="border-b border-[#1152d4]/10 bg-[#1152d4]/5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <th className="px-6 py-4">Institution Name</th>
                <th className="px-6 py-4">Admin Email</th>
                <th className="px-6 py-4">Hierarchy</th>
                <th className="px-6 py-4">Total Users</th>
                <th className="px-6 py-4">Subscription</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1152d4]/5">
              {paginatedInstitutions.map((institute) => (
                <tr
                  className={`group transition-colors hover:bg-[#1152d4]/5 ${
                    selectedInstituteId === institute._id ? "bg-[#1152d4]/5" : ""
                  }`}
                  key={institute._id}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1152d4]/20 font-bold text-[#1152d4]">
                        {institute.name
                          .split(" ")
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{institute.name}</p>
                        <p className="text-xs text-slate-500">{institute.subdomain || institute.domain || "No domain configured"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{institute.primaryContactEmail || "Not available"}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${hierarchyBadgeClass(institute.hierarchyType)}`}>
                      {hierarchyLabel(institute.hierarchyType)}
                    </span>
                    {institute.parentInstituteName ? (
                      <p className="mt-1 text-xs text-slate-500">Lead: {institute.parentInstituteName}</p>
                    ) : null}
                    {institute.managedInstituteCount ? (
                      <p className="mt-1 text-xs text-slate-500">{institute.managedInstituteCount} managed</p>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">{inferTotalUsers(institute).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      institute.subscriptionPlan === "enterprise"
                        ? "bg-[#1152d4]/10 text-[#1152d4]"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {institute.subscriptionPlan || "basic"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${statusDotClass(institute.status)}`} />
                      <span className={`text-sm font-medium capitalize ${statusTextClass(institute.status)}`}>
                        {institute.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#1152d4] transition-colors hover:bg-[#1152d4]/10"
                        onClick={() => handleOpenInstitute(institute._id)}
                        title="View"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-lg">visibility</span>
                        View
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100"
                        onClick={() => handleOpenInstitute(institute._id)}
                        title="Manage"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-lg">settings</span>
                        Manage
                      </button>
                      <button
                        className={actionButtonClassForStatus(institute.status)}
                        onClick={() => handleStatusAction(institute)}
                        title={actionLabelForStatus(institute.status)}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-lg">
                          {actionIconForStatus(institute.status)}
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!paginatedInstitutions.length && !institutesQuery.isLoading ? (
                <tr>
                  <td className="px-6 py-8 text-center text-sm text-slate-500" colSpan={7}>
                    No institutions found for the selected filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[#1152d4]/10 bg-slate-50 px-6 py-4">
          <div className="text-sm text-slate-500">
            Page <span className="font-medium text-slate-900">{currentPage}</span> of <span className="font-medium text-slate-900">{totalPages}</span>
          </div>
          <div className="flex gap-2">
            <button
              className={`rounded-lg border border-[#1152d4]/10 bg-white px-3 py-1 text-sm ${currentPage === 1 ? "cursor-not-allowed opacity-50" : ""}`}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              type="button"
            >
              Previous
            </button>
            <button className="rounded-lg border border-[#1152d4]/10 bg-[#1152d4] px-3 py-1 text-sm text-white" type="button">
              {currentPage}
            </button>
            <button
              className={`rounded-lg border border-[#1152d4]/10 bg-white px-3 py-1 text-sm ${currentPage === totalPages ? "cursor-not-allowed opacity-50" : ""}`}
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <section className="scroll-mt-6 rounded-xl border border-[#1152d4]/10 bg-white p-6 shadow-sm" ref={workspaceRef}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Institution Workspace</p>
            <h3 className="mt-2 text-xl font-bold text-slate-900">{currentInstitute?.name || "Select an institution from the table"}</h3>
          </div>
          {selectedInstituteId ? (
            <button
              className="rounded-lg border border-[#1152d4]/20 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-[#1152d4]/5"
              disabled={resendInviteMutation.isPending}
              onClick={() => resendInviteMutation.mutate(selectedInstituteId)}
              type="button"
            >
              {resendInviteMutation.isPending ? "Sending..." : "Resend Admin Invite"}
            </button>
          ) : null}
        </div>

        {!selectedInstituteId ? <p className="mt-4 text-sm text-slate-500">Use the row actions to open an institution workspace.</p> : null}
        {instituteDetailQuery.isLoading ? <p className="mt-4 text-sm text-slate-500">Loading institute detail...</p> : null}
        {instituteDetailQuery.isError ? <p className="mt-4 text-sm font-semibold text-rose-600">{instituteDetailQuery.error.message}</p> : null}

        {instituteDetailQuery.data ? (
          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-xl border border-[#1152d4]/10 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Hierarchy</p>
              <form className="mt-3 space-y-3" onSubmit={onHierarchySubmit}>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  name="hierarchyType"
                  onChange={onHierarchyChange}
                  value={hierarchyForm.hierarchyType}
                >
                  <option value="standalone">Standalone institution</option>
                  <option value="group_lead">Lead institute of a group</option>
                  <option value="group_member">Member institute managed by a lead</option>
                </select>
                {hierarchyForm.hierarchyType === "group_member" ? (
                  <select
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    name="parentInstituteId"
                    onChange={onHierarchyChange}
                    value={hierarchyForm.parentInstituteId}
                  >
                    <option value="">Select lead institute</option>
                    {institutions
                      .filter((item) => item._id !== selectedInstituteId)
                      .map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                ) : null}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[
                    ["billing", "Billing"],
                    ["admins", "Admins"],
                    ["branding", "Branding"],
                    ["reporting", "Reporting"],
                    ["contentModeration", "Moderation"]
                  ].map(([key, label]) => (
                    <label className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-700" key={key}>
                      <input
                        checked={Boolean(hierarchyForm.hierarchyCapabilities?.[key])}
                        name={`capability.${key}`}
                        onChange={onHierarchyChange}
                        type="checkbox"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <button
                  className="w-full rounded-lg bg-[#1152d4] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#0f48ba]"
                  disabled={updateHierarchyMutation.isPending}
                  type="submit"
                >
                  {updateHierarchyMutation.isPending ? "Saving..." : "Save Hierarchy"}
                </button>
              </form>
              {updateHierarchyMutation.isError ? <p className="mt-2 text-sm font-semibold text-rose-600">{updateHierarchyMutation.error.message}</p> : null}
              {instituteDetailQuery.data.hierarchy?.parent ? (
                <p className="mt-3 text-sm text-slate-600">
                  Managed by <strong>{instituteDetailQuery.data.hierarchy.parent.name}</strong>
                </p>
              ) : null}
              {instituteDetailQuery.data.hierarchy?.children?.length ? (
                <div className="mt-3 space-y-2">
                  {instituteDetailQuery.data.hierarchy.children.map((child) => (
                    <article className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700" key={child._id}>
                      <strong>{child.name}</strong>
                      <span className="ml-2 text-xs text-slate-500">{child.status} | {child.subscriptionPlan}</span>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-[#1152d4]/10 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Subscription</p>
              <form className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={onSubscriptionSubmit}>
                <select
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  name="subscriptionPlan"
                  onChange={onSubscriptionChange}
                  value={subscriptionForm.subscriptionPlan}
                >
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
                <select
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  name="subscriptionStatus"
                  onChange={onSubscriptionChange}
                  value={subscriptionForm.subscriptionStatus}
                >
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="inactive">Inactive</option>
                  <option value="expired">Expired</option>
                </select>
                <input
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  name="renewalDate"
                  onChange={onSubscriptionChange}
                  type="date"
                  value={subscriptionForm.renewalDate}
                />
                <input
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  name="amount"
                  onChange={onSubscriptionChange}
                  placeholder="Payment amount"
                  type="number"
                  value={subscriptionForm.amount}
                />
                <input
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  name="currency"
                  onChange={onSubscriptionChange}
                  placeholder="Currency"
                  value={subscriptionForm.currency}
                />
                <input
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  name="notes"
                  onChange={onSubscriptionChange}
                  placeholder="Billing note"
                  value={subscriptionForm.notes}
                />
                <button
                  className="rounded-lg bg-[#1152d4] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#0f48ba] sm:col-span-2"
                  disabled={updateSubscriptionMutation.isPending}
                  type="submit"
                >
                  {updateSubscriptionMutation.isPending ? "Updating..." : "Update Subscription"}
                </button>
              </form>
              {updateSubscriptionMutation.isError ? <p className="mt-2 text-sm font-semibold text-rose-600">{updateSubscriptionMutation.error.message}</p> : null}
              {resendInviteMutation.isError ? <p className="mt-2 text-sm font-semibold text-rose-600">{resendInviteMutation.error.message}</p> : null}
              {resendInviteMutation.isSuccess ? <p className="mt-2 text-sm font-semibold text-emerald-700">{resendInviteMutation.data.invite.message}</p> : null}
            </div>

            <div className="rounded-xl border border-[#1152d4]/10 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Institution Snapshot</p>
              <div className="mt-3 space-y-2">
                <article className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
                  Status: <strong>{instituteDetailQuery.data.institute.status}</strong>
                </article>
                <article className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
                  Billing: <strong>{instituteDetailQuery.data.institute.subscriptionStatus}</strong>
                </article>
                <article className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
                  Renewal: <strong>{formatDate(instituteDetailQuery.data.institute.subscriptionRenewsAt)}</strong>
                </article>
                <article className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
                  Last payment: <strong>{formatDate(instituteDetailQuery.data.institute.lastPaymentAt)}</strong>
                </article>
                <article className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
                  Pending admin setup: <strong>{instituteDetailQuery.data.support.hasPendingAdminSetup ? "Yes" : "No"}</strong>
                </article>
                <article className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
                  Inactive admins: <strong>{instituteDetailQuery.data.support.inactiveAdminCount}</strong>
                </article>
              </div>
            </div>

            <div className="rounded-xl border border-[#1152d4]/10 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Institute Admins</p>
              <div className="mt-3 space-y-2">
                {instituteDetailQuery.data.admins.map((admin) => (
                  <article className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-3" key={admin._id}>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{admin.name}</p>
                      <p className="text-xs text-slate-500">{admin.email}</p>
                      <p className="text-xs text-slate-500">Created: {formatDateTime(admin.createdAt)}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${admin.isActive ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {admin.onboardingStatus}
                    </span>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[#1152d4]/10 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Billing History</p>
              <div className="mt-3 space-y-2">
                {(instituteDetailQuery.data.institute.billingHistory || []).slice(0, 6).map((item, index) => (
                  <article className="rounded-lg bg-white px-3 py-3" key={`${item.paidAt}-${index}`}>
                    <p className="text-sm font-semibold text-slate-900">
                      {item.plan} | {item.status}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.currency} {item.amount} | Paid: {formatDate(item.paidAt)}
                    </p>
                    {item.notes ? <p className="text-xs text-slate-500">{item.notes}</p> : null}
                  </article>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {approvalMutation.isError ? <p className="text-sm font-semibold text-rose-600">{approvalMutation.error.message}</p> : null}
      {suspendMutation.isError ? <p className="text-sm font-semibold text-rose-600">{suspendMutation.error.message}</p> : null}
    </section>
  );
}

export default SuperAdminInstituteWorkspace;
