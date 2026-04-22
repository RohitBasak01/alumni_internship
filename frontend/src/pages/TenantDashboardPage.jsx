import { Link } from "react-router-dom";
import { PortalPageHeader } from "../components/PortalPrimitives.jsx";
import SectionCard from "../components/SectionCard.jsx";
import { DashboardMetrics } from "../components/DashboardMetrics.jsx";
import { ActivityFeed } from "../components/ActivityFeed.jsx";
import { FeedPostCard } from "../components/FeedPostCard.jsx";
import { PostComposer } from "../components/PostComposer.jsx";
import "../styles/Dashboard.css";
import { useDashboardLogic } from "../hooks/useDashboardLogic.js";
import { renderComposerPreviewBlocks } from "../utils/markdown.jsx";
import { formatRelativeTime } from "../utils/formatters.js";

function TenantDashboardPage() {
  const {
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
    commentDrafts,
    queries,
    mutations,
    derived,
    composerDraftKey,
  } = useDashboardLogic();

  const isSchool = tenantDisplay.isSchool;
  const dashboardName = auth.user?.name || "Portal User";
  const firstName = dashboardName.split(" ")[0] || "Member";
  const profile = derived.profile;
  const roleLabel = profile?.designation || profile?.occupation || tenant.communityLabels.memberSingular;
  const companyLabel = profile?.company || profile?.currentInstitution || tenant.displayName;

  if (isAlumni) {
    const fullPost = queries.posts.data?.find(p => p._id === selectedPostId);

    return (
      <div className="member-home alumni-feed-page">
        <PortalPageHeader
          title={`Welcome back, ${firstName}`}
          subtitle={`Your ${tenantDisplay.memberPlural.toLowerCase()} home brings together conversations, reactions, and thoughtful updates.`}
          actions={
            <>
              <Link className="button secondary" to="/portal/alumni">{`Discover ${tenantDisplay.memberPlural}`}</Link>
              <Link className="button primary" to="/portal/profile?mode=edit">Refine profile</Link>
            </>
          }
        />

        <DashboardMetrics
          isAlumni={true}
          isSchool={isSchool}
          showMentorship={showMentorship}
          showJobs={showJobs}
          posts={queries.posts.data || []}
          alumni={queries.alumni.data || []}
          sameBatchCount={derived.sameBatchCount}
          mentorshipRequests={queries.mentorship.data || []}
          sameCompanyCount={derived.sameCompanyCount}
        />

        <section className="alumni-feed-layout">
          <div className="alumni-feed-main">
            <SectionCard title="Share an update">
              <PostComposer
                composer={composer}
                setComposer={setComposer}
                composerMode={composerMode}
                setComposerMode={setComposerMode}
                composerDraftSavedAt={composerDraftSavedAt}
                composerDraftNotice={composerDraftNotice}
                createPostMutation={mutations.createPost}
                dashboardName={dashboardName}
                roleLabel={roleLabel}
                companyLabel={companyLabel}
                renderComposerPreviewBlocks={renderComposerPreviewBlocks}
              />
            </SectionCard>

            <SectionCard title={`${tenantDisplay.memberPlural} feed`} action={<button className="button ghost" onClick={() => queries.posts.refetch()}>Refresh</button>}>
              <div className="alumni-post-stack">
                {(queries.posts.data || []).map((post) => (
                  <FeedPostCard
                    key={post._id}
                    post={post}
                    isSchool={isSchool}
                    memberFallback={tenantDisplay.memberSingular}
                    expanded={Boolean(expandedComments[post._id])}
                    commentDraft={commentDrafts[post._id] || ""}
                    onToggleComments={(id) => console.log("Toggle", id)}
                    onCommentDraftChange={(id, val) => console.log("Draft", id, val)}
                    onCommentSubmit={(id) => console.log("Submit", id)}
                    onLike={(p) => mutations.like.mutate(p._id)}
                    onViewFull={setSelectedPostId}
                    onReport={setReportTarget}
                    pendingLike={mutations.like.isPending}
                    pendingComment={mutations.comment.isPending}
                    pendingReport={mutations.report.isPending}
                  />
                ))}
              </div>
            </SectionCard>
          </div>

          <aside className="alumni-feed-sidebar">
             <SectionCard title="Community pulse" subtitle="Quick highlights">
                <ActivityFeed items={derived.activityFeed} />
             </SectionCard>
          </aside>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <PortalPageHeader title={isSchool ? "School Overview" : "Institute Overview"} />
      <DashboardMetrics
        isAlumni={false}
        alumni={queries.alumni.data || []}
        notifications={queries.notifications.data}
        approvalKpi={queries.approval.data}
        showJobs={showJobs}
        jobs={queries.jobs.data || []}
        announcements={queries.announcements.data || []}
        events={queries.events.data || []}
      />
      <section className="member-content-grid">
        <SectionCard title="Recent activity">
          <ActivityFeed items={queries.notifications.data?.recentActivity || []} />
        </SectionCard>
      </section>
    </div>
  );
}

export default TenantDashboardPage;
