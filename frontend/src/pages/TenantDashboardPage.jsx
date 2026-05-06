import { Link } from "react-router-dom";
import { useDashboardLogic } from "../hooks/useDashboardLogic.js";
import { PortalPageHeader } from "../components/PortalPrimitives.jsx";
import { DashboardMetrics } from "../components/DashboardMetrics.jsx";
import { ActivityFeed } from "../components/ActivityFeed.jsx";
import SectionCard from "../components/SectionCard.jsx";
import { formatRelativeTime } from "../utils/formatters.js";
import "../styles/Dashboard.css";
import "../styles/AdminDashboard.css";


/* ── Static sample data shown when live data is loading/empty ── */
const SAMPLE_POSTS = [
  {
    _id: "s1",
    author: { name: "Riya Desai", initials: "RD" },
    role: "Product Manager at Finverse",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    content: "Excited to share that our community mixer was a huge success! 🎉\nThanks to everyone who joined and made it special.",
    likeCount: 42, commentCount: 12, shareCount: 8,
    accentColor: "#6366f1",
  },
  {
    _id: "s2",
    author: { name: "Dev Mehta", initials: "DM" },
    role: "Engineering Lead at Orbit Systems",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    content: "Looking forward to mentoring 5 final-year students this month.\nFeel free to reach out if you need guidance!",
    likeCount: 25, commentCount: 6, shareCount: 4,
    accentColor: "#0ea5e9",
  },
  {
    _id: "s3",
    author: { name: "SPIT Alumni Association", initials: "SA" },
    role: "Official",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    content: "Registrations open for the Annual Alumni Meet 2026!\nJoin us for a memorable experience. Register now.",
    likeCount: 67, commentCount: 18, shareCount: 12,
    accentColor: "#10b981",
  },
];

const SAMPLE_CONNECTIONS = [
  { id: "c1", name: "Sneha Iyer",  role: "Data Scientist at Google",    batch: "Batch of 2018", color: "#6366f1" },
  { id: "c2", name: "Arjun Kapoor", role: "Product Manager at Microsoft", batch: "Batch of 2017", color: "#0ea5e9" },
  { id: "c3", name: "Megha Nair",  role: "UX Designer at Adobe",         batch: "Batch of 2019", color: "#f59e0b" },
  { id: "c4", name: "Kunal Joshi", role: "Founder & CEO at TechNova",    batch: "Batch of 2016", color: "#10b981" },
];

const UPCOMING_EVENTS = [
  { month: "MAY", day: "24", title: "Annual Alumni Meet 2026", detail: "May 24, 2026 • 10:00 AM\nSPIT Campus, Mumbai", color: "#6366f1" },
  { month: "JUN", day: "07", title: "Startup Networking Night", detail: "Jun 07, 2026 • 6:30 PM\nWeWork, BKC Mumbai", color: "#10b981" },
  { month: "JUN", day: "21", title: "Career Mentorship Summit", detail: "Jun 21, 2026 • 11:00 AM\nOnline Event", color: "#f59e0b" },
];

const QUICK_ACTIONS = [
  { icon: "edit_note",   label: "Post Update",    to: "/portal" },
  { icon: "person_search", label: "Find Alumni", to: "/portal/alumni" },
  { icon: "work",        label: "Browse Jobs",    to: "/portal/jobs" },
  { icon: "diversity_3", label: "Join Groups",    to: "/portal/groups" },
  { icon: "event",       label: "Create Event",   to: "/portal/events" },
  { icon: "feedback",    label: "Give Feedback",  to: "/portal" },
];

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
  return (
    <div className="adb-activity-card">
      <div className="adb-activity-avatar" style={{ background: post.accentColor }}>
        {post.author?.initials || post.author?.name?.[0] || "?"}
      </div>
      <div className="adb-activity-body">
        <div className="adb-activity-meta">
          <span className="adb-activity-name">{post.author?.name}</span>
          <span className="adb-activity-role">{post.role}</span>
          <span className="adb-activity-time">{formatRelativeTime(post.createdAt)}</span>
        </div>
        <p className="adb-activity-text">{post.content}</p>
        <div className="adb-activity-actions">
          <span>❤️ {post.likeCount ?? 0}</span>
          <span>💬 {post.commentCount ?? 0}</span>
          <span>↗ {post.shareCount ?? 0}</span>
          <button className="adb-bookmark-btn" aria-label="Bookmark">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>bookmark_border</span>
          </button>
        </div>
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
  const mentorship = queries.mentorship.data || [];
  const posts = queries.posts.data || [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  /* Use live posts if available, else show samples */
  const displayPosts = posts.length > 0
    ? posts.slice(0, 3).map(p => ({
        ...p,
        role: p.author?.designation || p.author?.occupation || "",
        likeCount: p.likes?.length ?? 0,
        commentCount: p.comments?.length ?? 0,
        shareCount: 0,
        accentColor: ["#6366f1","#0ea5e9","#10b981"][Math.floor(Math.random()*3)],
      }))
    : SAMPLE_POSTS;

  return (
    <div className="adb-root">
      {/* ── Hero greeting card ──────────────────────────────── */}
      <div className="adb-hero-card">
        <div className="adb-hero-left">
          <h1 className="adb-hero-greeting">{greeting}, {firstName}! 👋</h1>
          <p className="adb-hero-sub">Here's what's happening in your alumni community today.</p>
          <div className="adb-profile-completion">
            <div className="adb-completion-header">
              <span className="adb-completion-label">Profile Completion</span>
              <span className="adb-completion-pct">{completionPct}% Complete</span>
            </div>
            <div className="adb-completion-bar">
              <div className="adb-completion-fill" style={{ width: `${completionPct}%` }} />
            </div>
            <Link to="/portal/profile?mode=edit" className="adb-completion-btn">Complete Now</Link>
          </div>
        </div>
        <div className="adb-hero-illustration">
          <div className="adb-hero-building">
            <span className="material-symbols-outlined" style={{ fontSize: 80, color: "#c7d2fe" }}>account_balance</span>
          </div>
          <div className="adb-hero-blob" />
        </div>
      </div>

      {/* ── Stat cards row ──────────────────────────────────── */}
      <div className="adb-stats-row">
        <StatCard icon="diversity_3"   label="Total Alumni"     value={alumni.length || "12.8K"} change="12%"  color="#6366f1" />
        <StatCard icon="hub"           label="Active Network"   value={`${Math.max(alumni.length, 2400).toLocaleString()}`} change="8%"   color="#0ea5e9" />
        <StatCard icon="handshake"     label="Mentorships"      value={mentorship.filter(m => m.status === "accepted").length || 320}  change="16%" color="#10b981" />
        <StatCard icon="event"         label="Events"           value={events.length || 24}   change="5%"  color="#f59e0b" />
        <StatCard icon="work"          label="Jobs Posted"      value={jobs.length || 56}     change="10%" color="#8b5cf6" />
      </div>

      {/* ── Main 3-col layout ───────────────────────────────── */}
      <div className="adb-content-grid">
        {/* Left: Recent Activity */}
        <div className="adb-col-left">
          <div className="adb-section-header">
            <span className="adb-section-title">Recent Activity</span>
            <Link to="/portal/alumni" className="adb-view-all">View All</Link>
          </div>
          <div className="adb-activity-list">
            {displayPosts.map(post => (
              <ActivityCard key={post._id} post={post} />
            ))}
            <button className="adb-load-more">Load more posts ▾</button>
          </div>
        </div>

        {/* Middle: Suggested Connections + Find Mentor CTA */}
        <div className="adb-col-mid">
          <div className="adb-section-header">
            <span className="adb-section-title">Suggested Connections</span>
            <Link to="/portal/alumni" className="adb-view-all">View All</Link>
          </div>
          <div className="adb-connections-list">
            {SAMPLE_CONNECTIONS.map(c => (
              <div key={c.id} className="adb-connection-item">
                <div className="adb-connection-avatar" style={{ background: c.color }}>{c.name[0]}</div>
                <div className="adb-connection-info">
                  <div className="adb-connection-name">{c.name}</div>
                  <div className="adb-connection-batch">{c.batch} · {c.role}</div>
                </div>
                <Link to="/portal/alumni" className="adb-connect-btn">
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>person_add</span>
                  Connect
                </Link>
              </div>
            ))}
          </div>

          {/* Find Your Mentor CTA */}
          <div className="adb-mentor-cta">
            <div className="adb-mentor-cta-left">
              <div className="adb-mentor-cta-title">Find Your Mentor</div>
              <div className="adb-mentor-cta-sub">Get guidance from experienced alumni and accelerate your career.</div>
              <Link to="/portal/messages" className="adb-mentor-cta-btn">Explore Mentors →</Link>
            </div>
            <div className="adb-mentor-avatars">
              {["#6366f1","#0ea5e9","#10b981","#f59e0b","#8b5cf6"].map((c, i) => (
                <div key={i} className="adb-mentor-avatar" style={{ background: c, zIndex: 5 - i }}>
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
              <div className="adb-mentor-avatar adb-mentor-avatar--more">+12</div>
            </div>
          </div>
        </div>

        {/* Right: Events + Quick Actions + Community Highlights */}
        <div className="adb-col-right">
          {/* Upcoming Events */}
          <div className="adb-right-section">
            <div className="adb-section-header">
              <span className="adb-section-title">Upcoming Events</span>
              <Link to="/portal/events" className="adb-view-all">View All</Link>
            </div>
            <div className="adb-events-list">
              {(events.length > 0 ? events.slice(0, 3).map((ev, i) => ({
                month: new Date(ev.date || ev.startDate || Date.now()).toLocaleString("default", { month: "short" }).toUpperCase(),
                day: new Date(ev.date || ev.startDate || Date.now()).getDate(),
                title: ev.title,
                detail: ev.location || "Online",
                color: UPCOMING_EVENTS[i]?.color || "#6366f1",
              })) : UPCOMING_EVENTS).map((ev, i) => (
                <div key={i} className="adb-event-item">
                  <div className="adb-event-date" style={{ borderLeftColor: ev.color }}>
                    <div className="adb-event-month" style={{ color: ev.color }}>{ev.month}</div>
                    <div className="adb-event-day">{ev.day}</div>
                  </div>
                  <div className="adb-event-info">
                    <div className="adb-event-title">{ev.title}</div>
                    <div className="adb-event-detail" style={{ whiteSpace: "pre-line" }}>{ev.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="adb-right-section">
            <div className="adb-section-title" style={{ marginBottom: "0.75rem" }}>Quick Actions</div>
            <div className="adb-quick-grid">
              {QUICK_ACTIONS.map(a => (
                <Link key={a.label} to={a.to} className="adb-quick-item">
                  <span className="material-symbols-outlined adb-quick-icon">{a.icon}</span>
                  <span className="adb-quick-label">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Community Highlights */}
          <div className="adb-right-section">
            <div className="adb-section-title" style={{ marginBottom: "0.75rem" }}>Community Highlights</div>
            <div className="adb-highlight-row">
              <div className="adb-highlight-avatars">
                {["#6366f1","#0ea5e9","#10b981"].map((c, i) => (
                  <div key={i} className="adb-highlight-avatar" style={{ background: c }}>
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <div className="adb-highlight-text">
                <div className="adb-highlight-name">Arjun and 24 others</div>
                <div className="adb-highlight-sub">joined the community this week</div>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#10b981" }}>trending_up</span>
            </div>
            <div className="adb-top-contributor">
              <span className="adb-contributor-label">Top Contributor</span>
              <div className="adb-contributor-row">
                <div className="adb-contributor-avatar">R</div>
                <span className="adb-contributor-name">Riya Desai</span>
                <span className="adb-contributor-pts">⭐ 120 points</span>
              </div>
            </div>
          </div>
        </div>
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
function DonutChart({ slices }) {
  let offset = 0;
  const r = 70, cx = 80, cy = 80, stroke = 28;
  const circ = 2 * Math.PI * r;
  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      {slices.map((s, i) => {
        const dash = (s.pct / 100) * circ;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset * circ / 100}
            style={{transform:"rotate(-90deg)",transformOrigin:"80px 80px"}}/>
        );
        offset += s.pct;
        return el;
      })}
      <text x="80" y="76" textAnchor="middle" fontSize="20" fontWeight="900" fill="#0f172a">4,892</text>
      <text x="80" y="94" textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="600">Total</text>
    </svg>
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
  const { auth, queries } = logic;
  const alumni    = queries.alumni.data    || [];
  const events    = queries.events.data    || [];
  const jobs      = queries.jobs.data      || [];
  const announce  = queries.announcements.data || [];

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
    <div className="adm-root">
      {/* ── Welcome header ── */}
      <div className="adm-welcome-row">
        <div>
          <h1 className="adm-welcome-title">Welcome back, Admin! 👋</h1>
          <p className="adm-welcome-sub">Here's what's happening with your institute today.</p>
        </div>
        <button className="adm-date-btn">
          <span className="material-symbols-outlined" style={{fontSize:16}}>calendar_today</span>
          May 18 – May 24, 2024
          <span className="material-symbols-outlined" style={{fontSize:16}}>expand_more</span>
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="adm-stats-row">
        {STATS.map(s => (
          <div key={s.label} className="adm-stat-card">
            <div className="adm-stat-top">
              <div className="adm-stat-icon" style={{background:s.bg,color:s.color}}>
                <span className="material-symbols-outlined" style={{fontSize:20}}>{s.icon}</span>
              </div>
              <span className="adm-stat-label">{s.label}</span>
            </div>
            <div className="adm-stat-value">{typeof s.value==="number"?s.value.toLocaleString():s.value}</div>
            <div className="adm-stat-foot">
              <span className="adm-stat-change">↑ {s.change}</span>
              <Spark color={s.color}/>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main 3-col grid ── */}
      <div className="adm-content-grid">

        {/* ── Col left: charts ── */}
        <div className="adm-col-charts">
          {/* Membership Overview */}
          <div className="adm-card">
            <div className="adm-card-header">
              <span className="adm-card-title">Membership Overview</span>
              <button className="adm-period-btn">Last 6 Months <span className="material-symbols-outlined" style={{fontSize:14}}>expand_more</span></button>
            </div>
            <div className="adm-chart-legend">
              <span className="adm-legend-dot" style={{background:"#6366f1"}}/>Total Members
              <span className="adm-legend-dot" style={{background:"#10b981",marginLeft:"1rem"}}/>New Members
            </div>
            <LineChart/>
          </div>

          {/* Members by Batch */}
          <div className="adm-card">
            <div className="adm-card-header">
              <span className="adm-card-title">Members by Batch</span>
            </div>
            <div className="adm-batch-layout">
              <DonutChart slices={DONUT_SLICES}/>
              <div className="adm-batch-legend">
                {DONUT_SLICES.map(s => (
                  <div key={s.label} className="adm-batch-row">
                    <span className="adm-batch-dot" style={{background:s.color}}/>
                    <span className="adm-batch-label">{s.label}</span>
                    <span className="adm-batch-count">{s.count.toLocaleString()}</span>
                    <span className="adm-batch-pct">({s.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="adm-card">
            <div className="adm-card-header">
              <span className="adm-card-title">Recent Activity</span>
              <Link to="/portal/alumni" className="adm-view-all">View All</Link>
            </div>
            <div className="adm-activity-list">
              {ACTIVITY.map((a,i) => (
                <div key={i} className="adm-activity-row">
                  <div className="adm-activity-icon" style={{background:a.color+"18",color:a.color}}>
                    <span className="material-symbols-outlined" style={{fontSize:15}}>{a.icon}</span>
                  </div>
                  <div className="adm-activity-body">
                    <p className="adm-activity-text">{a.text}</p>
                    <span className="adm-activity-time">{a.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Cities */}
          <div className="adm-card">
            <div className="adm-card-header">
              <span className="adm-card-title">Top Cities</span>
              <Link to="/portal/alumni" className="adm-view-all">View All</Link>
            </div>
            <div className="adm-cities-list">
              {TOP_CITIES.map(c => (
                <div key={c.city} className="adm-city-row">
                  <span className="material-symbols-outlined" style={{fontSize:14,color:"#94a3b8"}}>location_on</span>
                  <span className="adm-city-name">{c.city}</span>
                  <div className="adm-city-bar-bg">
                    <div className="adm-city-bar-fill" style={{width:`${c.pct}%`}}/>
                  </div>
                  <span className="adm-city-count">{c.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Col right: sidebar ── */}
        <div className="adm-col-sidebar">
          {/* Recent Registrations */}
          <div className="adm-card">
            <div className="adm-card-header">
              <span className="adm-card-title">Recent Registrations</span>
              <Link to="/portal/alumni" className="adm-view-all">View All</Link>
            </div>
            <div className="adm-reg-list">
              {RECENT_REGS.map(r => (
                <div key={r.name} className="adm-reg-row">
                  <div className="adm-reg-avatar" style={{background:r.color+"22",color:r.color}}>{r.name.split(" ").map(n=>n[0]).join("")}</div>
                  <div className="adm-reg-info">
                    <div className="adm-reg-name">{r.name}</div>
                    <div className="adm-reg-dept">{r.dept}</div>
                  </div>
                  <span className="adm-reg-time">{r.time}</span>
                </div>
              ))}
            </div>
            <Link to="/portal/alumni" className="adm-view-all-link">View All Registrations →</Link>
          </div>

          {/* Upcoming Events */}
          <div className="adm-card">
            <div className="adm-card-header">
              <span className="adm-card-title">Upcoming Events</span>
              <Link to="/portal/events" className="adm-view-all">View All</Link>
            </div>
            <div className="adm-events-list">
              {UPComing_EVENTS.map((ev,i) => (
                <div key={i} className="adm-event-row">
                  <div className="adm-event-cal" style={{borderLeft:`3px solid ${ev.color}`}}>
                    <div className="adm-event-month" style={{color:ev.color}}>{ev.month}</div>
                    <div className="adm-event-day">{ev.day}</div>
                  </div>
                  <div className="adm-event-info">
                    <div className="adm-event-title">{ev.title}</div>
                    <div className="adm-event-meta">{ev.loc} · {ev.time}</div>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/portal/events" className="adm-view-all-link">View All Events →</Link>
          </div>

          {/* Quick Actions */}
          <div className="adm-card">
            <div className="adm-card-title" style={{marginBottom:".75rem"}}>Quick Actions</div>
            <div className="adm-quick-grid">
              {QUICK.map(q => (
                <Link key={q.label} to={q.to} className="adm-quick-item">
                  <span className="material-symbols-outlined" style={{fontSize:20,color:"#6366f1"}}>{q.icon}</span>
                  <span>{q.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="adm-card">
            <div className="adm-card-title" style={{marginBottom:".75rem"}}>System Status</div>
            <div className="adm-status-row">
              <div className="adm-status-dot"/>
              <div>
                <div className="adm-status-label">All Systems Operational</div>
                <div className="adm-status-sub">Everything is running smoothly</div>
              </div>
              <span className="material-symbols-outlined" style={{fontSize:16,color:"#94a3b8",marginLeft:"auto"}}>chevron_right</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer summary strip ── */}
      <div className="adm-footer-strip">
        {FOOTER_STATS.map(f => (
          <div key={f.label} className="adm-footer-item">
            <div className="adm-footer-icon">
              <span className="material-symbols-outlined" style={{fontSize:22,color:"#6366f1"}}>{f.icon}</span>
            </div>
            <div>
              <div className="adm-footer-value">{f.value}</div>
              <div className="adm-footer-label">{f.label}</div>
              <div className={`adm-footer-sub ${f.trend?"adm-footer-sub--up":""}`}>{f.sub}</div>
            </div>
          </div>
        ))}
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
