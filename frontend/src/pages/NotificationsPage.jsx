import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

import { PortalPageHeader, PortalSegmentedTabs } from "../components/PortalPrimitives.jsx";
import {
  dismissNotification,
  fetchNotifications,
  fetchNotificationSummary,
  markAllNotificationsRead,
  markNotificationRead
} from "../lib/api.js";

function getApiOrigin() {
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  return baseUrl.replace(/\/api\/?$/, "");
}

function formatRelativeTime(value) {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) return "Recently";

  const diffMs = Date.now() - timestamp;
  const minute = 1000 * 60;
  const hour = minute * 60;
  const day = hour * 24;

  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))} min ago`;
  if (diffMs < day) return `${Math.max(1, Math.floor(diffMs / hour))} hr ago`;
  if (diffMs < day * 2) return "Yesterday";

  return new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function getDateGroup(value) {
  const date = new Date(value);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday.getTime() - 24 * 60 * 60 * 1000);
  const startWeek = new Date(startToday.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (date >= startToday) return "Today";
  if (date >= startYesterday) return "Yesterday";
  if (date >= startWeek) return "This Week";
  return "Older";
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

  const notificationsQuery = useInfiniteQuery({
    queryKey: ["notifications", activeTab],
    queryFn: ({ pageParam }) => fetchNotifications({ category: activeTab, before: pageParam, limit: 12 }),
    getNextPageParam: (lastPage) => lastPage?.nextCursor || undefined,
    initialPageParam: undefined
  });

  useEffect(() => {
    const socket = io(getApiOrigin(), {
      withCredentials: true,
      transports: ["polling", "websocket"]
    });

    socket.on("social:update", (payload = {}) => {
      if (payload.type === "notification") {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["notification-summary"] });
      }
    });

    return () => socket.disconnect();
  }, [queryClient]);

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

  const notifications = notificationsQuery.data?.pages.flatMap((page) => page.items || []) || [];
  const unreadByCategory = summaryQuery.data?.unreadByCategory || { connections: 0, jobs: 0, events: 0, system: 0 };
  const totalUnread = summaryQuery.data?.unreadCount || 0;

  const groupedNotifications = useMemo(
    () =>
      notifications.reduce((groups, item) => {
        const group = getDateGroup(item.createdAt);
        return {
          ...groups,
          [group]: [...(groups[group] || []), item]
        };
      }, {}),
    [notifications]
  );

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

  function renderNotification(item) {
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
            <button className="button primary compact" onClick={() => void handleOpenNotification(item)} type="button">View</button>
            {!item.isRead ? (
              <button className="button secondary compact" onClick={() => markReadMutation.mutate(item._id)} type="button">Mark as read</button>
            ) : null}
            <button className="button secondary compact" onClick={() => dismissMutation.mutate(item._id)} type="button">Dismiss</button>
          </div>
        </div>

        <time>{formatRelativeTime(item.createdAt)}</time>
      </article>
    );
  }

  const isInitialLoading = notificationsQuery.isLoading && !notifications.length;

  return (
    <div className="notifications-page">
      <PortalPageHeader
        actions={
          <div className="notifications-header-actions">
            <button className="button secondary" onClick={() => notificationsQuery.refetch()} type="button">Refresh</button>
            <button className="button primary" disabled={markAllMutation.isPending || !totalUnread} onClick={() => markAllMutation.mutate()} type="button">
              {markAllMutation.isPending ? "Marking..." : "Mark all as read"}
            </button>
          </div>
        }
        className="notifications-header"
        eyebrow="Activity center"
        subtitle="Actual activity from your alumni network, including conversations, jobs, events, and system updates."
        title="Notifications"
        tone="coral"
      />

      <PortalSegmentedTabs
        activeValue={activeTab}
        ariaLabel="Notification categories"
        className="notifications-tabs"
        items={tabs}
        onChange={setActiveTab}
      />

      {isInitialLoading ? (
        <div className="notifications-list">
          {[0, 1, 2, 3].map((item) => <div className="notifications-skeleton" key={item} />)}
        </div>
      ) : null}
      {notificationsQuery.isError ? <p className="error-text">{notificationsQuery.error.message}</p> : null}
      {!isInitialLoading && !notifications.length ? (
        <div className="notifications-empty">
          <span className="material-symbols-outlined">notifications_off</span>
          <h3>No notifications yet</h3>
          <p>When activity arrives, it will show up here in real time.</p>
        </div>
      ) : null}

      <div className="notifications-list">
        {["Today", "Yesterday", "This Week", "Older"].map((group) =>
          groupedNotifications[group]?.length ? (
            <section className="notifications-group" key={group}>
              <h2>{group}</h2>
              {groupedNotifications[group].map(renderNotification)}
            </section>
          ) : null
        )}
      </div>

      {notificationsQuery.hasNextPage ? (
        <div className="notifications-load">
          <button className="button secondary" disabled={notificationsQuery.isFetchingNextPage} onClick={() => notificationsQuery.fetchNextPage()} type="button">
            {notificationsQuery.isFetchingNextPage ? "Loading..." : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default NotificationsPage;
