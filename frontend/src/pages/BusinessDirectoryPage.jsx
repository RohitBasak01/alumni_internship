import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import {
  createBusinessListing, deleteBusinessListing, fetchBusinessListings,
  fetchCitiesByState, fetchCountries, fetchStatesByCountry,
} from "../lib/api.js";
import "../styles/BusinessDirectory.css";

/* ── Static data ─────────────────────────────────────────── */
const initialForm = {
  businessName:"",description:"",website:"",industry:"",product:"",service:"",
  country:"",state:"",city:"",location:"",contactEmail:"",contactCountry:"",
  contactNumber:"",isManagementTeam:"yes",logoUrl:"",termsAccepted:false,
};
const INDUSTRY_CATALOG = {
  "Advertising & Marketing":{ products:["Ad Platform","CRM","Campaign Automation","Analytics Dashboard","Creative Toolkit"], services:["Brand Strategy","SEO","Social Media Management","Performance Marketing","Content Production"] },
  Technology:{ products:["SaaS Platform","Mobile App","Developer Tools","Cybersecurity Suite","Cloud Infrastructure"], services:["Custom Software Development","Cloud Migration","DevOps Consulting","Data Engineering","Tech Support"] },
  Finance:{ products:["Payment Gateway","Lending Platform","Investment App","Risk Engine","Accounting Software"], services:["Financial Advisory","Tax Planning","Compliance Services","Bookkeeping","Insurance Advisory"] },
  Education:{ products:["LMS","Assessment Platform","Virtual Classroom","Skill Certification Portal","Student CRM"], services:["Curriculum Design","Corporate Training","Career Counseling","Tutoring","Admissions Consulting"] },
  Healthcare:{ products:["EHR System","Telemedicine App","Hospital Management Suite","Diagnostic Device","Patient Portal"], services:["Clinical Consulting","Remote Care","Diagnostics","Wellness Programs","Medical Staffing"] },
  Retail:{ products:["POS System","E-commerce Storefront","Inventory Platform","Loyalty App","Warehouse Automation"], services:["Retail Consulting","Visual Merchandising","Supply Chain Services","Last-mile Delivery","Franchise Support"] },
  Consulting:{ products:["Process Toolkit","Benchmark Platform","Project Dashboard","Knowledge Base","Workflow Suite"], services:["Management Consulting","Operations Consulting","HR Consulting","Digital Transformation","Strategy Advisory"] },
  Marketing:{ products:["Marketing Platform","Lead Gen Tool","Email Suite"], services:["Digital Marketing","SEO","Growth Hacking"] },
  "Real Estate":{ products:["Property Portal","CRM","Valuation Tool"], services:["Property Management","Brokerage","Consulting"] },
  Manufacturing:{ products:["ERP","Inventory System","Quality Control Suite"], services:["Process Optimization","Supply Chain","Quality Assurance"] },
  Other:{ products:["General Product"], services:["General Service"] },
};
const industryOptions = Object.keys(INDUSTRY_CATALOG);

const CATEGORY_ICONS = {
  Technology:"devices", Finance:"payments", Healthcare:"favorite", Education:"school",
  Marketing:"campaign", Consulting:"handshake", "Real Estate":"home", Manufacturing:"factory",
  "Advertising & Marketing":"ads_click", Retail:"storefront", Other:"category",
};
const LOGO_COLORS = ["#6366f1","#10b981","#0ea5e9","#f59e0b","#8b5cf6","#ef4444","#ec4899","#14b8a6"];

const STATS = [
  { icon:"business",    label:"Total Businesses",    key:"total",    trend:"12% this month", trendColor:"#10b981" },
  { icon:"verified",    label:"Verified Businesses", key:"verified", trend:"18% this month", trendColor:"#10b981" },
  { icon:"category",    label:"Industries",          key:"industries",trend:"All categories", trendColor:"#6366f1" },
  { icon:"hub",         label:"Total Connections",   key:"connections",trend:"9% this month", trendColor:"#10b981" },
];
const SORT_OPTIONS = ["Recently Added","A–Z","Most Connected","Industry"];

function buildLocationValue(country, state, city) {
  return [city, state, country].map(v=>String(v||"").trim()).filter(Boolean).join(", ");
}
function logoColor(name="") { return LOGO_COLORS[(name.charCodeAt(0)||65)%LOGO_COLORS.length]; }
function initials(name="") { return name.split(" ").map(w=>w[0]||"").join("").slice(0,2).toUpperCase()||"?"; }

/* ── Business card ───────────────────────────────────────── */
function BizCard({ item, canDel, onDelete }) {
  const tags = [item.industry, item.product, item.service].filter(Boolean);
  const color = logoColor(item.businessName);
  const year = item.createdAt ? new Date(item.createdAt).getFullYear() : "";
  const founderName = item.owner?.name || "Alumni";
  return (
    <article className="bd-card">
      <div className="bd-card-top">
        <div className="bd-card-logo-wrap">
          {item.logoUrl
            ? <img src={item.logoUrl} alt={item.businessName} className="bd-card-logo-img"/>
            : <div className="bd-card-logo-init" style={{background:color+"18",color}}>{initials(item.businessName)}</div>
          }
        </div>
        <span className="bd-verified-badge">
          <span className="material-symbols-outlined" style={{fontSize:11}}>verified</span>Verified
        </span>
      </div>
      <div className="bd-card-body">
        <h3 className="bd-card-name">
          {item.businessName}
          <span className="material-symbols-outlined bd-verified-icon" style={{fontSize:15,color:"#6366f1"}}>verified</span>
        </h3>
        <div className="bd-card-category">{item.industry||"Business"}</div>
        {item.description && <p className="bd-card-desc">{item.description}</p>}
        <div className="bd-card-location">
          <span className="material-symbols-outlined" style={{fontSize:13}}>location_on</span>
          {item.location||"India"}
        </div>
        <div className="bd-card-founder">
          <div className="bd-founder-avatar" style={{background:color+"22",color}}>{founderName[0]?.toUpperCase()}</div>
          <span>Founded by <strong>{founderName}</strong>{year?" ("+year+")":""}</span>
        </div>
        {tags.length > 0 && (
          <div className="bd-tags">
            {tags.slice(0,3).map(t=><span key={t} className="bd-tag">{t}</span>)}
          </div>
        )}
        <div className="bd-card-actions">
          <button className="bd-view-btn">View Profile</button>
          <button className="bd-connect-btn">
            <span className="material-symbols-outlined" style={{fontSize:14}}>person_add</span>Connect
          </button>
          {item.website && (
            <a href={item.website} target="_blank" rel="noreferrer" className="bd-web-btn" title="Visit Website">
              <span className="material-symbols-outlined" style={{fontSize:14}}>open_in_new</span>
            </a>
          )}
          {canDel && (
            <button className="bd-del-btn" onClick={onDelete} title="Remove">
              <span className="material-symbols-outlined" style={{fontSize:14}}>delete</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/* ── Add Business form (existing logic, new styling) ─────── */
function AddBusinessForm({ onBack }) {
  const queryClient = useQueryClient();
  const navigate    = useNavigate();
  const [form, setForm]             = useState(initialForm);
  const [logoFileName, setLFN]      = useState("No file chosen");
  const selectedCatalog = INDUSTRY_CATALOG[form.industry] || INDUSTRY_CATALOG.Other;

  const countriesQuery = useQuery({ queryKey:["location-countries"], queryFn:fetchCountries });
  const statesQuery    = useQuery({ queryKey:["location-states",form.country], queryFn:()=>fetchStatesByCountry(form.country), enabled:Boolean(form.country) });
  const citiesQuery    = useQuery({ queryKey:["location-cities",form.country,form.state], queryFn:()=>fetchCitiesByState(form.country,form.state), enabled:Boolean(form.country)&&Boolean(form.state) });

  const createMutation = useMutation({
    mutationFn: createBusinessListing,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey:["business-listings"] }); navigate("/portal/business-directory"); },
  });

  function handleChange(e) {
    const { name, type, value, checked } = e.target;
    if (name==="industry") { setForm(c=>({...c,industry:value,product:"",service:""})); return; }
    if (name==="country")  { setForm(c=>({...c,country:value,state:"",city:"",location:buildLocationValue(value,"","")})); return; }
    if (name==="state")    { setForm(c=>({...c,state:value,city:"",location:buildLocationValue(c.country,value,"")})); return; }
    if (name==="city")     { setForm(c=>({...c,city:value,location:buildLocationValue(c.country,c.state,value)})); return; }
    setForm(c=>({...c,[name]:type==="checkbox"?checked:value}));
  }
  function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) { setForm(c=>({...c,logoUrl:""})); setLFN("No file chosen"); return; }
    if (!["image/png","image/jpeg","image/jpg"].includes(file.type)) { setLFN("Invalid file type"); return; }
    if (file.size > 2*1024*1024) { setLFN("File exceeds 2MB"); return; }
    const reader = new FileReader();
    reader.onload = () => { setForm(c=>({...c,logoUrl:String(reader.result||"")})); setLFN(file.name); };
    reader.readAsDataURL(file);
  }
  function handleSubmit(e) {
    e.preventDefault();
    createMutation.mutate({
      businessName:form.businessName, description:form.description, website:form.website,
      industry:form.industry, product:form.product, service:form.service,
      location:buildLocationValue(form.country,form.state,form.city),
      contactEmail:form.contactEmail, contactCountry:form.contactCountry,
      contactNumber:form.contactNumber, isManagementTeam:form.isManagementTeam==="yes",
      logoUrl:form.logoUrl, termsAccepted:form.termsAccepted,
    });
  }

  return (
    <div className="bd-root">
      <div className="bd-page-header">
        <div>
          <h1 className="bd-page-title">Add Business Listing</h1>
          <p className="bd-page-sub">Showcase your business to the alumni network.</p>
        </div>
        <button className="bd-back-btn" onClick={onBack}>← Back to Directory</button>
      </div>
      <div className="bd-form-card">
        <form onSubmit={handleSubmit} className="bd-form">
          <div className="bd-form-row">
            <div className="bd-form-field bd-form-field--full">
              <label className="bd-label">Business Name *</label>
              <input className="bd-input" name="businessName" value={form.businessName} onChange={handleChange} required/>
            </div>
          </div>
          <div className="bd-form-field bd-form-field--full">
            <label className="bd-label">Description * <small>{form.description.length}/250</small></label>
            <textarea className="bd-input" name="description" value={form.description} onChange={handleChange} maxLength={250} rows={3} required/>
          </div>
          <div className="bd-form-row">
            <div className="bd-form-field">
              <label className="bd-label">Website</label>
              <input className="bd-input" name="website" type="url" value={form.website} onChange={handleChange} placeholder="https://example.com"/>
            </div>
            <div className="bd-form-field">
              <label className="bd-label">Industry</label>
              <select className="bd-input" name="industry" value={form.industry} onChange={handleChange}>
                <option value="">Select industry</option>
                {industryOptions.map(i=><option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>
          <div className="bd-form-row">
            <div className="bd-form-field">
              <label className="bd-label">Product</label>
              <select className="bd-input" name="product" value={form.product} onChange={handleChange} disabled={!form.industry}>
                <option value="">{form.industry?"Select product":"Select industry first"}</option>
                {selectedCatalog.products.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="bd-form-field">
              <label className="bd-label">Service</label>
              <select className="bd-input" name="service" value={form.service} onChange={handleChange} disabled={!form.industry}>
                <option value="">{form.industry?"Select service":"Select industry first"}</option>
                {selectedCatalog.services.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="bd-form-row">
            <div className="bd-form-field">
              <label className="bd-label">Country</label>
              <select className="bd-input" name="country" value={form.country} onChange={handleChange}>
                <option value="">Select country</option>
                {(countriesQuery.data||[]).map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="bd-form-field">
              <label className="bd-label">State</label>
              <select className="bd-input" name="state" value={form.state} onChange={handleChange} disabled={!form.country||statesQuery.isLoading}>
                <option value="">{form.country?"Select state":"Select country first"}</option>
                {(statesQuery.data||[]).map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="bd-form-field">
              <label className="bd-label">City</label>
              <select className="bd-input" name="city" value={form.city} onChange={handleChange} disabled={!form.state||citiesQuery.isLoading}>
                <option value="">{form.state?"Select city":"Select state first"}</option>
                {(citiesQuery.data||[]).map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="bd-form-row">
            <div className="bd-form-field">
              <label className="bd-label">Contact Email *</label>
              <input className="bd-input" name="contactEmail" type="email" value={form.contactEmail} onChange={handleChange} required/>
            </div>
            <div className="bd-form-field">
              <label className="bd-label">Contact Country</label>
              <select className="bd-input" name="contactCountry" value={form.contactCountry} onChange={handleChange}>
                <option value="">Country</option>
                {(countriesQuery.data||[]).map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="bd-form-field">
              <label className="bd-label">Contact Number *</label>
              <input className="bd-input" name="contactNumber" value={form.contactNumber} onChange={handleChange} placeholder="9876543210" required/>
            </div>
          </div>
          <div className="bd-form-field">
            <label className="bd-label">Part of management team?</label>
            <div className="bd-radio-group">
              {["yes","no"].map(v=>(
                <label key={v} className="bd-radio-label">
                  <input type="radio" name="isManagementTeam" value={v} checked={form.isManagementTeam===v} onChange={handleChange}/>
                  {v.charAt(0).toUpperCase()+v.slice(1)}
                </label>
              ))}
            </div>
          </div>
          <div className="bd-form-field">
            <label className="bd-label">Logo (PNG/JPG, max 2MB)</label>
            <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleLogoChange}/>
            <small style={{color:"#94a3b8"}}>{logoFileName}</small>
          </div>
          <label className="bd-checkbox-row">
            <input type="checkbox" name="termsAccepted" checked={form.termsAccepted} onChange={handleChange}/>
            I consent and agree to the terms and conditions.
          </label>
          <div className="bd-form-actions">
            <button className="bd-submit-btn" type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending?"Submitting...":"Submit Listing"}
            </button>
            <button className="bd-cancel-btn" type="button" onClick={onBack}>Cancel</button>
          </div>
          {createMutation.isError && <p style={{color:"#ef4444",fontSize:"0.8rem"}}>{createMutation.error.message}</p>}
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Page
   ══════════════════════════════════════════════════════════ */
export default function BusinessDirectoryPage() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const auth      = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery]                   = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [productFilter, setProductFilter]   = useState("");
  const [serviceFilter, setServiceFilter]   = useState("");
  const [sortBy, setSortBy]                 = useState("Recently Added");
  const [page, setPage]                     = useState(1);
  const PAGE_SIZE = 8;
  const isAdmin = auth.user?.role === "institute_admin";
  const isAddPage = location.pathname.endsWith("/business-directory/add");

  const deleteMutation = useMutation({
    mutationFn: deleteBusinessListing,
    onSuccess: () => queryClient.invalidateQueries({ queryKey:["business-listings"] }),
  });

  const listingsQuery = useQuery({ queryKey:["business-listings"], queryFn:fetchBusinessListings });
  const listings = listingsQuery.data || [];

  const productOptions = [...new Set(listings.map(i=>i.product).filter(Boolean))];
  const serviceOptions = [...new Set(listings.map(i=>i.service).filter(Boolean))];

  const industryCategories = useMemo(() => {
    const counts = {};
    listings.forEach(l=>{ if (l.industry) counts[l.industry]=(counts[l.industry]||0)+1; });
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  }, [listings]);

  const filteredListings = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter(item => {
      const text = `${item.businessName} ${item.description} ${item.industry} ${item.product||""} ${item.service||""} ${item.location}`.toLowerCase();
      return (!q||text.includes(q)) && (!industryFilter||item.industry===industryFilter) && (!productFilter||item.product===productFilter) && (!serviceFilter||item.service===serviceFilter);
    });
  }, [listings, query, industryFilter, productFilter, serviceFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredListings.length/PAGE_SIZE));
  const pageListings = filteredListings.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const featured = listings.slice(0,4);

  function canDelete(item) { return isAdmin || item.owner?.id===auth.user?.id; }

  if (isAddPage) return <AddBusinessForm onBack={()=>navigate("/portal/business-directory")}/>;

  return (
    <div className="bd-root">
      {/* Header */}
      <div className="bd-page-header">
        <div>
          <h1 className="bd-page-title">Business Directory</h1>
          <p className="bd-page-sub">Discover alumni-owned businesses and professional services.</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="bd-stats-row">
        {STATS.map((s,i)=>{
          const vals = [filteredListings.length, Math.round(filteredListings.length*0.68), industryCategories.length, filteredListings.length*3];
          return (
            <div key={s.key} className="bd-stat-card">
              <div className="bd-stat-icon" style={{background:["#eff0ff","#f0fdf4","#fff7ed","#fdf4ff"][i],color:["#6366f1","#10b981","#f59e0b","#8b5cf6"][i]}}>
                <span className="material-symbols-outlined" style={{fontSize:22}}>{s.icon}</span>
              </div>
              <div>
                <div className="bd-stat-label">{s.label}</div>
                <div className="bd-stat-value">{vals[i].toLocaleString()}</div>
                <div className="bd-stat-trend" style={{color:s.trendColor}}>↑ {s.trend}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search bar + Add button */}
      <div className="bd-search-row">
        <div className="bd-search-wrap">
          <span className="material-symbols-outlined bd-search-icon">search</span>
          <input className="bd-search-input" placeholder="Search businesses by name, service, or keyword..." value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/>
          <button className="bd-search-submit" aria-label="Search">
            <span className="material-symbols-outlined" style={{fontSize:18}}>search</span>
          </button>
        </div>
        <Link to="/portal/business-directory/add" className="bd-add-btn">
          <span className="material-symbols-outlined" style={{fontSize:16}}>add</span>
          Add Your Business
        </Link>
      </div>

      {/* Filter row */}
      <div className="bd-filter-row">
        <select className="bd-filter-select" value={industryFilter} onChange={e=>{setIndustryFilter(e.target.value);setPage(1);}}>
          <option value="">All Industries</option>
          {industryOptions.map(i=><option key={i} value={i}>{i}</option>)}
        </select>
        <select className="bd-filter-select" value={serviceFilter} onChange={e=>{setServiceFilter(e.target.value);setPage(1);}}>
          <option value="">All Services</option>
          {serviceOptions.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select className="bd-filter-select" value={productFilter} onChange={e=>{setProductFilter(e.target.value);setPage(1);}}>
          <option value="">All Locations</option>
          {productOptions.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
        <div className="bd-sort-wrap">
          <span style={{fontSize:"0.78rem",color:"#64748b",fontWeight:600}}>Sort:</span>
          <select className="bd-filter-select" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            {SORT_OPTIONS.map(o=><option key={o}>{o}</option>)}
          </select>
        </div>
        <button className="bd-more-filters-btn">
          <span className="material-symbols-outlined" style={{fontSize:15}}>filter_list</span>
          Filters
        </button>
        {(query||industryFilter||productFilter||serviceFilter)&&(
          <button className="bd-reset-btn" onClick={()=>{setQuery("");setIndustryFilter("");setProductFilter("");setServiceFilter("");setPage(1);}}>Reset</button>
        )}
      </div>

      {/* 2-col layout */}
      <div className="bd-layout">
        {/* Main */}
        <div className="bd-main-col">
          {listingsQuery.isLoading && <p style={{color:"#94a3b8",fontSize:"0.85rem"}}>Loading listings...</p>}
          {listingsQuery.isError   && <p style={{color:"#ef4444",fontSize:"0.85rem"}}>{listingsQuery.error.message}</p>}

          {!listingsQuery.isLoading && filteredListings.length === 0 && (
            <div className="bd-empty">
              <span className="material-symbols-outlined" style={{fontSize:48,color:"#c7d2fe"}}>search_off</span>
              <h3>No businesses found</h3>
              <p>Try adjusting your filters or <Link to="/portal/business-directory/add">add your business</Link>.</p>
            </div>
          )}

          <div className="bd-cards-grid">
            {pageListings.map(item=>(
              <BizCard key={item._id} item={item} canDel={canDelete(item)} onDelete={()=>deleteMutation.mutate(item._id)}/>
            ))}
          </div>

          {filteredListings.length > PAGE_SIZE && (
            <div className="bd-load-more-wrap">
              <button className="bd-load-more-btn" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages}>
                Load More Businesses
                <span className="material-symbols-outlined" style={{fontSize:17}}>expand_more</span>
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="bd-sidebar">
          {/* Featured */}
          <div className="bd-sidebar-card">
            <div className="bd-sidebar-header">
              <span className="bd-sidebar-title">Featured Businesses</span>
              <button className="bd-sidebar-view-all">View All</button>
            </div>
            <div className="bd-featured-list">
              {(featured.length ? featured : []).map(item=>{
                const color = logoColor(item.businessName);
                return (
                  <div key={item._id} className="bd-featured-item">
                    <div className="bd-featured-logo" style={{background:color+"18",color}}>{initials(item.businessName)}</div>
                    <div className="bd-featured-info">
                      <div className="bd-featured-name">
                        {item.businessName}
                        <span className="material-symbols-outlined" style={{fontSize:13,color:"#6366f1",marginLeft:3}}>verified</span>
                      </div>
                      <div className="bd-featured-cat">{item.industry||"Business"}</div>
                      <div className="bd-featured-loc">
                        <span className="material-symbols-outlined" style={{fontSize:12}}>location_on</span>
                        {item.location||"India"}
                      </div>
                      <div className="bd-featured-rating">★ 4.{(item.businessName.charCodeAt(0)%5)+5} <span>({10+Math.floor((item.businessName.charCodeAt(1)||10)%25)} reviews)</span></div>
                    </div>
                  </div>
                );
              })}
              {!featured.length && <p style={{fontSize:"0.78rem",color:"#94a3b8"}}>No featured listings yet.</p>}
            </div>
          </div>

          {/* Categories */}
          <div className="bd-sidebar-card">
            <div className="bd-sidebar-header">
              <span className="bd-sidebar-title">Categories</span>
              <button className="bd-sidebar-view-all">View All</button>
            </div>
            <div className="bd-cat-list">
              {industryCategories.length > 0 ? (
                industryCategories.slice(0, 8).map(([name, count]) => (
                  <button 
                    key={name} 
                    className={`bd-cat-item ${industryFilter === name ? "bd-cat-item--active" : ""}`} 
                    onClick={() => { setIndustryFilter(prev => prev === name ? "" : name); setPage(1); }}
                  >
                    <div className="bd-cat-icon">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{CATEGORY_ICONS[name] || "category"}</span>
                    </div>
                    <span className="bd-cat-label">{name}</span>
                    <span className="bd-cat-count">{count}</span>
                  </button>
                ))
              ) : (
                <div style={{ padding: "0.5rem", textAlign: "center" }}>
                   <p style={{ fontSize: "0.78rem", color: "#94a3b8", margin: 0 }}>No categories available</p>
                </div>
              )}
            </div>
          </div>

          {/* Promo */}
          <div className="bd-sidebar-promo">
            <div className="bd-promo-body">
              <h4>List Your Business</h4>
              <p>Showcase your business to the global SPIT alumni network.</p>
              <Link to="/portal/business-directory/add" className="bd-promo-btn">
                Add Your Business →
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
