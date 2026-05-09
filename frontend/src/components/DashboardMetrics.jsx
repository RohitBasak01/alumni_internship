import { PortalMetricCard, PortalMetricGrid } from "./PortalPrimitives.jsx";

export function DashboardMetrics({
  isAlumni,
  isSchool,
  showFriendship,
  showJobs,
  posts,
  alumni,
  sameBatchCount,
  friendshipRequests,
  sameCompanyCount,
  notifications,
  approvalKpi,
  announcements,
  events,
  jobs,
  tenantDisplayName
}) {
  if (isAlumni) {
    return (
      <PortalMetricGrid>
        <PortalMetricCard icon="FD" title="Feed Posts" trend="Live" value={posts.length} />
        <PortalMetricCard icon="NW" title="Network Size" trend="Growing" value={alumni.length} />
        <PortalMetricCard icon="BT" title={isSchool ? "Same Leaving Year" : "Same Batch"} trend="Relevant" value={sameBatchCount} />
        <PortalMetricCard
          icon="RQ"
          title={showFriendship ? "Accepted Friendships" : "Shared Organizations"}
          trend="Active"
          value={showFriendship ? friendshipRequests.filter(m => m.status === "accepted").length : sameCompanyCount}
        />
      </PortalMetricGrid>
    );
  }

  const approvalHours = approvalKpi?.averageHours;
  const approvalValue = typeof approvalHours === "number" ? `${Math.round(approvalHours)}h` : "--";
  const approvalTrend = (approvalKpi?.sampleSize || 0) > 0 ? `${approvalKpi.sampleSize} reviewed` : "No reviews yet";

  return (
    <PortalMetricGrid>
      <PortalMetricCard icon="AL" title="Total Members" trend="Growing" value={alumni.length.toLocaleString()} />
      <PortalMetricCard icon="NR" title="Pending Registrations" trend="Action" value={notifications?.pendingAlumniInvites || 0} />
      <PortalMetricCard icon="TT" title="Approval Turnaround" trend={approvalTrend} value={approvalValue} />
      <PortalMetricCard icon="JB" title={showJobs ? "Active Jobs" : "Announcements"} trend="Current" value={showJobs ? jobs.length : announcements.length} />
      <PortalMetricCard icon="EV" title="Upcoming Events" trend="Scheduled" value={events.length} />
    </PortalMetricGrid>
  );
}
