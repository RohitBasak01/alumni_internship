import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDashboardLogic } from "../hooks/useDashboardLogic.js";
import { PortalPageHeader } from "../components/PortalPrimitives.jsx";
import { DashboardMetrics } from "../components/DashboardMetrics.jsx";
import { ActivityFeed } from "../components/ActivityFeed.jsx";
import SectionCard from "../components/SectionCard.jsx";
import CelebrationWidget from "../components/CelebrationWidget.jsx";
import { formatRelativeTime } from "../utils/formatters.js";
import "../styles/Dashboard.css";
import "../styles/AdminDashboard.css";



/* ── Sparkline mini-chart (SVG) ───────────────────────────── */
function Sparkline({ color = "#6366f1", rising = true }) {
  const points = rising
    ? "0,24 12,20 24,22 36,16 48,18 60,10 72,14 84,8 96,10 108,4"
    : "0,8 12,12 24,10 36,16 48,14 60,20 72,16 84,22 96,18 108,24";
  return (
    <svg width="108" height="28" viewBox="0 0 108 28" fill="none" style={{ display: "block" }}>
      <polyline points={points} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Stat card ────────────────────────────────────────────── */
function StatCard({ icon, label, value, change, positive = true, color, sparkColor }) {
  return (
    <div className="adb-stat-card">
      <div className="adb-stat-top">
        <div className="adb-stat-icon-wrap" style={{ background: color + "18", color }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
        </div>
        <span className="adb-stat-label">{label}</span>
      </div>
      <div className="adb-stat-value">{value}</div>
      <div className="adb-stat-footer">
        <span className={`adb-stat-change ${positive ? "adb-stat-change--up" : "adb-stat-change--dn"}`}>
          {positive ? "▲" : "▼"} {change}
        </span>
        <Sparkline color={sparkColor || color} rising={positive} />
      </div>
    </div>
  );
}

/* ── Activity post card ───────────────────────────────────── */
function ActivityCard({ post }) {
  const initials = post.author?.initials || post.author?.name?.split(" ").map(n => n[0]).join("").toUpperCase() || "?";
  
  return (
    <div className="adb-activity-card">
      <div className="adb-activity-header">
        <div className="adb-activity-avatar" style={{ background: post.accentColor || "#6366f1" }}>
          {initials}
        </div>
        <div className="adb-activity-info">
          <div className="adb-activity-name">{post.author?.name}</div>
          <div className="adb-activity-meta">
            <span className="adb-activity-role">{post.role}</span>
            <span className="adb-activity-dot">·</span>
            <span className="adb-activity-time">{formatRelativeTime(post.createdAt)}</span>
          </div>
        </div>
        <button className="adb-more-btn">
          <span className="material-symbols-outlined">more_horiz</span>
        </button>
      </div>
      
      <div className="adb-activity-content">
        <p className="adb-activity-text">{post.content}</p>
        {post.image && <img src={post.image} alt="Post" className="adb-activity-image" />}
      </div>

      <div className="adb-activity-actions">
        <button className="adb-action-btn">
          <span className="material-symbols-outlined">favorite</span>
          {post.likeCount ?? 0}
        </button>
        <button className="adb-action-btn">
          <span className="material-symbols-outlined">chat_bubble</span>
          {post.commentCount ?? 0}
        </button>
        <button className="adb-action-btn adb-bookmark-btn">
          <span className="material-symbols-outlined">bookmark</span>
        </button>
      </div>
    </div>
  );
}

/* ── Main Alumni Dashboard ────────────────────────────────── */
function AlumniDashboard({ logic }) {
  const { auth, tenant, queries, derived } = logic;
  const firstName = (auth.user?.name || "").split(" ")[0] || "there";
  const profile = derived.profile;
  const completionPct = profile ? 72 : 30;

  const alumni = queries.alumni.data || [];
  const events = queries.events.data || [];
  const jobs = queries.jobs.data || [];
  const friendship = queries.friendship.data || [];
  const posts = queries.posts.data || [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const displayPosts = posts.slice(0, 5).map(p => ({
    ...p,
    role: p.author?.designation || p.author?.occupation || p.author?.company || "",
    likeCount: p.likes?.length ?? 0,
    commentCount: p.comments?.length ?? 0,
    shareCount: 0,
    accentColor: ["#6366f1","#0ea5e9","#10b981"][Math.floor(Math.random()*3)],
  }));

  const QUICK_ACTIONS = [
    { icon: "edit_note",   label: "Update",    to: "/portal/feed", color: "#6366f1" },
    { icon: "person_search", label: "Search", to: "/portal/alumni", color: "#0ea5e9" },
    { icon: "work",        label: "Jobs",    to: "/portal/jobs", color: "#10b981" },
    { icon: "event",       label: "Events",   to: "/portal/events", color: "#f59e0b" },
  ];

  const { communityHighlights, suggestedConnections } = derived;
  const recentJoins = communityHighlights.joinedThisWeek;
  const topContributor = communityHighlights.topContributor;

  return (
    <div className="adb-root adb-root--modern module-platform">
      {/* ── Top Section: Greeting & Stats ── */}
      <div className="adb-header-section">
        <div className="adb-greeting-box">
          <h1 className="adb-hero-greeting">{greeting}, {firstName}! 👋</h1>
          <p className="adb-hero-sub">Welcome back to the {tenant.displayName} community.</p>
        </div>

        <div className="adb-quick-metrics">
          <div className="adb-metric-pill">
            <span className="material-symbols-outlined">groups</span>
            <strong>{alumni.length.toLocaleString()}</strong> Alumni
          </div>
          <div className="adb-metric-pill">
            <span className="material-symbols-outlined">hub</span>
            <strong>{Math.max(alumni.filter(a => a.isActive).length, 1).toLocaleString()}</strong> Active
          </div>
          <div className="adb-metric-pill">
            <span className="material-symbols-outlined">event</span>
            <strong>{events.length}</strong> Events
          </div>
        </div>
      </div>

      <div className="adb-main-layout">
        {/* ── Left Column: Feed ── */}
        <div className="adb-main-col">
          {/* Profile Completion CTA (More compact) */}
          <div className="adb-completion-mini">
             <div className="adb-mini-info">
                <h3>Finish your profile</h3>
                <p>Help your peers find you better by completing your details.</p>
             </div>
             <div className="adb-mini-stats">
                <div className="adb-mini-pct-ring">
                   <svg viewBox="0 0 36 36" className="circular-chart">
                      <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="circle" strokeDasharray={`${completionPct}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                   </svg>
                   <span>{completionPct}%</span>
                </div>
                <Link to="/portal/profile?mode=edit" className="adb-mini-btn">Edit Profile</Link>
             </div>
          </div>

          <div className="adb-section">
            <div className="adb-section-header">
              <h2 className="adb-section-title">Latest Updates</h2>
              <Link to="/portal/feed" className="adb-view-link">Visit Feed</Link>
            </div>
            <div className="adb-feed-list">
              {displayPosts.length > 0 ? (
                displayPosts.map(post => (
                  <ActivityCard key={post._id} post={post} />
                ))
              ) : (
                <div className="adb-empty-state">No recent activity found.</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Column: Sidebar ── */}
        <aside className="adb-sidebar-col">
          {/* Quick Actions */}
          <div className="adb-sidebar-card">
            <h3 className="adb-sidebar-title">Quick Actions</h3>
            <div className="adb-action-grid">
               {QUICK_ACTIONS.map(action => (
                 <Link key={action.label} to={action.to} className="adb-action-item" style={{"--accent": action.color}}>
                    <span className="material-symbols-outlined">{action.icon}</span>
                    <span className="action-label">{action.label}</span>
                 </Link>
               ))}
            </div>
          </div>

          {/* Suggested Connections */}
          <div className="adb-sidebar-card">
            <div className="adb-sidebar-header">
               <h3 className="adb-sidebar-title">Suggested Peers</h3>
               <Link to="/portal/alumni" className="adb-view-link">View All</Link>
            </div>
            <div className="adb-suggestion-list">
               {suggestedConnections.slice(0, 3).map((c, i) => {
                 const name = c.name || c.userId?.name || "Alumni Member";
                 const initials = name.split(" ").map(n => n[0]).join("").toUpperCase();

                 return (
                   <div key={c._id || i} className="adb-peer-card">
                      <div className="adb-peer-avatar" style={{ background: ["#6366f1","#0ea5e9","#10b981"][i % 3] }}>
                         {initials}
                      </div>
                      <div className="adb-peer-info">
                         <strong>{name}</strong>
                         <p>{c.occupation || c.designation || (c.batch || c.leavingYear ? `Batch of ${c.batch || c.leavingYear}` : "Member")}</p>
                      </div>
                      <Link to="/portal/alumni" className="adb-peer-btn">
                         <span className="material-symbols-outlined">add</span>
                      </Link>
                   </div>
                 );
               })}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="adb-sidebar-card">
            <div className="adb-sidebar-header">
               <h3 className="adb-sidebar-title">Upcoming Events</h3>
               <Link to="/portal/events" className="adb-view-link">All Events</Link>
            </div>
            <div className="adb-mini-events">
                {events.slice(0, 2).map((ev, i) => {
                  const dateObj = ev.date || ev.startDate ? new Date(ev.date || ev.startDate) : new Date();
                  const isInvalid = isNaN(dateObj.getTime());
                  const displayDate = isInvalid ? new Date() : dateObj;
                  
                  return (
                    <div key={ev._id || i} className="adb-mini-event">
                      <div className="event-date-box">
                        <span className="month">{displayDate.toLocaleString('default', { month: 'short' })}</span>
                        <span className="day">{displayDate.getDate()}</span>
                      </div>
                    <div className="event-content">
                       <h4>{ev.title}</h4>
                       <p>{ev.location || "Campus"}</p>
                    </div>
                   </div>
                  );
                })}
            </div>
          </div>

          {/* Celebrations Widget */}
          <CelebrationWidget />

          {/* Community Stats Donut (Visual Only) */}
          <div className="adb-sidebar-card adb-community-card">
             <div className="adb-card-blob" />
             <h3 className="adb-sidebar-title">Our Growing Network</h3>
             <DonutChart 
                total={alumni.length}
                slices={[
                  {label:"Active",pct:65,color:"#6366f1"},
                  {label:"Pending",pct:35,color:"#e2e8f0"}
                ]} 
             />
             <p className="adb-community-sub">Connecting <strong>{alumni.length.toLocaleString()}</strong> alumni across the globe.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ── Sparkline ───────────────────────────────────────────── */
function Spark({ color="#6366f1", up=true }) {
  const pts = up ? "0,22 18,18 36,20 54,14 72,16 90,8 108,11" : "0,8 18,12 36,10 54,16 72,13 90,19 108,22";
  return (
    <svg width="108" height="28" viewBox="0 0 108 28" fill="none" style={{display:"block"}}>
      <defs><linearGradient id={`sg${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".18"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <polygon points={`0,28 ${pts} 108,28`} fill={`url(#sg${color.slice(1)})`}/>
      <polyline points={pts} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Mini donut chart ───────────────────────────────────── */
function DonutChart({ slices, total = 0 }) {
  let offset = 0;
  const r = 70, cx = 80, cy = 80, stroke = 22;
  const circ = 2 * Math.PI * r;
  return (
    <div className="donut-container">
      <svg width="160" height="160" viewBox="0 0 160 160">
        {slices.map((s, i) => {
          const dash = (s.pct / 100) * circ;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset * circ / 100}
              strokeLinecap="round"
              style={{transform:"rotate(-90deg)",transformOrigin:"80px 80px", transition: "all 0.5s ease"}}/>
          );
          offset += s.pct;
          return el;
        })}
        <text x="80" y="78" textAnchor="middle" fontSize="22" fontWeight="900" fill="#fff" style={{fontFamily: 'Outfit'}}>{total.toLocaleString()}</text>
        <text x="80" y="96" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.5)" fontWeight="600" style={{fontFamily: 'Outfit', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Total Members</text>
      </svg>
    </div>
  );
}

/* ── Mini line chart ────────────────────────────────────── */
function LineChart() {
  const months = ["Dec '23","Jan '24","Feb '24","Mar '24","Apr '24","May '24"];
  const total  = [3000,3300,3700,4100,4500,4892];
  const newM   = [200,350,450,600,900,1200];
  const W=460, H=130, pad=28;
  const xScale = i => pad + i*(W-2*pad)/5;
  const yScale = (v,mn,mx) => H-pad - (v-mn)/(mx-mn)*(H-2*pad);
  const tPts = total.map((v,i)=>`${xScale(i)},${yScale(v,2800,5100)}`).join(" ");
  const nPts = newM.map((v,i)=>`${xScale(i)},${yScale(v,100,1400)}`).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block"}}>
      <defs>
        <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity=".15"/><stop offset="100%" stopColor="#6366f1" stopOpacity="0"/></linearGradient>
      </defs>
      {[0,1,2,3,4].map(i=><line key={i} x1={pad} x2={W-pad} y1={pad+i*(H-2*pad)/4} y2={pad+i*(H-2*pad)/4} stroke="#f1f5f9" strokeWidth="1"/>)}
      {months.map((m,i)=><text key={i} x={xScale(i)} y={H-6} textAnchor="middle" fontSize="9" fill="#94a3b8">{m}</text>)}
      {[1000,2000,3000,4000,5000].map((v,i)=><text key={i} x={pad-4} y={yScale(v,2800,5100)+3} textAnchor="end" fontSize="8" fill="#94a3b8">{v/1000}K</text>)}
      <polygon points={`${pad},${H-pad} ${tPts} ${W-pad},${H-pad}`} fill="url(#tg)"/>
      <polyline points={tPts} stroke="#6366f1" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {total.map((v,i)=><circle key={i} cx={xScale(i)} cy={yScale(v,2800,5100)} r="3" fill="#6366f1"/>)}
      <polyline points={nPts} stroke="#10b981" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {newM.map((v,i)=><circle key={i} cx={xScale(i)} cy={yScale(v,100,1400)} r="3" fill="#10b981"/>)}
    </svg>
  );
}

/* ── Admin Dashboard ────────────────────────────────────── */
function AdminDashboard({ logic }) {
  const { auth, tenant, queries } = logic;
  const alumni    = queries.alumni.data    || [];
  const events    = queries.events.data    || [];
  const jobs      = queries.jobs.data      || [];
  const announce  = queries.announcements.data || [];
  
  const dashboardRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async () => {
    if (!dashboardRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const opt = {
        margin:       [10, 10, 10, 10], // top, left, bottom, right
        filename:     `${tenant.displayName}_Dashboard_Report.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };
      
      // Temporarily add a class for printing styles if needed
      dashboardRef.current.classList.add("exporting-pdf");
      await html2pdf().set(opt).from(dashboardRef.current).save();
      dashboardRef.current.classList.remove("exporting-pdf");
    } catch (err) {
      console.error("PDF Export failed:", err);
      alert("Failed to export dashboard to PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const STATS = [
    { icon:"people",      label:"Total Members",      value: alumni.length || 4892,  change:"12.5% vs last month", color:"#6366f1", bg:"#eff0ff" },
    { icon:"person_add",  label:"New Registrations",  value: Math.round((alumni.length||148)*0.03)||148, change:"18.3% vs last month", color:"#10b981", bg:"#f0fdf4" },
    { icon:"check_circle",label:"Active Members",     value: Math.round((alumni.length||2945)*0.6)||2945, change:"8.7% vs last month",  color:"#f59e0b", bg:"#fff7ed" },
    { icon:"work",        label:"Active Jobs",        value: jobs.filter(j=>j.adminStatus==="Approved").length||36, change:"9.1% vs last month", color:"#8b5cf6", bg:"#fdf4ff" },
    { icon:"event",       label:"Upcoming Events",    value: events.length||8,  change:"14.3% vs last month", color:"#0ea5e9", bg:"#eff6ff" },
  ];

  const DONUT_SLICES = [
    {label:"2020s",pct:37.7,count:1842,color:"#6366f1"},
    {label:"2010s",pct:32.0,count:1563,color:"#0ea5e9"},
    {label:"2000s",pct:20.2,count:987, color:"#f59e0b"},
    {label:"1990s",pct:6.4, count:312, color:"#10b981"},
    {label:"Earlier",pct:3.7,count:188,color:"#e2e8f0"},
  ];

  const RECENT_REGS = [
    {name:"Rahul Sharma", dept:"BE Computer Engineering - 2022",time:"2h ago",color:"#6366f1"},
    {name:"Neha Patel",   dept:"BE EXTC - 2021",               time:"4h ago",color:"#10b981"},
    {name:"Amit Verma",   dept:"BE IT - 2023",                 time:"6h ago",color:"#f59e0b"},
    {name:"Sneha Iyer",   dept:"BE Computer Engineering - 2020",time:"1d ago",color:"#8b5cf6"},
    {name:"Vivek Singh",  dept:"BE Mechanical - 2022",         time:"1d ago",color:"#0ea5e9"},
  ];

  const TOP_CITIES = [
    {city:"Mumbai",   count:1842, pct:100},
    {city:"Pune",     count:892,  pct:48},
    {city:"Bengaluru",count:623,  pct:34},
    {city:"Delhi",    count:412,  pct:22},
    {city:"Hyderabad",count:298,  pct:16},
  ];

  const UPComing_EVENTS = events.length > 0
    ? events.slice(0,3).map(ev => ({
        month: new Date(ev.date||ev.startDate||Date.now()).toLocaleString("en",{month:"short"}).toUpperCase(),
        day:   new Date(ev.date||ev.startDate||Date.now()).getDate(),
        title: ev.title,
        loc:   ev.location||"Online",
        time:  "7:00 PM IST",
        color: ["#6366f1","#10b981","#f59e0b"][0],
      }))
    : [
        {month:"MAY",day:"30",title:"Alumni Networking Night",loc:"Mumbai",      time:"7:00 PM IST",color:"#6366f1"},
        {month:"JUN",day:"08",title:"Placement Talk Series",  loc:"Online",      time:"5:00 PM IST",color:"#10b981"},
        {month:"JUN",day:"15",title:"Entrepreneurship Summit",loc:"Pune",        time:"10:00 AM IST",color:"#f59e0b"},
      ];

  const ACTIVITY = [
    {icon:"person_add",  text:<>New alumni registration by <strong>Priya Mehta</strong> (BE IT · 2021)</>,       time:"2 hours ago",  color:"#6366f1"},
    {icon:"event",       text:<>Event <strong>"Alumni Networking Night"</strong> scheduled on May 30, 2024</>,   time:"4 hours ago",  color:"#10b981"},
    {icon:"work",        text:<>New job posted: <strong>Senior Software Engineer at Google</strong></>,           time:"6 hours ago",  color:"#0ea5e9"},
    {icon:"diversity_3", text:<>New group <strong>"AI/ML Enthusiasts"</strong> created by Arjun Kapoor</>,       time:"1 day ago",    color:"#f59e0b"},
    {icon:"campaign",    text:<>News article <strong>"SPIT Ranked Among Top Engineering Colleges"</strong> published</>,time:"2 days ago",color:"#8b5cf6"},
  ];

  const QUICK = [
    {icon:"event",      label:"Add Event", to:"/portal/events/create"},
    {icon:"work",       label:"Add Job",   to:"/portal/jobs"},
    {icon:"campaign",   label:"Add News",  to:"/portal/newsroom"},
    {icon:"send",       label:"Send Email",to:"/portal/settings"},
  ];

  const FOOTER_STATS = [
    {icon:"account_balance",label:"Total Institutes",value:"1",sub:"SPIT"},
    {icon:"groups",         label:"Total Alumni",    value:(alumni.length||4892).toLocaleString(),sub:"Across all batches"},
    {icon:"language",       label:"Alumni Reach",    value:"28",sub:"Countries"},
    {icon:"person",         label:"Profile Completion",value:"72%",sub:"↑ 6% vs last month",trend:true},
  ];

  return (
    <div className="adm-root adm-root--modern module-admin" ref={dashboardRef}>
      {/* ── Top Section: Title & Actions ── */}
      <div className="adm-header-section">
        <div className="adm-title-box">
          <h1 className="adm-welcome-title">Institution Overview</h1>
          <p className="adm-welcome-sub">Managing {tenant.displayName} Central Hub</p>
        </div>
        <div className="adm-header-actions">
           <button 
              className="adm-action-btn primary"
              onClick={handleExportPdf}
              disabled={isExporting}
           >
              <span className="material-symbols-outlined">
                {isExporting ? "hourglass_empty" : "download"}
              </span>
              {isExporting ? "Exporting..." : "Export Report"}
           </button>
           <button className="adm-action-btn">
              <span className="material-symbols-outlined">settings</span>
           </button>
        </div>
      </div>

      {/* ── Stats Strip ── */}
      <div className="adm-stats-strip">
        {STATS.map(s => (
          <div key={s.label} className="adm-stat-pill">
            <div className="pill-icon" style={{color: s.color}}>
              <span className="material-symbols-outlined">{s.icon}</span>
            </div>
            <div className="pill-info">
               <span className="pill-value">{s.value.toLocaleString()}</span>
               <span className="pill-label">{s.label}</span>
            </div>
            <div className="pill-trend up">{s.change}</div>
          </div>
        ))}
      </div>

      <div className="adm-main-grid">
         {/* ── Left: Analytics ── */}
         <div className="adm-analytics-col">
            <div className="adm-card">
               <div className="adm-card-header">
                  <h3>Engagement Overview</h3>
                  <div className="chart-toggles">
                     <button className="active">Week</button>
                     <button>Month</button>
                  </div>
               </div>
               <div className="adm-chart-wrap">
                  <LineChart />
               </div>
            </div>

            <div className="adm-card-row">
               <div className="adm-card">
                  <h3>Batch Distribution</h3>
                  <div className="donut-wrap">
                     <DonutChart slices={[
                        {label: "2020-24", pct: 45, color: "#6366f1"},
                        {label: "2016-20", pct: 30, color: "#10b981"},
                        {label: "Older", pct: 25, color: "#f59e0b"}
                     ]} />
                  </div>
               </div>
               <div className="adm-card">
                  <h3>Top Departments</h3>
                  <div className="dept-list">
                     {[
                        {name: "Computer Science", count: 120, pct: 85},
                        {name: "IT", count: 95, pct: 70},
                        {name: "EXTC", count: 80, pct: 60}
                     ].map(d => (
                        <div key={d.name} className="dept-item">
                           <div className="dept-info">
                              <span>{d.name}</span>
                              <strong>{d.count}</strong>
                           </div>
                           <div className="dept-bar"><div style={{width: `${d.pct}%`}} /></div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>

         {/* ── Right: Feed & Management ── */}
         <aside className="adm-side-col">
            <div className="adm-card">
               <div className="adm-card-header">
                  <h3>Recent Registrations</h3>
                  <Link to="/portal/alumni" className="view-link">Review</Link>
               </div>
               <div className="adm-reg-list">
                  {RECENT_REGS.map((r, i) => (
                    <div key={i} className="adm-reg-row">
                       <div className="reg-avatar" style={{background: r.color}}>{r.name[0]}</div>
                       <div className="reg-info">
                          <strong>{r.name}</strong>
                          <p>{r.dept}</p>
                       </div>
                       <span className="reg-tag">New</span>
                    </div>
                  ))}
               </div>
            </div>

            <div className="adm-card">
               <div className="adm-card-header">
                  <h3>Upcoming Events</h3>
                  <Link to="/portal/events" className="view-link">Manage</Link>
               </div>
               <div className="adm-event-mini-list">
                  {UPComing_EVENTS.map((ev, i) => (
                    <div key={i} className="adm-event-mini">
                       <div className="mini-date">{ev.day} {ev.month}</div>
                       <div className="mini-info">
                          <strong>{ev.title}</strong>
                          <p>{ev.loc}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </aside>
      </div>
    </div>
  );
}

/* ── Page export ──────────────────────────────────────────── */
function TenantDashboardPage() {
  const logic = useDashboardLogic();
  const { isAlumni } = logic;

  return isAlumni ? <AlumniDashboard logic={logic} /> : <AdminDashboard logic={logic} />;
}

export default TenantDashboardPage;
