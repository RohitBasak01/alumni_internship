import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchCampaigns } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/Fundraising.css";

export default function FundraisingPage() {
  const auth = useAuth();
  const isAdmin = auth.hasPermission("manage_fundraising");
  const [filter, setFilter] = useState("active");

  const { data: campaigns = [], isLoading, isError } = useQuery({
    queryKey: ["campaigns", filter],
    queryFn: () => fetchCampaigns(filter === "all" ? "" : filter),
  });

  return (
    <div className="fr-page-container">
      <div className="fr-hero">
        <div className="fr-hero-content">
          <h1 className="fr-hero-title">Giving Back</h1>
          <p className="fr-hero-subtitle">Support our latest initiatives, empower students, and help shape the future of our institute.</p>
        </div>
        {isAdmin && (
          <Link to="/portal/admin/fundraising" className="fr-hero-btn">
            <span className="material-symbols-outlined">settings</span>
            Manage Campaigns
          </Link>
        )}
      </div>

      <div className="fr-filters">
        <button className={`fr-filter-btn ${filter === "active" ? "active" : ""}`} onClick={() => setFilter("active")}>Active Campaigns</button>
        <button className={`fr-filter-btn ${filter === "completed" ? "active" : ""}`} onClick={() => setFilter("completed")}>Completed</button>
        <button className={`fr-filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>All Campaigns</button>
      </div>

      {isLoading ? (
        <div className="fr-loading">Loading campaigns...</div>
      ) : isError ? (
        <div className="fr-error">Failed to load campaigns.</div>
      ) : campaigns.length === 0 ? (
        <div className="fr-empty">
          <span className="material-symbols-outlined fr-empty-icon">volunteer_activism</span>
          <h3>No campaigns found</h3>
          <p>Check back later for new fundraising initiatives.</p>
        </div>
      ) : (
        <div className="fr-grid">
          {campaigns.map((campaign) => {
            const progress = campaign.goalAmount > 0 ? Math.min(100, Math.round((campaign.raisedAmount / campaign.goalAmount) * 100)) : 0;
            return (
              <div key={campaign._id} className="fr-card">
                <div className="fr-card-img-wrap">
                  {campaign.coverImage ? (
                    <img src={campaign.coverImage} alt={campaign.title} className="fr-card-img" />
                  ) : (
                    <div className="fr-card-img-placeholder">
                      <span className="material-symbols-outlined">volunteer_activism</span>
                    </div>
                  )}
                  {campaign.status === "completed" && <div className="fr-card-badge completed">Completed</div>}
                  {campaign.featured && campaign.status === "active" && <div className="fr-card-badge featured">Featured</div>}
                </div>
                <div className="fr-card-body">
                  <h3 className="fr-card-title">{campaign.title}</h3>
                  <p className="fr-card-desc">{campaign.description.replace(/<[^>]*>?/gm, '').substring(0, 100)}...</p>
                  
                  <div className="fr-progress-wrap">
                    <div className="fr-progress-stats">
                      <span className="fr-raised">₹{campaign.raisedAmount.toLocaleString()}</span>
                      <span className="fr-goal">raised of ₹{campaign.goalAmount.toLocaleString()}</span>
                    </div>
                    <div className="fr-progress-bar-bg">
                      <div className="fr-progress-bar-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="fr-progress-pct">{progress}% funded</div>
                  </div>

                  <Link to={`/portal/fundraising/${campaign._id}`} className="fr-card-btn">
                    View Campaign
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
