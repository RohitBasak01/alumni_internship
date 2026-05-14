import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchNotifications, fetchNotificationSummary, markNotificationRead } from "../lib/api.js";

function formatRelativeTime(value) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Recently";

  const diffMs = Date.now() - timestamp;
  const minute = 1000 * 60;
  const hour = minute * 60;
  const day = hour * 24;

  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))}m ago`;
  if (diffMs < day) return `${Math.max(1, Math.floor(diffMs / hour))}h ago`;
  return new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function categoryIcon(category) {
  if (category === "connections") return "forum";
  if (category === "jobs") return "work";
  if (category === "events") return "event";
  return "campaign";
}

function categoryColor(category) {
  if (category === "connections") return "bg-blue-50 text-blue-600";
  if (category === "jobs") return "bg-green-50 text-green-600";
  if (category === "events") return "bg-amber-50 text-amber-600";
  return "bg-slate-50 text-slate-600";
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const summaryQuery = useQuery({
    queryKey: ["notification-summary"],
    queryFn: fetchNotificationSummary,
  });

  const notificationsQuery = useQuery({
    queryKey: ["notifications", "recent"],
    queryFn: () => fetchNotifications({ limit: 5 }),
    enabled: isOpen,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-summary"] });
    },
  });

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = summaryQuery.data?.unreadCount || 0;
  const notifications = notificationsQuery.data?.items || [];

  async function handleNotificationClick(item) {
    if (!item.isRead) {
      await markReadMutation.mutateAsync(item._id);
    }
    setIsOpen(false);
    navigate(item.linkTo || "/portal/notifications");
  }

  return (
    <div className="dl-notification-wrap" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`dl-topbar-icon-btn dl-notification-trigger ${isOpen ? "dl-notification-trigger--open" : ""}`}
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={isOpen}
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="dl-topbar-dot dl-topbar-dot--alert" />
        )}
      </button>

      {isOpen && (
        <div className="dl-notification-menu">
          <div className="dl-notification-header">
            <h3>Recent Notifications</h3>
            {unreadCount > 0 && (
              <span className="dl-notification-count">
                {unreadCount} New
              </span>
            )}
          </div>

          <div className="dl-notification-list custom-scrollbar">
            {notificationsQuery.isLoading ? (
              <div className="dl-notification-empty">
                <div className="dl-notification-spinner" />
                <p>Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="dl-notification-empty">
                <span className="material-symbols-outlined">notifications_off</span>
                <p>No recent notifications</p>
              </div>
            ) : (
              <div className="dl-notification-items">
                {notifications.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => handleNotificationClick(item)}
                    className={`dl-notification-item ${!item.isRead ? "dl-notification-item--unread" : ""}`}
                  >
                    {!item.isRead && (
                      <div className="dl-notification-unread-mark" />
                    )}
                    <div className={`h-10 w-10 rounded-xl flex-shrink-0 grid place-items-center ${categoryColor(item.category)}`}>
                      <span className="material-symbols-outlined text-[20px]">
                        {categoryIcon(item.category)}
                      </span>
                    </div>
                    <div className="dl-notification-copy">
                      <p className="dl-notification-title">{item.title}</p>
                      <p className="dl-notification-message">{item.message}</p>
                      <p className="dl-notification-time">
                        {formatRelativeTime(item.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/portal/notifications"
            onClick={() => setIsOpen(false)}
            className="dl-notification-view-all"
          >
            View All Notifications
          </Link>
        </div>
      )}
    </div>
  );
}
