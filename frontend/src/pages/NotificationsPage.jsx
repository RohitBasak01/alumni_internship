import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PortalPageHeader, PortalSegmentedTabs } from "../components/PortalPrimitives.jsx";
import {
  dismissNotification,
  fetchNotifications,
  fetchNotificationSummary,
  markAllNotificationsRead,
  markNotificationRead
} from "../lib/api.js";

function formatRelativeTime(value) {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "Recently";
  }

  const diffMs = Date.now() - timestamp;
  const minute = 1000 * 60;
  const hour = minute * 60;
  const day = hour * 24;

  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))} min ago`;
  if (diffMs < day) return `${Math.max(1, Math.floor(diffMs / hour))} hr ago`;
  if (diffMs < day * 2) return "Yesterday";

  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function categoryIcon(category) {
  if (category === "connections") return "forum";
  if (category === "jobs") return "work";
  if (category === "events") return "event";
  return "campaign";
}

function categoryAccent(category) {
  if (category === "connections") return "blue";
  if (category === "jobs") return "green";
  if (category === "events") return "gold";
  return "gray";
}

function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");

  const summaryQuery = useQuery({
    queryKey: ["notification-summary"],
    queryFn: fetchNotificationSummary
  });

  const notificationsQuery = useQuery({
    queryKey: ["notifications", activeTab],
    queryFn: () => fetchNotifications({ category: activeTab })
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["notification-summary"] });
    }
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["notification-summary"] });
    }
  });

  const dismissMutation = useMutation({
    mutationFn: dismissNotification,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["notification-summary"] });
    }
  });

  const notifications = notificationsQuery.data?.items || [];
  const unreadByCategory = summaryQuery.data?.unreadByCategory || { connections: 0, jobs: 0, events: 0, system: 0 };
  const totalUnread = summaryQuery.data?.unreadCount || 0;

  const tabs = useMemo(
    () => [
      { value: "all", label: "All", badge: totalUnread || null },
      { value: "connections", label: "Connections", badge: unreadByCategory.connections || null },
      { value: "jobs", label: "Jobs", badge: unreadByCategory.jobs || null },
      { value: "events", label: "Events", badge: unreadByCategory.events || null },
      { value: "system", label: "System", badge: unreadByCategory.system || null }
    ],
    [totalUnread, unreadByCategory]
  );

  async function handleOpenNotification(item) {
    if (!item.isRead) {
      await markReadMutation.mutateAsync(item._id);
    }

    navigate(item.linkTo || "/portal");
  }

  return (
    <div className="notifications-page">
      <PortalPageHeader
        className="notifications-header"
        title="Notifications"
        subtitle="Actual activity from your alumni network, including conversations, jobs, events, and system updates."
        actions={
          <div className="notifications-header-actions">
            <button className="button secondary" type="button" onClick={() => notificationsQuery.refetch()}>
              Refresh
            </button>
            <button className="button primary" type="button" onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending || !totalUnread}>
              {markAllMutation.isPending ? "Marking..." : "Mark all as read"}
            </button>
          </div>
        }
      />

      <PortalSegmentedTabs
        activeValue={activeTab}
        ariaLabel="Notification categories"
        className="notifications-tabs"
        items={tabs}
        onChange={setActiveTab}
      />

      {notificationsQuery.isLoading ? <p>Loading notifications...</p> : null}
      {notificationsQuery.isError ? <p className="error-text">{notificationsQuery.error.message}</p> : null}
      {!notificationsQuery.isLoading && !notifications.length ? <p className="muted">No notifications in this view yet.</p> : null}

      <div className="notifications-list">
        {notifications.map((item) => {
          const accent = categoryAccent(item.category);
          return (
            <article className={`notifications-card ${accent} ${item.isRead ? "is-read" : "is-unread"}`.trim()} key={item._id}>
              <div className={`notifications-icon ${accent}`}>
                <span className="material-symbols-outlined">{categoryIcon(item.category)}</span>
              </div>

              <div className="notifications-copy">
                <h3>{item.title}</h3>
                <p>{item.message}</p>
                {item.actor?.name ? <span className="muted">From {item.actor.name}</span> : null}
                <div className="notifications-card-actions">
                  <button className="button primary compact" onClick={() => void handleOpenNotification(item)} type="button">
                    View
                  </button>
                  {!item.isRead ? (
                    <button className="button secondary compact" onClick={() => markReadMutation.mutate(item._id)} type="button">
                      Mark as read
                    </button>
                  ) : null}
                  <button className="button secondary compact" onClick={() => dismissMutation.mutate(item._id)} type="button">
                    Dismiss
                  </button>
                </div>
              </div>

              <time>{formatRelativeTime(item.createdAt)}</time>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default NotificationsPage;
