import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import SectionCard from "../components/SectionCard.jsx";
import { useTenantContext } from "../hooks/useTenantContext.js";
import {
  fetchReportedPosts,
  fetchModerationStats,
  moderatePost
} from "../lib/api.js";
import { getTenantDisplayConfig } from "../utils/tenantDisplay.js";
import { formatRelativeTime } from "../utils/formatters.js";
import { LoadingSpinner } from "../components/LoadingSpinner.jsx";

function ModerationStats({ stats, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-8 bg-gray-300 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="text-sm text-gray-500 mb-1">Reported Posts</div>
        <div className="text-3xl font-bold text-gray-900">{stats.reportedPosts || 0}</div>
        <div className="text-xs text-gray-400 mt-1">
          {stats.totalPosts ? `${((stats.reportedPosts / stats.totalPosts) * 100).toFixed(1)}% of all posts` : "No posts yet"}
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="text-sm text-gray-500 mb-1">Total Posts</div>
        <div className="text-3xl font-bold text-gray-900">{stats.totalPosts || 0}</div>
        <div className="text-xs text-gray-400 mt-1">Active in community</div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="text-sm text-gray-500 mb-1">Recent Reports</div>
        <div className="text-3xl font-bold text-gray-900">{stats.recentReports || 0}</div>
        <div className="text-xs text-gray-400 mt-1">Last 7 days</div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="text-sm text-gray-500 mb-1">Report Rate</div>
        <div className="text-3xl font-bold text-gray-900">{stats.reportRate || 0}%</div>
        <div className="text-xs text-gray-400 mt-1">
          {stats.reportRate < 5 ? "Healthy" : stats.reportRate < 10 ? "Moderate" : "Needs attention"}
        </div>
      </div>
    </div>
  );
}

function ReportedPostCard({ post, onModerate, isModerating }) {
  const [action, setAction] = useState("");
  const [reason, setReason] = useState("");

  const handleAction = (selectedAction) => {
    if (!selectedAction) return;
    onModerate(post._id, selectedAction, reason || "No reason provided");
    setAction("");
    setReason("");
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 mb-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900">{post.author?.name || "Unknown User"}</span>
            <span className="text-sm text-gray-500">•</span>
            <span className="text-sm text-gray-500">{formatRelativeTime(post.createdAt)}</span>
          </div>
          {post.title && (
            <h3 className="font-semibold text-gray-900 mb-2">{post.title}</h3>
          )}
          <p className="text-gray-700 mb-3">{post.content}</p>
        </div>
        <div className="bg-red-50 text-red-700 text-xs font-medium px-3 py-1 rounded-full">
          {post.reportCount} report{post.reportCount !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <div className="text-sm font-medium text-gray-700 mb-2">Reports:</div>
        <div className="space-y-2 mb-4">
          {post.reports.map((report, idx) => (
            <div key={idx} className="text-sm bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">{report.reporter?.name || "Anonymous"}</span>
                <span className="text-gray-500 text-xs">{formatRelativeTime(report.createdAt)}</span>
              </div>
              <div className="text-gray-600 mt-1">{report.reason}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Optional reason for action..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isModerating}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handleAction("dismiss")}
              disabled={isModerating}
            >
              {isModerating && action === "dismiss" ? <LoadingSpinner size="sm" /> : "Dismiss"}
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handleAction("warn")}
              disabled={isModerating}
            >
              {isModerating && action === "warn" ? <LoadingSpinner size="sm" /> : "Warn"}
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handleAction("hide")}
              disabled={isModerating}
            >
              {isModerating && action === "hide" ? <LoadingSpinner size="sm" /> : "Hide"}
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handleAction("delete")}
              disabled={isModerating}
            >
              {isModerating && action === "delete" ? <LoadingSpinner size="sm" /> : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContentModerationPage() {
  const { tenant } = useTenantContext();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [notification, setNotification] = useState(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["moderationStats"],
    queryFn: fetchModerationStats
  });

  const { data: reportedData, isLoading: postsLoading, refetch } = useQuery({
    queryKey: ["reportedPosts", page],
    queryFn: () => fetchReportedPosts({ page, limit: 10 })
  });

  const moderationMutation = useMutation({
    mutationFn: ({ postId, action, reason }) => moderatePost(postId, { action, reason }),
    onSuccess: (data, variables) => {
      setNotification({
        type: "success",
        message: data.message || "Action completed successfully"
      });
      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ["moderationStats"] });
      queryClient.invalidateQueries({ queryKey: ["reportedPosts"] });
      // Also refetch to update the list
      refetch();
      
      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000);
    },
    onError: (error) => {
      setNotification({
        type: "error",
        message: error.response?.data?.message || "Failed to perform moderation action"
      });
      setTimeout(() => setNotification(null), 5000);
    }
  });

  const handleModerate = (postId, action, reason) => {
    moderationMutation.mutate({ postId, action, reason });
  };

  const tenantConfig = getTenantDisplayConfig(tenant);
  const reportedPosts = reportedData?.posts || [];
  const pagination = reportedData?.pagination || { page: 1, total: 0, pages: 1 };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Content Moderation</h1>
          <Link
            to="/admin/dashboard"
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            ← Back to Dashboard
          </Link>
        </div>
        <p className="text-gray-600">
          Review and manage reported content from the {tenantConfig.memberPlural.toLowerCase()} community
        </p>
      </div>

      {notification && (
        <div className={`mb-6 p-4 rounded-lg ${notification.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {notification.message}
        </div>
      )}

      <ModerationStats stats={stats} isLoading={statsLoading} />

      <SectionCard title="Reported Posts" className="mb-6">
        {postsLoading ? (
          <div className="text-center py-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-500">Loading reported posts...</p>
          </div>
        ) : reportedPosts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reported posts</h3>
            <p className="text-gray-500">All content is clean! No posts have been reported.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-500">
              Showing {reportedPosts.length} of {pagination.total} reported posts
            </div>
            <div>
              {reportedPosts.map(post => (
                <ReportedPostCard
                  key={post._id}
                  post={post}
                  onModerate={handleModerate}
                  isModerating={moderationMutation.isPending}
                />
              ))}
            </div>

            {pagination.pages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || postsLoading}
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {page} of {pagination.pages}
                </span>
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages || postsLoading}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </SectionCard>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="font-medium text-blue-900 mb-2">Moderation Guidelines</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Dismiss</strong>: If reports are unfounded or mistaken</li>
          <li>• <strong>Warn</strong>: For minor violations - user receives a warning</li>
          <li>• <strong>Hide</strong>: For inappropriate content - post becomes invisible to others</li>
          <li>• <strong>Delete</strong>: For severe violations - post is permanently removed</li>
          <li>• Always provide a clear reason when taking action</li>
        </ul>
      </div>
    </div>
  );
}