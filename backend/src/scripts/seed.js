import dotenv from "dotenv";
import mongoose from "mongoose";

import { attachTenantDatabaseContext, buildTenantPersistenceConfig, getTenantModels } from "../db/tenantConnectionManager.js";
import Institute from "../models/Institute.js";
import User from "../models/User.js";
import { hashPassword } from "../utils/auth.js";

dotenv.config();

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

async function seed() {
  await mongoose.connect(CENTRAL_MONGODB_URI);

  await Promise.all([User.deleteMany({}), Institute.deleteMany({})]);

  const tenantConfig = buildTenantPersistenceConfig({
    name: "SPIT Demo Institute",
    subdomain: "spit",
    dataIsolationMode: process.env.DEFAULT_TENANT_ISOLATION_MODE || "shared"
  });

  const institute = await Institute.create({
    name: "SPIT Demo Institute",
    subdomain: "spit",
    domain: "alumni.spit.ac.in",
    dataIsolationMode: process.env.DEFAULT_TENANT_ISOLATION_MODE || "shared",
    tenantDatabaseName: tenantConfig.databaseName,
    status: "active",
    subscriptionPlan: "pro",
    subscriptionStatus: "active",
    subscriptionRenewsAt: new Date("2027-01-15T00:00:00.000Z"),
    lastPaymentAt: new Date("2026-01-15T00:00:00.000Z"),
    billingHistory: [
      {
        plan: "pro",
        status: "active",
        amount: 15000,
        currency: "INR",
        paidAt: new Date("2026-01-15T00:00:00.000Z"),
        notes: "Initial annual subscription"
      }
    ],
    primaryContactName: "Dr. Meera Joshi",
    primaryContactEmail: "admin@spit.edu",
    primaryContactPhone: "9876543210"
  });

  const [superAdminPassword, instituteAdminPassword, alumniPassword] = await Promise.all([
    hashPassword("Admin@123"),
    hashPassword("Institute@123"),
    hashPassword("Alumni@123")
  ]);

  const superAdmin = await User.create({
    name: "Platform Super Admin",
    email: "superadmin@alumninetwork.com",
    passwordHash: superAdminPassword,
    role: "super_admin",
    isActive: true,
    passwordSetupCompleted: true
  });

  const tenantContext = {};
  await attachTenantDatabaseContext(tenantContext, institute);
  const {
    AlumniProfile,
    AlumniPost,
    Announcement,
    Event,
    Job,
    Notification,
    User: TenantUser
  } = getTenantModels(tenantContext);

  await Promise.all([
    TenantUser.deleteMany({ instituteId: institute._id }),
    AlumniProfile.deleteMany({ instituteId: institute._id }),
    AlumniPost.deleteMany({ instituteId: institute._id }),
    Announcement.deleteMany({ instituteId: institute._id }),
    Event.deleteMany({ instituteId: institute._id }),
    Job.deleteMany({ instituteId: institute._id }),
    Notification.deleteMany({ instituteId: institute._id })
  ]);

  const instituteAdmin = await TenantUser.create({
    instituteId: institute._id,
    name: "SPIT Admin",
    email: "admin@spit.edu",
    passwordHash: instituteAdminPassword,
    role: "institute_admin",
    isActive: true,
    passwordSetupCompleted: true
  });

  const [alumniUser, riyaUser, devUser] = await TenantUser.create([
    {
      instituteId: institute._id,
      name: "Aarav Shah",
      email: "aarav@spit.edu",
      passwordHash: alumniPassword,
      role: "alumni",
      isActive: true,
      passwordSetupCompleted: true
    },
    {
      instituteId: institute._id,
      name: "Riya Desai",
      email: "riya@spit.edu",
      passwordHash: alumniPassword,
      role: "alumni",
      isActive: true,
      passwordSetupCompleted: true
    },
    {
      instituteId: institute._id,
      name: "Dev Mehta",
      email: "dev@spit.edu",
      passwordHash: alumniPassword,
      role: "alumni",
      isActive: true,
      passwordSetupCompleted: true
    }
  ]);

  await AlumniProfile.create([
    {
      instituteId: institute._id,
      userId: alumniUser._id,
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
      bio: "Helping early-stage teams build products alumni actually love.",
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
    }
  ]);

  const mixerPostCreatedAt = hoursAgo(3);
  const mentoringPostCreatedAt = daysAgo(1, 5);
  const toolPostCreatedAt = daysAgo(4, 2);

  const [mixerPost] = await AlumniPost.create([
    {
      instituteId: institute._id,
      authorUserId: riyaUser._id,
      title: "Anyone attending the July alumni mixer?",
      content: "I am planning to attend the alumni mixer next month and would love to meet people working in product, community, and startup roles. If you are going, drop a comment and let us coordinate.",
      likes: [alumniUser._id],
      comments: [
        {
          userId: alumniUser._id,
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
      likes: [alumniUser._id, riyaUser._id],
      createdAt: mentoringPostCreatedAt,
      updatedAt: mentoringPostCreatedAt
    },
    {
      instituteId: institute._id,
      authorUserId: alumniUser._id,
      title: "Built a small tool for alumni event coordination",
      content: "Spent the weekend building a simple workflow to coordinate RSVPs and volunteer signups for alumni events. Happy to share the approach if anyone else is solving something similar inside their communities.",
      likes: [riyaUser._id],
      createdAt: toolPostCreatedAt,
      updatedAt: daysAgo(3, 18)
    }
  ]);

  const announcement = await Announcement.create({
    instituteId: institute._id,
    title: "Alumni Reunion 2026 registrations are now open",
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
    description: "Hiring alumni with React and product engineering experience.",
    postedBy: instituteAdmin._id,
    status: "published",
    applicationDeadline: daysAgo(-10),
    createdAt: daysAgo(1, 3),
    updatedAt: daysAgo(1, 3)
  });

  await Notification.create([
    {
      instituteId: institute._id,
      userId: alumniUser._id,
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
      userId: alumniUser._id,
      actorUserId: instituteAdmin._id,
      category: "jobs",
      type: "job_published",
      title: "New role: Frontend Developer",
      message: "Open Systems Labs is hiring alumni from your network.",
      entityType: "Job",
      entityId: job._id,
      linkTo: "/portal/jobs",
      createdAt: daysAgo(1, 3),
      updatedAt: daysAgo(1, 3)
    },
    {
      instituteId: institute._id,
      userId: alumniUser._id,
      actorUserId: instituteAdmin._id,
      category: "events",
      type: "event_published",
      title: "New event: Global Alumni Meetup 2026",
      message: "Mumbai Campus • 20 Jun 2026",
      entityType: "Event",
      entityId: event._id,
      linkTo: "/portal/events",
      createdAt: daysAgo(1, 8),
      updatedAt: daysAgo(1, 8)
    },
    {
      instituteId: institute._id,
      userId: alumniUser._id,
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

  console.log("Seed complete");
  console.log(`Super admin: ${superAdmin.email} / Admin@123`);
  console.log(`Institute admin: ${instituteAdmin.email} / Institute@123`);
  console.log(`Alumni: ${alumniUser.email} / Alumni@123`);
  console.log(`Institute portal: ${institute.subdomain}.yourplatform.com`);

  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error("Seed failed", error);
  await mongoose.disconnect();
  process.exit(1);
});
