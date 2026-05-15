import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext.jsx";
import { applyToJob, createJob, deleteJob, fetchJobs, updateJob, fetchUserApplications } from "../lib/api.js";
import "../styles/Jobs.css";

const initialForm = { title:"",company:"",description:"",location:"",industry:"",requestedDeadline:"",applicationDeadline:"",status:"pending_approval" };
const initialFilters = { query:"",jobType:"",location:"",industry:"" };

const LOGO_COLORS=["#6366f1","#0ea5e9","#10b981","#f59e0b","#8b5cf6","#ef4444","#ec4899","#14b8a6"];
const RECOMMENDED=[
  {title:"Senior Software Engineer",company:"Cognizant",location:"Bengaluru, India",exp:"3-5 Yrs",color:"#6366f1"},
  {title:"Machine Learning Engineer",company:"Flipkart",location:"Bengaluru, India",exp:"2-4 Yrs",color:"#0ea5e9"},
  {title:"Business Analyst",company:"Deloitte",location:"Mumbai, India",exp:"2-3 Yrs",color:"#1e293b"},
  {title:"DevOps Engineer",company:"IBM",location:"Pune, India",exp:"3-6 Yrs",color:"#1d4ed8"},
];
const CAREER_RESOURCES=[
  {icon:"description",title:"Resume Review",sub:"Get your resume reviewed by experts"},
  {icon:"chat",title:"Interview Preparation",sub:"Practice with mock interviews"},
  {icon:"bar_chart",title:"Salary Insights",sub:"Check salary trends and benchmarks"},
];

function fmtRel(v){
  const h=Math.max(1,Math.round((Date.now()-new Date(v).getTime())/(1000*60*60)));
  if(h<24) return `${h}h ago`;
  const d=Math.round(h/24);
  return `${d}d ago`;
}
function fmtDT(v){
  if(!v) return "Not set";
  return new Date(v).toLocaleString(undefined,{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});
}
function logoColor(name=""){ return LOGO_COLORS[(name.charCodeAt(0)||65)%LOGO_COLORS.length]; }

function JobRow({item,idx,onView,isAdmin,onEdit,onDelete,deletePending}){
  const color=logoColor(item.company);
  const isNew=(Date.now()-new Date(item.createdAt).getTime())<86400000*2;
  return(
    <div className="jb-row">
      <div className="jb-row-logo" style={{background:color+"18",color}}>{item.company?.[0]?.toUpperCase()||"?"}</div>
      <div className="jb-row-body">
        <div className="jb-row-top">
          {isNew&&<span className="jb-new-badge">New</span>}
          <h3 className="jb-row-title" onClick={()=>onView(item)}>
            {item.title}
            <span className="material-symbols-outlined" style={{fontSize:14,color:"#6366f1",marginLeft:4}}>verified</span>
          </h3>
          <button className="jb-bookmark-btn"><span className="material-symbols-outlined" style={{fontSize:18}}>bookmark_border</span></button>
        </div>
        <div className="jb-row-meta">
          <span>{item.company}</span>
          <span>·</span>
          <span>{item.locationLabel||item.location||"India"}</span>
          <span>·</span>
          <span>{item.jobType||"Full-time"}</span>
        </div>
        <div className="jb-row-footer">
          <span className="jb-exp-badge">{2+(idx%4)}-{4+(idx%4)} Yrs</span>
          <span className="jb-cat-badge">{item.industryLabel||item.industry||"Technology"}</span>
          <span className="jb-time">{fmtRel(item.createdAt||new Date())}</span>
          <div className="jb-row-actions">
            <button className="jb-view-btn" onClick={()=>onView(item)}>View Details</button>
            {isAdmin&&<button className="jb-edit-btn" onClick={()=>onEdit(item)}>Edit</button>}
            {isAdmin&&<button className="jb-del-btn" disabled={deletePending} onClick={()=>onDelete(item._id)}>Delete</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ApplyModal({job,coverLetter,setCoverLetter,resumeFile,setResumeFile,onApply,onClose,isPending,isSuccess,canApply}){
  return(
    <div className="jb-modal-backdrop" onClick={onClose}>
      <div className="jb-modal" onClick={e=>e.stopPropagation()}>
        <div className="jb-modal-header">
          <div>
            <p className="jb-modal-kicker">Apply for position</p>
            <h3 className="jb-modal-title">{job.title}</h3>
            <p className="jb-modal-sub">{job.company} · {job.locationLabel||job.location}</p>
          </div>
          <button className="jb-modal-close" onClick={onClose}><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="jb-modal-body">
          <div className="jb-detail-grid">
            <div><span className="jb-detail-label">Company</span><span className="jb-detail-val">{job.company}</span></div>
            <div><span className="jb-detail-label">Location</span><span className="jb-detail-val">{job.locationLabel||job.location}</span></div>
            <div><span className="jb-detail-label">Type</span><span className="jb-detail-val">{job.jobType||"Full-time"}</span></div>
            <div><span className="jb-detail-label">Industry</span><span className="jb-detail-val">{job.industryLabel||job.industry}</span></div>
            <div><span className="jb-detail-label">Status</span><span className="jb-detail-val">{job.adminStatus}</span></div>
            <div><span className="jb-detail-label">Deadline</span><span className="jb-detail-val">{fmtDT(job.applicationDeadline||job.requestedDeadline)}</span></div>
          </div>
          {job.description&&<p className="jb-detail-desc">{job.description}</p>}
          {isSuccess?(
            <div className="jb-success-msg">✓ Application submitted successfully!</div>
          ):!canApply?(
            <div className="jb-info-msg">
              {job.adminStatus==="Pending"?"This job is pending approval.":job.adminStatus==="Rejected"?"This job was rejected.":job.adminStatus==="Expired"?"This job has expired.":"You cannot apply to this job."}
            </div>
          ):(
            <>
              <textarea className="jb-textarea" rows={3} placeholder="Cover letter (optional)..." value={coverLetter} onChange={e=>setCoverLetter(e.target.value)}/>
              <div className="jb-resume-row">
                <label className="jb-resume-label">
                  <span className="material-symbols-outlined" style={{fontSize:16}}>upload_file</span>
                  {resumeFile?resumeFile.name:"Upload Resume (PDF/DOC, optional)"}
                  <input type="file" accept=".pdf,.doc,.docx" style={{display:"none"}} onChange={e=>setResumeFile(e.target.files?.[0]||null)}/>
                </label>
              </div>
            </>
          )}
        </div>
        <div className="jb-modal-footer">
          {!isSuccess&&canApply&&(
            <button className="jb-apply-btn" disabled={isPending} onClick={onApply}>
              {isPending?"Submitting...":"Apply Now"}
            </button>
          )}
          <button className="jb-close-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function JobsPage(){
  const auth=useAuth();
  const queryClient=useQueryClient();
  const [form,setForm]=useState(initialForm);
  const [filters,setFilters]=useState(initialFilters);
  const [editingId,setEditingId]=useState(null);
  const [showComposer,setShowComposer]=useState(false);
  const [selectedJobId,setSelectedJobId]=useState(null);
  const [coverLetter,setCoverLetter]=useState("");
  const [resumeFile,setResumeFile]=useState(null);
  const [applicationSuccess,setApplicationSuccess]=useState(null);
  const [activeTab,setActiveTab]=useState("All Jobs");
  const [page,setPage]=useState(1);
  const PAGE_SIZE=10;

  const {data=[],isLoading,isError,error}=useQuery({queryKey:["jobs"],queryFn:fetchJobs});
  const {data: userApplications=[]}=useQuery({queryKey:["user-applications"],queryFn:fetchUserApplications});
  const deferredQuery=useDeferredValue(filters.query);

  const saveMutation=useMutation({
    mutationFn:({id,payload})=>id?updateJob(id,payload):createJob(payload),
    onSuccess:()=>{queryClient.invalidateQueries({queryKey:["jobs"]});setForm(initialForm);setEditingId(null);setShowComposer(false);}
  });
  const deleteMutation=useMutation({mutationFn:deleteJob,onSuccess:()=>queryClient.invalidateQueries({queryKey:["jobs"]})});
  const applyMutation=useMutation({
    mutationFn:async(payload)=>{
      if(resumeFile){
        return new Promise((resolve,reject)=>{
          const reader=new FileReader();
          reader.onload=async()=>{try{resolve(await applyToJob(selectedJobId,{...payload,resumeUrl:reader.result,resumeFileName:resumeFile.name}));}catch(e){reject(e);}};
          reader.onerror=reject;
          reader.readAsDataURL(resumeFile);
        });
      }
      return applyToJob(selectedJobId,payload);
    },
    onSuccess:()=>{queryClient.invalidateQueries({queryKey:["user-applications"]});setApplicationSuccess(true);setCoverLetter("");setResumeFile(null);setTimeout(()=>{setApplicationSuccess(null);setSelectedJobId(null);},2000);}
  });

  function handleChange(e){setForm(c=>({...c,[e.target.name]:e.target.value}));}
  function handleFilterChange(e){setFilters(c=>({...c,[e.target.name]:e.target.value}));}
  function handleSubmit(e){
    e.preventDefault();
    const payload={title:form.title,company:form.company,description:form.description,location:form.location,industry:form.industry};
    if(form.requestedDeadline) payload.requestedDeadline=form.requestedDeadline;
    if(isAdmin){payload.status=form.status;if(form.applicationDeadline)payload.applicationDeadline=form.applicationDeadline;}
    saveMutation.mutate({id:editingId,payload});
  }
  function handleEdit(item){
    setEditingId(item._id);setShowComposer(true);
    setForm({title:item.title||"",company:item.company||"",description:item.description||"",location:item.location||item.locationLabel||"",industry:item.industry||item.industryLabel||"",
      requestedDeadline:item.requestedDeadline?new Date(item.requestedDeadline).toISOString().slice(0,16):"",
      applicationDeadline:item.applicationDeadline?new Date(item.applicationDeadline).toISOString().slice(0,16):"",
      status:item.adminStatus==="Approved"?"published":item.adminStatus==="Rejected"?"rejected":item.adminStatus==="Expired"?"expired":"pending_approval"});
  }
  function handleCancel(){setEditingId(null);setForm(initialForm);setShowComposer(false);}
  function clearFilters(){setFilters(initialFilters);}

  const isAdmin = auth.hasPermission("manage_jobs");
  const locationOptions=[...new Set(data.map(i=>i.locationLabel).filter(Boolean))];
  const industryOptions=[...new Set(data.map(i=>i.industryLabel).filter(Boolean))];

  const filteredJobs=useMemo(()=>data.filter(item=>{
    const hs=`${item.title} ${item.company} ${item.description} ${item.industryLabel}`.toLowerCase();
    const q=deferredQuery?hs.includes(deferredQuery.toLowerCase()):true;
    const t=filters.jobType?(isAdmin?item.adminStatus===filters.jobType:item.jobType===filters.jobType):true;
    const l=filters.location?item.locationLabel===filters.location:true;
    const ind=filters.industry?item.industryLabel===filters.industry:true;
    return q&&t&&l&&ind;
  }),[data,deferredQuery,filters,isAdmin]);

  const pendingJobs=data.filter(i=>i.adminStatus==="Pending");
  const activeJobs=data.filter(i=>i.adminStatus==="Approved");
  const archivedJobs=data.filter(i=>i.adminStatus==="Expired"||i.adminStatus==="Rejected");
  const totalPages=Math.max(1,Math.ceil(filteredJobs.length/PAGE_SIZE));
  const pagedJobs=filteredJobs.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  const selectedJob=filteredJobs.find(j=>j._id===selectedJobId);

  // Calculate application tracker stats
  const appTrackerStats=[
    {v:userApplications.length,l:"Applied",c:"#6366f1"},
    {v:userApplications.filter(app=>app.status==="pending").length,l:"Pending",c:"#f59e0b"},
    {v:userApplications.filter(app=>app.status==="reviewed").length,l:"Reviewed",c:"#10b981"},
    {v:userApplications.filter(app=>app.status==="accepted").length,l:"Accepted",c:"#8b5cf6"}
  ];

  const STATS=[
    {icon:"work",label:"Active Jobs",value:activeJobs.length||filteredJobs.length,trend:"18% this week",color:"#6366f1",bg:"#eff0ff"},
    {icon:"new_releases",label:"New This Week",value:Math.round(filteredJobs.length*0.26)||324,trend:"24% this week",color:"#10b981",bg:"#f0fdf4"},
    {icon:"send",label:"Applications Sent",value:userApplications.length||0,trend:userApplications.length>0?"12% this week":"0% this week",color:"#f59e0b",bg:"#fff7ed"},
    {icon:"groups",label:"Interviews",value:userApplications.filter(app=>app.status==="reviewed").length||0,trend:"9% this week",color:"#8b5cf6",bg:"#fdf4ff"},
  ];

  return(
    <div className="jb-root module-careers">
      <div className="jb-page-header">
        <div>
          <h1 className="jb-page-title">Jobs</h1>
          <p className="jb-page-sub">Discover exciting opportunities and take the next step in your career.</p>
        </div>
      </div>

      <div className="jb-stats-row">
        {STATS.map(s=>(
          <div key={s.label} className="jb-stat-card">
            <div className="jb-stat-icon" style={{background:s.bg,color:s.color}}>
              <span className="material-symbols-outlined" style={{fontSize:22}}>{s.icon}</span>
            </div>
            <div>
              <div className="jb-stat-value">{s.value.toLocaleString()}</div>
              <div className="jb-stat-label">{s.label}</div>
              <div className="jb-stat-trend" style={{color:s.color}}>↑ {s.trend}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="jb-search-row">
        <div className="jb-search-wrap">
          <span className="material-symbols-outlined jb-search-icon">search</span>
          <input className="jb-search-input" name="query" value={filters.query} onChange={handleFilterChange} placeholder="Search jobs, companies, or keywords..."/>
        </div>
        <button className="jb-post-btn" onClick={()=>setShowComposer(s=>!s)}>
          <span className="material-symbols-outlined" style={{fontSize:16}}>add</span>
          Post a Job
        </button>
      </div>

      <div className="jb-filter-row">
        <select className="jb-filter-select" name="jobType" value={filters.jobType} onChange={handleFilterChange}>
          <option value="">All Job Types</option>
          <option value="Full-time">Full-time</option>
          <option value="Internship">Internship</option>
          <option value="Contract">Contract</option>
          {isAdmin&&<><option value="Pending">Pending</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option></>}
        </select>
        <select className="jb-filter-select" name="location" value={filters.location} onChange={handleFilterChange}>
          <option value="">All Locations</option>
          {locationOptions.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
        <select className="jb-filter-select" name="industry" value={filters.industry} onChange={handleFilterChange}>
          <option value="">All Industries</option>
          {industryOptions.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
        <select className="jb-filter-select"><option>Experience Level</option><option>0-2 Yrs</option><option>2-5 Yrs</option><option>5+ Yrs</option></select>
        <button className="jb-more-filters-btn">
          <span className="material-symbols-outlined" style={{fontSize:15}}>filter_list</span>More Filters
        </button>
        {(filters.query||filters.jobType||filters.location||filters.industry)&&(
          <button className="jb-reset-btn" onClick={clearFilters}>Reset</button>
        )}
      </div>

      {showComposer&&(
        <div className="jb-composer-card">
          <h3 className="jb-composer-title">{editingId?(isAdmin?"Review Job":"Edit Job"):"Post a New Job"}</h3>
          <form onSubmit={handleSubmit} className="jb-composer-form">
            <div className="jb-composer-row">
              <input className="jb-cinput" name="title" value={form.title} onChange={handleChange} placeholder="Job title" required/>
              <input className="jb-cinput" name="company" value={form.company} onChange={handleChange} placeholder="Company" required/>
            </div>
            <div className="jb-composer-row">
              <input className="jb-cinput" name="location" value={form.location} onChange={handleChange} placeholder="Location"/>
              <input className="jb-cinput" name="industry" value={form.industry} onChange={handleChange} placeholder="Industry"/>
            </div>
            <textarea className="jb-cinput" name="description" value={form.description} onChange={handleChange} placeholder="Job description" rows={3}/>
            <div className="jb-composer-row">
              <input className="jb-cinput" name="requestedDeadline" type="datetime-local" value={form.requestedDeadline} onChange={handleChange}/>
              {isAdmin&&<input className="jb-cinput" name="applicationDeadline" type="datetime-local" value={form.applicationDeadline} onChange={handleChange}/>}
              {isAdmin&&(
                <select className="jb-cinput" name="status" value={form.status} onChange={handleChange}>
                  <option value="pending_approval">Pending Review</option>
                  <option value="published">Approve</option>
                  <option value="rejected">Reject</option>
                  <option value="expired">Expire</option>
                </select>
              )}
            </div>
            <div className="jb-composer-actions">
              <button className="jb-post-btn" type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending?"Saving...":editingId?"Update":"Submit"}</button>
              <button className="jb-reset-btn" type="button" onClick={handleCancel} style={{borderColor:"#e2e8f0",color:"#374151",background:"#fff"}}>Cancel</button>
            </div>
            {saveMutation.isError&&<p style={{color:"#ef4444",fontSize:"0.8rem"}}>{saveMutation.error.message}</p>}
          </form>
        </div>
      )}

      <div className="jb-layout">
        <div className="jb-main-col">
          <div className="jb-tabs-row">
            {["All Jobs","Saved Jobs","Applied Jobs","Company Following"].map(tab=>(
              <button key={tab} className={`jb-tab ${activeTab===tab?"jb-tab--active":""}`} onClick={()=>setActiveTab(tab)}>{tab}</button>
            ))}
            <div className="jb-sort-wrap" style={{marginLeft:"auto"}}>
              <span style={{fontSize:"0.75rem",color:"#64748b",fontWeight:600}}>Sort by:</span>
              <select className="jb-filter-select">
                <option>Most Recent</option><option>Most Relevant</option><option>Salary</option>
              </select>
              <div className="jb-view-toggle">
                <button className="jb-view-btn jb-view-btn--active"><span className="material-symbols-outlined" style={{fontSize:17}}>grid_view</span></button>
                <button className="jb-view-btn"><span className="material-symbols-outlined" style={{fontSize:17}}>view_list</span></button>
              </div>
            </div>
          </div>

          {isLoading&&<p style={{color:"#94a3b8",fontSize:"0.85rem"}}>Loading jobs...</p>}
          {isError&&<p style={{color:"#ef4444",fontSize:"0.85rem"}}>{error.message}</p>}
          {!isLoading&&filteredJobs.length===0&&(
            <div className="jb-empty">
              <span className="material-symbols-outlined" style={{fontSize:44,color:"#c7d2fe"}}>work_off</span>
              <h3>No jobs found</h3><p>Try adjusting your filters.</p>
            </div>
          )}

          <div className="jb-list">
            {pagedJobs.map((item,idx)=>(
              <JobRow key={item._id} item={item} idx={idx} isAdmin={isAdmin}
                onView={j=>setSelectedJobId(j._id)}
                onEdit={handleEdit}
                onDelete={id=>deleteMutation.mutate(id)}
                deletePending={deleteMutation.isPending}
              />
            ))}
          </div>

          {totalPages>1&&(
            <div className="jb-pagination">
              <button className="jb-page-btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>
                <span className="material-symbols-outlined" style={{fontSize:17}}>chevron_left</span>
              </button>
              {Array.from({length:Math.min(totalPages,5)},(_,i)=>i+1).map(n=>(
                <button key={n} className={`jb-page-btn ${page===n?"jb-page-btn--active":""}`} onClick={()=>setPage(n)}>{n}</button>
              ))}
              {totalPages>5&&<span className="jb-page-ellipsis">...</span>}
              {totalPages>5&&<button className="jb-page-btn" onClick={()=>setPage(totalPages)}>{totalPages}</button>}
              <button className="jb-page-btn" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>
                <span className="material-symbols-outlined" style={{fontSize:17}}>chevron_right</span>
              </button>
            </div>
          )}
        </div>

        <aside className="jb-sidebar">
          <div className="jb-sidebar-card">
            <div className="jb-sidebar-header"><span className="jb-sidebar-title">Recommended for You</span><button className="jb-sidebar-link">View All</button></div>
            <div className="jb-rec-list">
              {RECOMMENDED.map(r=>(
                <div key={r.title} className="jb-rec-item">
                  <div className="jb-rec-logo" style={{background:r.color+"18",color:r.color}}>{r.company[0]}</div>
                  <div className="jb-rec-info">
                    <div className="jb-rec-title">{r.title}</div>
                    <div className="jb-rec-company">{r.company}</div>
                    <div className="jb-rec-meta">
                      <span><span className="material-symbols-outlined" style={{fontSize:11}}>location_on</span>{r.location}</span>
                      <span className="jb-rec-exp">{r.exp}</span>
                    </div>
                  </div>
                  <button className="jb-bookmark-btn"><span className="material-symbols-outlined" style={{fontSize:16}}>bookmark_border</span></button>
                </div>
              ))}
            </div>
          </div>

          <div className="jb-sidebar-card">
            <div className="jb-sidebar-header"><span className="jb-sidebar-title">Application Tracker</span><button className="jb-sidebar-link">View All</button></div>
            <div className="jb-tracker-row">
              {appTrackerStats.map(t=>(
                <div key={t.l} className="jb-tracker-item">
                  <div className="jb-tracker-val" style={{color:t.c}}>{t.v}</div>
                  <div className="jb-tracker-label">{t.l}</div>
                </div>
              ))}
            </div>
            <div className="jb-recent-apps">
              {data.slice(0,3).map((job,i)=>(
                <div key={job._id} className="jb-recent-app-row">
                  <div className="jb-recent-logo" style={{background:logoColor(job.company)+"18",color:logoColor(job.company)}}>{job.company?.[0]||"?"}</div>
                  <div className="jb-recent-info">
                    <div className="jb-recent-title">{job.company} – {job.title}</div>
                    <div className="jb-recent-time">{fmtRel(job.createdAt||new Date())}</div>
                  </div>
                  <span className={`jb-status-pill jb-status-${["review","applied","interview"][i%3]}`}>{["In Review","Applied","Interview"][i%3]}</span>
                </div>
              ))}
            </div>
            <button className="jb-sidebar-link" style={{marginTop:".5rem",display:"block"}}>View All Applications →</button>
          </div>

          <div className="jb-sidebar-card">
            <div className="jb-sidebar-header"><span className="jb-sidebar-title">Career Resources</span><button className="jb-sidebar-link">View All</button></div>
            <div className="jb-res-list">
              {CAREER_RESOURCES.map(r=>(
                <div key={r.title} className="jb-res-item">
                  <div className="jb-res-icon"><span className="material-symbols-outlined" style={{fontSize:18,color:"#6366f1"}}>{r.icon}</span></div>
                  <div><div className="jb-res-title">{r.title}</div><div className="jb-res-sub">{r.sub}</div></div>
                  <span className="material-symbols-outlined" style={{fontSize:16,color:"#94a3b8",marginLeft:"auto"}}>chevron_right</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {selectedJob&&(
        <ApplyModal
          job={selectedJob}
          coverLetter={coverLetter} setCoverLetter={setCoverLetter}
          resumeFile={resumeFile} setResumeFile={setResumeFile}
          onApply={()=>applyMutation.mutate({coverLetter})}
          onClose={()=>setSelectedJobId(null)}
          isPending={applyMutation.isPending}
          isSuccess={!!applicationSuccess}
          canApply={!!selectedJob.canApply}
        />
      )}
      {deleteMutation.isError&&<p style={{color:"#ef4444",fontSize:"0.8rem"}}>{deleteMutation.error.message}</p>}
    </div>
  );
}
