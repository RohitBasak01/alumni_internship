export const demoInstitutes = [
  {
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
      enableGroups: true,
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
  },
  {
    _id: "65f000000000000000000011",
    name: "Greenwood School Network",
    subdomain: "greenwood",
    domain: "alumni.greenwoodschool.edu",
    institutionType: "school",
    educationLevel: "k12",
    communityLabels: {
      memberPlural: "Former Students",
      memberSingular: "Former Student",
      adminLabel: "School Admin"
    },
    featureFlags: {
      enableJobs: false,
      enableMentorship: false,
      enableDirectory: true,
      enableEvents: true,
      enableAnnouncements: true,
      enableGroups: true,
      enableSocialLinks: false,
      enableCareerFields: false
    },
    status: "active",
    subscriptionPlan: "basic",
    subscriptionStatus: "active",
    subscriptionRenewsAt: "2027-02-10T00:00:00.000Z",
    lastPaymentAt: "2026-02-10T00:00:00.000Z",
    billingHistory: [
      {
        plan: "basic",
        status: "active",
        amount: 8000,
        currency: "INR",
        paidAt: "2026-02-10T00:00:00.000Z",
        notes: "School community launch plan"
      }
    ],
    primaryContactName: "Anita D'Souza",
    primaryContactEmail: "admin@greenwoodschool.edu",
    primaryContactPhone: "",
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-10T00:00:00.000Z"
  }
];

export const demoInstitute = demoInstitutes[0];
export const demoSchoolInstitute = demoInstitutes[1];

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
  },
  {
    _id: "65f000000000000000000012",
    name: "Anita D'Souza",
    email: "admin@greenwoodschool.edu",
    password: "School@123",
    role: "institute_admin",
    isActive: true,
    passwordSetupCompleted: true,
    instituteId: demoSchoolInstitute._id
  },
  {
    _id: "65f000000000000000000013",
    name: "Maya Fernandes",
    email: "maya@greenwoodschool.edu",
    password: "FormerStudent@123",
    role: "alumni",
    isActive: true,
    passwordSetupCompleted: true,
    instituteId: demoSchoolInstitute._id
  },
  {
    _id: "65f000000000000000000014",
    name: "Rohan Mehta",
    email: "rohan@greenwoodschool.edu",
    password: "FormerStudent@123",
    role: "alumni",
    isActive: true,
    passwordSetupCompleted: true,
    instituteId: demoSchoolInstitute._id
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
  },
  {
    _id: "65f000000000000000000111",
    instituteId: demoSchoolInstitute._id,
    userId: "65f000000000000000000013",
    batch: null,
    department: "",
    leavingYear: 2020,
    lastClassAttended: "Class 12 Science",
    section: "Aster House",
    currentEducation: "B.Sc. Psychology",
    currentInstitution: "St. Xavier's College",
    occupation: "Undergraduate Student",
    company: "",
    designation: "",
    location: "Goa",
    industry: "",
    bio: "Looking to reconnect with teachers and classmates from Greenwood.",
    skills: [],
    linkedinUrl: "",
    websiteUrl: "",
    twitterHandle: "",
    profileVisibility: "institute_only",
    showEmail: false,
    allowMentorRequests: false,
    createdAt: "2026-02-14T00:00:00.000Z",
    updatedAt: "2026-02-14T00:00:00.000Z"
  },
  {
    _id: "65f000000000000000000112",
    instituteId: demoSchoolInstitute._id,
    userId: "65f000000000000000000014",
    batch: null,
    department: "",
    leavingYear: 2019,
    lastClassAttended: "Class 10",
    section: "Blue House",
    currentEducation: "",
    currentInstitution: "Mehta Family Ventures",
    occupation: "Operations Associate",
    company: "",
    designation: "",
    location: "Pune",
    industry: "",
    bio: "Happy to support school events and community initiatives.",
    skills: [],
    linkedinUrl: "",
    websiteUrl: "",
    twitterHandle: "",
    profileVisibility: "institute_only",
    showEmail: false,
    allowMentorRequests: false,
    createdAt: "2026-02-16T00:00:00.000Z",
    updatedAt: "2026-02-16T00:00:00.000Z"
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
  },
  {
    _id: "65f000000000000000000211",
    instituteId: demoSchoolInstitute._id,
    title: "Greenwood Homecoming Week Announced",
    content: "Former students can now RSVP for homecoming assemblies, campus tours, and the founders' evening.",
    status: "published",
    createdBy: "65f000000000000000000012",
    createdAt: "2026-03-12T09:00:00.000Z",
    updatedAt: "2026-03-12T09:00:00.000Z"
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
  },
  {
    _id: "65f000000000000000000302",
    instituteId: demoInstitute._id,
    groupId: "65f000000000000000000601",
    title: "AI Product Workshop",
    description: "Hands-on workshop for AI Builders to share their latest projects and get feedback.",
    eventDate: "2026-07-15T15:00:00.000Z",
    location: "Online (Zoom)",
    registrations: [],
    createdBy: "65f000000000000000000003",
    createdAt: "2026-04-01T10:00:00.000Z",
    updatedAt: "2026-04-01T10:00:00.000Z"
  },
  {
    _id: "65f000000000000000000311",
    instituteId: demoSchoolInstitute._id,
    title: "Greenwood Founders Day",
    description: "A school-wide celebration inviting former students, teachers, and families back to campus.",
    eventDate: "2026-08-14T09:30:00.000Z",
    location: "Greenwood Main Quadrangle",
    registrations: [],
    createdBy: "65f000000000000000000012",
    createdAt: "2026-03-05T10:00:00.000Z",
    updatedAt: "2026-03-05T10:00:00.000Z"
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

export const demoCommunityGroups = [
  {
    _id: "65f000000000000000000601",
    instituteId: demoInstitute._id,
    name: "AI Builders Circle",
    description: "Institute-managed group for alumni interested in applied AI, product building, and founder conversations.",
    groupType: "interest",
    audienceLabel: "Artificial Intelligence",
    memberIds: ["65f000000000000000000004"],
    createdBy: "65f000000000000000000004",
    messages: [
      {
        _id: "65f000000000000000000701",
        senderId: "65f000000000000000000004",
        content: "Excited to start this group. Would love to discuss product ideas and AI use cases.",
        sentAt: "2026-03-18T10:30:00.000Z"
      }
    ],
    createdAt: "2026-03-12T10:00:00.000Z",
    updatedAt: "2026-03-18T10:30:00.000Z"
  },
  {
    _id: "65f000000000000000000602",
    instituteId: demoInstitute._id,
    name: "Batch of 2018",
    description: "Official year group for the 2018 graduating cohort.",
    groupType: "year",
    audienceLabel: "Batch of 2018",
    memberIds: ["65f000000000000000000004"],
    createdBy: "65f000000000000000000003",
    messages: [],
    createdAt: "2026-03-15T10:00:00.000Z",
    updatedAt: "2026-03-15T10:00:00.000Z"
  },
  {
    _id: "65f000000000000000000611",
    instituteId: demoSchoolInstitute._id,
    name: "Class of 2020",
    description: "Reconnect with former students from the 2020 graduating class.",
    groupType: "year",
    audienceLabel: "Leaving Year 2020",
    memberIds: ["65f000000000000000000013", "65f000000000000000000014"],
    createdBy: "65f000000000000000000012",
    messages: [],
    createdAt: "2026-03-20T10:00:00.000Z",
    updatedAt: "2026-03-20T10:00:00.000Z"
  },
  {
    _id: "65f000000000000000000612",
    instituteId: demoSchoolInstitute._id,
    name: "Aster House Circle",
    description: "School-managed community for former students from Aster House.",
    groupType: "class",
    audienceLabel: "Aster House",
    memberIds: ["65f000000000000000000013"],
    createdBy: "65f000000000000000000012",
    messages: [
      {
        _id: "65f000000000000000000713",
        senderId: "65f000000000000000000013",
        content: "Would love to organize a quick reunion during Founders Day.",
        sentAt: "2026-03-22T18:00:00.000Z"
      }
    ],
    createdAt: "2026-03-21T08:00:00.000Z",
    updatedAt: "2026-03-22T18:00:00.000Z"
  }
];

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

export function findMockInstituteById(instituteId) {
  return demoInstitutes.find((item) => item._id === instituteId) || null;
}

export function buildSessionUser(user, institute = null) {
  const resolvedInstitute = institute || findMockInstituteById(user?.instituteId);

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    institute: resolvedInstitute
      ? {
          _id: resolvedInstitute._id,
          name: resolvedInstitute.name,
          status: resolvedInstitute.status,
          subdomain: resolvedInstitute.subdomain,
          domain: resolvedInstitute.domain,
          institutionType: resolvedInstitute.institutionType,
          educationLevel: resolvedInstitute.educationLevel,
          communityLabels: resolvedInstitute.communityLabels,
          featureFlags: resolvedInstitute.featureFlags
        }
      : null
  };
}

export function createMockStore() {
  return {
    institutes: demoInstitutes.map((item) => structuredClone(item)),
    users: demoUsers.map((user) => structuredClone(user)),
    profiles: demoProfiles.map((profile) => structuredClone(profile)),
    announcements: demoAnnouncements.map((item) => structuredClone(item)),
    events: demoEvents.map((item) => structuredClone(item)),
    jobs: demoJobs.map((item) => structuredClone(item)),
    mentorshipRequests: demoMentorshipRequests.map((item) => structuredClone(item)),
    communityGroups: demoCommunityGroups.map((item) => structuredClone(item)),
    auditLogs: demoAuditLogs.map((item) => structuredClone(item))
  };
}
