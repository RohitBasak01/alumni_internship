import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { PortalPageHeader, PortalSegmentedTabs } from "../components/PortalPrimitives.jsx";
import SectionCard from "../components/SectionCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchAlumni, fetchMentorshipRequests, createMentorshipRequest, updateMentorshipRequest } from "../lib/api.js";

function ConnectionRequestsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");
  const [discoverSearch, setDiscoverSearch] = useState("");
  const [selectedForRequest, setSelectedForRequest] = useState(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [connectionSuccess, setConnectionSuccess] = useState(null);

  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ["mentorship-requests"],
    queryFn: fetchMentorshipRequests,
    enabled: auth.user?.role === "alumni"
  });

  const { data: allAlumni = [] } = useQuery({
    queryKey: ["alumni"],
    queryFn: fetchAlumni
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => updateMentorshipRequest(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
    }
  });

  const sendRequestMutation = useMutation({
    mutationFn: (payload) => createMentorshipRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
      setConnectionSuccess(true);
      setSelectedForRequest(null);
      setRequestMessage("");
      setTimeout(() => setConnectionSuccess(null), 2000);
    }
  });

  const pendingRequests = useMemo(() => {
    const incoming = data
      .filter((item) => item.mentor?._id === auth.user?.id && item.status === "pending")
      .map((item) => ({
        _id: item._id,
        name: item.requester?.name || "Alumni Member",
        batch: item.requester?.batch,
        department: item.requester?.department,
        mutuals: item.requester?.mutualConnectionsCount || 0
      }));

    return incoming;
  }, [auth.user?.id, data]);

  const sentRequests = useMemo(() => {
    const outgoing = data
      .filter((item) => item.requester?._id === auth.user?.id)
      .map((item) => ({
        _id: item._id,
        name: item.mentor?.name || "Alumni Member",
        batch: item.mentor?.batch,
        department: item.mentor?.department,
        status: item.status
      }));

    return outgoing;
  }, [auth.user?.id, data]);

  const discoverAlumni = useMemo(() => {
    const sentRequestIds = new Set(data
      .filter((item) => item.requester?._id === auth.user?.id)
      .map((item) => item.mentor?._id)
    );

    const pendingRequestIds = new Set(data
      .filter((item) => item.mentor?._id === auth.user?.id && item.status === "pending")
      .map((item) => item.requester?._id)
    );

    return allAlumni
      .filter((alumni) => {
        // Exclude self
        if (alumni.userId?._id === auth.user?.id || alumni.userId === auth.user?.id) return false;
        // Exclude those already connected to
        if (sentRequestIds.has(alumni.userId?._id) || sentRequestIds.has(alumni.userId)) return false;
        // Exclude those who sent pending requests
        if (pendingRequestIds.has(alumni.userId?._id) || pendingRequestIds.has(alumni.userId)) return false;
        // Filter by search
        const haystack = `${alumni.userId?.name || ""} ${alumni.company || ""} ${alumni.designation || ""} ${alumni.batch || ""}`.toLowerCase();
        return haystack.includes(discoverSearch.toLowerCase());
      })
      .slice(0, 12);
  }, [allAlumni, auth.user?.id, data, discoverSearch]);

  if (auth.user?.role !== "alumni") {
    return (
      <SectionCard title="Connection Requests" subtitle="Portal Access">
        <p className="muted">Connection requests are available for alumni accounts.</p>
      </SectionCard>
    );
  }

  return (
    <div className="connections-page">
      <PortalPageHeader
        className="connections-header"
        subtitle="Manage your professional network and incoming invitations."
        title="Connection Requests"
      />

      <PortalSegmentedTabs
        activeValue={activeTab}
        ariaLabel="Connection request sections"
        className="connections-tabs"
        items={[
          { value: "discover", label: "Discover" },
          { value: "pending", label: `Pending Requests (${pendingRequests.length})` },
          { value: "sent", label: `Sent Requests (${sentRequests.length})` }
        ]}
        onChange={setActiveTab}
      />

      {isLoading ? <p>Loading connection requests...</p> : null}
      {isError ? <p className="error-text">{error.message}</p> : null}

      {activeTab === "discover" ? (
        <>
          <section className="connections-section-head">
            <h2>Discover Alumni</h2>
            <p className="muted">Connect with other alumni in your network</p>
          </section>

          <div className="connections-discover-search">
            <input
              type="text"
              placeholder="Search by name, company, or designation..."
              value={discoverSearch}
              onChange={(e) => setDiscoverSearch(e.target.value)}
              className="connections-search-input"
            />
          </div>

          {connectionSuccess ? (
            <div className="connection-success-message">
              <p>✓ Connection request sent successfully!</p>
            </div>
          ) : null}

          {selectedForRequest ? (
            <div className="connection-request-modal-overlay" onClick={() => setSelectedForRequest(null)}>
              <div className="connection-request-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Connect with {selectedForRequest.userId?.name || "Alumni Member"}</h3>
                  <button className="modal-close" onClick={() => setSelectedForRequest(null)} type="button">×</button>
                </div>
                <div className="modal-body">
                  <div className="connection-profile-summary">
                    <p><strong>{selectedForRequest.userId?.name}</strong></p>
                    <p>{selectedForRequest.designation} @ {selectedForRequest.company}</p>
                    <p className="muted">Batch {selectedForRequest.batch}</p>
                  </div>
                  <textarea
                    className="textarea"
                    placeholder="Write a message (at least 10 characters)..."
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    rows="4"
                  />
                </div>
                <div className="modal-footer">
                  <button
                    className="button primary"
                    disabled={sendRequestMutation.isPending || requestMessage.trim().length < 10}
                    onClick={() => sendRequestMutation.mutate({
                      mentorUserId: selectedForRequest.userId?._id || selectedForRequest.userId,
                      message: requestMessage
                    })}
                    type="button"
                  >
                    {sendRequestMutation.isPending ? "Sending..." : "Send Request"}
                  </button>
                  <button className="button secondary" onClick={() => setSelectedForRequest(null)} type="button">Cancel</button>
                </div>
                {sendRequestMutation.isError ? <p className="error-text">{sendRequestMutation.error?.message}</p> : null}
              </div>
            </div>
          ) : null}

          <div className="connections-discover-grid">
            {discoverAlumni.map((alumni) => (
              <article className="connections-discover-card" key={alumni._id}>
                <div className="connections-discover-header">
                  <div className="connections-avatar large">{alumni.userId?.name?.slice(0, 1) || "?"}</div>
                </div>
                <div className="connections-discover-body">
                  <h3>{alumni.userId?.name || "Alumni Member"}</h3>
                  <p className="designation">{alumni.designation} @ {alumni.company}</p>
                  <p className="location">{alumni.location || "Location unknown"}</p>
                  <p className="batch">Batch {alumni.batch}</p>
                  <p className="department">{alumni.department}</p>
                </div>
                <button
                  className="button primary"
                  onClick={() => {
                    setSelectedForRequest(alumni);
                    setRequestMessage("");
                  }}
                  type="button"
                >
                  + Connect
                </button>
              </article>
            ))}
          </div>

          {!discoverAlumni.length && !discoverSearch ? (
            <p className="muted">No more alumni to connect with</p>
          ) : null}

          {!discoverAlumni.length && discoverSearch ? (
            <p className="muted">No alumni match your search</p>
          ) : null}
        </>
      ) : null}

      {activeTab === "pending" ? (
        <>
          <section className="connections-section-head">
            <h2>Pending Approvals</h2>
          </section>

          <div className="connections-pending-grid">
            {pendingRequests.map((item) => (
              <article className="connections-pending-card" key={item._id}>
                <div className="connections-person">
                  <div className="connections-avatar">{item.name.slice(0, 1)}</div>
                  <div>
                    <h3>{item.name}</h3>
                    <p>
                      Batch {item.batch || "-"} | {item.department || "-"}
                    </p>
                    <span>{item.mutuals} Mutual Connections</span>
                  </div>
                </div>

                <div className="connections-actions">
                  <button
                    className="button primary"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ id: item._id, status: "accepted" })}
                    type="button"
                  >
                    Accept
                  </button>
                  <button
                    className="button secondary"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ id: item._id, status: "declined" })}
                    type="button"
                  >
                    Ignore
                  </button>
                </div>
              </article>
            ))}
          </div>

          {!pendingRequests.length ? <p className="muted">No pending connection requests</p> : null}
        </>
      ) : null}

      {activeTab === "sent" ? (
        <>
          <section className="connections-section-head sent">
            <h2>Sent Requests</h2>
            <span>Total: {sentRequests.length}</span>
          </section>

          <div className="connections-sent-list">
            {sentRequests.map((item) => (
              <article className="connections-sent-row" key={item._id}>
                <div className="connections-person">
                  <div className="connections-avatar small">{item.name.slice(0, 1)}</div>
                  <div>
                    <h3>{item.name}</h3>
                    <p>
                      Batch {item.batch || "-"} | {item.department || "-"}
                    </p>
                  </div>
                </div>

                <div className="connections-sent-actions">
                  <span className={`connections-status-badge status-${item.status}`}>
                    {item.status === "pending" ? "Pending Approval" : item.status === "accepted" ? "Connected" : "Declined"}
                  </span>
                </div>
              </article>
            ))}
          </div>

          {!sentRequests.length ? <p className="muted">No sent connection requests</p> : null}
        </>
      ) : null}

      {updateMutation.isError ? <p className="error-text">{updateMutation.error.message}</p> : null}
    </div>
  );
}

export default ConnectionRequestsPage;
