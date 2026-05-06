import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchMyInstituteSettings, updateMyInstituteSettings } from "../lib/api.js";
import "../styles/Settings.css";

/* ── Logic helpers (unchanged) ─────────────────────────── */
const initialFormState = {
  name:"",website:"",email:"",bio:"",slug:"",tagline:"",
  primaryColor:"#4F46E5",secondaryColor:"#10B981",accentColor:"#F59E0B",
  logoUrl:"",enableJobs:true,enableEvents:true,allowStudentRegistrations:false,
  autoApproveAlumni:false,autoApproveEmailDomainsText:"",departmentsText:""
};
function normalizeAutoApproveDomainsInput(value){
  return [...new Set(String(value||"").split(/[,\n]/).map(i=>i.trim().toLowerCase().replace(/^@/,"")).filter(Boolean))];
}
function normalizeDepartmentsInput(value){
  return [...new Set(String(value||"").split(/[,\n]/).map(i=>i.trim()).filter(Boolean))];
}
function mapSettingsToForm(s){
  return {
    name:s?.name||"",website:s?.website||"",email:s?.primaryContactEmail||"",bio:s?.bio||"",
    slug:s?.subdomain||"",tagline:s?.branding?.tagline||"",
    primaryColor:s?.branding?.primaryColor||"#4F46E5",
    secondaryColor:s?.branding?.secondaryColor||"#10B981",
    accentColor:s?.branding?.accentColor||"#F59E0B",
    logoUrl:s?.branding?.logoUrl||"",
    enableJobs:Boolean(s?.featureFlags?.enableJobs),
    enableEvents:Boolean(s?.featureFlags?.enableEvents),
    allowStudentRegistrations:Boolean(s?.featureFlags?.allowStudentRegistrations),
    autoApproveAlumni:Boolean(s?.featureFlags?.autoApproveAlumni),
    autoApproveEmailDomainsText:Array.isArray(s?.featureFlags?.autoApproveEmailDomains)?s.featureFlags.autoApproveEmailDomains.join("\n"):"",
    departmentsText:Array.isArray(s?.departments)?s.departments.join("\n"):""
  };
}
function buildUpdatePayload(form){
  return {
    name:form.name,website:form.website,primaryContactEmail:form.email,bio:form.bio,
    branding:{tagline:form.tagline,primaryColor:form.primaryColor,secondaryColor:form.secondaryColor,accentColor:form.accentColor,logoUrl:form.logoUrl},
    featureFlags:{enableJobs:form.enableJobs,enableEvents:form.enableEvents,allowStudentRegistrations:form.allowStudentRegistrations,autoApproveAlumni:form.autoApproveAlumni,autoApproveEmailDomains:normalizeAutoApproveDomainsInput(form.autoApproveEmailDomainsText)},
    departments:normalizeDepartmentsInput(form.departmentsText)
  };
}

/* ── Toggle switch ─────────────────────────────────────── */
function Toggle({checked,onChange}){
  return(
    <button
      type="button"
      className={`st-toggle ${checked?"st-toggle--on":""}`}
      onClick={()=>onChange(!checked)}
      role="switch" aria-checked={checked}
    >
      <span className="st-toggle-knob"/>
    </button>
  );
}

/* ── Field wrapper ─────────────────────────────────────── */
function Field({label,hint,children,full}){
  return(
    <div className={`st-field ${full?"st-field--full":""}`}>
      {label&&<label className="st-label">{label}</label>}
      {children}
      {hint&&<small className="st-hint">{hint}</small>}
    </div>
  );
}

/* ── Department tags ───────────────────────────────────── */
function DeptTags({value,onChange}){
  const depts=normalizeDepartmentsInput(value);
  const [adding,setAdding]=useState(false);
  const [draft,setDraft]=useState("");
  function remove(d){onChange(depts.filter(x=>x!==d).join("\n"));}
  function add(){const t=draft.trim();if(t&&!depts.includes(t))onChange([...depts,t].join("\n"));setDraft("");setAdding(false);}
  return(
    <div className="st-dept-wrap">
      {depts.map(d=>(
        <span key={d} className="st-dept-tag">
          {d}
          <button type="button" className="st-dept-x" onClick={()=>remove(d)}>×</button>
        </span>
      ))}
      {adding?(
        <input className="st-dept-input" autoFocus value={draft} onChange={e=>setDraft(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();add();}if(e.key==="Escape")setAdding(false);}}
          onBlur={add} placeholder="Department name..."/>
      ):(
        <button type="button" className="st-dept-add" onClick={()=>setAdding(true)}>+ Add Department</button>
      )}
    </div>
  );
}

/* ── Sidebar nav ───────────────────────────────────────── */
const SIDEBAR_ITEMS=[
  {key:"general",   icon:"info",           label:"General Information"},
  {key:"depts",     icon:"account_tree",   label:"Academic Departments"},
  {key:"social",    icon:"link",           label:"Social Links"},
  {key:"contact",   icon:"call",           label:"Contact Information"},
];
const TOP_TABS=["General Information","Branding","Portal Configuration","Integrations","Email Templates","Security"];

/* ══════════════════════════════════════════════════════════
   Main Page
   ══════════════════════════════════════════════════════════ */
export default function InstitutionSettingsPage(){
  const auth=useAuth();
  const [activeTab,setActiveTab]=useState("General Information");
  const [sidebarKey,setSidebarKey]=useState("general");
  const [form,setForm]=useState(initialFormState);
  const [saveNotice,setSaveNotice]=useState("");
  const [editingGeneral,setEditingGeneral]=useState(false);
  const [editingBranding,setEditingBranding]=useState(false);
  const [editingPortal,setEditingPortal]=useState(false);

  const settingsQuery=useQuery({queryKey:["institute-settings"],queryFn:fetchMyInstituteSettings});

  useEffect(()=>{
    if(settingsQuery.data) setForm(mapSettingsToForm(settingsQuery.data));
  },[settingsQuery.data]);

  const mutation=useMutation({
    mutationFn:updateMyInstituteSettings,
    onSuccess:async(res)=>{
      setSaveNotice(res?.message||"All changes saved successfully.");
      if(res?.settings) setForm(mapSettingsToForm(res.settings));
      setEditingGeneral(false);setEditingBranding(false);setEditingPortal(false);
      await auth.refreshSession();
      setTimeout(()=>setSaveNotice(""),3000);
    }
  });

  function handleChange(e){
    const{name,value,type,checked}=e.target;
    setForm(c=>({...c,[name]:type==="checkbox"?checked:value}));
    setSaveNotice("");
  }
  function resetForm(){setForm(mapSettingsToForm(settingsQuery.data||initialFormState));setSaveNotice("");}

  const isDirty=useMemo(()=>{
    if(!settingsQuery.data) return false;
    return JSON.stringify(form)!==JSON.stringify(mapSettingsToForm(settingsQuery.data));
  },[form,settingsQuery.data]);

  const depts=normalizeDepartmentsInput(form.departmentsText);
  const domains=normalizeAutoApproveDomainsInput(form.autoApproveEmailDomainsText);

  if(settingsQuery.isLoading) return <p style={{color:"#94a3b8",fontSize:"0.85rem"}}>Loading settings...</p>;
  if(settingsQuery.isError)   return <p style={{color:"#ef4444",fontSize:"0.85rem"}}>{settingsQuery.error.message}</p>;

  return(
    <div className="st-root">
      {/* Page header */}
      <div className="st-page-header">
        <div>
          <h1 className="st-page-title">Institution Settings</h1>
          <p className="st-page-sub">Manage your institution profile, branding, and portal settings.</p>
        </div>
      </div>

      {/* Top tab nav */}
      <div className="st-top-tabs">
        {TOP_TABS.map(tab=>(
          <button key={tab} className={`st-top-tab ${activeTab===tab?"st-top-tab--active":""}`} onClick={()=>setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {/* Layout */}
      <div className="st-layout">
        {/* Left sidebar nav */}
        <aside className="st-sidebar-nav">
          {SIDEBAR_ITEMS.map(item=>(
            <button key={item.key} className={`st-side-item ${sidebarKey===item.key?"st-side-item--active":""}`} onClick={()=>setSidebarKey(item.key)}>
              <span className="material-symbols-outlined" style={{fontSize:17}}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </aside>

        {/* Right content */}
        <div className="st-content">

          {/* ── General Information panel ── */}
          <div className="st-panel">
            <div className="st-panel-header">
              <div>
                <h2 className="st-panel-title">General Information</h2>
                <p className="st-panel-sub">Core details about your institution.</p>
              </div>
              <button className="st-edit-btn" onClick={()=>setEditingGeneral(e=>!e)}>
                <span className="material-symbols-outlined" style={{fontSize:15}}>edit</span>
                {editingGeneral?"Cancel":"Edit"}
              </button>
            </div>

            <div className="st-info-grid">
              <div className="st-info-block">
                <div className="st-info-label">Institution Name</div>
                {editingGeneral
                  ?<input className="st-input" name="name" value={form.name} onChange={handleChange}/>
                  :<div className="st-info-val">{form.name||"SPIT Demo Institute"}</div>
                }
              </div>
              <div className="st-info-block">
                <div className="st-info-label">Website</div>
                {editingGeneral
                  ?<input className="st-input" name="website" value={form.website} onChange={handleChange}/>
                  :<div className="st-info-val">{form.website||"https://www.spit.edu"}</div>
                }
              </div>
              <div className="st-info-block">
                <div className="st-info-label">Contact Email</div>
                {editingGeneral
                  ?<input className="st-input" name="email" value={form.email} onChange={handleChange}/>
                  :<div className="st-info-val">{form.email||"admin@spit.edu"}</div>
                }
              </div>
              <div className="st-info-block">
                <div className="st-info-label">Established Year</div>
                <div className="st-info-val">1962</div>
              </div>
              <div className="st-info-block st-info-block--full">
                <div className="st-info-label">About / Bio</div>
                {editingGeneral
                  ?<textarea className="st-input" name="bio" value={form.bio} onChange={handleChange} rows={3}/>
                  :<div className="st-info-val">{form.bio||"SPIT is a premier technical institute committed to academic excellence, innovation, and holistic development of students."}</div>
                }
              </div>
              <div className="st-info-block">
                <div className="st-info-label">Institution Type</div>
                <div className="st-info-val">Engineering Institute</div>
              </div>

              {/* Logo */}
              <div className="st-logo-wrap">
                <div className="st-logo-preview">
                  {form.logoUrl
                    ?<img src={form.logoUrl} alt="Logo" className="st-logo-img"/>
                    :<div className="st-logo-placeholder">
                      <span className="material-symbols-outlined" style={{fontSize:38,color:"#6366f1"}}>school</span>
                    </div>
                  }
                </div>
                {editingGeneral&&(
                  <div style={{display:"flex",flexDirection:"column",gap:".35rem"}}>
                    <label className="st-label">Logo URL</label>
                    <input className="st-input" name="logoUrl" value={form.logoUrl} onChange={handleChange} placeholder="https://..."/>
                  </div>
                )}
                <button className="st-change-logo-btn">
                  <span className="material-symbols-outlined" style={{fontSize:14}}>cloud_upload</span>
                  Change Logo
                </button>
              </div>
            </div>
          </div>

          {/* ── Departments panel ── */}
          <div className="st-panel">
            <div className="st-panel-header">
              <div>
                <h2 className="st-panel-title">Academic Departments / Branches</h2>
                <p className="st-panel-sub">Departments displayed during alumni registration.</p>
              </div>
              <button className="st-manage-btn">
                <span className="material-symbols-outlined" style={{fontSize:15}}>settings</span>
                Manage Departments
              </button>
            </div>
            <DeptTags
              value={form.departmentsText}
              onChange={v=>setForm(c=>({...c,departmentsText:v}))}
            />
          </div>

          {/* ── Branding + Portal side-by-side ── */}
          <div className="st-two-col">
            {/* Branding */}
            <div className="st-panel">
              <div className="st-panel-header">
                <div>
                  <h2 className="st-panel-title">Branding</h2>
                  <p className="st-panel-sub">Customize how your institution looks to alumni.</p>
                </div>
                <button className="st-edit-btn" onClick={()=>setEditingBranding(e=>!e)}>
                  <span className="material-symbols-outlined" style={{fontSize:15}}>edit</span>
                  {editingBranding?"Cancel":"Edit"}
                </button>
              </div>
              <div className="st-branding-grid">
                {[{k:"primaryColor",l:"Primary Color"},{k:"secondaryColor",l:"Secondary Color"},{k:"accentColor",l:"Accent Color"}].map(({k,l})=>(
                  <div key={k} className="st-color-block">
                    <div className="st-color-label">{l}</div>
                    <div className="st-color-row">
                      <span className="st-color-swatch" style={{background:form[k]}}/>
                      {editingBranding
                        ?<><input type="color" name={k} value={form[k]} onChange={handleChange} className="st-color-input"/><span className="st-color-hex">{form[k].toUpperCase()}</span></>
                        :<span className="st-color-hex">{form[k].toUpperCase()}</span>
                      }
                    </div>
                  </div>
                ))}
              </div>
              <div className="st-branding-extra">
                <div className="st-info-block">
                  <div className="st-info-label">Portal Tagline</div>
                  {editingBranding
                    ?<input className="st-input" name="tagline" value={form.tagline} onChange={handleChange}/>
                    :<div className="st-info-val">{form.tagline||"Build lifelong alumni relationships."}</div>
                  }
                </div>
                <div className="st-info-block">
                  <div className="st-info-label">Portal Slug</div>
                  <div className="st-slug-row">
                    <span className="st-info-val">{form.slug||"spit"}</span>
                    <span className="material-symbols-outlined" style={{fontSize:14,color:"#94a3b8"}}>link</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Portal Configuration */}
            <div className="st-panel">
              <div className="st-panel-header">
                <div>
                  <h2 className="st-panel-title">Portal Configuration</h2>
                  <p className="st-panel-sub">Enable or disable features for your alumni community.</p>
                </div>
                <button className="st-edit-btn" onClick={()=>setEditingPortal(e=>!e)}>
                  <span className="material-symbols-outlined" style={{fontSize:15}}>edit</span>
                  {editingPortal?"Cancel":"Edit"}
                </button>
              </div>
              <div className="st-toggle-list">
                {[
                  {name:"enableJobs",             label:"Enable Jobs Board",             sub:"Allow alumni to post and browse job opportunities."},
                  {name:"enableEvents",            label:"Enable Events",                  sub:"Manage reunions, workshops, and seminars."},
                  {name:"allowStudentRegistrations",label:"Allow Student Registrations",   sub:"Permit currently enrolled students to join the portal."},
                  {name:"autoApproveAlumni",       label:"Auto-approve Alumni",            sub:"Automatically approve registrations matching verified email domains."},
                ].map(t=>(
                  <div key={t.name} className="st-toggle-row">
                    <div>
                      <div className="st-toggle-label">{t.label}</div>
                      <div className="st-toggle-sub">{t.sub}</div>
                    </div>
                    <Toggle
                      checked={!!form[t.name]}
                      onChange={v=>setForm(c=>({...c,[t.name]:v}))}
                    />
                  </div>
                ))}

                <div className="st-toggle-row st-toggle-row--domains">
                  <div className="st-toggle-label">Auto-approve Email Domains</div>
                  <div className="st-domains-row">
                    {domains.length>0
                      ?<span className="st-domain-val">{domains.join(", ")}</span>
                      :<span style={{color:"#94a3b8",fontSize:".75rem"}}>No domains set</span>
                    }
                    <button className="st-copy-btn" title="Copy domains">
                      <span className="material-symbols-outlined" style={{fontSize:14}}>content_copy</span>
                    </button>
                  </div>
                  {editingPortal&&(
                    <textarea className="st-input" name="autoApproveEmailDomainsText" value={form.autoApproveEmailDomainsText}
                      onChange={handleChange} rows={2} placeholder="alumni.edu&#10;spit.ac.in"
                      style={{marginTop:".4rem",width:"100%",boxSizing:"border-box"}}/>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Footer save bar ── */}
      <footer className="st-footer">
        <div className="st-footer-left">
          {saveNotice&&(
            <div className="st-save-notice">
              <span className="material-symbols-outlined" style={{fontSize:16,color:"#10b981"}}>check_circle</span>
              {saveNotice}
            </div>
          )}
          {isDirty&&!saveNotice&&<span className="st-unsaved">Unsaved changes</span>}
        </div>
        <div className="st-footer-actions">
          <button className="st-discard-btn" disabled={!isDirty||mutation.isPending} onClick={resetForm} type="button">Discard</button>
          <button className="st-save-btn" disabled={!isDirty||mutation.isPending} onClick={()=>mutation.mutate(buildUpdatePayload(form))} type="button">
            <span className="material-symbols-outlined" style={{fontSize:16}}>save</span>
            {mutation.isPending?"Saving...":"Save Changes"}
          </button>
        </div>
      </footer>

      {mutation.isError&&<p style={{color:"#ef4444",fontSize:"0.8rem",marginTop:".5rem"}}>{mutation.error.message}</p>}
    </div>
  );
}
