import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchEmailCampaigns,
  createEmailCampaign,
  updateEmailCampaign,
  sendEmailCampaign
} from "../lib/api.js";
import { PortalPageHeader } from "../components/PortalPrimitives.jsx";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import "../styles/EmailCampaign.css";

/* ── Status Badge ────────────────────────────────────────── */
function StatusBadge({ status }) {
  const styles = {
    draft: { bg: "#f1f5f9", color: "#64748b" },
    sending: { bg: "#fef08a", color: "#854d0e" },
    completed: { bg: "#bbf7d0", color: "#166534" },
    failed: { bg: "#fecdd3", color: "#9f1239" },
  };
  const s = styles[status] || styles.draft;
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      padding: "2px 8px",
      borderRadius: "12px",
      fontSize: "12px",
      fontWeight: "600",
      textTransform: "capitalize"
    }}>
      {status}
    </span>
  );
}

/* ── Main Page ───────────────────────────────────────────── */
export default function EmailCampaignPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState("list"); // list | composer
  const [editingId, setEditingId] = useState(null);
  const [subject, setSubject] = useState("");
  const [filters, setFilters] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: fetchEmailCampaigns,
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image
    ],
    content: "",
  });

  const handleEdit = (campaign) => {
    setEditingId(campaign._id);
    setSubject(campaign.subject);
    setFilters(campaign.targetFilters || {});
    if (editor) editor.commands.setContent(campaign.content);
    setView("composer");
  };

  const handleNew = () => {
    setEditingId(null);
    setSubject("");
    setFilters({});
    if (editor) editor.commands.setContent("");
    setView("composer");
  };

  const handleSaveDraft = async () => {
    if (!subject || !editor.getHTML()) {
      alert("Subject and content are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = { subject, content: editor.getHTML(), targetFilters: filters };
      if (editingId) {
        await updateEmailCampaign(editingId, payload);
      } else {
        await createEmailCampaign(payload);
      }
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setView("list");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save draft.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSend = async (campaignId) => {
    if (!window.confirm("Are you sure you want to send this campaign now? This action cannot be undone.")) return;
    
    // If we are in the composer and clicking send, we should save it first
    let idToSend = campaignId;
    if (!idToSend && view === "composer") {
      setIsSubmitting(true);
      try {
        const payload = { subject, content: editor.getHTML(), targetFilters: filters };
        const res = editingId 
          ? await updateEmailCampaign(editingId, payload)
          : await createEmailCampaign(payload);
        idToSend = res._id;
      } catch (err) {
        alert(err.response?.data?.message || "Failed to save campaign before sending.");
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await sendEmailCampaign(idToSend);
      alert(`Campaign started! ${res.expectedCount} emails will be sent in the background.`);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setView("list");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send campaign.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="adm-root module-admin">
      <PortalPageHeader 
        title="Email Campaigns" 
        subtitle="Create and manage targeted email newsletters for your alumni community."
        actions={view === "list" && (
          <button className="adm-action-btn primary" onClick={handleNew}>
            <span className="material-symbols-outlined">add</span>
            New Campaign
          </button>
        )}
      />

      <div className="adm-main-layout" style={{ display: "block" }}>
        {view === "list" ? (
          <div className="adm-section">
            <h2 className="adm-section-title">Past Campaigns & Drafts</h2>
            {isLoading ? (
              <p>Loading campaigns...</p>
            ) : campaigns.length === 0 ? (
              <div className="adm-empty-state">No email campaigns found.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                      <th style={{ padding: "12px", color: "#64748b" }}>Subject</th>
                      <th style={{ padding: "12px", color: "#64748b" }}>Status</th>
                      <th style={{ padding: "12px", color: "#64748b" }}>Audience</th>
                      <th style={{ padding: "12px", color: "#64748b" }}>Date</th>
                      <th style={{ padding: "12px", color: "#64748b" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map(c => (
                      <tr key={c._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px", fontWeight: "600", color: "#0f172a" }}>{c.subject}</td>
                        <td style={{ padding: "12px" }}>
                          <StatusBadge status={c.status} />
                          {c.status === "completed" && <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{c.metrics?.sentCount} sent</div>}
                        </td>
                        <td style={{ padding: "12px", color: "#475569", fontSize: 14 }}>
                          {Object.keys(c.targetFilters || {}).length === 0 ? "All Alumni" : "Filtered Segments"}
                        </td>
                        <td style={{ padding: "12px", color: "#475569", fontSize: 14 }}>
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "12px" }}>
                          {c.status === "draft" && (
                            <button className="adm-action-btn" onClick={() => handleEdit(c)} style={{ padding: "4px 8px", marginRight: 8 }}>
                              Edit
                            </button>
                          )}
                          {c.status === "draft" && (
                            <button className="adm-action-btn primary" onClick={() => handleSend(c._id)} style={{ padding: "4px 8px" }} disabled={isSubmitting}>
                              Send Now
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="adm-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <button className="adm-action-btn" onClick={() => setView("list")} disabled={isSubmitting}>
                <span className="material-symbols-outlined">arrow_back</span>
                Back
              </button>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="adm-action-btn" onClick={handleSaveDraft} disabled={isSubmitting}>
                  Save Draft
                </button>
                <button className="adm-action-btn primary" onClick={() => handleSend(null)} disabled={isSubmitting}>
                  <span className="material-symbols-outlined">send</span>
                  Send Campaign
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 60%", minWidth: 300 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#334155" }}>Email Subject</label>
                  <input 
                    type="text" 
                    value={subject} 
                    onChange={e => setSubject(e.target.value)} 
                    placeholder="E.g. Monthly Newsletter - May 2024"
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 15 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#334155" }}>Email Content</label>
                  <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden" }}>
                    <div style={{ padding: "8px", background: "#f8fafc", borderBottom: "1px solid #cbd5e1", display: "flex", gap: 8 }}>
                      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} style={{ padding: "4px 8px", background: editor?.isActive("bold") ? "#e2e8f0" : "transparent", border: "none", borderRadius: 4, cursor: "pointer" }}><strong>B</strong></button>
                      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} style={{ padding: "4px 8px", background: editor?.isActive("italic") ? "#e2e8f0" : "transparent", border: "none", borderRadius: 4, cursor: "pointer" }}><em>I</em></button>
                      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} style={{ padding: "4px 8px", background: editor?.isActive("heading") ? "#e2e8f0" : "transparent", border: "none", borderRadius: 4, cursor: "pointer" }}>H2</button>
                      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} style={{ padding: "4px 8px", background: editor?.isActive("bulletList") ? "#e2e8f0" : "transparent", border: "none", borderRadius: 4, cursor: "pointer" }}>• List</button>
                    </div>
                    <EditorContent editor={editor} style={{ padding: "16px", minHeight: "300px", background: "#fff" }} />
                  </div>
                </div>
              </div>

              <div style={{ flex: "1 1 30%", minWidth: 250 }}>
                <div style={{ background: "#f8fafc", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <h3 style={{ margin: "0 0 16px 0", color: "#0f172a", fontSize: 16 }}>Target Audience</h3>
                  <p style={{ color: "#64748b", fontSize: 14, marginBottom: 16 }}>Leave filters blank to target all active alumni.</p>
                  
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Batch / Year</label>
                    <input 
                      type="text" 
                      value={filters.batch || ""} 
                      onChange={e => setFilters({...filters, batch: e.target.value})} 
                      placeholder="e.g. 2020"
                      style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6 }}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Department</label>
                    <input 
                      type="text" 
                      value={filters.department || ""} 
                      onChange={e => setFilters({...filters, department: e.target.value})} 
                      placeholder="e.g. Computer Science"
                      style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6 }}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Industry</label>
                    <input 
                      type="text" 
                      value={filters.industry || ""} 
                      onChange={e => setFilters({...filters, industry: e.target.value})} 
                      placeholder="e.g. Technology"
                      style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6 }}
                    />
                  </div>

                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                    <input 
                      type="checkbox" 
                      checked={filters.isFaculty || false} 
                      onChange={e => setFilters({...filters, isFaculty: e.target.checked ? true : undefined})} 
                    />
                    Target Faculty only
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
