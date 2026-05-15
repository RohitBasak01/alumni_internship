import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDelegatedAdmins, grantDelegation, revokeDelegation } from "../lib/api.js";
import { DELEGATION_SCOPES, DELEGATION_SCOPE_LABELS, DELEGATION_SCOPE_ICONS } from "../lib/delegationScopes.js";
import "../styles/ManageAdmins.css";

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
}
function formatDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function expiryCountdown(expiresAt) {
  if (!expiresAt) return null;
  const diffMs = new Date(expiresAt) - new Date();
  if (diffMs <= 0) return "Expired";
  const days = Math.ceil(diffMs / 86400000);
  if (days === 1) return "Expires today";
  if (days <= 7) return `Expires in ${days} days`;
  return `Expires ${formatDate(expiresAt)}`;
}

function DelegateModal({ alumni, onClose, onSuccess }) {
  const [permissions, setPermissions] = useState([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () => grantDelegation({ userId: alumni.userId?._id || alumni.userId || alumni._id, permissions, expiresAt, note }),
    onSuccess: (data) => { onSuccess(data); onClose(); },
    onError: (err) => setError(err.response?.data?.message || "Failed to grant delegation"),
  });
  const toggleScope = (scope) => setPermissions(p => p.includes(scope) ? p.filter(s => s !== scope) : [...p, scope]);
  const minDate = new Date(Date.now() + 3600000).toISOString().slice(0, 16);
  const canSubmit = permissions.length > 0 && expiresAt && !mutation.isPending;
  return (
    <div className="ma-overlay" role="dialog" aria-modal="true">
      <div className="ma-modal">
        <div className="ma-modal-header">
          <h2 className="ma-modal-title">Grant Co-Admin Access</h2>
          <button className="ma-modal-close" onClick={onClose}><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="ma-modal-alumniinfo">
          <div className="ma-modal-avatar">{(alumni.name || "?")[0].toUpperCase()}</div>
          <div><div className="ma-modal-alumni-name">{alumni.name}</div><div className="ma-modal-alumni-meta">{alumni.email}</div></div>
        </div>
        <div className="ma-modal-section">
          <div className="ma-modal-label">Permissions to grant</div>
          <div className="ma-permission-grid">
            {DELEGATION_SCOPES.map(scope => (
              <label key={scope} className={`ma-perm-pill ${permissions.includes(scope) ? "ma-perm-pill--on" : ""}`}>
                <input type="checkbox" hidden checked={permissions.includes(scope)} onChange={() => toggleScope(scope)} />
                <span className="material-symbols-outlined ma-perm-icon">{DELEGATION_SCOPE_ICONS[scope]}</span>
                <span className="ma-perm-label">{DELEGATION_SCOPE_LABELS[scope]}</span>
                <span className="ma-perm-check material-symbols-outlined">{permissions.includes(scope) ? "check_circle" : "radio_button_unchecked"}</span>
              </label>
            ))}
          </div>
          {permissions.length === 0 && <p className="ma-field-hint">Select at least one permission</p>}
        </div>
        <div className="ma-modal-section">
          <label className="ma-modal-label" htmlFor="dlg-expires">Access expires on <span className="ma-required">*</span></label>
          <input id="dlg-expires" type="datetime-local" className="ma-date-input" min={minDate} value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
          <p className="ma-field-hint">Required — delegations must have an expiry date</p>
        </div>
        <div className="ma-modal-section">
          <label className="ma-modal-label" htmlFor="dlg-note">Note <span className="ma-optional">(optional)</span></label>
          <textarea id="dlg-note" className="ma-textarea" rows={2} placeholder="e.g. Covering while on leave" value={note} onChange={e => setNote(e.target.value)} />
        </div>
        {error && <p className="ma-error">{error}</p>}
        <div className="ma-modal-actions">
          <button className="ma-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="ma-btn-primary" disabled={!canSubmit} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Granting…" : "Grant Access"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RevokeDialog({ admin, onClose, onSuccess }) {
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () => revokeDelegation(admin._id),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (err) => setError(err.response?.data?.message || "Failed to revoke"),
  });
  return (
    <div className="ma-overlay" role="dialog" aria-modal="true">
      <div className="ma-modal ma-modal--sm">
        <div className="ma-modal-header">
          <h2 className="ma-modal-title">Revoke Admin Access</h2>
          <button className="ma-modal-close" onClick={onClose}><span className="material-symbols-outlined">close</span></button>
        </div>
        <p className="ma-modal-body-text">Are you sure you want to revoke co-admin access for <strong>{admin.name}</strong>? They will return to regular alumni access immediately.</p>
        {error && <p className="ma-error">{error}</p>}
        <div className="ma-modal-actions">
          <button className="ma-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="ma-btn-danger" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Revoking…" : "Yes, Revoke Access"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ManageAdminsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("active");
  const [revoking, setRevoking] = useState(null);
  const { data, isLoading, isError, error } = useQuery({ queryKey: ["delegated-admins"], queryFn: fetchDelegatedAdmins });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["delegated-admins"] });
  const active = data?.active || [];
  const history = data?.history || [];

  return (
    <div className="ma-root">
      <div className="ma-page-header">
        <h1 className="ma-page-title">Manage Admins</h1>
        <p className="ma-page-subtitle">Grant alumni co-admin access with scoped permissions and a mandatory expiry. Only you can grant or revoke delegations.</p>
      </div>

      <div className="ma-tabs">
        <button className={`ma-tab ${tab === "active" ? "ma-tab--active" : ""}`} onClick={() => setTab("active")}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>manage_accounts</span>
          Active Co-Admins
          {active.length > 0 && <span className="ma-tab-badge">{active.length}</span>}
        </button>
        <button className={`ma-tab ${tab === "history" ? "ma-tab--active" : ""}`} onClick={() => setTab("history")}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>history</span>
          Delegation History
        </button>
      </div>

      <div className="ma-content">
        {isLoading && <div className="ma-loading"><span className="material-symbols-outlined ma-spin">sync</span> Loading…</div>}
        {isError && <div className="ma-empty-state"><span className="material-symbols-outlined ma-empty-icon">error</span><p>{error?.response?.data?.message || "Failed to load"}</p></div>}

        {!isLoading && !isError && tab === "active" && (
          active.length === 0
            ? <div className="ma-empty-state">
                <span className="material-symbols-outlined ma-empty-icon">manage_accounts</span>
                <p>No active co-admins</p>
                <span className="ma-empty-hint">Go to the Alumni directory and click "Make Co-Admin" on an alumni card to delegate.</span>
              </div>
            : <div className="ma-admin-list">
                {active.map(admin => {
                  const countdown = expiryCountdown(admin.delegatedAdminExpiresAt);
                  const soonExpiring = admin.delegatedAdminExpiresAt && (new Date(admin.delegatedAdminExpiresAt) - new Date()) < 86400000 * 3;
                  return (
                    <div key={admin._id} className="ma-admin-card">
                      <div className="ma-admin-avatar">{(admin.name || "?")[0].toUpperCase()}</div>
                      <div className="ma-admin-info">
                        <div className="ma-admin-name">{admin.name}</div>
                        <div className="ma-admin-email">{admin.email}</div>
                        <div className="ma-admin-since">
                          Co-admin since {formatDate(admin.delegatedAdminSince)}
                          {" · "}
                          <span className={soonExpiring ? "ma-expiry-warn" : "ma-expiry"}>{countdown}</span>
                        </div>
                        <div className="ma-perm-tags">
                          {(admin.delegatedPermissions || []).map(scope => (
                            <span key={scope} className="ma-perm-tag">
                              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>{DELEGATION_SCOPE_ICONS[scope] || "check"}</span>
                              {DELEGATION_SCOPE_LABELS[scope] || scope}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="ma-admin-actions">
                        <button className="ma-btn-danger ma-btn-sm" onClick={() => setRevoking(admin)}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_remove</span>
                          Revoke
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
        )}

        {!isLoading && !isError && tab === "history" && (
          history.length === 0
            ? <div className="ma-empty-state"><span className="material-symbols-outlined ma-empty-icon">history</span><p>No delegation history yet</p></div>
            : <div className="ma-history-table-wrap">
                <table className="ma-history-table">
                  <thead><tr><th>Person</th><th>Action</th><th>Permissions</th><th>Expiry</th><th>Date</th></tr></thead>
                  <tbody>
                    {history.map(r => (
                      <tr key={r._id}>
                        <td><div className="ma-hist-name">{r.targetName || "—"}</div><div className="ma-hist-email">{r.targetEmail}</div></td>
                        <td><span className={`ma-action-badge ma-action-badge--${r.action}`}>{r.action === "granted" ? "Granted" : r.action === "revoked" ? "Revoked" : "Auto-expired"}</span></td>
                        <td><div className="ma-hist-perms">{(r.permissions || []).slice(0, 3).map(s => <span key={s} className="ma-perm-tag ma-perm-tag--sm">{DELEGATION_SCOPE_LABELS[s] || s}</span>)}{(r.permissions || []).length > 3 && <span className="ma-perm-tag ma-perm-tag--sm">+{r.permissions.length - 3} more</span>}</div></td>
                        <td className="ma-hist-expiry">{formatDate(r.expiresAt)}</td>
                        <td className="ma-hist-date">{formatDateTime(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
        )}
      </div>

      {revoking && <RevokeDialog admin={revoking} onClose={() => setRevoking(null)} onSuccess={invalidate} />}
    </div>
  );
}
