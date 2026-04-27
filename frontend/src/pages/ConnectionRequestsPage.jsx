import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  PortalMetricCard,
  PortalMetricGrid,
  PortalPageHeader,
  PortalSearchField,
  PortalSegmentedTabs
} from "../components/PortalPrimitives.jsx";
import SectionCard from "../components/SectionCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useTenantContext } from "../hooks/useTenantContext.js";
import {
  createMentorshipRequest,
  fetchAlumni,
  fetchMentorshipRequests,
  updateMentorshipRequest
} from "../lib/api.js";
import { getTenantDisplayConfig } from "../utils/tenantDisplay.js";

function ConnectionRequestsPage() {
  const auth = useAuth();
  const tenant = useTenantContext();
  const tenantDisplay = getTenantDisplayConfig(tenant);
  const isSchool = tenantDisplay.isSchool;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");
  const [discoverSearch, setDiscoverSearch] = useState("");
  const [selectedForRequest, setSelectedForRequest] = useState(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [connectionSuccess, setConnectionSuccess] = useState(null);

  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ["mentorship-requests"],
    queryFn: fetchMentorshipRequests,
    enabled: auth.user?.role === "alumni" && tenant.featureFlags.enableMentorship !== false
  });

  const { data: allAlumni = [] } = useQuery({
    queryKey: ["alumni"],
    queryFn: fetchAlumni,
    enabled: auth.user?.role === "alumni" && tenant.featureFlags.enableMentorship !== false
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
      setConnectionSuccess("Connection request sent.");
      setSelectedForRequest(null);
      setRequestMessage("");
      setTimeout(() => setConnectionSuccess(null), 2400);
    }
  });

  const pendingRequests = useMemo(
    () =>
      data
        .filter((item) => item.mentor?._id === auth.user?.id && item.status === "pending")
        .map((item) => ({
          _id: item._id,
          name: item.requester?.name || tenantDisplay.roleFallback,
          batch: item.requester?.batch,
          department: item.requester?.department,
          leavingYear: item.requester?.leavingYear,
          lastClassAttended: item.requester?.lastClassAttended,
          message: item.message || "Would like to connect with you.",
          mutuals: item.requester?.mutualConnectionsCount || 0
        })),
    [auth.user?.id, data, tenantDisplay.roleFallback]
  );

  const sentRequests = useMemo(
    () =>
      data
        .filter((item) => item.requester?._id === auth.user?.id)
        .map((item) => ({
          _id: item._id,
          name: item.mentor?.name || tenantDisplay.roleFallback,
          batch: item.mentor?.batch,
          department: item.mentor?.department,
          leavingYear: item.mentor?.leavingYear,
          lastClassAttended: item.mentor?.lastClassAttended,
          status: item.status,
          message: item.message || ""
        })),
    [auth.user?.id, data, tenantDisplay.roleFallback]
  );

  const discoverAlumni = useMemo(() => {
    const sentRequestIds = new Set(
      data.filter((item) => item.requester?._id === auth.user?.id).map((item) => item.mentor?._id)
    );
    const pendingRequestIds = new Set(
      data
        .filter((item) => item.mentor?._id === auth.user?.id && item.status === "pending")
        .map((item) => item.requester?._id)
    );

    return allAlumni
      .filter((alumni) => {
        const alumniUserId = alumni.userId?._id || alumni.userId;
        if (alumniUserId === auth.user?.id) {
          return false;
        }
        if (sentRequestIds.has(alumniUserId) || pendingRequestIds.has(alumniUserId)) {
          return false;
        }

        const haystack = [
          alumni.userId?.name || alumni.name || "",
          alumni.company || alumni.currentInstitution || "",
          alumni.designation || alumni.occupation || "",
          alumni.batch || alumni.leavingYear || "",
          alumni.department || alumni.lastClassAttended || ""
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(discoverSearch.toLowerCase());
      })
      .slice(0, 12);
  }, [allAlumni, auth.user?.id, data, discoverSearch]);

  if (auth.user?.role !== "alumni") {
    return (
      <SectionCard title="Connection requests" subtitle="Portal access">
        <p className="muted">Connection requests are available for alumni accounts.</p>
      </SectionCard>
    );
  }

  if (tenant.featureFlags.enableMentorship === false) {
    return (
      <SectionCard title="Connections unavailable" subtitle="Feature availability">
        <p className="muted">
          Direct connection requests are turned off for this institution. You can still discover people through the {tenantDisplay.memberPlural.toLowerCase()} directory, groups, events, and announcements.
        </p>
      </SectionCard>
    );
  }

  function formatProfileSummary(item) {
    const year = isSchool ? item.leavingYear || item.batch || "-" : item.batch || "-";
    const education = isSchool
      ? item.lastClassAttended || item.department || "Class not added"
      : item.department || "Department not added";
    return `${tenantDisplay.yearShortLabel} ${year} | ${education}`;
  }

  return (
    <div className="member-connections-page">
      <PortalPageHeader
        title="Connection requests"
        subtitle={`Discover ${tenantDisplay.memberPlural.toLowerCase()}, review incoming requests, and track the people you have already reached out to.`}
      />

      <PortalMetricGrid>
        <PortalMetricCard title="Pending" value={pendingRequests.length} icon="PN" />
        <PortalMetricCard title="Sent" value={sentRequests.length} icon="ST" />
        <PortalMetricCard title="Discoverable" value={discoverAlumni.length} icon="NW" />
      </PortalMetricGrid>

      <PortalSegmentedTabs
        activeValue={activeTab}
        ariaLabel="Connection request sections"
        items={[
          { value: "discover", label: "Discover" },
          { value: "pending", label: `Pending (${pendingRequests.length})` },
          { value: "sent", label: `Sent (${sentRequests.length})` }
        ]}
        onChange={setActiveTab}
      />

      {isLoading ? <p>Loading connection requests...</p> : null}
      {isError ? <p className="error-text">{error.message}</p> : null}
      {connectionSuccess ? <p className="success-text">{connectionSuccess}</p> : null}
      {updateMutation.isError ? <p className="error-text">{updateMutation.error.message}</p> : null}

      {activeTab === "discover" ? (
        <div className="member-connections-stack">
          <SectionCard title={`Find ${tenantDisplay.memberPlural.toLowerCase()} to connect with`} subtitle="Search the network and send thoughtful requests.">
            <PortalSearchField
              className="member-connections-search"
              onChange={(event) => setDiscoverSearch(event.target.value)}
              placeholder={tenantDisplay.searchPlaceholder}
              value={discoverSearch}
            />
          </SectionCard>

          <div className="member-connections-grid">
            {discoverAlumni.map((alumni) => (
              <article className="member-connection-card" key={alumni._id}>
                <div className="member-connection-card-head">
                  <div className="member-person-avatar">{(alumni.userId?.name || alumni.name || "?").slice(0, 1)}</div>
                  <div>
                    <strong>{alumni.userId?.name || alumni.name || tenantDisplay.roleFallback}</strong>
                    <p>
                      {isSchool ? alumni.occupation || tenantDisplay.roleFallback : alumni.designation || tenantDisplay.roleFallback}
                      {(isSchool ? alumni.currentInstitution : alumni.company)
                        ? ` at ${isSchool ? alumni.currentInstitution : alumni.company}`
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="member-connection-card-meta">
                  <span>{isSchool ? `Leaving Year ${alumni.leavingYear || "-"}` : `Batch ${alumni.batch || "-"}`}</span>
                  <span>{isSchool ? alumni.lastClassAttended || "Class not added" : alumni.department || "Department not added"}</span>
                  <span>{alumni.location || "Location not added"}</span>
                </div>
                <button
                  className="button primary"
                  onClick={() => {
                    setSelectedForRequest(alumni);
                    setRequestMessage("");
                  }}
                  type="button"
                >
                  Send request
                </button>
              </article>
            ))}
          </div>

          {!discoverAlumni.length ? (
            <SectionCard title="No matches yet" subtitle="Try widening your search">
              <p className="muted">
                {discoverSearch ? `No ${tenantDisplay.memberPlural.toLowerCase()} match your current search.` : "You are caught up for now. New people will appear here as the network grows."}
              </p>
            </SectionCard>
          ) : null}
        </div>
      ) : null}

      {activeTab === "pending" ? (
        <div className="member-connections-grid two-column">
          {pendingRequests.map((item) => (
            <SectionCard key={item._id} title={item.name} subtitle={formatProfileSummary(item)}>
              <div className="member-request-card-body">
                <p>{item.message}</p>
                <span>{item.mutuals} mutual connections</span>
                <div className="member-inline-actions">
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
                    Decline
                  </button>
                </div>
              </div>
            </SectionCard>
          ))}
          {!pendingRequests.length ? (
            <SectionCard title="No pending requests" subtitle="Your inbox is clear">
              <p className="muted">When {tenantDisplay.memberPlural.toLowerCase()} request to connect with you, they will appear here.</p>
            </SectionCard>
          ) : null}
        </div>
      ) : null}

      {activeTab === "sent" ? (
        <div className="member-connections-grid two-column">
          {sentRequests.map((item) => (
            <SectionCard key={item._id} title={item.name} subtitle={formatProfileSummary(item)}>
              <div className="member-request-card-body">
                <span className={`member-status-pill status-${item.status}`}>{item.status}</span>
                <p>{item.message || "Connection request sent."}</p>
              </div>
            </SectionCard>
          ))}
          {!sentRequests.length ? (
            <SectionCard title="No sent requests" subtitle="Start a few conversations">
              <p className="muted">Use Discover to reach out to people you want to connect with.</p>
            </SectionCard>
          ) : null}
        </div>
      ) : null}

      {selectedForRequest ? (
        <div className="member-dialog-backdrop" onClick={() => setSelectedForRequest(null)}>
          <div className="member-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="member-dialog-header">
              <div>
                <p className="member-card-kicker">New connection</p>
                <h3>Connect with {selectedForRequest.userId?.name || selectedForRequest.name || tenantDisplay.roleFallback}</h3>
              </div>
              <button className="member-dialog-close" onClick={() => setSelectedForRequest(null)} type="button">
                Close
              </button>
            </div>
            <div className="member-dialog-body">
              <p className="muted">
                Add a short note so your request feels personal and relevant.
              </p>
              <textarea
                className="textarea member-form-textarea"
                onChange={(event) => setRequestMessage(event.target.value)}
                placeholder="Write a message of at least 10 characters"
                rows="5"
                value={requestMessage}
              />
            </div>
            <div className="member-inline-actions">
              <button
                className="button primary"
                disabled={sendRequestMutation.isPending || requestMessage.trim().length < 10}
                onClick={() =>
                  sendRequestMutation.mutate({
                    recipientUserId:
                      selectedForRequest.userId?._id || selectedForRequest.userId,
                    message: requestMessage
                  })
                }
                type="button"
              >
                {sendRequestMutation.isPending ? "Sending..." : "Send request"}
              </button>
              <button className="button secondary" onClick={() => setSelectedForRequest(null)} type="button">
                Cancel
              </button>
            </div>
            {sendRequestMutation.isError ? <p className="error-text">{sendRequestMutation.error?.message}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ConnectionRequestsPage;
