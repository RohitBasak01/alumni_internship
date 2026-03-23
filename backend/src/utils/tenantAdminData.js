import { attachTenantDatabaseContext, getTenantModels } from "../db/tenantConnectionManager.js";

function buildRecentActivityItems(recentAnnouncements, recentEvents, recentJobs) {
  return [
    ...recentAnnouncements.map((item) => ({
      id: item._id,
      type: "announcement",
      title: item.title,
      meta: item.status,
      createdAt: item.createdAt
    })),
    ...recentEvents.map((item) => ({
      id: item._id,
      type: "event",
      title: item.title,
      meta: item.location || item.eventDate?.toISOString?.() || "",
      createdAt: item.createdAt
    })),
    ...recentJobs.map((item) => ({
      id: item._id,
      type: "job",
      title: item.title,
      meta: `${item.company} | ${item.status}`,
      createdAt: item.createdAt
    }))
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);
}

export async function getInstituteTenantModels(institute) {
  const tenantContext = {};
  await attachTenantDatabaseContext(tenantContext, institute);
  return getTenantModels(tenantContext);
}

export async function getInstituteTenantSummary(institute, options = {}) {
  const { includeAdmins = false, includeRecentActivity = false } = options;
  const tenantModels = await getInstituteTenantModels(institute);
  const { AlumniProfile, Announcement, Event, Job, MentorshipRequest, User } = tenantModels;
  const instituteId = institute._id;

  const [
    adminUsers,
    alumniProfilesCount,
    activeAlumniUsersCount,
    eventsCount,
    jobsCount,
    publishedJobsCount,
    announcementsCount,
    mentorshipRequestsCount,
    pendingMentorshipRequests,
    recentEvents,
    recentJobs,
    recentAnnouncements,
    eventsForRsvpCount
  ] = await Promise.all([
    includeAdmins
      ? User.find({ instituteId, role: "institute_admin" })
          .select("name email isActive passwordSetupCompleted inviteTokenHash inviteTokenExpiresAt createdAt")
          .sort({ createdAt: -1 })
      : Promise.resolve([]),
    AlumniProfile.countDocuments({ instituteId }),
    User.countDocuments({ instituteId, role: "alumni", isActive: true }),
    Event.countDocuments({ instituteId }),
    Job.countDocuments({ instituteId }),
    Job.countDocuments({ instituteId, status: "published" }),
    Announcement.countDocuments({ instituteId }),
    MentorshipRequest.countDocuments({ instituteId }),
    MentorshipRequest.countDocuments({ instituteId, status: "pending" }),
    includeRecentActivity
      ? Event.find({ instituteId }).select("title eventDate location createdAt").sort({ createdAt: -1 }).limit(3)
      : Promise.resolve([]),
    includeRecentActivity
      ? Job.find({ instituteId }).select("title company status createdAt").sort({ createdAt: -1 }).limit(3)
      : Promise.resolve([]),
    includeRecentActivity
      ? Announcement.find({ instituteId }).select("title status createdAt").sort({ createdAt: -1 }).limit(3)
      : Promise.resolve([]),
    Event.find({ instituteId }).select("registrations").lean()
  ]);

  const totalRsvps = eventsForRsvpCount.reduce(
    (sum, event) => sum + (Array.isArray(event.registrations) ? event.registrations.length : 0),
    0
  );

  return {
    admins: adminUsers,
    metrics: {
      adminsCount: adminUsers.length,
      alumniProfilesCount,
      activeAlumniUsersCount,
      eventsCount,
      jobsCount,
      publishedJobsCount,
      announcementsCount,
      mentorshipRequestsCount,
      pendingMentorshipRequests,
      totalRsvps
    },
    support: {
      hasPendingAdminSetup: adminUsers.some((user) => !user.passwordSetupCompleted),
      pendingInstituteAdminSetupCount: adminUsers.filter((user) => !user.passwordSetupCompleted).length,
      inactiveAdminCount: adminUsers.filter((user) => !user.isActive).length
    },
    recentActivity: includeRecentActivity ? buildRecentActivityItems(recentAnnouncements, recentEvents, recentJobs) : []
  };
}

export async function getPlatformTenantSummaries(institutes, options = {}) {
  return Promise.all(
    institutes.map(async (institute) => ({
      institute,
      summary: await getInstituteTenantSummary(institute, options)
    }))
  );
}
