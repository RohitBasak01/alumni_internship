import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchInstituteAdminAnalytics } from "../lib/api.js";
import "../styles/Insights.css";

const RANGE_PRESETS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1y", days: 365 },
  { label: "Custom", days: null },
];

const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16", "#f97316"];

function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function getPresetRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
  };
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatCurrency(value) {
  return `INR ${Number(value || 0).toLocaleString()}`;
}

function DeltaBadge({ value = 0 }) {
  const tone = value > 0 ? "positive" : value < 0 ? "negative" : "neutral";
  const prefix = value > 0 ? "+" : "";
  return <span className={`ana-delta ana-delta--${tone}`}>{prefix}{value}% vs previous</span>;
}

export default function AdminInsightPage() {
  const [activePreset, setActivePreset] = useState("30d");
  const [range, setRange] = useState(() => getPresetRange(30));

  const queryParams = useMemo(() => ({
    startDate: range.startDate,
    endDate: range.endDate,
  }), [range.endDate, range.startDate]);

  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ["institute-admin-analytics", queryParams],
    queryFn: () => fetchInstituteAdminAnalytics(queryParams),
  });

  function handlePreset(preset) {
    setActivePreset(preset.label);
    if (preset.days) {
      setRange(getPresetRange(preset.days));
    }
  }

  function handleDateChange(field, value) {
    setActivePreset("Custom");
    setRange((current) => ({ ...current, [field]: value }));
  }

  function exportCsv() {
    if (!analytics) return;
    const rows = [
      ["Metric", "Value", "Delta"],
      ...kpis.map((item) => [item.label, item.rawValue, `${item.delta}%`]),
      [],
      ["Top Campaign", "Raised", "Goal"],
      ...analytics.topCampaigns.map((campaign) => [
        campaign.title,
        campaign.raisedAmount || 0,
        campaign.goalAmount || 0,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `insights-${range.startDate}-to-${range.endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return (
      <div className="ana-loading">
        <div className="dl-topbar-dot ana-spinner" />
      </div>
    );
  }

  if (error) return <div className="ana-container">Error loading analytics.</div>;

  const { metrics, deltas, trends, topCampaigns, distribution } = analytics;
  const kpis = [
    { label: "Total Alumni", icon: "group", value: formatNumber(metrics.totalAlumni), rawValue: metrics.totalAlumni, delta: deltas.totalAlumni, tone: "blue" },
    { label: "Total Raised", icon: "payments", value: formatCurrency(metrics.totalDonations), rawValue: metrics.totalDonations, delta: deltas.totalDonations, tone: "emerald" },
    { label: "Active Jobs", icon: "work", value: formatNumber(metrics.activeJobs), rawValue: metrics.activeJobs, delta: deltas.activeJobs, tone: "amber" },
    { label: "Sessions Held", icon: "school", value: formatNumber(metrics.totalSessions), rawValue: metrics.totalSessions, delta: deltas.totalSessions, tone: "violet" },
    { label: "Active Users", icon: "person_check", value: formatNumber(metrics.activeUsers), rawValue: metrics.activeUsers, delta: deltas.activeUsers, tone: "cyan" },
    { label: "Event Attendance", icon: "event_available", value: `${metrics.eventAttendanceRate}%`, rawValue: metrics.eventAttendanceRate, delta: deltas.eventAttendanceRate, tone: "rose" },
    { label: "Messages Sent", icon: "mail", value: formatNumber(metrics.messagesSent), rawValue: metrics.messagesSent, delta: deltas.messagesSent, tone: "green" },
    { label: "Forum Engagement", icon: "forum", value: formatNumber(metrics.forumEngagement), rawValue: metrics.forumEngagement, delta: deltas.forumEngagement, tone: "slate" },
  ];

  return (
    <div className="ana-container">
      <header className="ana-header">
        <div>
          <h1 className="ana-title">Platform Insights</h1>
          <p className="ana-subtitle">Monitor growth, engagement, and financial health for this institute.</p>
        </div>
        <button className="ana-export-btn" type="button" onClick={exportCsv}>
          <span className="material-symbols-outlined">download</span>
          Export CSV
        </button>
      </header>

      <section className="ana-filter-bar" aria-label="Analytics date range">
        <div className="ana-presets">
          {RANGE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={`ana-preset ${activePreset === preset.label ? "ana-preset--active" : ""}`}
              onClick={() => handlePreset(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="ana-date-fields">
          <label>
            Start
            <input type="date" value={range.startDate} onChange={(event) => handleDateChange("startDate", event.target.value)} />
          </label>
          <label>
            End
            <input type="date" value={range.endDate} onChange={(event) => handleDateChange("endDate", event.target.value)} />
          </label>
        </div>
      </section>

      <section className="ana-kpi-grid">
        {kpis.map((item) => (
          <article className="ana-kpi-card" key={item.label}>
            <div className={`ana-kpi-icon ana-kpi-icon--${item.tone}`}>
              <span className="material-symbols-outlined">{item.icon}</span>
            </div>
            <div className="ana-kpi-info">
              <h3>{item.label}</h3>
              <p className="ana-kpi-value">{item.value}</p>
              <DeltaBadge value={item.delta} />
            </div>
          </article>
        ))}
      </section>

      <section className="ana-charts-grid">
        <div className="ana-chart-card">
          <div className="ana-chart-header">
            <h2 className="ana-chart-title">Donation Trends</h2>
          </div>
          <div className="ana-chart-box">
            <ResponsiveContainer>
              <AreaChart data={trends.donations}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fill="#dcfce7" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="ana-chart-card">
          <div className="ana-chart-header">
            <h2 className="ana-chart-title">New Registrations</h2>
          </div>
          <div className="ana-chart-box">
            <ResponsiveContainer>
              <BarChart data={trends.registrations}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="ana-chart-card">
          <div className="ana-chart-header">
            <h2 className="ana-chart-title">Alumni Distribution</h2>
          </div>
          <div className="ana-chart-box">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={62} outerRadius={104} paddingAngle={3}>
                  {distribution.map((entry, index) => (
                    <Cell key={entry.name + entry.batch} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="ana-legend">
            {distribution.map((item, index) => (
              <span key={item.name + item.batch}>
                <i style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                {item.name} {item.batch !== "Unspecified" ? `(${item.batch})` : ""}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="ana-table-card">
        <h2 className="ana-chart-title">Highest Performing Campaigns</h2>
        <div className="ana-table-wrap">
          <table className="ana-table">
            <thead>
              <tr>
                <th>Campaign Name</th>
                <th>Raised Amount</th>
                <th>Goal</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {topCampaigns.map((campaign) => {
                const progress = campaign.goalAmount ? Math.min(100, (campaign.raisedAmount / campaign.goalAmount) * 100) : 0;
                return (
                  <tr key={campaign._id}>
                    <td>{campaign.title}</td>
                    <td className="ana-money">{formatCurrency(campaign.raisedAmount)}</td>
                    <td>{formatCurrency(campaign.goalAmount)}</td>
                    <td>
                      <div className="ana-progress">
                        <div><span style={{ width: `${progress}%` }} /></div>
                        <strong>{progress.toFixed(0)}%</strong>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
