import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useQuery } from "@tanstack/react-query";
import { fetchIdCardPayload } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useTenantContext } from "../hooks/useTenantContext.js";
import "../styles/IdCard.css";

export default function DigitalIdCardModal({ isOpen, onClose }) {
  const auth = useAuth();
  const tenant = useTenantContext();
  const [isRotating, setIsRotating] = useState(false);

  const { data: idData, isLoading, error } = useQuery({
    queryKey: ["id-card-payload"],
    queryFn: fetchIdCardPayload,
    enabled: isOpen,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // Handle escape key to close
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  const user = auth.user;
  const cardColor = tenant.primaryColor || "#2563eb";

  return (
    <div className="idc-overlay" onClick={onClose}>
      <div 
        className="idc-card" 
        style={{ 
          background: `linear-gradient(135deg, ${cardColor}dd 0%, #0f172aaa 100%)` 
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="idc-close" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="idc-header">
          <div className="idc-inst-name">{tenant.displayName}</div>
          <div className="idc-label">Official Alumni Pass</div>
        </div>

        <div className="idc-body">
          <div className="idc-avatar-container">
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt={user.name} className="idc-avatar" />
            ) : (
              <div className="idc-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '4rem', opacity: 0.5 }}>person</span>
              </div>
            )}
          </div>

          <h2 className="idc-name">{user?.name}</h2>
          <div className="idc-info">
            {user?.role === "alumni" ? (
              <>Alumni • Class of {user?.batch || "N/A"}</>
            ) : (
              <>Administrator</>
            )}
          </div>

          <div className="idc-qr-container">
            {isLoading ? (
              <div style={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                <div className="idc-status-dot"></div>
              </div>
            ) : error ? (
              <div style={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', textAlign: 'center', fontSize: '0.8rem' }}>
                Failed to load ID payload
              </div>
            ) : (
              <QRCodeSVG 
                value={idData?.token || "INVALID"} 
                size={180}
                level="M"
                includeMargin={false}
                imageSettings={{
                  src: tenant.logo || "",
                  x: undefined,
                  y: undefined,
                  height: 30,
                  width: 30,
                  excavate: true,
                }}
              />
            )}
          </div>

          <div className="idc-status">
            <div className="idc-status-dot"></div>
            Active Digital Pass
          </div>
        </div>

        <div className="idc-footer">
          <div>ID: {user?._id?.substring(0, 8).toUpperCase()}</div>
          <div style={{ opacity: 0.7 }}>Exp: 24h</div>
        </div>
      </div>
    </div>
  );
}
