import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCampaigns, createCampaign, updateCampaign } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/Fundraising.css";

export default function AdminFundraisingPage() {
  const queryClient = useQueryClient();
  const auth = useAuth();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const initialForm = {
    title: "",
    description: "",
    coverImage: "",
    goalAmount: "",
    status: "active",
    featured: false
  };
  const [form, setForm] = useState(initialForm);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns", "all"],
    queryFn: () => fetchCampaigns("all"),
  });

  const createMutation = useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      closeModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateCampaign(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign"] });
      closeModal();
    }
  });

  const handleOpenNew = () => {
    setForm(initialForm);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (campaign) => {
    setForm({
      title: campaign.title,
      description: campaign.description,
      coverImage: campaign.coverImage || "",
      goalAmount: campaign.goalAmount,
      status: campaign.status,
      featured: campaign.featured
    });
    setEditingId(campaign._id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="fr-page-container" style={{ maxWidth: "1200px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", color: "#0f172a", margin: "0 0 0.5rem" }}>Manage Campaigns</h1>
          <p style={{ color: "#64748b", margin: 0 }}>Create and update fundraising campaigns.</p>
        </div>
        <button className="fr-btn-solid" onClick={handleOpenNew}>
          + New Campaign
        </button>
      </div>

      <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569", fontSize: "0.9rem" }}>
              <th style={{ padding: "1rem" }}>Campaign</th>
              <th style={{ padding: "1rem" }}>Status</th>
              <th style={{ padding: "1rem" }}>Raised / Goal</th>
              <th style={{ padding: "1rem" }}>Featured</th>
              <th style={{ padding: "1rem", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="5" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading...</td></tr>
            ) : campaigns.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>No campaigns created yet.</td></tr>
            ) : (
              campaigns.map(camp => (
                <tr key={camp._id} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "1rem", fontWeight: "600", color: "#0f172a" }}>{camp.title}</td>
                  <td style={{ padding: "1rem" }}>
                    <span className={`fr-badge ${camp.status === "completed" ? "completed" : ""}`} style={{ background: camp.status === "active" ? "#eff6ff" : "", color: camp.status === "active" ? "#3b82f6" : "" }}>
                      {camp.status}
                    </span>
                  </td>
                  <td style={{ padding: "1rem", color: "#475569" }}>
                    <span style={{ color: "#10b981", fontWeight: "700" }}>₹{camp.raisedAmount.toLocaleString()}</span> / ₹{camp.goalAmount.toLocaleString()}
                  </td>
                  <td style={{ padding: "1rem" }}>{camp.featured ? "Yes" : "No"}</td>
                  <td style={{ padding: "1rem", textAlign: "right" }}>
                    <button className="fr-btn-outline" style={{ padding: "0.4rem 0.8rem", width: "auto" }} onClick={() => handleEdit(camp)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "2rem", width: "100%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.5rem" }}>{editingId ? "Edit Campaign" : "New Campaign"}</h2>
              <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem" }}>Title</label>
                <input required className="fr-amount-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Alumni Scholarship Fund" />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem" }}>Goal Amount (₹)</label>
                <input required type="number" className="fr-amount-input" value={form.goalAmount} onChange={e => setForm({...form, goalAmount: e.target.value})} placeholder="100000" />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem" }}>Cover Image URL (Optional)</label>
                <input className="fr-amount-input" value={form.coverImage} onChange={e => setForm({...form, coverImage: e.target.value})} placeholder="https://..." />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem" }}>Description (Supports HTML)</label>
                <textarea required className="fr-msg-input" style={{ minHeight: "120px" }} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem" }}>Status</label>
                  <select className="fr-amount-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem" }}>Featured</label>
                  <select className="fr-amount-input" value={form.featured} onChange={e => setForm({...form, featured: e.target.value === "true"})}>
                    <option value={false}>No</option>
                    <option value={true}>Yes</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" className="fr-btn-outline" onClick={closeModal}>Cancel</button>
                <button type="submit" className="fr-btn-solid" disabled={createMutation.isPending || updateMutation.isPending} style={{ flex: 1 }}>
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
