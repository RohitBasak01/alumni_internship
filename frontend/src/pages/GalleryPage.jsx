import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext.jsx";
import { createGalleryItem, deleteGalleryItem, fetchGalleryItems } from "../lib/api.js";
import "../styles/Gallery.css";

/* ── Static data ─────────────────────────────────────────── */
const emptyForm = { url: "", caption: "" };

const MEDIA_TABS = ["All Media", "Photos", "Videos", "Albums", "Events", "Institutes"];

const TAG_COLORS = {
  "Campus Life":   ["#eff0ff","#6366f1"],
  "Events":        ["#f0fdf4","#16a34a"],
  "Reunions":      ["#fff7ed","#d97706"],
  "Convocation":   ["#fdf4ff","#9333ea"],
  "Alumni Meetups":["#eff6ff","#3b82f6"],
  "Sports":        ["#fff1f2","#e11d48"],
  "Campus Views":  ["#f0fdfa","#0d9488"],
  "Clubs & Activities":["#fefce8","#ca8a04"],
  images:          ["#eff0ff","#6366f1"],
  videos:          ["#f0fdf4","#16a34a"],
  personal_photos: ["#fff7ed","#d97706"],
};

const MOCK_ALBUMS = [
  { title:"SPIT Annual Meet 2026", date:"May 2026",  count:156, img:"https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=80&q=60" },
  { title:"Alumni Reunion Mumbai",  date:"Feb 2026",  count:98,  img:"https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=80&q=60" },
  { title:"Convocation 2025",       date:"Jan 2026",  count:134, img:"https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=80&q=60" },
  { title:"Tech Talk Series",       date:"2025",      count:76,  img:"https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=80&q=60" },
  { title:"Campus Life",            date:"2025",      count:112, img:"https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=80&q=60" },
];
const HIGHLIGHT_IMGS = [
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=120&q=60",
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=120&q=60",
  "https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=120&q=60",
  "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=120&q=60",
];

const SORT_OPTIONS = ["Newest First","Oldest First","Most Viewed","A–Z"];

/* tag background colors */
function tagStyle(section) {
  const s = TAG_COLORS[section] || ["#f1f5f9","#475569"];
  return { background: s[0], color: s[1] };
}

function sectionLabel(section) {
  const MAP = { images:"Campus Life", videos:"Events", personal_photos:"Alumni Meetups" };
  return MAP[section] || section;
}

function formatDate(v) {
  if (!v) return "";
  return new Date(v).toLocaleDateString("en-US",{ month:"short", year:"numeric" });
}

/* ── Lightbox ────────────────────────────────────────────── */
function Lightbox({ item, onClose }) {
  const isVideo = item.mediaType === "video";
  return (
    <div className="gl-lightbox-backdrop" onClick={onClose}>
      <div className="gl-lightbox" onClick={e=>e.stopPropagation()}>
        <button className="gl-lightbox-close" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>
        {isVideo
          ? <video src={item.url} controls className="gl-lightbox-media" autoPlay/>
          : <img src={item.url} alt={item.caption||"Gallery"} className="gl-lightbox-media"/>
        }
        {item.caption && <div className="gl-lightbox-caption">{item.caption}</div>}
      </div>
    </div>
  );
}

/* ── Gallery tile ────────────────────────────────────────── */
function GalleryTile({ item, canDelete, onDelete, onOpen, wide, tall }) {
  const isVideo = item.mediaType === "video";
  const label   = sectionLabel(item.section);
  const ts      = tagStyle(item.section);
  const count   = Math.floor(10 + (item.caption||"x").charCodeAt(0) % 25);

  return (
    <div
      className={`gl-tile ${wide?"gl-tile--wide":""} ${tall?"gl-tile--tall":""}`}
      onClick={() => onOpen(item)}
    >
      {isVideo
        ? <video src={item.url} className="gl-tile-media" muted preload="metadata"/>
        : <img src={item.url} alt={item.caption||"Gallery"} className="gl-tile-media" loading="lazy"/>
      }
      <div className="gl-tile-overlay"/>
      <span className="gl-tile-tag" style={ts}>{label}</span>
      {isVideo && (
        <div className="gl-tile-play">
          <span className="material-symbols-outlined" style={{fontSize:28}}>play_circle</span>
        </div>
      )}
      <div className="gl-tile-footer">
        <span className="gl-tile-count">
          <span className="material-symbols-outlined" style={{fontSize:13}}>{isVideo?"videocam":"photo_library"}</span>
          {isVideo ? "1:24" : `${count} Photos`}
        </span>
        {canDelete && (
          <button className="gl-tile-del" onClick={e=>{e.stopPropagation();onDelete(item._id);}}>
            <span className="material-symbols-outlined" style={{fontSize:14}}>delete</span>
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main GalleryPage
   ══════════════════════════════════════════════════════════ */
export default function GalleryPage() {
  const auth        = useAuth();
  const queryClient = useQueryClient();
  const isAdmin  = auth.user?.role === "institute_admin";
  const isAlumni = auth.user?.role === "alumni";

  const [adminImageForm, setAdminImageForm] = useState(emptyForm);
  const [adminVideoForm, setAdminVideoForm] = useState(emptyForm);
  const [personalForm,   setPersonalForm]   = useState(emptyForm);
  const [activeTab, setActiveTab]           = useState("All Media");
  const [sortBy, setSortBy]                 = useState("Newest First");
  const [viewMode, setViewMode]             = useState("grid"); // grid | list
  const [lightbox, setLightbox]             = useState(null);
  const [showUpload, setShowUpload]         = useState(false);
  const [dragOver, setDragOver]             = useState(false);
  const [uploadUrl, setUploadUrl]           = useState("");
  const [uploadCaption, setUploadCaption]   = useState("");
  const [uploadSection, setUploadSection]   = useState("personal_photos");
  const [uploadType, setUploadType]         = useState("image");
  const [page, setPage]                     = useState(1);
  const PAGE_SIZE = 9;

  const galleryQuery = useQuery({ queryKey:["gallery-items"], queryFn:fetchGalleryItems });

  const createMutation = useMutation({
    mutationFn: createGalleryItem,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey:["gallery-items"] }); },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteGalleryItem,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey:["gallery-items"] }); },
  });

  const allItems = galleryQuery.data || [];

  const grouped = useMemo(() => ({
    images:          allItems.filter(i=>i.section==="images"),
    videos:          allItems.filter(i=>i.section==="videos"),
    personal_photos: allItems.filter(i=>i.section==="personal_photos"),
  }), [allItems]);

  const filtered = useMemo(() => {
    if (activeTab==="All Media")  return allItems;
    if (activeTab==="Photos")     return allItems.filter(i=>i.mediaType!=="video");
    if (activeTab==="Videos")     return allItems.filter(i=>i.mediaType==="video");
    if (activeTab==="Events")     return grouped.images;
    if (activeTab==="Albums")     return grouped.personal_photos;
    if (activeTab==="Institutes") return grouped.images;
    return allItems;
  }, [activeTab, allItems, grouped]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sortBy==="Newest First") return arr.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    if (sortBy==="Oldest First") return arr.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
    if (sortBy==="A–Z") return arr.sort((a,b)=>(a.caption||"").localeCompare(b.caption||""));
    return arr;
  }, [filtered, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sorted.length/PAGE_SIZE));
  const paged = sorted.slice(0, page*PAGE_SIZE);

  function canDelete(item) {
    if (isAdmin) return true;
    if (!isAlumni) return false;
    return item.section==="personal_photos" && item.uploader?.id===auth.user?.id;
  }

  function submitSection(section, mediaType, form, setForm) {
    createMutation.mutate({ section, mediaType, url:form.url, caption:form.caption }, {
      onSuccess: () => setForm(emptyForm),
    });
  }

  function handleUploadSubmit() {
    if (!uploadUrl) return;
    createMutation.mutate({ section: uploadSection, mediaType: uploadType, url: uploadUrl, caption: uploadCaption }, {
      onSuccess: () => { setUploadUrl(""); setUploadCaption(""); setShowUpload(false); },
    });
  }

  return (
    <div className="gl-root">
      {/* Header */}
      <div className="gl-page-header">
        <div>
          <h1 className="gl-page-title">Gallery</h1>
          <p className="gl-page-sub">Explore memories, moments, and milestones from our alumni community.</p>
        </div>
        <button className="gl-upload-header-btn" onClick={()=>setShowUpload(s=>!s)}>
          <span className="material-symbols-outlined" style={{fontSize:16}}>cloud_upload</span>
          Upload Photos / Videos
        </button>
      </div>

      {/* Media tabs */}
      <div className="gl-tabs-row">
        {MEDIA_TABS.map(tab=>(
          <button key={tab} className={`gl-tab ${activeTab===tab?"gl-tab--active":""}`} onClick={()=>{setActiveTab(tab);setPage(1);}}>
            {tab}
            {tab==="All Media"&&<span className="gl-tab-badge">{allItems.length}</span>}
          </button>
        ))}
      </div>

      {/* 2-col layout */}
      <div className="gl-layout">

        {/* Main column */}
        <div className="gl-main-col">
          {/* Toolbar */}
          <div className="gl-toolbar">
            <div className="gl-toolbar-left">
              <button className="gl-filter-btn">
                <span className="material-symbols-outlined" style={{fontSize:15}}>calendar_today</span>
                All Time
                <span className="material-symbols-outlined" style={{fontSize:14}}>expand_more</span>
              </button>
              <button className="gl-filter-btn">
                <span className="material-symbols-outlined" style={{fontSize:15}}>label</span>
                All Categories
                <span className="material-symbols-outlined" style={{fontSize:14}}>expand_more</span>
              </button>
            </div>
            <div className="gl-toolbar-right">
              <div className="gl-sort-wrap">
                <span style={{fontSize:"0.75rem",color:"#64748b",fontWeight:600}}>Sort by:</span>
                <select className="gl-sort-select" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
                  {SORT_OPTIONS.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="gl-view-toggle">
                <button className={`gl-view-btn ${viewMode==="grid"?"gl-view-btn--active":""}`} onClick={()=>setViewMode("grid")}>
                  <span className="material-symbols-outlined" style={{fontSize:18}}>grid_view</span>
                </button>
                <button className={`gl-view-btn ${viewMode==="list"?"gl-view-btn--active":""}`} onClick={()=>setViewMode("list")}>
                  <span className="material-symbols-outlined" style={{fontSize:18}}>view_list</span>
                </button>
              </div>
            </div>
          </div>

          {/* Loading/error */}
          {galleryQuery.isLoading && <p style={{color:"#94a3b8",fontSize:"0.85rem"}}>Loading gallery...</p>}
          {galleryQuery.isError   && <p style={{color:"#ef4444",fontSize:"0.85rem"}}>{galleryQuery.error.message}</p>}

          {/* Masonry grid */}
          {viewMode==="grid" && (
            <div className="gl-masonry">
              {paged.length===0 && !galleryQuery.isLoading && (
                <div className="gl-empty">
                  <span className="material-symbols-outlined" style={{fontSize:44,color:"#c7d2fe"}}>photo_library</span>
                  <h3>No media yet</h3>
                  <p>Upload photos or videos to get started.</p>
                </div>
              )}
              {paged.map((item, idx)=>(
                <GalleryTile
                  key={item._id}
                  item={item}
                  wide={idx===0||idx===5}
                  tall={idx===3}
                  canDelete={canDelete(item)}
                  onDelete={id=>deleteMutation.mutate(id)}
                  onOpen={setLightbox}
                />
              ))}
            </div>
          )}

          {/* List view */}
          {viewMode==="list" && (
            <div className="gl-list-view">
              {paged.map(item=>(
                <div key={item._id} className="gl-list-item" onClick={()=>setLightbox(item)}>
                  {item.mediaType==="video"
                    ? <video src={item.url} className="gl-list-thumb" muted preload="metadata"/>
                    : <img src={item.url} alt={item.caption||""} className="gl-list-thumb" loading="lazy"/>
                  }
                  <div className="gl-list-info">
                    <div className="gl-list-caption">{item.caption||"Untitled"}</div>
                    <div className="gl-list-meta">{sectionLabel(item.section)} · {formatDate(item.createdAt)} · By {item.uploader?.name||"Alumni"}</div>
                  </div>
                  {canDelete(item) && (
                    <button className="gl-list-del" onClick={e=>{e.stopPropagation();deleteMutation.mutate(item._id);}}>
                      <span className="material-symbols-outlined" style={{fontSize:16}}>delete</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Load more */}
          {page < totalPages && (
            <div className="gl-load-more-wrap">
              <button className="gl-load-more-btn" onClick={()=>setPage(p=>p+1)}>
                Load More
                <span className="material-symbols-outlined" style={{fontSize:17}}>expand_more</span>
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="gl-sidebar">
          {/* My Albums */}
          <div className="gl-sidebar-card">
            <div className="gl-sidebar-header">
              <span className="gl-sidebar-title">My Albums</span>
              <button className="gl-sidebar-link">View All</button>
            </div>
            <div className="gl-albums-list">
              {MOCK_ALBUMS.map(album=>(
                <div key={album.title} className="gl-album-item">
                  <img src={album.img} alt={album.title} className="gl-album-thumb" loading="lazy"/>
                  <div className="gl-album-info">
                    <div className="gl-album-title">{album.title}</div>
                    <div className="gl-album-date">{album.date}</div>
                  </div>
                  <span className="gl-album-count">{album.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upload panel */}
          <div className="gl-sidebar-card">
            <div className="gl-sidebar-header">
              <span className="gl-sidebar-title">Upload New Media</span>
            </div>
            <div
              className={`gl-drop-zone ${dragOver?"gl-drop-zone--active":""}`}
              onDragOver={e=>{e.preventDefault();setDragOver(true);}}
              onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);}}
            >
              <span className="material-symbols-outlined" style={{fontSize:32,color:"#6366f1"}}>cloud_upload</span>
              <p className="gl-drop-text">Drag &amp; drop your files here</p>
              <p className="gl-drop-or">or</p>
              <button className="gl-browse-btn" onClick={()=>setShowUpload(s=>!s)}>Browse Files</button>
              <p className="gl-drop-hint">Supports JPG, PNG, MP4, MOV (Max 200MB)</p>
            </div>
            {/* URL upload for now (API uses URL) */}
            {showUpload && (
              <div className="gl-url-upload">
                <input className="gl-input" placeholder="Paste image/video URL" value={uploadUrl} onChange={e=>setUploadUrl(e.target.value)} type="url"/>
                <input className="gl-input" placeholder="Caption (optional)" value={uploadCaption} onChange={e=>setUploadCaption(e.target.value)}/>
                <select className="gl-input" value={uploadSection} onChange={e=>setUploadSection(e.target.value)}>
                  {(isAdmin?["images","videos","personal_photos"]:["personal_photos"]).map(s=>(
                    <option key={s} value={s}>{s.replace("_"," ")}</option>
                  ))}
                </select>
                <select className="gl-input" value={uploadType} onChange={e=>setUploadType(e.target.value)}>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
                <button className="gl-upload-submit-btn" onClick={handleUploadSubmit} disabled={!uploadUrl||createMutation.isPending}>
                  {createMutation.isPending?"Uploading...":"Upload"}
                </button>
              </div>
            )}
          </div>

          {/* Highlights */}
          <div className="gl-sidebar-card">
            <div className="gl-sidebar-header">
              <span className="gl-sidebar-title">Highlights</span>
              <button className="gl-sidebar-link">View All</button>
            </div>
            <div className="gl-highlights-grid">
              {HIGHLIGHT_IMGS.map((src,i)=>(
                <img key={i} src={src} alt="" className="gl-highlight-img" loading="lazy"/>
              ))}
            </div>
            <p className="gl-highlight-caption">Relive your best moments ✨</p>
          </div>
        </aside>
      </div>

      {/* Lightbox */}
      {lightbox && <Lightbox item={lightbox} onClose={()=>setLightbox(null)}/>}

      {createMutation.isError && <p style={{color:"#ef4444",fontSize:"0.8rem"}}>{createMutation.error.message}</p>}
      {deleteMutation.isError && <p style={{color:"#ef4444",fontSize:"0.8rem"}}>{deleteMutation.error.message}</p>}
    </div>
  );
}
