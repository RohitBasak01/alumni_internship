import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMyResume, updateMyResume } from "../lib/api.js";
import "../styles/ResumeBuilder.css";

const defaultPersonalInfo = { fullName: "", email: "", phone: "", location: "", linkedin: "", website: "" };
const defaultExperience = { title: "", company: "", location: "", startDate: "", endDate: "", current: false, description: "" };
const defaultEducation = { institution: "", degree: "", fieldOfStudy: "", startDate: "", endDate: "", grade: "" };
const defaultProject = { name: "", description: "", link: "", technologies: [] };

export default function ResumeBuilderPage() {
  const queryClient = useQueryClient();
  const printRef = useRef(null);

  const { data: resumeData, isLoading } = useQuery({
    queryKey: ["my-resume"],
    queryFn: fetchMyResume
  });

  const [activeTab, setActiveTab] = useState("personal");
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    if (resumeData) {
      setFormData(resumeData);
    }
  }, [resumeData]);

  const saveMutation = useMutation({
    mutationFn: updateMyResume,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-resume"] });
    }
  });

  if (isLoading || !formData) {
    return <div className="resume-builder-root" style={{ padding: "2rem", color: "#64748b" }}>Loading resume data...</div>;
  }

  const handlePersonalChange = (e) => {
    setFormData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [e.target.name]: e.target.value }
    }));
  };

  const handleArrayChange = (type, index, field, value) => {
    setFormData(prev => {
      const arr = [...prev[type]];
      arr[index] = { ...arr[index], [field]: value };
      return { ...prev, [type]: arr };
    });
  };

  const handleAddArrayItem = (type, defaultItem) => {
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], defaultItem]
    }));
  };

  const handleRemoveArrayItem = (type, index) => {
    setFormData(prev => {
      const arr = [...prev[type]];
      arr.splice(index, 1);
      return { ...prev, [type]: arr };
    });
  };

  const handleSkillsChange = (e) => {
    const val = e.target.value;
    const skillsArray = val.split(",").map(s => s.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, skills: skillsArray }));
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="resume-builder-root">
      <div className="resume-header">
        <div>
          <h1 className="resume-title">Resume Builder</h1>
          <p className="resume-sub">Create and customize your professional resume.</p>
        </div>
        <div className="resume-header-actions">
          <button className="resume-btn resume-btn-secondary" onClick={handlePrint}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>print</span> Print / Export PDF
          </button>
          <button className="resume-btn resume-btn-primary" onClick={handleSave} disabled={saveMutation.isPending}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>save</span> 
            {saveMutation.isPending ? "Saving..." : "Save Resume"}
          </button>
        </div>
      </div>

      <div className="resume-layout">
        {/* Editor Pane */}
        <div className="resume-editor">
          <div className="resume-editor-tabs">
            <button className={`resume-tab ${activeTab === "personal" ? "active" : ""}`} onClick={() => setActiveTab("personal")}>Personal Info</button>
            <button className={`resume-tab ${activeTab === "summary" ? "active" : ""}`} onClick={() => setActiveTab("summary")}>Summary</button>
            <button className={`resume-tab ${activeTab === "experience" ? "active" : ""}`} onClick={() => setActiveTab("experience")}>Experience</button>
            <button className={`resume-tab ${activeTab === "education" ? "active" : ""}`} onClick={() => setActiveTab("education")}>Education</button>
            <button className={`resume-tab ${activeTab === "skills" ? "active" : ""}`} onClick={() => setActiveTab("skills")}>Skills</button>
            <button className={`resume-tab ${activeTab === "projects" ? "active" : ""}`} onClick={() => setActiveTab("projects")}>Projects</button>
          </div>

          <div className="resume-editor-content">
            {activeTab === "personal" && (
              <div>
                <h3 className="resume-section-title">Personal Information</h3>
                <div className="resume-form-grid">
                  <div className="resume-form-group">
                    <label className="resume-label">Full Name</label>
                    <input className="resume-input" name="fullName" value={formData.personalInfo?.fullName || ""} onChange={handlePersonalChange} placeholder="John Doe" />
                  </div>
                  <div className="resume-form-group">
                    <label className="resume-label">Email</label>
                    <input className="resume-input" name="email" value={formData.personalInfo?.email || ""} onChange={handlePersonalChange} placeholder="john@example.com" />
                  </div>
                  <div className="resume-form-group">
                    <label className="resume-label">Phone</label>
                    <input className="resume-input" name="phone" value={formData.personalInfo?.phone || ""} onChange={handlePersonalChange} placeholder="+1 234 567 890" />
                  </div>
                  <div className="resume-form-group">
                    <label className="resume-label">Location</label>
                    <input className="resume-input" name="location" value={formData.personalInfo?.location || ""} onChange={handlePersonalChange} placeholder="City, Country" />
                  </div>
                  <div className="resume-form-group">
                    <label className="resume-label">LinkedIn</label>
                    <input className="resume-input" name="linkedin" value={formData.personalInfo?.linkedin || ""} onChange={handlePersonalChange} placeholder="linkedin.com/in/johndoe" />
                  </div>
                  <div className="resume-form-group">
                    <label className="resume-label">Website</label>
                    <input className="resume-input" name="website" value={formData.personalInfo?.website || ""} onChange={handlePersonalChange} placeholder="johndoe.com" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "summary" && (
              <div>
                <h3 className="resume-section-title">Professional Summary</h3>
                <div className="resume-form-group full">
                  <label className="resume-label">Summary</label>
                  <textarea className="resume-input resume-textarea" value={formData.summary || ""} onChange={e => setFormData(prev => ({ ...prev, summary: e.target.value }))} placeholder="Brief overview of your professional background and goals..." />
                </div>
              </div>
            )}

            {activeTab === "experience" && (
              <div>
                <h3 className="resume-section-title">Work Experience</h3>
                {formData.experience?.map((exp, idx) => (
                  <div key={idx} className="resume-item-card">
                    <div className="resume-item-header">
                      <h4 className="resume-item-title">{exp.title || "New Experience"}</h4>
                      <button className="resume-item-remove" onClick={() => handleRemoveArrayItem("experience", idx)}><span className="material-symbols-outlined">delete</span></button>
                    </div>
                    <div className="resume-form-grid">
                      <div className="resume-form-group">
                        <label className="resume-label">Job Title</label>
                        <input className="resume-input" value={exp.title || ""} onChange={(e) => handleArrayChange("experience", idx, "title", e.target.value)} placeholder="Software Engineer" />
                      </div>
                      <div className="resume-form-group">
                        <label className="resume-label">Company</label>
                        <input className="resume-input" value={exp.company || ""} onChange={(e) => handleArrayChange("experience", idx, "company", e.target.value)} placeholder="Google" />
                      </div>
                      <div className="resume-form-group">
                        <label className="resume-label">Start Date</label>
                        <input className="resume-input" value={exp.startDate || ""} onChange={(e) => handleArrayChange("experience", idx, "startDate", e.target.value)} placeholder="Jan 2020" />
                      </div>
                      <div className="resume-form-group">
                        <label className="resume-label">End Date</label>
                        <input className="resume-input" value={exp.endDate || ""} onChange={(e) => handleArrayChange("experience", idx, "endDate", e.target.value)} placeholder="Present" disabled={exp.current} />
                      </div>
                      <div className="resume-form-group full" style={{flexDirection:"row", alignItems:"center", gap:"0.5rem"}}>
                        <input type="checkbox" checked={exp.current || false} onChange={(e) => handleArrayChange("experience", idx, "current", e.target.checked)} />
                        <label className="resume-label" style={{margin:0}}>I currently work here</label>
                      </div>
                      <div className="resume-form-group full">
                        <label className="resume-label">Description</label>
                        <textarea className="resume-input resume-textarea" value={exp.description || ""} onChange={(e) => handleArrayChange("experience", idx, "description", e.target.value)} placeholder="- Developed features..." />
                      </div>
                    </div>
                  </div>
                ))}
                <button className="resume-add-btn" onClick={() => handleAddArrayItem("experience", defaultExperience)}>
                  <span className="material-symbols-outlined">add</span> Add Experience
                </button>
              </div>
            )}

            {activeTab === "education" && (
              <div>
                <h3 className="resume-section-title">Education</h3>
                {formData.education?.map((edu, idx) => (
                  <div key={idx} className="resume-item-card">
                    <div className="resume-item-header">
                      <h4 className="resume-item-title">{edu.degree ? `${edu.degree} at ${edu.institution}` : "New Education"}</h4>
                      <button className="resume-item-remove" onClick={() => handleRemoveArrayItem("education", idx)}><span className="material-symbols-outlined">delete</span></button>
                    </div>
                    <div className="resume-form-grid">
                      <div className="resume-form-group">
                        <label className="resume-label">Institution</label>
                        <input className="resume-input" value={edu.institution || ""} onChange={(e) => handleArrayChange("education", idx, "institution", e.target.value)} placeholder="University Name" />
                      </div>
                      <div className="resume-form-group">
                        <label className="resume-label">Degree</label>
                        <input className="resume-input" value={edu.degree || ""} onChange={(e) => handleArrayChange("education", idx, "degree", e.target.value)} placeholder="Bachelor of Science" />
                      </div>
                      <div className="resume-form-group">
                        <label className="resume-label">Field of Study</label>
                        <input className="resume-input" value={edu.fieldOfStudy || ""} onChange={(e) => handleArrayChange("education", idx, "fieldOfStudy", e.target.value)} placeholder="Computer Science" />
                      </div>
                      <div className="resume-form-group">
                        <label className="resume-label">Grade / GPA</label>
                        <input className="resume-input" value={edu.grade || ""} onChange={(e) => handleArrayChange("education", idx, "grade", e.target.value)} placeholder="3.8/4.0" />
                      </div>
                      <div className="resume-form-group">
                        <label className="resume-label">Start Date</label>
                        <input className="resume-input" value={edu.startDate || ""} onChange={(e) => handleArrayChange("education", idx, "startDate", e.target.value)} placeholder="2016" />
                      </div>
                      <div className="resume-form-group">
                        <label className="resume-label">End Date</label>
                        <input className="resume-input" value={edu.endDate || ""} onChange={(e) => handleArrayChange("education", idx, "endDate", e.target.value)} placeholder="2020" />
                      </div>
                    </div>
                  </div>
                ))}
                <button className="resume-add-btn" onClick={() => handleAddArrayItem("education", defaultEducation)}>
                  <span className="material-symbols-outlined">add</span> Add Education
                </button>
              </div>
            )}

            {activeTab === "skills" && (
              <div>
                <h3 className="resume-section-title">Skills</h3>
                <div className="resume-form-group full">
                  <label className="resume-label">Skills (comma separated)</label>
                  <textarea className="resume-input resume-textarea" value={formData.skills?.join(", ") || ""} onChange={handleSkillsChange} placeholder="JavaScript, React, Node.js, Python..." />
                </div>
              </div>
            )}

            {activeTab === "projects" && (
              <div>
                <h3 className="resume-section-title">Projects</h3>
                {formData.projects?.map((proj, idx) => (
                  <div key={idx} className="resume-item-card">
                    <div className="resume-item-header">
                      <h4 className="resume-item-title">{proj.name || "New Project"}</h4>
                      <button className="resume-item-remove" onClick={() => handleRemoveArrayItem("projects", idx)}><span className="material-symbols-outlined">delete</span></button>
                    </div>
                    <div className="resume-form-grid">
                      <div className="resume-form-group">
                        <label className="resume-label">Project Name</label>
                        <input className="resume-input" value={proj.name || ""} onChange={(e) => handleArrayChange("projects", idx, "name", e.target.value)} placeholder="E-commerce App" />
                      </div>
                      <div className="resume-form-group">
                        <label className="resume-label">Link / URL</label>
                        <input className="resume-input" value={proj.link || ""} onChange={(e) => handleArrayChange("projects", idx, "link", e.target.value)} placeholder="github.com/..." />
                      </div>
                      <div className="resume-form-group full">
                        <label className="resume-label">Technologies (comma separated)</label>
                        <input className="resume-input" value={proj.technologies?.join(", ") || ""} onChange={(e) => handleArrayChange("projects", idx, "technologies", e.target.value.split(",").map(s=>s.trim()).filter(Boolean))} placeholder="React, Node.js, MongoDB" />
                      </div>
                      <div className="resume-form-group full">
                        <label className="resume-label">Description</label>
                        <textarea className="resume-input resume-textarea" value={proj.description || ""} onChange={(e) => handleArrayChange("projects", idx, "description", e.target.value)} placeholder="Built a full-stack application..." />
                      </div>
                    </div>
                  </div>
                ))}
                <button className="resume-add-btn" onClick={() => handleAddArrayItem("projects", defaultProject)}>
                  <span className="material-symbols-outlined">add</span> Add Project
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Preview Pane */}
        <div className="resume-preview-wrap">
          <div className="resume-preview-header">
            <div className="resume-preview-title">
              <span className="material-symbols-outlined" style={{fontSize:18}}>visibility</span> Live Preview
            </div>
            <div>
              <select className="resume-theme-select" value={formData.theme || "modern"} onChange={(e) => setFormData(prev => ({...prev, theme: e.target.value}))}>
                <option value="modern">Modern Theme</option>
                <option value="minimal">Minimal Theme</option>
              </select>
            </div>
          </div>
          <div className="resume-preview-content">
            <div className={`resume-paper theme-${formData.theme || "modern"}`} ref={printRef}>
              <div className="r-header">
                <h1 className="r-name">{formData.personalInfo?.fullName || "Your Name"}</h1>
                <div className="r-contact">
                  {formData.personalInfo?.email && <span><span className="material-symbols-outlined" style={{fontSize:14}}>mail</span> {formData.personalInfo.email}</span>}
                  {formData.personalInfo?.phone && <span><span className="material-symbols-outlined" style={{fontSize:14}}>call</span> {formData.personalInfo.phone}</span>}
                  {formData.personalInfo?.location && <span><span className="material-symbols-outlined" style={{fontSize:14}}>location_on</span> {formData.personalInfo.location}</span>}
                  {formData.personalInfo?.linkedin && <span><span className="material-symbols-outlined" style={{fontSize:14}}>link</span> {formData.personalInfo.linkedin}</span>}
                  {formData.personalInfo?.website && <span><span className="material-symbols-outlined" style={{fontSize:14}}>language</span> {formData.personalInfo.website}</span>}
                </div>
              </div>

              {formData.summary && (
                <div className="r-section">
                  <h2 className="r-section-title">Summary</h2>
                  <div className="r-item-desc">{formData.summary}</div>
                </div>
              )}

              {formData.experience?.length > 0 && (
                <div className="r-section">
                  <h2 className="r-section-title">Experience</h2>
                  {formData.experience.map((exp, idx) => (
                    <div key={idx} className="r-item">
                      <div className="r-item-head">
                        <span className="r-item-title">{exp.title}</span>
                        <span className="r-item-date">{exp.startDate} – {exp.current ? "Present" : exp.endDate}</span>
                      </div>
                      <div className="r-item-sub">{exp.company}{exp.location && ` | ${exp.location}`}</div>
                      <div className="r-item-desc">{exp.description}</div>
                    </div>
                  ))}
                </div>
              )}

              {formData.education?.length > 0 && (
                <div className="r-section">
                  <h2 className="r-section-title">Education</h2>
                  {formData.education.map((edu, idx) => (
                    <div key={idx} className="r-item">
                      <div className="r-item-head">
                        <span className="r-item-title">{edu.degree}{edu.fieldOfStudy && ` in ${edu.fieldOfStudy}`}</span>
                        <span className="r-item-date">{edu.startDate} – {edu.endDate}</span>
                      </div>
                      <div className="r-item-sub">{edu.institution}</div>
                      {edu.grade && <div className="r-item-desc">Grade: {edu.grade}</div>}
                    </div>
                  ))}
                </div>
              )}

              {formData.projects?.length > 0 && (
                <div className="r-section">
                  <h2 className="r-section-title">Projects</h2>
                  {formData.projects.map((proj, idx) => (
                    <div key={idx} className="r-item">
                      <div className="r-item-head">
                        <span className="r-item-title">{proj.name} {proj.link && <span style={{fontSize:"0.8rem", fontWeight:"normal", marginLeft:"0.5rem"}}>{proj.link}</span>}</span>
                      </div>
                      {proj.technologies?.length > 0 && (
                        <div className="r-item-sub" style={{color:"#64748b"}}>Tech: {proj.technologies.join(", ")}</div>
                      )}
                      <div className="r-item-desc">{proj.description}</div>
                    </div>
                  ))}
                </div>
              )}

              {formData.skills?.length > 0 && (
                <div className="r-section">
                  <h2 className="r-section-title">Skills</h2>
                  <div className="r-skills">
                    {formData.skills.map((skill, idx) => (
                      <span key={idx} className="r-skill-badge">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
