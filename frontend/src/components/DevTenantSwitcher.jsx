import { useState, useRef, useEffect } from "react";
import { useTenantContext } from "../hooks/useTenantContext.js";

const PRESET_TENANTS = [
  { slug: "spit", name: "S.P.I.T. Mumbai" },
  { slug: "vjti", name: "V.J.T.I." },
  { slug: "iitb", name: "IIT Bombay" },
  { slug: "bits", name: "BITS Pilani" }
];

export default function DevTenantSwitcher() {
  const { isTenant, slug } = useTenantContext();
  const [isOpen, setIsOpen] = useState(false);
  const [inputSlug, setInputSlug] = useState("");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const dropdownRef = useRef(null);
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMouseDown = (e) => {
    // Only drag if clicking the main button area, not the dropdown or specific buttons
    if (e.target.closest('button') && isOpen) return;
    
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y
    };
    
    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - dragRef.current.startX;
      const deltaY = moveEvent.clientY - dragRef.current.startY;
      
      setPosition({
        x: dragRef.current.initialX + deltaX,
        y: dragRef.current.initialY + deltaY
      });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return null;
  }

  const handleSwitch = (newSlug) => {
    const url = new URL(window.location.href);
    if (newSlug) {
      url.searchParams.set("tenant", newSlug.toLowerCase());
    } else {
      url.searchParams.delete("tenant");
    }
    window.location.href = url.toString();
  };

  return (
    <div 
      className="fixed z-[9999]" 
      style={{ 
        bottom: `calc(1.5rem - ${position.y}px)`, 
        right: `calc(1.5rem - ${position.x}px)`,
        transition: isDragging ? 'none' : 'all 0.1s ease-out'
      }}
      ref={dropdownRef}
    >
      {/* Trigger Button */}
      <button
        onClick={() => !isDragging && setIsOpen(!isOpen)}
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        className={`flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-2xl shadow-2xl transition-shadow duration-300 border-2 select-none ${
          isTenant 
          ? "bg-white border-brand-500 text-brand-600" 
          : "bg-slate-900 border-slate-800 text-white"
        }`}
      >
        <div className="flex flex-col items-start leading-tight pointer-events-none">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
            Dev Context
          </span>
          <span className="text-sm font-bold truncate max-w-[120px]">
            {isTenant ? `Tenant: ${slug}` : "Platform Root"}
          </span>
        </div>
        <span className={`material-symbols-outlined transition-transform duration-300 pointer-events-none ${isOpen ? "rotate-180" : ""}`}>
          expand_more
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-4 w-72 glass-card rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="p-5 bg-slate-50/50 border-b border-slate-100">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Quick Switch</h4>
            <div className="grid grid-cols-1 gap-1.5">
              {PRESET_TENANTS.map((t) => (
                <button
                  key={t.slug}
                  onClick={() => handleSwitch(t.slug)}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    slug === t.slug 
                    ? "bg-brand-50 text-brand-600 border border-brand-100" 
                    : "bg-white text-slate-600 hover:bg-brand-50 hover:text-brand-600 border border-transparent"
                  }`}
                >
                  {t.name}
                  {slug === t.slug && <span className="material-symbols-outlined text-sm">check_circle</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Custom Slug</h4>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={inputSlug}
                onChange={(e) => setInputSlug(e.target.value)}
                placeholder="Enter slug..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                onKeyDown={(e) => e.key === "Enter" && handleSwitch(inputSlug)}
              />
              <button
                onClick={() => handleSwitch(inputSlug)}
                className="p-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-500/20"
              >
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            </div>

            <button
              onClick={() => handleSwitch(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
            >
              <span className="material-symbols-outlined text-base">home</span>
              Reset to Platform
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
