import dotenv from "dotenv";
import mongoose from "mongoose";

import { attachTenantDatabaseContext, buildTenantPersistenceConfig, getTenantModels } from "../db/tenantConnectionManager.js";
import Institute from "../models/Institute.js";
import User from "../models/User.js";
import { hashPassword } from "../utils/auth.js";
import { getDefaultBranding, getDefaultCommunityLabels, getDefaultFeatureFlags } from "../utils/tenantConfig.js";

dotenv.config({ override: true });

const CENTRAL_MONGODB_URI =
  process.env.CENTRAL_MONGODB_URI ||
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/alumni-network";

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function daysAgo(days, extraHours = 0) {
  return new Date(Date.now() - (days * 24 + extraHours) * 60 * 60 * 1000);
}

async function createInstitute({
  name,
  subdomain,
  domain,
  institutionType,
  educationLevel,
  subscriptionPlan,
  primaryContactName,
  primaryContactEmail,
  billingAmount
}) {
  const tenantConfig = buildTenantPersistenceConfig({
    name,
    subdomain,
    dataIsolationMode: process.env.DEFAULT_TENANT_ISOLATION_MODE || "shared"
  });

  return Institute.create({
    name,
    subdomain,
    domain,
    institutionType,
    educationLevel,
    communityLabels: getDefaultCommunityLabels(institutionType),
    featureFlags: getDefaultFeatureFlags(institutionType),
    branding: getDefaultBranding(institutionType),
    dataIsolationMode: process.env.DEFAULT_TENANT_ISOLATION_MODE || "shared",
    tenantDatabaseName: tenantConfig.databaseName,
    status: "active",
    subscriptionPlan,
    subscriptionStatus: "active",
    subscriptionRenewsAt: new Date("2027-01-15T00:00:00.000Z"),
    lastPaymentAt: new Date("2026-01-15T00:00:00.000Z"),
    billingHistory: [
      {
        plan: subscriptionPlan,
        status: "active",
        amount: billingAmount,
        currency: "INR",
        paidAt: new Date("2026-01-15T00:00:00.000Z"),
        notes: "Initial annual subscription"
      }
    ],
    primaryContactName,
    primaryContactEmail,
    primaryContactPhone: "9876543210"
  });
}

async function seedCollegeTenant(institute, passwords) {
  const tenantContext = {};
  await attachTenantDatabaseContext(tenantContext, institute);
  const { AlumniProfile, AlumniPost, Announcement, Event, Job, JobApplication, Notification, User: TenantUser } = getTenantModels(tenantContext);

  await Promise.all([
    TenantUser.deleteMany({ instituteId: institute._id }),
    AlumniProfile.deleteMany({ instituteId: institute._id }),
    AlumniPost.deleteMany({ instituteId: institute._id }),
    Announcement.deleteMany({ instituteId: institute._id }),
    Event.deleteMany({ instituteId: institute._id }),
    Job.deleteMany({ instituteId: institute._id }),
    JobApplication.deleteMany({ instituteId: institute._id }),
    Notification.deleteMany({ instituteId: institute._id })
  ]);

  const instituteAdmin = await TenantUser.create({
    instituteId: institute._id,
    name: "SPIT Admin",
    email: "admin@spit.edu",
    passwordHash: passwords.instituteAdmin,
    role: "institute_admin",
    isActive: true,
    passwordSetupCompleted: true
  });

  const [aaravUser, riyaUser, devUser, snehaUser] = await TenantUser.create([
    {
      instituteId: institute._id,
      name: "Aarav Shah",
      email: "aarav@spit.edu",
      passwordHash: passwords.collegeMember,
      role: "alumni",
      isActive: true,
      passwordSetupCompleted: true
    },
    {
      instituteId: institute._id,
      name: "Riya Desai",
      email: "riya@spit.edu",
      passwordHash: passwords.collegeMember,
      role: "alumni",
      isActive: true,
      passwordSetupCompleted: true
    },
    {
      instituteId: institute._id,
      name: "Dev Mehta",
      email: "dev@spit.edu",
      passwordHash: passwords.collegeMember,
      role: "alumni",
      isActive: true,
      passwordSetupCompleted: true
    },
    {
      instituteId: institute._id,
      name: "Sneha Kulkarni",
      email: "sneha@spit.edu",
      passwordHash: passwords.collegeMember,
      role: "alumni",
      isActive: true,
      passwordSetupCompleted: true
    }
  ]);

  await AlumniProfile.create([
    {
      instituteId: institute._id,
      userId: aaravUser._id,
      batch: 2018,
      department: "Computer Engineering",
      company: "Open Systems Labs",
      designation: "Software Engineer",
      location: "Mumbai",
      bio: "Working on scalable alumni communities and internal platforms.",
      skills: ["React", "Node.js", "MongoDB"]
    },
    {
      instituteId: institute._id,
      userId: riyaUser._id,
      batch: 2017,
      department: "Information Technology",
      company: "Finverse",
      designation: "Product Manager",
      location: "Bengaluru",
      bio: "Helping early-stage teams build products communities actually love.",
      skills: ["Product", "Community", "Growth"]
    },
    {
      instituteId: institute._id,
      userId: devUser._id,
      batch: 2016,
      department: "Electronics",
      company: "Orbit Systems",
      designation: "Engineering Lead",
      location: "Pune",
      bio: "Mentoring young engineers and working on embedded systems.",
      skills: ["Embedded", "Leadership", "Mentorship"]
    },
    {
      instituteId: institute._id,
      userId: snehaUser._id,
      batch: 2019,
      department: "Information Technology",
      company: "CloudBridge",
      designation: "Frontend Engineer",
      location: "Hyderabad",
      bio: "Building accessible product experiences and mentoring junior members.",
      skills: ["React", "Accessibility", "Design Systems"]
    }
  ]);

  const mixerPostCreatedAt = hoursAgo(3);
  const mentoringPostCreatedAt = daysAgo(1, 5);
  const toolPostCreatedAt = daysAgo(4, 2);

  const [mixerPost] = await AlumniPost.create([
    {
      instituteId: institute._id,
      authorUserId: riyaUser._id,
      title: "Anyone attending the July community mixer?",
      content: "I am planning to attend the community mixer next month and would love to meet people working in product, community, and startup roles. If you are going, drop a comment and let us coordinate.",
      likes: [aaravUser._id],
      comments: [
        {
          userId: aaravUser._id,
          content: "Count me in. Happy to connect before the event too.",
          createdAt: hoursAgo(2),
          updatedAt: hoursAgo(2)
        }
      ],
      createdAt: mixerPostCreatedAt,
      updatedAt: hoursAgo(2)
    },
    {
      instituteId: institute._id,
      authorUserId: devUser._id,
      title: "Open to mentoring final-year students",
      content: "I have a few slots this month for alumni or senior students who want guidance on career transitions into core engineering and leadership tracks. Feel free to reach out if this would help.",
      likes: [aaravUser._id, riyaUser._id],
      createdAt: mentoringPostCreatedAt,
      updatedAt: mentoringPostCreatedAt
    },
    {
      instituteId: institute._id,
      authorUserId: aaravUser._id,
      title: "Built a small tool for event coordination",
      content: "Spent the weekend building a simple workflow to coordinate RSVPs and volunteer signups for institution events. Happy to share the approach if anyone else is solving something similar inside their communities.",
      likes: [riyaUser._id],
      createdAt: toolPostCreatedAt,
      updatedAt: daysAgo(3, 18)
    }
  ]);

  const announcement = await Announcement.create({
    instituteId: institute._id,
    title: "Community Reunion 2026 registrations are now open",
    content: "Secure your place for the annual reunion and volunteer mixer before June 15.",
    status: "published",
    createdBy: instituteAdmin._id,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2)
  });

  const event = await Event.create({
    instituteId: institute._id,
    title: "Global Alumni Meetup 2026",
    description: "Annual reunion for alumni, mentors, and institute leadership.",
    eventDate: new Date("2026-06-20T10:00:00.000Z"),
    location: "Mumbai Campus",
    createdBy: instituteAdmin._id,
    createdAt: daysAgo(1, 8),
    updatedAt: daysAgo(1, 8)
  });

  const job = await Job.create({
    instituteId: institute._id,
    title: "Frontend Developer",
    company: "Open Systems Labs",
    description: "Hiring community members with React and product engineering experience.",
    postedBy: instituteAdmin._id,
    status: "published",
    applicationDeadline: daysAgo(-10),
    createdAt: daysAgo(1, 3),
    updatedAt: daysAgo(1, 3)
  });

  // Create sample job applications
  await JobApplication.create([
    {
      jobId: job._id,
      userId: aaravUser._id,
      coverLetter: "I'm very interested in this Frontend role. I have 3+ years of React experience.",
      resumeUrl: "https://example.com/resume-aarav.pdf",
      resumeFileName: "resume-aarav.pdf",
      status: "pending",
      createdAt: daysAgo(1, 2),
      updatedAt: daysAgo(1, 2)
    },
    {
      jobId: job._id,
      userId: riyaUser._id,
      coverLetter: "Excited about this opportunity. I have built several React applications.",
      resumeUrl: "https://example.com/resume-riya.pdf",
      resumeFileName: "resume-riya.pdf",
      status: "reviewed",
      createdAt: daysAgo(1, 1),
      updatedAt: daysAgo(0, 20)
    },
    {
      jobId: job._id,
      userId: devUser._id,
      coverLetter: "I'd like to apply for the Frontend Developer position.",
      resumeUrl: "https://example.com/resume-dev.pdf",
      resumeFileName: "resume-dev.pdf",
      status: "accepted",
      createdAt: daysAgo(0, 12),
      updatedAt: daysAgo(0, 12)
    }
  ]);

  await Notification.create([
    {
      instituteId: institute._id,
      userId: aaravUser._id,
      actorUserId: riyaUser._id,
      category: "connections",
      type: "post_comment",
      title: "Riya Desai commented on your post",
      message: "Count me in. Happy to connect before the event too.",
      entityType: "AlumniPost",
      entityId: mixerPost._id,
      linkTo: "/portal/notifications",
      createdAt: hoursAgo(2),
      updatedAt: hoursAgo(2)
    },
    {
      instituteId: institute._id,
      userId: aaravUser._id,
      actorUserId: instituteAdmin._id,
      category: "jobs",
      type: "job_published",
      title: "New role: Frontend Developer",
      message: "Open Systems Labs is hiring from your network.",
      entityType: "Job",
      entityId: job._id,
      linkTo: "/portal/jobs",
      createdAt: daysAgo(1, 3),
      updatedAt: daysAgo(1, 3)
    },
    {
      instituteId: institute._id,
      userId: aaravUser._id,
      actorUserId: instituteAdmin._id,
      category: "events",
      type: "event_published",
      title: "New event: Global Alumni Meetup 2026",
      message: "Mumbai Campus | 20 Jun 2026",
      entityType: "Event",
      entityId: event._id,
      linkTo: "/portal/events",
      createdAt: daysAgo(1, 8),
      updatedAt: daysAgo(1, 8)
    },
    {
      instituteId: institute._id,
      userId: aaravUser._id,
      actorUserId: instituteAdmin._id,
      category: "system",
      type: "announcement_published",
      title: announcement.title,
      message: announcement.content,
      entityType: "Announcement",
      entityId: announcement._id,
      linkTo: "/portal/announcements",
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2)
    }
  ]);

  return { instituteAdmin, aaravUser, snehaUser: snehaUser };
}

async function seedSchoolTenant(institute, passwords) {
  const tenantContext = {};
  await attachTenantDatabaseContext(tenantContext, institute);
  const { AlumniProfile, Announcement, Event, Notification, User: TenantUser, CommunityGroup } = getTenantModels(tenantContext);

  await Promise.all([
    TenantUser.deleteMany({ instituteId: institute._id }),
    AlumniProfile.deleteMany({ instituteId: institute._id }),
    Announcement.deleteMany({ instituteId: institute._id }),
    Event.deleteMany({ instituteId: institute._id }),
    Notification.deleteMany({ instituteId: institute._id }),
    CommunityGroup?.deleteMany ? CommunityGroup.deleteMany({ instituteId: institute._id }) : Promise.resolve()
  ]);

  const schoolAdmin = await TenantUser.create({
    instituteId: institute._id,
    name: "Greenwood Admin",
    email: "admin@greenwoodschool.edu",
    passwordHash: passwords.schoolAdmin,
    role: "institute_admin",
    isActive: true,
    passwordSetupCompleted: true
  });

  const [mayaUser, rohanUser] = await TenantUser.create([
    {
      instituteId: institute._id,
      name: "Maya Fernandes",
      email: "maya@greenwoodschool.edu",
      passwordHash: passwords.schoolMember,
      role: "alumni",
      isActive: true,
      passwordSetupCompleted: true
    },
    {
      instituteId: institute._id,
      name: "Rohan Mehta",
      email: "rohan@greenwoodschool.edu",
      passwordHash: passwords.schoolMember,
      role: "alumni",
      isActive: true,
      passwordSetupCompleted: true
    }
  ]);

  await AlumniProfile.create([
    {
      instituteId: institute._id,
      userId: mayaUser._id,
      batch: null,
      department: "",
      leavingYear: 2020,
      lastClassAttended: "Class 12 Science",
      section: "Aster House",
      currentEducation: "B.Sc. Psychology",
      currentInstitution: "St. Xavier's College",
      occupation: "Undergraduate Student",
      location: "Goa",
      bio: "Looking to reconnect with teachers and classmates from Greenwood.",
      skills: [],
      allowMentorRequests: false
    },
    {
      instituteId: institute._id,
      userId: rohanUser._id,
      batch: null,
      department: "",
      leavingYear: 2019,
      lastClassAttended: "Class 10",
      section: "Blue House",
      currentEducation: "",
      currentInstitution: "Mehta Family Ventures",
      occupation: "Operations Associate",
      location: "Pune",
      bio: "Happy to support school events and community initiatives.",
      skills: [],
      allowMentorRequests: false
    }
  ]);

  const announcement = await Announcement.create({
    instituteId: institute._id,
    title: "Greenwood Homecoming Week Announced",
    content: "Former students can now RSVP for homecoming assemblies, campus tours, and the founders' evening.",
    status: "published",
    createdBy: schoolAdmin._id,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3)
  });

  const event = await Event.create({
    instituteId: institute._id,
    title: "Greenwood Founders Day",
    description: "A school-wide celebration inviting former students, teachers, and families back to campus.",
    eventDate: new Date("2026-08-14T09:30:00.000Z"),
    location: "Greenwood Main Quadrangle",
    createdBy: schoolAdmin._id,
    createdAt: daysAgo(1, 10),
    updatedAt: daysAgo(1, 10)
  });

  await Notification.create([
    {
      instituteId: institute._id,
      userId: mayaUser._id,
      actorUserId: schoolAdmin._id,
      category: "events",
      type: "event_published",
      title: event.title,
      message: "Main Quadrangle | 14 Aug 2026",
      entityType: "Event",
      entityId: event._id,
      linkTo: "/portal/events",
      createdAt: daysAgo(1, 10),
      updatedAt: daysAgo(1, 10)
    },
    {
      instituteId: institute._id,
      userId: mayaUser._id,
      actorUserId: schoolAdmin._id,
      category: "system",
      type: "announcement_published",
      title: announcement.title,
      message: announcement.content,
      entityType: "Announcement",
      entityId: announcement._id,
      linkTo: "/portal/announcements",
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3)
    }
  ]);

  if (CommunityGroup) {
    await CommunityGroup.create([
      {
        instituteId: institute._id,
        name: "Class of 2020",
        description: "Reconnect with former students from the 2020 graduating class.",
        groupType: "year",
        audienceLabel: "Leaving Year 2020",
        memberIds: [mayaUser._id, rohanUser._id],
        createdBy: schoolAdmin._id
      }
    ]);
  }

  return { schoolAdmin, mayaUser, rohanUser };
}

async function seed() {
  await mongoose.connect(CENTRAL_MONGODB_URI);

  await Promise.all([User.deleteMany({}), Institute.deleteMany({})]);

  const collegeInstitute = await createInstitute({
    name: "SPIT Demo Institute",
    subdomain: "spit",
    domain: "alumni.spit.ac.in",
    institutionType: "college",
    educationLevel: "higher_ed",
    subscriptionPlan: "pro",
    primaryContactName: "Dr. Meera Joshi",
    primaryContactEmail: "admin@spit.edu",
    billingAmount: 15000
  });

  const schoolInstitute = await createInstitute({
    name: "Greenwood School Network",
    subdomain: "greenwood",
    domain: "alumni.greenwoodschool.edu",
    institutionType: "school",
    educationLevel: "k12",
    subscriptionPlan: "basic",
    primaryContactName: "Anita D'Souza",
    primaryContactEmail: "admin@greenwoodschool.edu",
    billingAmount: 8000
  });

  const passwords = {
    superAdmin: await hashPassword("Admin@123"),
    instituteAdmin: await hashPassword("Institute@123"),
    collegeMember: await hashPassword("Alumni@123"),
    schoolAdmin: await hashPassword("School@123"),
    schoolMember: await hashPassword("FormerStudent@123")
  };

  const superAdmin = await User.create({
    name: "Platform Super Admin",
    email: "superadmin@alumninetwork.com",
    passwordHash: passwords.superAdmin,
    role: "super_admin",
    isActive: true,
    passwordSetupCompleted: true
  });

  const collegeSeed = await seedCollegeTenant(collegeInstitute, passwords);
  const schoolSeed = await seedSchoolTenant(schoolInstitute, passwords);

  console.log("Seed complete");
  console.log(`Super admin: ${superAdmin.email} / Admin@123`);
  console.log(`College admin: ${collegeSeed.instituteAdmin.email} / Institute@123`);
  console.log(`College member: ${collegeSeed.aaravUser.email} / Alumni@123`);
  console.log(`College member: ${collegeSeed.snehaUser.email} / Alumni@123`);
  console.log(`School admin: ${schoolSeed.schoolAdmin.email} / School@123`);
  console.log(`School member: ${schoolSeed.mayaUser.email} / FormerStudent@123`);
  console.log(`School member: ${schoolSeed.rohanUser.email} / FormerStudent@123`);
  console.log(`College portal: ${collegeInstitute.subdomain}.yourplatform.com`);
  console.log(`School portal: ${schoolInstitute.subdomain}.yourplatform.com`);

  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error("Seed failed", error);
  await mongoose.disconnect();
  process.exit(1);
});
