function formatCompactNumber(value = 0) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function monthLabel(date) {
  return new Date(date).toLocaleDateString(undefined, { month: "short" });
}

function downloadTextFile(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildMonthlyReport({ institutes, support, totals, mrrByMonth, institutesByMonth, activeRate, alumniPerInstitute, computedMrr }) {
  const generatedAt = new Date();
  const latestMrr = mrrByMonth[mrrByMonth.length - 1]?.value || 0;
  const latestInstitutes = institutesByMonth[institutesByMonth.length - 1]?.value || 0;
  const lines = [
    "AlumNet SaaS Monthly Report",
    `Generated: ${generatedAt.toLocaleString()}`,
    "",
    "Platform Summary",
    `Total institutes: ${totals?.totalInstitutes || 0}`,
    `Active institutes: ${totals?.activeInstitutes || 0}`,
    `Pending institutes: ${totals?.pendingInstitutes || 0}`,
    `Suspended institutes: ${totals?.suspendedInstitutes || 0}`,
    `Active rate: ${activeRate}%`,
    `Active alumni users: ${totals?.activeAlumniUsers || 0}`,
    `Total alumni profiles: ${totals?.totalAlumniProfiles || 0}`,
    `Average alumni per institute: ${alumniPerInstitute}`,
    `Current month MRR (USD): ${computedMrr}`,
    `Latest MRR month value (USD): ${latestMrr}`,
    `New institutes this month: ${latestInstitutes}`,
    `Total events: ${totals?.totalEvents || 0}`,
    `Total jobs: ${totals?.totalJobs || 0}`,
    `Published jobs: ${totals?.publishedJobs || 0}`,
    `Total RSVPs: ${totals?.totalRsvps || 0}`,
    `Friendship requests: ${totals?.totalFriendshipRequests || 0}`,
    `Pending friendship requests: ${totals?.pendingFriendshipRequests || 0}`,
    "",
    "Support Summary",
    `Pending institute requests: ${support?.pendingInstituteRequests || 0}`,
    `Pending institute admin setup: ${support?.pendingInstituteAdminSetup || 0}`,
    `Inactive institute admins: ${support?.inactiveInstituteAdmins || 0}`,
    `Pending alumni invites: ${support?.pendingAlumniInvites || 0}`,
    `Expired invites: ${support?.expiredInvites || 0}`,
    "",
    "Revenue Trend (last 6 months)",
    ...mrrByMonth.map((item) => `${item.label}: $${item.value.toLocaleString()}`),
    "",
    "New Institutions (last 6 months)",
    ...institutesByMonth.map((item) => `${item.label}: ${item.value}`),
    "",
    "Institutes",
    ...(institutes || []).map((institute) => {
      const latestBilling = institute.billingHistory?.[0];
      return [
        `${institute.name}`,
        `  Status: ${institute.status || "pending"}`,
        `  Plan: ${institute.subscriptionPlan || "basic"}`,
        `  Subscription status: ${institute.subscriptionStatus || "inactive"}`,
        `  Renewal: ${institute.subscriptionRenewsAt ? new Date(institute.subscriptionRenewsAt).toLocaleDateString() : "Not set"}`,
        `  Latest billed amount: ${latestBilling?.amount || 0} ${latestBilling?.currency || "INR"}`
      ].join("\n");
    })
  ];

  return lines.join("\n");
}

function SuperAdminOverview({ billing, institutes, support, totals, trends }) {
  const now = new Date();
  const monthAnchors = Array.from({ length: 6 }, (_, index) => {
    const value = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${value.getFullYear()}-${value.getMonth() + 1}`,
      label: monthLabel(value),
      date: value
    };
  });

  const fallbackMrrByMonth = monthAnchors.map((anchor) => {
    const amount = (institutes || []).reduce((sum, institute) => {
      const history = institute.billingHistory || [];
      const monthAmount = history
        .filter((item) => {
          if (!item.paidAt) return false;
          const paid = new Date(item.paidAt);
          return paid.getFullYear() === anchor.date.getFullYear() && paid.getMonth() === anchor.date.getMonth();
        })
        .reduce((total, item) => total + Number(item.amount || 0), 0);
      return sum + monthAmount;
    }, 0);

    return {
      label: anchor.label,
      value: amount
    };
  });

  const mrrByMonth = trends?.revenueByMonth?.length ? trends.revenueByMonth : fallbackMrrByMonth;
  const maxMrr = Math.max(...mrrByMonth.map((item) => item.value), 1);

  const fallbackInstitutesByMonth = monthAnchors.map((anchor) => {
    const count = (institutes || []).filter((institute) => {
      if (!institute.createdAt) return false;
      const created = new Date(institute.createdAt);
      return created.getFullYear() === anchor.date.getFullYear() && created.getMonth() === anchor.date.getMonth();
    }).length;

    return {
      label: anchor.label,
      value: count
    };
  });

  const institutesByMonth = trends?.newInstitutesByMonth?.length ? trends.newInstitutesByMonth : fallbackInstitutesByMonth;
  const maxNewInstitutes = Math.max(...institutesByMonth.map((item) => item.value), 1);

  const activeRate = totals?.totalInstitutes
    ? Math.round(((totals.activeInstitutes || 0) / totals.totalInstitutes) * 100)
    : 0;
  const alumniPerInstitute = totals?.totalInstitutes
    ? Math.round((totals.totalAlumniProfiles || 0) / totals.totalInstitutes)
    : 0;
  const computedMrr = billing?.currentMrr ?? mrrByMonth[mrrByMonth.length - 1]?.value ?? 0;

  const topInstitutions = (institutes || []).slice(0, 4).map((institute, index) => {
    const billedAmount = institute.billingHistory?.[0]?.amount || 0;
    const engagement = Math.min(95, 45 + index * 12 + Math.round(billedAmount / 50));

    return {
      id: institute._id,
      name: institute.name,
      users: institute.memberCount || institute.activeUsers || 0,
      engagement,
      plan: institute.subscriptionPlan || "basic"
    };
  });

  const displayInstitutions = topInstitutions;

  const activity = (institutes || []).slice(0, 4).map((institute, index) => ({
    id: `activity-${institute._id || index}`,
    title:
      institute.subscriptionStatus === "active"
        ? `${institute.name} is active on ${institute.subscriptionPlan || "basic"} plan.`
        : `${institute.name} is currently ${institute.subscriptionStatus || "pending"}.`,
    time: institute.updatedAt ? new Date(institute.updatedAt).toLocaleDateString() : "Recently",
    icon: institute.subscriptionStatus === "active" ? "verified" : "schedule",
    color: institute.subscriptionStatus === "active" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
  }));

  function handleGenerateMonthlyReport() {
    const content = buildMonthlyReport({
      institutes,
      support,
      totals,
      mrrByMonth,
      institutesByMonth,
      activeRate,
      alumniPerInstitute,
      computedMrr
    });
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(`alumnet-monthly-report-${stamp}.txt`, content);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">System Overview</h2>
          <p className="mt-1 text-slate-500">Real-time performance metrics across all AlumNet tenants.</p>
        </div>
        <button
          className="flex items-center gap-2 rounded-lg bg-[#1152d4] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#1152d4]/20 transition-colors hover:bg-[#0f48ba] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!institutes?.length}
          onClick={handleGenerateMonthlyReport}
          type="button"
        >
          <span className="material-symbols-outlined text-base">download</span>
          <span>Generate Monthly Report</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-start justify-between">
            <div className="rounded-lg bg-[#1152d4]/10 p-2 text-[#1152d4]">
              <span className="material-symbols-outlined">school</span>
            </div>
            <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{activeRate}% active</span>
          </div>
          <p className="text-sm font-medium text-slate-500">Total Institutions</p>
          <h3 className="mt-1 text-2xl font-bold">{totals?.totalInstitutes || 0}</h3>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-start justify-between">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
              <span className="material-symbols-outlined">group</span>
            </div>
            <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{alumniPerInstitute} / inst.</span>
          </div>
          <p className="text-sm font-medium text-slate-500">Total Active Users</p>
          <h3 className="mt-1 text-2xl font-bold">{formatCompactNumber(totals?.activeAlumniUsers || 0)}</h3>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-start justify-between">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
              <span className="material-symbols-outlined">monetization_on</span>
            </div>
            <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">latest month</span>
          </div>
          <p className="text-sm font-medium text-slate-500">MRR (USD)</p>
          <h3 className="mt-1 text-2xl font-bold">${computedMrr.toLocaleString()}</h3>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-start justify-between">
            <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600">
              <span className="material-symbols-outlined">diversity_3</span>
            </div>
            <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">live count</span>
          </div>
          <p className="text-sm font-medium text-slate-500">Total Alumni</p>
          <h3 className="mt-1 text-2xl font-bold">{formatCompactNumber(totals?.totalAlumniProfiles || 0)}</h3>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <h4 className="text-lg font-bold">MRR Growth (6 Months)</h4>
            <select className="rounded border-none bg-slate-50 py-1 text-xs font-bold">
              <option>This Year</option>
              <option>Last Year</option>
            </select>
          </div>

          <div className="flex h-64 flex-col justify-end gap-2">
            <div className="flex h-48 items-end justify-between px-2">
              {mrrByMonth.map((item, index) => (
                <div
                  className="group relative w-10 rounded-t-lg bg-[#1152d4]"
                  key={`${item.label}-${index}`}
                  style={{ height: `${Math.max((item.value / maxMrr) * 100, 6)}%`, opacity: 0.25 + index * 0.12 }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-slate-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                    ${item.value.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between px-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              {mrrByMonth.map((item) => (
                <span key={item.label}>{item.label}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <h4 className="text-lg font-bold">New Institutions</h4>
            <span className="rounded-full bg-[#1152d4]/10 px-3 py-1 text-xs font-bold text-[#1152d4]">
              {(totals?.pendingInstitutes || 0).toLocaleString()} pending
            </span>
          </div>

          <div className="flex h-64 flex-col justify-end gap-2">
            <div className="flex h-48 items-end justify-between gap-2 px-2">
              {institutesByMonth.map((item) => (
                <div className="flex flex-1 flex-col items-center gap-2" key={item.label}>
                  <div className="w-full rounded-t-lg bg-[#1152d4]/20" style={{ height: `${Math.max((item.value / maxNewInstitutes) * 160, 8)}px` }} />
                  <span className="text-xs font-bold text-slate-600">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between px-2 text-[10px] font-bold uppercase text-slate-400">
              {institutesByMonth.map((item) => (
                <span key={item.label}>{item.label}</span>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-8 2xl:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <h4 className="text-lg font-bold">Recent Activity</h4>
            <button className="text-xs font-bold text-[#1152d4] hover:underline" type="button">
              View All
            </button>
          </div>

          <div className="space-y-6">
            {activity.map((item) => (
              <div className="flex gap-4" key={item.id}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.color}`}>
                  <span className="material-symbols-outlined text-sm">{item.icon}</span>
                </div>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.time}</p>
                </div>
              </div>
            ))}
            {!activity.length ? <p className="text-sm text-slate-500">No recent platform activity found.</p> : null}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white 2xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 p-6">
            <h4 className="text-lg font-bold">Top Performing Institutions</h4>
            <div className="flex gap-2">
              <button className="rounded p-2 transition-colors hover:bg-slate-100" type="button">
                <span className="material-symbols-outlined text-lg">filter_list</span>
              </button>
              <button className="rounded p-2 transition-colors hover:bg-slate-100" type="button">
                <span className="material-symbols-outlined text-lg">more_vert</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Institution</th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase text-slate-500">Active Users</th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase text-slate-500">Engagement</th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase text-slate-500">Plan</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayInstitutions.map((institution) => (
                  <tr key={institution.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-200 text-xs font-bold text-slate-600">
                          {institution.name
                            .split(" ")
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join("")
                            .toUpperCase()}
                        </div>
                        <span className="text-sm font-bold">{institution.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm">{institution.users.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="mx-auto h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-[#1152d4]" style={{ width: `${institution.engagement}%` }} />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                          institution.plan === "enterprise"
                            ? "bg-[#1152d4]/10 text-[#1152d4]"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {institution.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 transition-colors hover:text-[#1152d4]" type="button">
                        <span className="material-symbols-outlined text-lg">arrow_forward_ios</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {!displayInstitutions.length ? (
                  <tr>
                    <td className="px-6 py-8 text-center text-sm text-slate-500" colSpan={5}>
                      No institutions available yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 p-4 text-center">
            <button className="text-sm font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-[#1152d4]" onClick={handleGenerateMonthlyReport} type="button">
              View Rankings Report
            </button>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Pending institute requests</p>
          <strong className="mt-1 block text-2xl font-bold">{support?.pendingInstituteRequests || 0}</strong>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Inactive institute admins</p>
          <strong className="mt-1 block text-2xl font-bold">{support?.inactiveInstituteAdmins || 0}</strong>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Open alumni invites</p>
          <strong className="mt-1 block text-2xl font-bold">{support?.pendingAlumniInvites || 0}</strong>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Suspended institutes</p>
          <strong className="mt-1 block text-2xl font-bold">{totals?.suspendedInstitutes || 0}</strong>
        </article>
      </div>
    </div>
  );
}

export default SuperAdminOverview;
