import { useQuery } from "@tanstack/react-query";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from "recharts";
import { fetchAdminAnalytics } from "../lib/api.js";
import "../styles/Insights.css";

export default function AdminInsightPage() {
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: fetchAdminAnalytics,
  });

  if (isLoading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="dl-topbar-dot" style={{ width: 24, height: 24 }}></div>
    </div>
  );

  if (error) return <div className="ana-container">Error loading analytics.</div>;

  const { metrics, trends, topCampaigns } = analytics;

  return (
    <div className="ana-container">
      <header className="ana-header">
        <h1 className="ana-title">Platform Insights</h1>
        <p className="ana-subtitle">Monitor growth, engagement, and financial health of your alumni network.</p>
      </header>

      {/* KPI Cards */}
      <div className="ana-kpi-grid">
        <div className="ana-kpi-card">
          <div className="ana-kpi-icon bg-blue">
            <span className="material-symbols-outlined">group</span>
          </div>
          <div className="ana-kpi-info">
            <h3>Total Alumni</h3>
            <p className="ana-kpi-value">{metrics.totalAlumni.toLocaleString()}</p>
          </div>
        </div>

        <div className="ana-kpi-card">
          <div className="ana-kpi-icon bg-emerald">
            <span className="material-symbols-outlined">payments</span>
          </div>
          <div className="ana-kpi-info">
            <h3>Total Raised</h3>
            <p className="ana-kpi-value">₹{metrics.totalDonations.toLocaleString()}</p>
          </div>
        </div>

        <div className="ana-kpi-card">
          <div className="ana-kpi-icon bg-amber">
            <span className="material-symbols-outlined">work</span>
          </div>
          <div className="ana-kpi-info">
            <h3>Active Jobs</h3>
            <p className="ana-kpi-value">{metrics.activeJobs}</p>
          </div>
        </div>

        <div className="ana-kpi-card">
          <div className="ana-kpi-icon bg-purple">
            <span className="material-symbols-outlined">school</span>
          </div>
          <div className="ana-kpi-info">
            <h3>Sessions Held</h3>
            <p className="ana-kpi-value">{metrics.totalSessions}</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="ana-charts-grid">
        <div className="ana-chart-card">
          <div className="ana-chart-header">
            <h2 className="ana-chart-title">Donation Trends</h2>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={trends.donations}>
                <defs>
                  <linearGradient id="colorDonation" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  cursor={{ stroke: '#10b981', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorDonation)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="ana-chart-card">
          <div className="ana-chart-header">
            <h2 className="ana-chart-title">New Registrations</h2>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={trends.registrations}>
                <defs>
                  <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorReg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Campaigns Table */}
      <div className="ana-table-card">
        <h2 className="ana-chart-title">Highest Performing Campaigns</h2>
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
            {topCampaigns.map(camp => {
              const progress = Math.min(100, (camp.raisedAmount / camp.goalAmount) * 100);
              return (
                <tr key={camp._id}>
                  <td>{camp.title}</td>
                  <td style={{ color: '#10b981', fontWeight: 700 }}>₹{camp.raisedAmount.toLocaleString()}</td>
                  <td>₹{camp.goalAmount.toLocaleString()}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: '#10b981' }} />
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', minWidth: 40 }}>{progress.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
