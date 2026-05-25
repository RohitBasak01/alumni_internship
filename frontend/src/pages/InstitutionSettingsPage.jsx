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
  autoApproveAlumni:false,autoApproveEmailDomainsText:"",departmentsText:"",departmentStreamsText:"",
  profileFields: [], leadershipMessages: [], quickLinks: [], socialLinks: {facebook:"",twitter:"",linkedin:"",youtube:"",instagram:""}, heroImageUrl: "", manualUpdates: [],
  integrations: {
    ssoEnabled: false,
    ssoProvider: "google",
    googleAnalyticsId: "",
    stripePublicKey: ""
  },
  emailTemplates: {
    welcomeSubject: "Welcome to {{institute}} Alumni Portal!",
    welcomeBody: "Hello {{name}},\n\nWelcome to the official alumni community of {{institute}}!",
    approvalSubject: "Your alumni account has been approved!",
    approvalBody: "Hello {{name}},\n\nYour registration has been approved. You can now log in."
  },
  security: {
    sessionTimeout: 60,
    passwordMinLength: 8,
    require2FA: false
  }
};
function normalizeAutoApproveDomainsInput(value){
  return [...new Set(String(value||"").split(/[,\n]/).map(i=>i.trim().toLowerCase().replace(/^@/,"")).filter(Boolean))];
}
function normalizeDepartmentsInput(value){
  return [...new Set(String(value||"").split(/[,\n]/).map(i=>i.trim()).filter(Boolean))];
}
function normalizeStreamsInput(value){
  return [...new Set(String(value||"").split(/[\,\n]/).map(i=>i.trim()).filter(Boolean))];
}
function formatDepartmentStreamsInput(value){
  if(!value||typeof value!=="object"||Array.isArray(value)) return "";
  return Object.entries(value).map(([department,streams])=>`${department}: ${(Array.isArray(streams)?streams:[]).join(", ")}`).join("\n");
}
function normalizeDepartmentStreamsInput(value){
  const normalized = {};
  String(value||"").split(/\n/).forEach((line)=>{
    const [departmentPart,...streamParts] = line.split(":");
    const department = String(departmentPart||"").trim();
    if(!department) return;
    const streams = streamParts.join(":");
    const parsed = [...new Set(String(streams||"").split(/[\,\n]/).map((item)=>item.trim()).filter(Boolean))];
    if(parsed.length>0) normalized[department] = parsed;
  });
  return normalized;
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
    departmentsText:Array.isArray(s?.departments)?s.departments.join("\n"):"",
    departmentStreamsText:formatDepartmentStreamsInput(s?.departmentStreams||{}),
    profileFields: Array.isArray(s?.profileFields) ? s.profileFields : [],
    leadershipMessages: Array.isArray(s?.leadershipMessages) ? s.leadershipMessages : [],
    quickLinks: Array.isArray(s?.quickLinks) ? s.quickLinks : [],
    socialLinks: s?.socialLinks || {facebook:"",twitter:"",linkedin:"",youtube:"",instagram:""},
    heroImageUrl: s?.branding?.heroImageUrl || "",
    manualUpdates: Array.isArray(s?.manualUpdates) ? s.manualUpdates : [],
    integrations: s?.integrations || {
      ssoEnabled: false,
      ssoProvider: "google",
      googleAnalyticsId: "",
      stripePublicKey: ""
    },
    emailTemplates: s?.emailTemplates || {
      welcomeSubject: "Welcome to {{institute}} Alumni Portal!",
      welcomeBody: "Hello {{name}},\n\nWelcome to the official alumni community of {{institute}}!",
      approvalSubject: "Your alumni account has been approved!",
      approvalBody: "Hello {{name}},\n\nYour registration has been approved. You can now log in."
    },
    security: s?.security || {
      sessionTimeout: 60,
      passwordMinLength: 8,
      require2FA: false
    }
  };
}
function buildUpdatePayload(form){
  const departmentStreams = normalizeDepartmentStreamsInput(form.departmentStreamsText);
  return {
    name:form.name,website:form.website,primaryContactEmail:form.email,bio:form.bio,
    branding:{tagline:form.tagline,primaryColor:form.primaryColor,secondaryColor:form.secondaryColor,accentColor:form.accentColor,logoUrl:form.logoUrl,heroImageUrl:form.heroImageUrl},
    leadershipMessages:form.leadershipMessages,
    quickLinks:form.quickLinks,
    socialLinks:form.socialLinks,
    featureFlags:{enableJobs:form.enableJobs,enableEvents:form.enableEvents,allowStudentRegistrations:form.allowStudentRegistrations,autoApproveAlumni:form.autoApproveAlumni,autoApproveEmailDomains:normalizeAutoApproveDomainsInput(form.autoApproveEmailDomainsText)},
    departments:normalizeDepartmentsInput(form.departmentsText),
    departmentStreams,
    streams:[...new Set(Object.values(departmentStreams).flat())],
    profileFields: form.profileFields,
    manualUpdates: form.manualUpdates,
    integrations: form.integrations,
    emailTemplates: form.emailTemplates,
    security: form.security
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

/* ── List tags ───────────────────────────────────── */
function ListTags({value,onChange,placeholder,addLabel}){
  const items=normalizeDepartmentsInput(value);
  const [adding,setAdding]=useState(false);
  const [draft,setDraft]=useState("");
  function remove(d){onChange(items.filter(x=>x!==d).join("\n"));}
  function add(){const t=draft.trim();if(t&&!items.includes(t))onChange([...items,t].join("\n"));setDraft("");setAdding(false);}
  return(
    <div className="st-dept-wrap">
      {items.map(d=>(
        <span key={d} className="st-dept-tag">
          {d}
          <button type="button" className="st-dept-x" onClick={()=>remove(d)}>×</button>
        </span>
      ))}
      {adding?(
        <input className="st-dept-input" autoFocus value={draft} onChange={e=>setDraft(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();add();}if(e.key==="Escape")setAdding(false);}}
          onBlur={add} placeholder={placeholder}/>
      ):(
        <button type="button" className="st-dept-add" onClick={()=>setAdding(true)}>{addLabel}</button>
      )}
    </div>
  );
}

/* ── Profile & Registration Fields Manager ───────────────── */
function ProfileFieldsManager({ form, setForm }) {
  const fields = form.profileFields || [];
  const [newField, setNewField] = useState({
    fieldKey: "",
    label: "",
    inputType: "text",
    showInRegistration: "optional",
    showInProfile: true,
    isStandard: false,
    options: ""
  });
  const [error, setError] = useState("");

  const handleAddField = () => {
    const key = newField.fieldKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    const label = newField.label.trim();
    if (!key || !label) {
      setError("Field key and label are required");
      return;
    }
    if (fields.some(f => f.fieldKey === key)) {
      setError("A field with this key already exists");
      return;
    }

    const fieldToAdd = {
      fieldKey: key,
      label,
      inputType: newField.inputType,
      visibility: newField.showInRegistration,
      showInRegistration: newField.showInRegistration,
      showInProfile: newField.showInProfile,
      isStandard: false,
      options: newField.inputType === "select" ? newField.options.split(",").map(o => o.trim()).filter(Boolean) : []
    };

    setForm(c => ({
      ...c,
      profileFields: [...fields, fieldToAdd]
    }));

    setNewField({
      fieldKey: "",
      label: "",
      inputType: "text",
      showInRegistration: "optional",
      showInProfile: true,
      isStandard: false,
      options: ""
    });
    setError("");
  };

  const handleUpdateRegistrationVisibility = (fieldKey, showInRegistration) => {
    setForm(c => ({
      ...c,
      profileFields: fields.map(f => f.fieldKey === fieldKey ? { ...f, showInRegistration, visibility: showInRegistration } : f)
    }));
  };

  const handleUpdateProfileVisibility = (fieldKey, showInProfile) => {
    setForm(c => ({
      ...c,
      profileFields: fields.map(f => f.fieldKey === fieldKey ? { ...f, showInProfile } : f)
    }));
  };

  const handleDeleteField = (fieldKey) => {
    setForm(c => ({
      ...c,
      profileFields: fields.filter(f => f.fieldKey !== fieldKey)
    }));
  };

  return (
    <div className="st-fields-manager">
      <div className="st-panel">
        <div className="st-panel-header">
          <div>
            <h2 className="st-panel-title">Registration & Profile Fields</h2>
            <p className="st-panel-sub">Configure which fields are displayed to users during registration and on their profiles.</p>
          </div>
        </div>

        <div className="st-fields-list" style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
          {fields.map(field => (
            <div key={field.fieldKey} className="st-field-row" style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1rem",
              background: "#1e293b",
              borderRadius: "8px",
              border: "1px solid #334155"
            }}>
              <div>
                <div style={{ fontWeight: "600", color: "#f8fafc" }}>
                  {field.label} {field.isStandard && <span style={{ fontSize: "0.75rem", color: "#6366f1", marginLeft: "0.5rem" }}>(System Field)</span>}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  Key: <code>{field.fieldKey}</code> • Type: {field.inputType}
                </div>
                {field.options && field.options.length > 0 && (
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.25rem" }}>
                    Options: {field.options.join(", ")}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.7rem", fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase" }}>Registration</label>
                  <select
                    value={field.showInRegistration || field.visibility}
                    onChange={(e) => handleUpdateRegistrationVisibility(field.fieldKey, e.target.value)}
                    className="st-input"
                    style={{ width: "auto", minWidth: "125px", height: "38px", padding: "4px 8px" }}
                  >
                    <option value="required">Required</option>
                    <option value="optional">Optional</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.7rem", fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase" }}>Profile</label>
                  <select
                    value={field.showInProfile !== undefined ? (field.showInProfile ? "visible" : "hidden") : (field.visibility === "hidden" ? "hidden" : "visible")}
                    onChange={(e) => handleUpdateProfileVisibility(field.fieldKey, e.target.value === "visible")}
                    className="st-input"
                    style={{ width: "auto", minWidth: "125px", height: "38px", padding: "4px 8px" }}
                  >
                    <option value="visible">Visible</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>

                {!field.isStandard && (
                  <button
                    type="button"
                    onClick={() => handleDeleteField(field.fieldKey)}
                    className="st-edit-btn"
                    style={{ color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", cursor: "pointer", height: "38px", marginTop: "1.1rem" }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="st-panel" style={{ marginTop: "1.5rem" }}>
        <div className="st-panel-header">
          <div>
            <h2 className="st-panel-title">Add Custom Profile Field</h2>
            <p className="st-panel-sub">Create a new field for user-specific institutional data.</p>
          </div>
        </div>

        <div className="st-info-grid" style={{ marginTop: "1rem" }}>
          <div className="st-info-block">
            <label className="st-label">Field Label (e.g. Roll Number)</label>
            <input
              type="text"
              className="st-input"
              value={newField.label}
              onChange={(e) => setNewField(c => ({ ...c, label: e.target.value }))}
              placeholder="e.g. Student ID"
            />
          </div>

          <div className="st-info-block">
            <label className="st-label">Field Key (unique, lowercase, no spaces)</label>
            <input
              type="text"
              className="st-input"
              value={newField.fieldKey}
              onChange={(e) => setNewField(c => ({ ...c, fieldKey: e.target.value }))}
              placeholder="e.g. student_id"
            />
          </div>

          <div className="st-info-block">
            <label className="st-label">Input Type</label>
            <select
              value={newField.inputType}
              onChange={(e) => setNewField(c => ({ ...c, inputType: e.target.value }))}
              className="st-input"
            >
              <option value="text">Text Input</option>
              <option value="number">Number Input</option>
              <option value="date">Date Picker</option>
              <option value="select">Dropdown Menu</option>
            </select>
          </div>

          <div className="st-info-block">
            <label className="st-label">Show in Registration</label>
            <select
              value={newField.showInRegistration}
              onChange={(e) => setNewField(c => ({ ...c, showInRegistration: e.target.value }))}
              className="st-input"
            >
              <option value="optional">Optional</option>
              <option value="required">Required</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>

          <div className="st-info-block">
            <label className="st-label">Show in Profile</label>
            <select
              value={newField.showInProfile ? "visible" : "hidden"}
              onChange={(e) => setNewField(c => ({ ...c, showInProfile: e.target.value === "visible" }))}
              className="st-input"
            >
              <option value="visible">Visible</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>

          {newField.inputType === "select" && (
            <div className="st-info-block st-info-block--full">
              <label className="st-label">Dropdown Options (comma-separated)</label>
              <input
                type="text"
                className="st-input"
                value={newField.options}
                onChange={(e) => setNewField(c => ({ ...c, options: e.target.value }))}
                placeholder="Option 1, Option 2, Option 3"
              />
            </div>
          )}

          {error && (
            <div className="st-info-block st-info-block--full" style={{ color: "#ef4444", fontSize: "0.85rem" }}>
              {error}
            </div>
          )}

          <div className="st-info-block st-info-block--full" style={{ marginTop: "1rem" }}>
            <button
              type="button"
              onClick={handleAddField}
              className="st-save-btn"
              style={{ width: "auto", cursor: "pointer" }}
            >
              Add Field
            </button>
          </div>
        </div>
      </div>
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
const TOP_TABS=["General Information","Branding","Portal Configuration","Home Page Configuration","Registration & Profile Fields","Integrations","Email Templates","Security"];

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
      <div className={`st-layout ${activeTab !== "General Information" ? "st-layout--single" : ""}`}>
        {/* Left sidebar nav */}
        {activeTab === "General Information" && (
          <aside className="st-sidebar-nav">
            {SIDEBAR_ITEMS.map(item=>(
              <button key={item.key} className={`st-side-item ${sidebarKey===item.key?"st-side-item--active":""}`} onClick={()=>setSidebarKey(item.key)}>
                <span className="material-symbols-outlined" style={{fontSize:17}}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </aside>
        )}

        {/* Right content */}
        <div className="st-content">

          {activeTab === "General Information" && (
            <>
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
                <ListTags
                  value={form.departmentsText}
                  onChange={v=>setForm(c=>({...c,departmentsText:v}))}
                  placeholder="Department name..."
                  addLabel="+ Add Department"
                />
              </div>

              <div className="st-panel">
                <div className="st-panel-header">
                  <div>
                    <h2 className="st-panel-title">Department Streams</h2>
                    <p className="st-panel-sub">Map each department to the streams alumni can select during registration.</p>
                  </div>
                </div>
                <textarea
                  className="st-input"
                  name="departmentStreamsText"
                  value={form.departmentStreamsText}
                  onChange={handleChange}
                  rows={8}
                  placeholder={"B.Tech: CSE, IT, AIDS\nM.Tech: VLSI, CDS"}
                  style={{width:"100%", boxSizing:"border-box", lineHeight:1.5}}
                />
              </div>
            </>
          )}

          {activeTab === "Branding" && (
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
              <div className="st-branding-grid" style={{ marginTop: "1rem" }}>
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
              <div className="st-branding-extra" style={{ marginTop: "1.5rem" }}>
                <div className="st-info-block">
                  <div className="st-info-label">Portal Tagline</div>
                  {editingBranding
                    ?<input className="st-input" name="tagline" value={form.tagline} onChange={handleChange}/>
                    :<div className="st-info-val">{form.tagline||"Build lifelong alumni relationships."}</div>
                  }
                </div>
                <div className="st-info-block" style={{ marginTop: "1rem" }}>
                  <div className="st-info-label">Portal Slug</div>
                  <div className="st-slug-row">
                    <span className="st-info-val">{form.slug||"spit"}</span>
                    <span className="material-symbols-outlined" style={{fontSize:14,color:"#94a3b8"}}>link</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Portal Configuration" && (
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
              <div className="st-toggle-list" style={{ marginTop: "1rem" }}>
                {[
                  {name:"enableJobs",             label:"Enable Jobs Board",             sub:"Allow alumni to post and browse job opportunities."},
                  {name:"enableEvents",            label:"Enable Events",                  sub:"Manage reunions, workshops, and seminars."},
                  {name:"allowStudentRegistrations",label:"Allow Student Registrations",   sub:"Permit currently enrolled students to join the portal."},
                  {name:"autoApproveAlumni",       label:"Auto-approve Alumni",            sub:"Automatically approve registrations matching verified email domains."},
                ].map(t=>(
                  <div key={t.name} className="st-toggle-row" style={{ display: "flex", justifyContent: "space-between", padding: "1rem 0", borderBottom: "1px solid #334155" }}>
                    <div>
                      <div className="st-toggle-label" style={{ fontWeight: "600" }}>{t.label}</div>
                      <div className="st-toggle-sub" style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{t.sub}</div>
                    </div>
                    <Toggle
                      checked={!!form[t.name]}
                      onChange={v=>setForm(c=>({...c,[t.name]:v}))}
                    />
                  </div>
                ))}

                <div className="st-toggle-row st-toggle-row--domains" style={{ padding: "1rem 0" }}>
                  <div className="st-toggle-label" style={{ fontWeight: "600" }}>Auto-approve Email Domains</div>
                  <div className="st-domains-row" style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem" }}>
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
          )}

          
          {activeTab === "Home Page Configuration" && (
            <div className="st-panel">
              <div className="st-panel-header">
                <div>
                  <h2 className="st-panel-title">Home Page Configuration</h2>
                  <p className="st-panel-sub">Configure the content shown on your public institution home page.</p>
                </div>
              </div>
              <div className="st-info-grid" style={{ marginTop: "1rem" }}>
                <div className="st-info-block st-info-block--full">
                  <label className="st-label">Hero Background Image URL</label>
                  <input className="st-input" name="heroImageUrl" value={form.heroImageUrl} onChange={handleChange} placeholder="https://..." />
                </div>
              </div>

              <div className="st-panel-header" style={{ marginTop: "2rem" }}>
                <div>
                  <h3 className="st-panel-title" style={{ fontSize: "1.1rem" }}>Social Media Links</h3>
                </div>
              </div>
              <div className="st-info-grid" style={{ marginTop: "1rem" }}>
                {["facebook", "twitter", "linkedin", "youtube", "instagram"].map(network => (
                  <div key={network} className="st-info-block">
                    <label className="st-label" style={{ textTransform: "capitalize" }}>{network}</label>
                    <input 
                      className="st-input" 
                      value={form.socialLinks[network] || ""} 
                      onChange={e => setForm(c => ({...c, socialLinks: {...c.socialLinks, [network]: e.target.value}}))} 
                      placeholder={"https://"+network+".com/..."} 
                    />
                  </div>
                ))}
              </div>

              <div className="st-panel-header" style={{ marginTop: "2rem" }}>
                <div>
                  <h3 className="st-panel-title" style={{ fontSize: "1.1rem" }}>Leadership Messages</h3>
                  <p className="st-panel-sub">Add messages from the Chairman, Dean, etc.</p>
                </div>
                <button className="st-save-btn" style={{ width: "auto" }} onClick={() => setForm(c => ({...c, leadershipMessages: [...c.leadershipMessages, {role:"", name:"", title:"", photoUrl:"", message:"", salutation:""}]}))}>
                  Add Message
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginTop: "1rem" }}>
                {form.leadershipMessages.map((msg, idx) => (
                  <div key={idx} style={{ padding: "1.25rem", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <div className="st-info-grid">
                      <div className="st-info-block">
                        <label className="st-label">Role (e.g. Chairman)</label>
                        <input className="st-input" value={msg.role} onChange={e => { const newMsgs = [...form.leadershipMessages]; newMsgs[idx].role = e.target.value; setForm(c => ({...c, leadershipMessages: newMsgs})); }} />
                      </div>
                      <div className="st-info-block">
                        <label className="st-label">Name</label>
                        <input className="st-input" value={msg.name} onChange={e => { const newMsgs = [...form.leadershipMessages]; newMsgs[idx].name = e.target.value; setForm(c => ({...c, leadershipMessages: newMsgs})); }} />
                      </div>
                      <div className="st-info-block">
                        <label className="st-label">Title</label>
                        <input className="st-input" value={msg.title} onChange={e => { const newMsgs = [...form.leadershipMessages]; newMsgs[idx].title = e.target.value; setForm(c => ({...c, leadershipMessages: newMsgs})); }} />
                      </div>
                      <div className="st-info-block">
                        <label className="st-label">Photo URL</label>
                        <input className="st-input" value={msg.photoUrl} onChange={e => { const newMsgs = [...form.leadershipMessages]; newMsgs[idx].photoUrl = e.target.value; setForm(c => ({...c, leadershipMessages: newMsgs})); }} />
                      </div>
                      <div className="st-info-block st-info-block--full">
                        <label className="st-label">Message</label>
                        <textarea className="st-input" rows={4} value={msg.message} onChange={e => { const newMsgs = [...form.leadershipMessages]; newMsgs[idx].message = e.target.value; setForm(c => ({...c, leadershipMessages: newMsgs})); }} />
                      </div>
                    </div>
                    <button className="st-discard-btn" style={{ marginTop: "1rem" }} onClick={() => setForm(c => ({...c, leadershipMessages: c.leadershipMessages.filter((_, i) => i !== idx)}))}>Remove</button>
                  </div>
                ))}
              </div>

              <div className="st-panel-header" style={{ marginTop: "2rem" }}>
                <div>
                  <h3 className="st-panel-title" style={{ fontSize: "1.1rem" }}>Quick Links</h3>
                  <p className="st-panel-sub">Add up to 4 quick links for the home page.</p>
                </div>
                <button className="st-save-btn" style={{ width: "auto" }} onClick={() => setForm(c => ({...c, quickLinks: [...c.quickLinks, {label:"", icon:"link", url:"", enabled:true}]}))}>
                  Add Link
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
                {form.quickLinks.map((link, idx) => (
                  <div key={idx} style={{ padding: "1.25rem", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", gap: "1rem", alignItems: "flex-end" }}>
                    <div className="st-info-block" style={{ flex: 1 }}>
                      <label className="st-label">Label</label>
                      <input className="st-input" value={link.label} onChange={e => { const newLinks = [...form.quickLinks]; newLinks[idx].label = e.target.value; setForm(c => ({...c, quickLinks: newLinks})); }} />
                    </div>
                    <div className="st-info-block" style={{ flex: 1 }}>
                      <label className="st-label">URL</label>
                      <input className="st-input" value={link.url} onChange={e => { const newLinks = [...form.quickLinks]; newLinks[idx].url = e.target.value; setForm(c => ({...c, quickLinks: newLinks})); }} />
                    </div>
                    <div className="st-info-block" style={{ width: "100px" }}>
                      <label className="st-label">Icon</label>
                      <input className="st-input" value={link.icon} onChange={e => { const newLinks = [...form.quickLinks]; newLinks[idx].icon = e.target.value; setForm(c => ({...c, quickLinks: newLinks})); }} />
                    </div>
                    <button className="st-discard-btn" onClick={() => setForm(c => ({...c, quickLinks: c.quickLinks.filter((_, i) => i !== idx)}))}>Remove</button>
                  </div>
                ))}
              </div>

              <div className="st-panel-header" style={{ marginTop: "2rem" }}>
                <div>
                  <h3 className="st-panel-title" style={{ fontSize: "1.1rem" }}>Latest Updates Bulletins</h3>
                  <p className="st-panel-sub">Add administrative announcements that show in the updates timeline and news ticker.</p>
                </div>
                <button className="st-save-btn" style={{ width: "auto" }} onClick={() => setForm(c => ({...c, manualUpdates: [...(c.manualUpdates || []), {text:"", category:"General", date: new Date().toISOString()}]}))}>
                  Add Update
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
                {form.manualUpdates && form.manualUpdates.map((update, idx) => (
                  <div key={idx} style={{ padding: "1.25rem", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
                    <div className="st-info-block" style={{ flex: 2, minWidth: "250px" }}>
                      <label className="st-label">Bulletin Text</label>
                      <input className="st-input" value={update.text} onChange={e => { const newUpdates = [...form.manualUpdates]; newUpdates[idx].text = e.target.value; setForm(c => ({...c, manualUpdates: newUpdates})); }} placeholder="e.g. SPIT ranked #1 in state by NIRF" />
                    </div>
                    <div className="st-info-block" style={{ width: "150px" }}>
                      <label className="st-label">Category</label>
                      <select 
                        className="st-input" 
                        value={update.category || "General"} 
                        onChange={e => { const newUpdates = [...form.manualUpdates]; newUpdates[idx].category = e.target.value; setForm(c => ({...c, manualUpdates: newUpdates})); }}
                        style={{ height: "42px", padding: "4px 8px" }}
                      >
                        <option value="General">General</option>
                        <option value="Campus">Campus</option>
                        <option value="Career">Career</option>
                        <option value="Academic">Academic</option>
                      </select>
                    </div>
                    <div className="st-info-block" style={{ width: "180px" }}>
                      <label className="st-label">Date</label>
                      <input 
                        type="date" 
                        className="st-input" 
                        value={update.date ? new Date(update.date).toISOString().split('T')[0] : ""} 
                        onChange={e => { const newUpdates = [...form.manualUpdates]; newUpdates[idx].date = e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString(); setForm(c => ({...c, manualUpdates: newUpdates})); }} 
                      />
                    </div>
                    <button className="st-discard-btn" style={{ height: "42px" }} onClick={() => setForm(c => ({...c, manualUpdates: c.manualUpdates.filter((_, i) => i !== idx)}))}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
          )}
{activeTab === "Registration & Profile Fields" && (
            <ProfileFieldsManager form={form} setForm={setForm} />
          )}

          {activeTab === "Integrations" && (
            <div className="st-panel">
              <div className="st-panel-header">
                <div>
                  <h2 className="st-panel-title">Integrations</h2>
                  <p className="st-panel-sub">Configure external connections and services for your portal.</p>
                </div>
              </div>
              <div className="st-info-grid" style={{ marginTop: "1.5rem" }}>
                <Field label="Google Analytics Tracking ID" hint="e.g. G-XXXXXXX to track page views and traffic">
                  <input
                    className="st-input"
                    value={form.integrations?.googleAnalyticsId || ""}
                    onChange={e => setForm(c => ({
                      ...c,
                      integrations: { ...c.integrations, googleAnalyticsId: e.target.value }
                    }))}
                    placeholder="G-XXXXXXXXXX"
                  />
                </Field>
                <Field label="Stripe Publishable Key" hint="Used to collect alumni donation payments on-platform">
                  <input
                    className="st-input"
                    value={form.integrations?.stripePublicKey || ""}
                    onChange={e => setForm(c => ({
                      ...c,
                      integrations: { ...c.integrations, stripePublicKey: e.target.value }
                    }))}
                    placeholder="pk_test_..."
                  />
                </Field>
                <div className="st-field st-field--full" style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1.5rem", marginTop: "1rem" }}>
                  <div className="st-toggle-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span className="st-label" style={{ margin: 0 }}>Enable Single Sign-On (SSO)</span>
                      <p className="st-hint" style={{ marginTop: "0.25rem" }}>Allow alumni to register and sign in using third-party accounts.</p>
                    </div>
                    <Toggle
                      checked={Boolean(form.integrations?.ssoEnabled)}
                      onChange={val => setForm(c => ({
                        ...c,
                        integrations: { ...c.integrations, ssoEnabled: val }
                      }))}
                    />
                  </div>
                </div>
                {form.integrations?.ssoEnabled && (
                  <Field label="SSO Provider" hint="Select the primary identity provider to configure">
                    <select
                      className="st-input"
                      value={form.integrations?.ssoProvider || "google"}
                      onChange={e => setForm(c => ({
                        ...c,
                        integrations: { ...c.integrations, ssoProvider: e.target.value }
                      }))}
                      style={{ height: "42px", padding: "4px 8px" }}
                    >
                      <option value="google">Google Workspace</option>
                      <option value="linkedin">LinkedIn Authentication</option>
                      <option value="saml">SAML Custom Provider</option>
                    </select>
                  </Field>
                )}
              </div>
            </div>
          )}

          {activeTab === "Email Templates" && (
            <div className="st-panel">
              <div className="st-panel-header">
                <div>
                  <h2 className="st-panel-title">Email Templates</h2>
                  <p className="st-panel-sub">Customize automated system email messages sent to alumni.</p>
                </div>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "2rem", marginTop: "1.5rem" }}>
                {/* Welcome Template */}
                <div style={{ paddingBottom: "2rem", borderBottom: "1px solid #e2e8f0" }}>
                  <h3 className="st-label" style={{ fontSize: "1rem", color: "var(--th-primary)", marginBottom: "1rem" }}>Welcome Email (Alumni Join)</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <Field label="Subject Line">
                      <input
                        className="st-input"
                        value={form.emailTemplates?.welcomeSubject || ""}
                        onChange={e => setForm(c => ({
                          ...c,
                          emailTemplates: { ...c.emailTemplates, welcomeSubject: e.target.value }
                        }))}
                        placeholder="Welcome to {{institute}}!"
                      />
                    </Field>
                    <Field label="Email Body Text" hint="Supported placeholders: {{name}}, {{institute}}">
                      <textarea
                        className="st-input"
                        value={form.emailTemplates?.welcomeBody || ""}
                        onChange={e => setForm(c => ({
                          ...c,
                          emailTemplates: { ...c.emailTemplates, welcomeBody: e.target.value }
                        }))}
                        rows={5}
                        placeholder="Hello {{name}}, welcome to our portal!"
                        style={{ fontFamily: "monospace", fontSize: "0.85rem" }}
                      />
                    </Field>
                  </div>
                </div>

                {/* Approval Template */}
                <div>
                  <h3 className="st-label" style={{ fontSize: "1rem", color: "var(--th-primary)", marginBottom: "1rem" }}>Account Approved Email</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <Field label="Subject Line">
                      <input
                        className="st-input"
                        value={form.emailTemplates?.approvalSubject || ""}
                        onChange={e => setForm(c => ({
                          ...c,
                          emailTemplates: { ...c.emailTemplates, approvalSubject: e.target.value }
                        }))}
                        placeholder="Your alumni account has been approved!"
                      />
                    </Field>
                    <Field label="Email Body Text" hint="Supported placeholders: {{name}}, {{institute}}">
                      <textarea
                        className="st-input"
                        value={form.emailTemplates?.approvalBody || ""}
                        onChange={e => setForm(c => ({
                          ...c,
                          emailTemplates: { ...c.emailTemplates, approvalBody: e.target.value }
                        }))}
                        rows={5}
                        placeholder="Hello {{name}}, your account has been approved!"
                        style={{ fontFamily: "monospace", fontSize: "0.85rem" }}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Security" && (
            <div className="st-panel">
              <div className="st-panel-header">
                <div>
                  <h2 className="st-panel-title">Security Settings</h2>
                  <p className="st-panel-sub">Manage portal access guidelines, authentication complexity, and timeout controls.</p>
                </div>
              </div>
              
              <div className="st-info-grid" style={{ marginTop: "1.5rem" }}>
                <Field label="Minimum Password Length" hint="Enforces minimum password characters during registration">
                  <input
                    type="number"
                    min={6}
                    max={32}
                    className="st-input"
                    value={form.security?.passwordMinLength || 8}
                    onChange={e => setForm(c => ({
                      ...c,
                      security: { ...c.security, passwordMinLength: parseInt(e.target.value) || 8 }
                    }))}
                  />
                </Field>
                <Field label="Session Inactivity Timeout (minutes)" hint="Automatically sign out users after inactivity">
                  <input
                    type="number"
                    min={5}
                    max={1440}
                    className="st-input"
                    value={form.security?.sessionTimeout || 60}
                    onChange={e => setForm(c => ({
                      ...c,
                      security: { ...c.security, sessionTimeout: parseInt(e.target.value) || 60 }
                    }))}
                  />
                </Field>
                
                <div className="st-field st-field--full" style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1.5rem", marginTop: "1rem" }}>
                  <div className="st-toggle-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span className="st-label" style={{ margin: 0 }}>Require Multi-Factor Authentication (MFA / 2FA)</span>
                      <p className="st-hint" style={{ marginTop: "0.25rem" }}>Mandates alumni and administrators to setup TOTP-based authentication for increased safety.</p>
                    </div>
                    <Toggle
                      checked={Boolean(form.security?.require2FA)}
                      onChange={val => setForm(c => ({
                        ...c,
                        security: { ...c.security, require2FA: val }
                      }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

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
