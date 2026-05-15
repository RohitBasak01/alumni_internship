import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchCampaign, initiateDonation, verifyDonation } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/Fundraising.css";

export default function CampaignDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const auth = useAuth();
  
  const [donationAmount, setDonationAmount] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [donorMessage, setDonorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => fetchCampaign(id),
  });

  if (isLoading) return <div className="fr-loading">Loading campaign...</div>;
  if (isError || !data?.campaign) return <div className="fr-error">Campaign not found.</div>;

  const { campaign, recentDonors } = data;
  const progress = campaign.goalAmount > 0 ? Math.min(100, Math.round((campaign.raisedAmount / campaign.goalAmount) * 100)) : 0;
  
  const predefinedAmounts = [500, 1000, 5000, 10000];

  const handleDonate = async (e) => {
    e.preventDefault();
    if (!donationAmount || Number(donationAmount) < 1) {
      setErrorMsg("Please enter a valid amount.");
      return;
    }
    setErrorMsg("");
    setIsProcessing(true);

    try {
      // 1. Create order on backend
      const { orderId, amount, currency, key } = await initiateDonation(id, {
        amount: Number(donationAmount),
        isAnonymous,
        donorMessage
      });

      // 2. Open Razorpay Checkout
      const options = {
        key: key,
        amount: amount,
        currency: currency,
        name: "Alumni Network",
        description: `Donation for ${campaign.title}`,
        order_id: orderId,
        handler: async function (response) {
          try {
            // 3. Verify payment on backend
            await verifyDonation(id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setPaymentSuccess(true);
            setDonationAmount("");
            setDonorMessage("");
            refetch(); // Refresh campaign stats
          } catch (err) {
            setErrorMsg(err.response?.data?.message || "Payment verification failed.");
          }
        },
        prefill: {
          name: auth.user?.name || "",
          email: auth.user?.email || "",
        },
        theme: {
          color: "#6366f1",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        setErrorMsg("Payment failed. Please try again.");
      });
      rzp.open();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Could not initiate payment.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fr-detail-container">
      <div className="fr-detail-header">
        <button className="fr-back-btn" onClick={() => navigate("/portal/fundraising")}>
          <span className="material-symbols-outlined">arrow_back</span> Back to Campaigns
        </button>
      </div>

      <div className="fr-detail-grid">
        <div className="fr-detail-main">
          {campaign.coverImage ? (
            <img src={campaign.coverImage} alt={campaign.title} className="fr-detail-img" />
          ) : (
            <div className="fr-detail-img-placeholder">
              <span className="material-symbols-outlined">volunteer_activism</span>
            </div>
          )}
          
          <h1 className="fr-detail-title">{campaign.title}</h1>
          <div className="fr-detail-meta">
            <span>Started {new Date(campaign.startDate).toLocaleDateString()}</span>
            {campaign.status === "completed" && <span className="fr-badge completed">Completed</span>}
          </div>

          <div className="fr-detail-desc" dangerouslySetInnerHTML={{ __html: campaign.description }}></div>
        </div>

        <div className="fr-detail-sidebar">
          <div className="fr-donate-card">
            <div className="fr-donate-stats">
              <div className="fr-donate-raised">₹{campaign.raisedAmount.toLocaleString()}</div>
              <div className="fr-donate-goal">raised of ₹{campaign.goalAmount.toLocaleString()} goal</div>
            </div>
            <div className="fr-progress-bar-bg">
              <div className="fr-progress-bar-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="fr-donate-pct">{progress}% Funded</div>

            {paymentSuccess ? (
              <div className="fr-success-msg">
                <span className="material-symbols-outlined">check_circle</span>
                <h4>Thank you for your generous donation!</h4>
                <p>Your support makes a huge difference.</p>
                <button className="fr-btn-outline" onClick={() => setPaymentSuccess(false)}>Donate Again</button>
              </div>
            ) : campaign.status === "active" ? (
              <form onSubmit={handleDonate} className="fr-donate-form">
                <div className="fr-amount-presets">
                  {predefinedAmounts.map(amt => (
                    <button
                      type="button"
                      key={amt}
                      className={`fr-preset-btn ${donationAmount == amt ? "active" : ""}`}
                      onClick={() => setDonationAmount(amt)}
                    >
                      ₹{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
                <div className="fr-input-group">
                  <span className="fr-currency-symbol">₹</span>
                  <input
                    type="number"
                    className="fr-amount-input"
                    placeholder="Custom Amount"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                    min="1"
                  />
                </div>
                
                <textarea
                  className="fr-msg-input"
                  placeholder="Leave a message for the donor wall (optional)"
                  value={donorMessage}
                  onChange={(e) => setDonorMessage(e.target.value)}
                  maxLength={500}
                />
                
                <label className="fr-anon-checkbox">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                  />
                  Donate anonymously (hide my name)
                </label>

                {errorMsg && <div className="fr-error-text">{errorMsg}</div>}

                <button type="submit" className="fr-btn-solid" disabled={isProcessing}>
                  {isProcessing ? "Processing..." : "Donate Now"}
                </button>
              </form>
            ) : (
              <div className="fr-closed-msg">This campaign is no longer accepting donations.</div>
            )}
          </div>

          <div className="fr-donors-card">
            <h3 className="fr-donors-title">Recent Supporters</h3>
            {recentDonors.length === 0 ? (
              <p className="fr-no-donors">Be the first to support this campaign!</p>
            ) : (
              <div className="fr-donors-list">
                {recentDonors.map((donation, idx) => (
                  <div key={idx} className="fr-donor-item">
                    <div className="fr-donor-avatar">
                      {donation.userId?.profilePicture ? (
                        <img src={donation.userId.profilePicture} alt="Donor" />
                      ) : (
                        <span className="material-symbols-outlined">person</span>
                      )}
                    </div>
                    <div className="fr-donor-info">
                      <div className="fr-donor-name">
                        {donation.isAnonymous ? "Anonymous Donor" : donation.userId?.name || "Anonymous Donor"}
                      </div>
                      <div className="fr-donor-amt">₹{donation.amount.toLocaleString()}</div>
                      {donation.donorMessage && <div className="fr-donor-msg">"{donation.donorMessage}"</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
