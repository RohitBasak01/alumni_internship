import { useMemo, useState } from "react";

const planCatalog = [
  {
    id: "free",
    name: "Free",
    price: 0,
    subtitle: "For small pilot alumni communities.",
    featured: false,
    features: [
      { label: "Basic Directory", enabled: true },
      { label: "Jobs Board", enabled: true },
      { label: "Up to 500 Alumni", enabled: true },
      { label: "White Labeling", enabled: false }
    ]
  },
  {
    id: "pro",
    name: "Pro",
    price: 99,
    subtitle: "Advanced features for growing networks.",
    featured: true,
    features: [
      { label: "Events Management", enabled: true },
      { label: "Analytics Dashboard", enabled: true },
      { label: "Priority Support", enabled: true },
      { label: "Unlimited Alumni", enabled: true }
    ]
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 499,
    subtitle: "Full customizability for large universities.",
    featured: false,
    features: [
      { label: "Custom Domain & SSL", enabled: true },
      { label: "White Labeling", enabled: true },
      { label: "API & Webhook Access", enabled: true },
      { label: "Dedicated Account Manager", enabled: true }
    ]
  }
];

function initials(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function planPrice(planName) {
  if (planName === "enterprise") return 499;
  if (planName === "pro") return 99;
  return 0;
}

function SuperAdminSubscriptions({ institutes }) {
  const [search, setSearch] = useState("");

  const filteredInstitutes = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return institutes;
    }

    return institutes.filter((institute) => {
      return [
        institute.name,
        institute.primaryContactEmail,
        institute.subdomain,
        institute.domain,
        institute.subscriptionPlan
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [institutes, search]);

  const billingRows = useMemo(() => {
    const rows = [];

    filteredInstitutes.forEach((institute) => {
      (institute.billingHistory || []).forEach((item) => {
        rows.push({
          id: `${institute._id}-${item.paidAt}-${item.amount}`,
          institution: institute.name,
          planChange: item.notes || `Updated to ${item.plan}`,
          date: item.paidAt,
          amount: item.amount,
          status: item.status === "active" ? "success" : item.status === "failed" ? "failed" : "changed"
        });
      });
    });

    return rows
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);
  }, [filteredInstitutes]);

  const activeCounts = useMemo(() => {
    return planCatalog.reduce((accumulator, plan) => {
      accumulator[plan.id] = filteredInstitutes.filter(
        (institute) => (institute.subscriptionPlan || "basic") === plan.id
      ).length;
      return accumulator;
    }, {});
  }, [filteredInstitutes]);

  const mrr = useMemo(() => {
    return filteredInstitutes.reduce((total, institute) => {
      return total + planPrice(institute.subscriptionPlan || "basic");
    }, 0);
  }, [filteredInstitutes]);

  const arpu = filteredInstitutes.length ? mrr / filteredInstitutes.length : 0;
  const mostPopular = useMemo(() => {
    const entries = Object.entries(activeCounts);
    if (!entries.length) return "pro";
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }, [activeCounts]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <h3 className="text-lg font-bold leading-tight">Subscription Management</h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">
              search
            </span>
            <input
              className="w-64 rounded-lg border-none bg-slate-50 py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#1152d4]"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search plans..."
              type="text"
              value={search}
            />
          </div>
          <button
            className="flex items-center gap-2 rounded-lg bg-[#1152d4] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0f48ba]"
            type="button"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Create New Plan
          </button>
        </div>
      </div>

      <div>
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Pricing & Plans</h1>
        <p className="text-sm text-slate-500">Define and manage SaaS pricing tiers and feature access for your partner institutions.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="mb-1 text-sm font-medium text-slate-500">Total MRR</p>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold">${mrr.toLocaleString()}</span>
            <span className="mb-1 flex items-center gap-0.5 text-xs font-bold text-emerald-500">
              <span className="material-symbols-outlined text-xs">trending_up</span> 12%
            </span>
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="mb-1 text-sm font-medium text-slate-500">Avg. Revenue Per User</p>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold">${arpu.toFixed(2)}</span>
            <span className="mb-1 flex items-center gap-0.5 text-xs font-bold text-emerald-500">
              <span className="material-symbols-outlined text-xs">trending_up</span> 3%
            </span>
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="mb-1 text-sm font-medium text-slate-500">Churn Rate</p>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold">2.4%</span>
            <span className="mb-1 flex items-center gap-0.5 text-xs font-bold text-rose-500">
              <span className="material-symbols-outlined text-xs">trending_down</span> 0.5%
            </span>
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="mb-1 text-sm font-medium text-slate-500">Most Popular Plan</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold capitalize text-[#1152d4]">{mostPopular}</span>
            <span className="rounded-full bg-[#1152d4]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1152d4]">
              Active
            </span>
          </div>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {planCatalog.map((plan) => {
          const activeInstitutions = activeCounts[plan.id] || 0;
          return (
            <article
              className={`relative flex flex-col overflow-hidden rounded-xl border bg-white ${
                plan.featured ? "scale-[1.02] border-2 border-[#1152d4] shadow-xl shadow-[#1152d4]/10" : "border-slate-200"
              }`}
              key={plan.id}
            >
              {plan.featured ? (
                <span className="absolute right-0 top-0 rounded-bl-lg bg-[#1152d4] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  Most Popular
                </span>
              ) : null}

              <div className="border-b border-slate-100 p-6">
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="mt-1 text-xs text-slate-500">{plan.subtitle}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-black tracking-tight">${plan.price}</span>
                  <span className="text-sm font-medium text-slate-500">/month</span>
                </div>
              </div>

              <div className={`flex-1 p-6 ${plan.featured ? "bg-[#1152d4]/5" : "bg-slate-50/60"}`}>
                <p className={`mb-4 text-xs font-bold uppercase tracking-widest ${plan.featured ? "text-[#1152d4]/70" : "text-slate-400"}`}>
                  Features & Limits
                </p>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li className={`flex items-center gap-3 text-sm ${feature.enabled ? "font-medium" : "text-slate-400"}`} key={feature.label}>
                      <span
                        className={`material-symbols-outlined text-lg ${
                          feature.enabled
                            ? plan.featured
                              ? "text-[#1152d4]"
                              : "text-emerald-500"
                            : "text-slate-300"
                        }`}
                      >
                        {feature.enabled ? "check_circle" : "cancel"}
                      </span>
                      {feature.label}
                    </li>
                  ))}
                </ul>

                <div className={`mt-6 border-t pt-6 ${plan.featured ? "border-[#1152d4]/10" : "border-slate-200"}`}>
                  <p className="mb-2 text-xs text-slate-500">Active Institutions</p>
                  <span className="text-lg font-bold">{activeInstitutions}</span>
                </div>
              </div>

              <div className="flex gap-2 bg-white p-4">
                <button
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                    plan.featured
                      ? "bg-[#1152d4] text-white hover:bg-[#0f48ba]"
                      : "border border-slate-200 hover:bg-slate-50"
                  }`}
                  type="button"
                >
                  Edit Plan
                </button>
                <button className="p-2 text-slate-400 transition-colors hover:text-rose-500" type="button">
                  <span className="material-symbols-outlined">archive</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <div>
            <h3 className="text-base font-bold">Recent Billing Activity</h3>
            <p className="text-xs text-slate-500">Overview of the latest plan changes and payments across the network.</p>
          </div>
          <button className="text-sm font-semibold text-[#1152d4] hover:underline" type="button">
            View All Logs
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Institution</th>
                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Plan Change</th>
                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Date</th>
                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Amount</th>
                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {billingRows.map((item) => (
                <tr className="transition-colors hover:bg-slate-50" key={item.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded bg-[#1152d4]/10 text-xs font-bold text-[#1152d4]">
                        {initials(item.institution)}
                      </div>
                      <span className="text-sm font-medium">{item.institution}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{item.planChange}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{new Date(item.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm font-bold">${Number(item.amount || 0).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        item.status === "success"
                          ? "bg-emerald-100 text-emerald-700"
                          : item.status === "failed"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!billingRows.length ? (
                <tr>
                  <td className="px-6 py-8 text-center text-sm text-slate-500" colSpan={5}>
                    No billing activity found for the selected institutions.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default SuperAdminSubscriptions;
