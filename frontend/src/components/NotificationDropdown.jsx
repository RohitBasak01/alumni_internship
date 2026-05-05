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
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative h-10 w-10 grid place-items-center rounded-xl transition-colors ${
          isOpen ? "bg-brand-50 text-brand-600" : "bg-slate-50 text-slate-600 hover:bg-brand-50 hover:text-brand-600"
        }`}
        title="Notifications"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden transform origin-top-right transition-all duration-200">
          <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <h3 className="font-bold text-slate-900">Recent Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold bg-brand-600 text-white px-2 py-0.5 rounded-full">
                {unreadCount} New
              </span>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notificationsQuery.isLoading ? (
              <div className="p-8 text-center">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-brand-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                <p className="mt-2 text-sm text-slate-400">Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-20">notifications_off</span>
                <p className="text-sm">No recent notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-4 flex gap-3 cursor-pointer hover:bg-slate-50 transition-colors relative ${
                      !item.isRead ? "bg-brand-50/30" : ""
                    }`}
                  >
                    {!item.isRead && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-600"></div>
                    )}
                    <div className={`h-10 w-10 rounded-xl flex-shrink-0 grid place-items-center ${categoryColor(item.category)}`}>
                      <span className="material-symbols-outlined text-[20px]">
                        {categoryIcon(item.category)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{item.title}</p>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{item.message}</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-1.5 uppercase tracking-wider">
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
            className="block p-3 text-center text-xs font-bold text-brand-600 hover:bg-brand-50 transition-colors border-t border-slate-50"
          >
            View All Notifications
          </Link>
        </div>
      )}
    </div>
  );
}
