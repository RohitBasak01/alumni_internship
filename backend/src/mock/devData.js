export const demoInstitute = {
  _id: "65f000000000000000000001",
  name: "SPIT Demo Institute",
  subdomain: "spit",
  domain: "alumni.spit.ac.in",
  institutionType: "college",
  educationLevel: "higher_ed",
  communityLabels: {
    memberPlural: "Alumni",
    memberSingular: "Alumnus/Alumna",
    adminLabel: "Institute Admin"
  },
  featureFlags: {
    enableJobs: true,
    enableMentorship: true,
    enableDirectory: true,
    enableEvents: true,
    enableAnnouncements: true,
    enableSocialLinks: true,
    enableCareerFields: true
  },
  status: "active",
  subscriptionPlan: "pro",
  subscriptionStatus: "active",
  subscriptionRenewsAt: "2027-01-15T00:00:00.000Z",
  lastPaymentAt: "2026-01-15T00:00:00.000Z",
  billingHistory: [
    {
      plan: "pro",
      status: "active",
      amount: 15000,
      currency: "INR",
      paidAt: "2026-01-15T00:00:00.000Z",
      notes: "Initial annual subscription"
    }
  ],
  primaryContactName: "Rohit Basak",
  primaryContactEmail: "admin@spit.edu",
  primaryContactPhone: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-15T00:00:00.000Z"
};

export const demoUsers = [
  {
    _id: "65f000000000000000000002",
    name: "Platform Super Admin",
    email: "superadmin@alumninetwork.com",
    password: "Admin@123",
    role: "super_admin",
    isActive: true,
    passwordSetupCompleted: true,
    instituteId: null
  },
  {
    _id: "65f000000000000000000003",
    name: "Rohit Basak",
    email: "admin@spit.edu",
    password: "Institute@123",
    role: "institute_admin",
    isActive: true,
    passwordSetupCompleted: true,
    instituteId: demoInstitute._id
  },
  {
    _id: "65f000000000000000000004",
    name: "Aarav Shah",
    email: "aarav@spit.edu",
    password: "Alumni@123",
    role: "alumni",
    isActive: true,
    passwordSetupCompleted: true,
    instituteId: demoInstitute._id
  }
];

export const demoProfiles = [
  {
    _id: "65f000000000000000000101",
    instituteId: demoInstitute._id,
    userId: "65f000000000000000000004",
    batch: 2018,
    department: "Computer Engineering",
    company: "Open Systems Labs",
    designation: "Software Engineer",
    location: "Mumbai",
    industry: "Technology",
    bio: "Working on scalable alumni communities and internal platforms.",
    skills: ["React", "Node.js", "MongoDB"],
    linkedinUrl: "",
    websiteUrl: "",
    twitterHandle: "",
    profileVisibility: "institute_only",
    showEmail: false,
    allowMentorRequests: true,
    createdAt: "2026-01-10T00:00:00.000Z",
    updatedAt: "2026-01-10T00:00:00.000Z"
  }
];

export const demoAnnouncements = [
  {
    _id: "65f000000000000000000201",
    instituteId: demoInstitute._id,
    title: "Welcome to the Alumni Portal",
    content: "The SPIT alumni portal is now live for all approved members.",
    status: "published",
    createdBy: "65f000000000000000000003",
    createdAt: "2026-03-10T09:00:00.000Z",
    updatedAt: "2026-03-10T09:00:00.000Z"
  }
];

export const demoEvents = [
  {
    _id: "65f000000000000000000301",
    instituteId: demoInstitute._id,
    title: "Global Alumni Meetup 2026",
    description: "Annual reunion for alumni, mentors, and institute leadership.",
    eventDate: "2026-06-20T10:00:00.000Z",
    location: "Mumbai Campus",
    registrations: [],
    createdBy: "65f000000000000000000003",
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z"
  }
];

export const demoJobs = [
  {
    _id: "65f000000000000000000401",
    instituteId: demoInstitute._id,
    title: "Frontend Developer",
    company: "Open Systems Labs",
    description: "Hiring alumni with React and product engineering experience.",
    postedBy: "65f000000000000000000003",
    status: "published",
    createdAt: "2026-03-05T10:00:00.000Z",
    updatedAt: "2026-03-05T10:00:00.000Z"
  }
];

export const demoMentorshipRequests = [];

export const demoAuditLogs = [
  {
    _id: "65f000000000000000000501",
    action: "system.mock_mode_enabled",
    targetType: "Server",
    targetId: "mock",
    actor: null,
    institute: {
      id: demoInstitute._id,
      name: demoInstitute.name,
      subdomain: demoInstitute.subdomain
    },
    metadata: {
      reason: "MongoDB unavailable in development"
    },
    createdAt: new Date().toISOString()
  }
];

export function buildSessionUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    institute: user.instituteId
      ? {
          _id: demoInstitute._id,
          name: demoInstitute.name,
          status: demoInstitute.status,
          subdomain: demoInstitute.subdomain,
          domain: demoInstitute.domain,
          institutionType: demoInstitute.institutionType,
          educationLevel: demoInstitute.educationLevel,
          communityLabels: demoInstitute.communityLabels,
          featureFlags: demoInstitute.featureFlags
        }
      : null
  };
}

export function createMockStore() {
  return {
    institutes: [structuredClone(demoInstitute)],
    users: demoUsers.map((user) => structuredClone(user)),
    profiles: demoProfiles.map((profile) => structuredClone(profile)),
    announcements: demoAnnouncements.map((item) => structuredClone(item)),
    events: demoEvents.map((item) => structuredClone(item)),
    jobs: demoJobs.map((item) => structuredClone(item)),
    mentorshipRequests: demoMentorshipRequests.map((item) => structuredClone(item)),
    auditLogs: demoAuditLogs.map((item) => structuredClone(item))
  };
}
