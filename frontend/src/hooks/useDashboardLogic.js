import { useState, useMemo, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAlumni,
  fetchAnnouncements,
  fetchEvents,
  fetchJobs,
  fetchFeed,
  fetchManagedInstitutions,
  fetchNotificationSummary,
  fetchAlumniApprovalTurnaroundKpi,
  fetchAlumniPosts,
  fetchMyAlumniProfile,
  fetchFriendshipRequests,
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
  const showFriendship = tenant.featureFlags.enableFriendship !== false;
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
  const managedInstitutionsQuery = useQuery({
    queryKey: ["managed-institutions"],
    queryFn: fetchManagedInstitutions,
    enabled: !isAlumni
  });
  
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

  const friendshipQuery = useQuery({
    queryKey: ["friendship-requests"],
    queryFn: fetchFriendshipRequests,
    enabled: isAlumni && showFriendship
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

  const communityHighlights = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const joinedThisWeek = alumni.filter(a => new Date(a.createdAt) >= oneWeekAgo);
    
    // Simple top contributor logic: person who authored the most posts in the current fetch
    const posts = postsQuery.data || [];
    const authorCounts = {};
    posts.forEach(p => {
      const authorId = p.author?.id;
      if (authorId) {
        authorCounts[authorId] = (authorCounts[authorId] || 0) + 1;
      }
    });
    
    let topAuthorId = null;
    let maxPosts = 0;
    Object.entries(authorCounts).forEach(([id, count]) => {
      if (count > maxPosts) {
        maxPosts = count;
        topAuthorId = id;
      }
    });
    
    const topContributor = topAuthorId ? posts.find(p => p.author?.id === topAuthorId)?.author : null;

    return {
      joinedThisWeek,
      topContributor
    };
  }, [alumni, postsQuery.data]);

  const suggestedConnections = useMemo(() => {
    if (!alumni.length) return [];
    const currentUserId = auth.user?.id;
    // Simple logic: exclude self, then maybe prioritize same batch, then random
    const others = alumni.filter(a => a.userId !== currentUserId && a.userId?._id !== currentUserId);
    
    // Sort: same batch first, then random
    return others
      .sort((a, b) => {
        const aSameBatch = (a.batch || a.leavingYear) === (profile?.batch || profile?.leavingYear);
        const bSameBatch = (b.batch || b.leavingYear) === (profile?.batch || profile?.leavingYear);
        if (aSameBatch && !bSameBatch) return -1;
        if (!aSameBatch && bSameBatch) return 1;
        return 0;
      })
      .slice(0, 4);
  }, [alumni, auth.user?.id, profile]);

  return {
    tenant,
    tenantDisplay,
    auth,
    isAlumni,
    showFriendship,
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
      managedInstitutions: managedInstitutionsQuery,
      approval: approvalTurnaroundQuery,
      announcements: announcementsQuery,
      events: eventsQuery,
      jobs: jobsQuery,
      friendship: friendshipQuery,
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
      communityHighlights,
      suggestedConnections,
    },
    composerDraftKey,
  };
}
