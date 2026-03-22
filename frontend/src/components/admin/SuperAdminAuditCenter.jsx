function severityForLog(log) {
  const text = `${log.action || ""} ${log.metadata?.status || ""}`.toLowerCase();

  if (text.includes("critical") || text.includes("failed") || text.includes("panic")) {
    return "critical";
  }

  if (text.includes("error") || text.includes("blocked")) {
    return "error";
  }

  if (text.includes("warning") || text.includes("suspend") || text.includes("retry")) {
    return "warning";
  }

  return "info";
}

function severityBadgeClasses(severity) {
  if (severity === "critical") return "bg-red-100 text-red-600";
  if (severity === "error") return "bg-orange-100 text-orange-600";
  if (severity === "warning") return "bg-amber-100 text-amber-600";
  return "bg-blue-100 text-blue-600";
}

function severityLabel(severity) {
  if (severity === "critical") return "CRITICAL";
  if (severity === "error") return "ERROR";
  if (severity === "warning") return "WARNING";
  return "INFO";
}

function actorLabel(log) {
  if (log.actor?.email) return log.actor.email;
  if (log.actor?.name) return log.actor.name;
  return "System Process";
}

function actorInitials(log) {
  if (!log.actor?.name) return "SY";

  return log.actor.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function SuperAdminAuditCenter({ auditFilters, auditLogsQuery, institutes, onFilterChange }) {
  const logs = auditLogsQuery.data || [];
  const severityCounts = logs.reduce(
    (counts, log) => {
      const level = severityForLog(log);
      counts[level] += 1;
      return counts;
    },
    {
      critical: 0,
      error: 0,
      warning: 0,
      info: 0
    }
  );

  const successfulCalls = logs.length
    ? (((severityCounts.info + severityCounts.warning) / logs.length) * 100).toFixed(1)
    : "100.0";

  const activeWebhooks = institutes.filter((institute) => institute.subscriptionStatus === "active").length * 6;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-3xl font-extrabold tracking-tight">System Logs</h3>
          <p className="max-w-2xl text-sm text-slate-500">
            Monitor system-wide events, security audits, and technical logs across all tenants.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold transition-colors hover:bg-slate-50"
            type="button"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            Download Logs
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#1152d4]/10 bg-white p-6 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total Logs (24h)</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#1152d4]/10 text-[#1152d4]">
              <span className="material-symbols-outlined text-lg">description</span>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold tracking-tight">{logs.length.toLocaleString()}</span>
            <span className="mb-1 text-xs font-bold text-slate-500">Current window</span>
          </div>
        </div>

        <div className="rounded-xl border border-[#1152d4]/10 bg-white p-6 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Critical Errors</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
              <span className="material-symbols-outlined text-lg">report_problem</span>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold tracking-tight">{severityCounts.critical}</span>
            <span className="mb-1 text-xs font-bold text-slate-500">From filtered logs</span>
          </div>
        </div>

        <div className="rounded-xl border border-[#1152d4]/10 bg-white p-6 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Successful API Calls</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <span className="material-symbols-outlined text-lg">check_circle</span>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold tracking-tight">{successfulCalls}%</span>
            <span className="mb-1 text-xs font-bold text-slate-500">Computed live</span>
          </div>
        </div>

        <div className="rounded-xl border border-[#1152d4]/10 bg-white p-6 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Active Webhooks</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <span className="material-symbols-outlined text-lg">api</span>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold tracking-tight">{activeWebhooks}</span>
            <span className="mb-1 text-xs font-bold text-slate-500">Estimated from active tenants</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-[#1152d4]/10 bg-white p-4">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 ml-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Severity
          </label>
          <select
            className="w-full rounded-lg border-none bg-slate-50 text-sm focus:ring-2 focus:ring-[#1152d4]/20"
            name="action"
            onChange={onFilterChange}
            value={auditFilters.action}
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>

        <div className="min-w-[200px] flex-1">
          <label className="mb-1 ml-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Institution
          </label>
          <select
            className="w-full rounded-lg border-none bg-slate-50 text-sm focus:ring-2 focus:ring-[#1152d4]/20"
            name="instituteId"
            onChange={onFilterChange}
            value={auditFilters.instituteId}
          >
            <option value="">All Tenants</option>
            {institutes.map((institute) => (
              <option key={institute._id} value={institute._id}>
                {institute.name}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[200px] flex-1">
          <label className="mb-1 ml-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Date Range / Rows
          </label>
          <select
            className="w-full rounded-lg border-none bg-slate-50 text-sm focus:ring-2 focus:ring-[#1152d4]/20"
            name="limit"
            onChange={onFilterChange}
            value={auditFilters.limit}
          >
            <option value="10">Last 24 Hours (10 rows)</option>
            <option value="20">Last 7 Days (20 rows)</option>
            <option value="50">Last 30 Days (50 rows)</option>
          </select>
        </div>

        <button
          className="rounded-lg bg-[#1152d4]/10 p-2.5 text-[#1152d4] transition-colors hover:bg-[#1152d4]/20"
          type="button"
        >
          <span className="material-symbols-outlined block">filter_alt</span>
        </button>
      </div>

      <section className="overflow-hidden rounded-xl border border-[#1152d4]/10 bg-white shadow-sm">
        {auditLogsQuery.isLoading ? <p className="px-6 py-4 text-sm text-slate-500">Loading audit logs...</p> : null}
        {auditLogsQuery.isError ? (
          <p className="px-6 py-4 text-sm font-semibold text-rose-600">{auditLogsQuery.error.message}</p>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-190 border-collapse text-left">
            <thead>
              <tr className="border-b border-[#1152d4]/10 bg-slate-50">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Timestamp</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Severity</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Institution</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Event Name</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">User/Actor</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#1152d4]/5">
              {logs.map((log) => {
                const severity = severityForLog(log);
                const timeLabel = new Date(log.createdAt).toLocaleString();

                return (
                  <tr className="transition-colors hover:bg-slate-50/60" key={log._id}>
                    <td className="px-6 py-4 text-sm font-medium text-slate-500">{timeLabel}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${severityBadgeClasses(severity)}`}
                      >
                        {severityLabel(severity)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold">{log.institute?.name || "Platform"}</td>
                    <td className="px-6 py-4 text-sm">{log.action}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex size-6 items-center justify-center rounded-full bg-[#1152d4]/20 text-[10px] font-bold text-[#1152d4]">
                          {actorInitials(log)}
                        </div>
                        <span className="text-sm">{actorLabel(log)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-xs font-bold uppercase tracking-tight text-[#1152d4] hover:underline" type="button">
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!logs.length && !auditLogsQuery.isLoading ? (
                <tr>
                  <td className="px-6 py-8 text-center text-sm text-slate-500" colSpan={6}>
                    No logs found for the selected filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[#1152d4]/10 bg-slate-50 px-6 py-4">
          <p className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-900">1</span> to <span className="font-bold text-slate-900">{logs.length}</span> of{" "}
            <span className="font-bold text-slate-900">{logs.length.toLocaleString()}</span> logs
          </p>
          <div className="flex gap-2">
            <button
              className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-400"
              disabled
              type="button"
            >
              Previous
            </button>
            <button className="rounded bg-[#1152d4] px-3 py-1.5 text-sm font-medium text-white" type="button">
              1
            </button>
            <button className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-400" disabled type="button">
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default SuperAdminAuditCenter;
