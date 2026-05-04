import { useState, useMemo, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAlumni,
  fetchAnnouncements,
  fetchEvents,
  fetchJobs,
  fetchFeed,
  fetchNotificationSummary,
  fetchAlumniApprovalTurnaroundKpi,
  fetchAlumniPosts,
  fetchMyAlumniProfile,
  fetchMentorshipRequests,
  createAlumniPost,
  toggleAlumniPostLike,
  addAlumniPostComment,
  reportAlumniPost,
} from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useTenantContext } from "../hooks/useTenantContext.js";
import { getTenantDisplayConfig } from "../utils/tenantDisplay.js";

export function useDashboardLogic() {
  const tenant = useTenantContext();
  const tenantDisplay = getTenantDisplayConfig(tenant);
  const auth = useAuth();
  const queryClient = useQueryClient();
  const isAlumni = auth.user?.role === "alumni";
  const showMentorship = tenant.featureFlags.enableMentorship !== false;
  const showJobs = tenant.featureFlags.enableJobs !== false;

  const [composer, setComposer] = useState({ title: "", content: "", attachments: [] });
  const [composerMode, setComposerMode] = useState("write");
  const [composerDraftSavedAt, setComposerDraftSavedAt] = useState("");
  const [composerDraftNotice, setComposerDraftNotice] = useState("");
  const [selectedPostId, setSelectedPostId] = useState("");
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [expandedComments, setExpandedComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});

  const composerDraftKey = useMemo(
    () => `alumni-composer-draft:${tenant.slug || tenant.displayName}:${auth.user?.id || "guest"}`,
    [auth.user?.id, tenant.displayName, tenant.slug]
  );

  // Queries
  const alumniQuery = useQuery({ queryKey: ["alumni"], queryFn: fetchAlumni });
  const announcementsQuery = useQuery({ queryKey: ["announcements"], queryFn: fetchAnnouncements });
  const eventsQuery = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const jobsQuery = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });
  const feedQuery = useQuery({ queryKey: ["feed"], queryFn: fetchFeed });
  const notificationsQuery = useQuery({ queryKey: ["notification-summary"], queryFn: fetchNotificationSummary });
  
  const approvalTurnaroundQuery = useQuery({
    queryKey: ["alumni-approval-turnaround-kpi"],
    queryFn: fetchAlumniApprovalTurnaroundKpi,
    enabled: !isAlumni
  });

  const postsQuery = useQuery({
    queryKey: ["alumni-posts"],
    queryFn: fetchAlumniPosts,
    enabled: isAlumni
  });

  const profileQuery = useQuery({
    queryKey: ["my-alumni-profile"],
    queryFn: fetchMyAlumniProfile,
    enabled: isAlumni
  });

  const mentorshipQuery = useQuery({
    queryKey: ["mentorship-requests"],
    queryFn: fetchMentorshipRequests,
    enabled: isAlumni && showMentorship
  });

  // Mutations
  const createPostMutation = useMutation({
    mutationFn: createAlumniPost,
    onSuccess: () => {
      setComposer({ title: "", content: "", attachments: [] });
      setComposerDraftSavedAt("");
      setComposerDraftNotice("Published");
      localStorage.removeItem(composerDraftKey);
      queryClient.invalidateQueries({ queryKey: ["alumni-posts"] });
    }
  });

  const likeMutation = useMutation({
    mutationFn: toggleAlumniPostLike,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alumni-posts"] });
      if (selectedPostId) queryClient.invalidateQueries({ queryKey: ["alumni-post", selectedPostId] });
    }
  });

  const commentMutation = useMutation({
    mutationFn: ({ id, payload }) => addAlumniPostComment(id, payload),
    onSuccess: (_, vars) => {
      setCommentDrafts(curr => ({ ...curr, [vars.id]: "" }));
      queryClient.invalidateQueries({ queryKey: ["alumni-posts"] });
      queryClient.invalidateQueries({ queryKey: ["alumni-post", vars.id] });
    }
  });

  const reportMutation = useMutation({
    mutationFn: ({ id, payload }) => reportAlumniPost(id, payload),
    onSuccess: () => {
      setReportReason("");
      setReportTarget(null);
      queryClient.invalidateQueries({ queryKey: ["alumni-posts"] });
    }
  });

  // Derived data
  const alumni = alumniQuery.data || [];
  const profile = profileQuery.data;
  const sameBatchCount = useMemo(() => 
    alumni.filter(item => (item.batch || item.leavingYear) === (profile?.batch || profile?.leavingYear)).length
  , [alumni, profile]);

  const sameCompanyCount = useMemo(() => {
    const profileOrg = profile?.company || profile?.currentInstitution;
    if (!profileOrg) return 0;
    return alumni.filter(item => (item.company || item.currentInstitution) === profileOrg).length;
  }, [alumni, profile]);

  const activityFeed = useMemo(() => {
    const items = [
      ...(feedQuery.data || []).slice(0, 2),
      ...(eventsQuery.data || []).slice(0, 1).map(item => ({
        id: item._id, type: "event", title: item.title, description: item.location, createdAt: item.createdAt
      })),
      ...(jobsQuery.data || []).slice(0, 1).map(item => ({
        id: item._id, type: "job", title: item.title, description: item.company, createdAt: item.createdAt
      }))
    ];
    return items.slice(0, 4);
  }, [feedQuery.data, eventsQuery.data, jobsQuery.data]);

  return {
    tenant,
    tenantDisplay,
    auth,
    isAlumni,
    showMentorship,
    showJobs,
    composer,
    setComposer,
    composerMode,
    setComposerMode,
    composerDraftSavedAt,
    composerDraftNotice,
    setComposerDraftNotice,
    selectedPostId,
    setSelectedPostId,
    reportTarget,
    setReportTarget,
    reportReason,
    setReportReason,
    expandedComments,
    setExpandedComments,
    commentDrafts,
    setCommentDrafts,
    queries: {
      alumni: alumniQuery,
      posts: postsQuery,
      notifications: notificationsQuery,
      approval: approvalTurnaroundQuery,
      announcements: announcementsQuery,
      events: eventsQuery,
      jobs: jobsQuery,
      mentorship: mentorshipQuery,
    },
    mutations: {
      createPost: createPostMutation,
      like: likeMutation,
      comment: commentMutation,
      report: reportMutation,
    },
    derived: {
      alumni,
      profile,
      sameBatchCount,
      sameCompanyCount,
      activityFeed,
    },
    composerDraftKey,
  };
}
