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
  const { AlumniProfile, Event, Job, User: TenantUser } = getTenantModels(tenantContext);

  await Promise.all([
    TenantUser.deleteMany({ instituteId: institute._id }),
    AlumniProfile.deleteMany({ instituteId: institute._id }),
    Event.deleteMany({ instituteId: institute._id }),
    Job.deleteMany({ instituteId: institute._id })
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

  const alumniUser = await TenantUser.create({
    instituteId: institute._id,
    name: "Aarav Shah",
    email: "aarav@spit.edu",
    passwordHash: alumniPassword,
    role: "alumni",
    isActive: true,
    passwordSetupCompleted: true
  });

  await AlumniProfile.create({
    instituteId: institute._id,
    userId: alumniUser._id,
    batch: 2018,
    department: "Computer Engineering",
    company: "Open Systems Labs",
    designation: "Software Engineer",
    location: "Mumbai",
    bio: "Working on scalable alumni communities and internal platforms.",
    skills: ["React", "Node.js", "MongoDB"]
  });

  await Event.create({
    instituteId: institute._id,
    title: "Global Alumni Meetup 2026",
    description: "Annual reunion for alumni, mentors, and institute leadership.",
    eventDate: new Date("2026-06-20T10:00:00.000Z"),
    location: "Mumbai Campus",
    createdBy: instituteAdmin._id
  });

  await Job.create({
    instituteId: institute._id,
    title: "Frontend Developer",
    company: "Open Systems Labs",
    description: "Hiring alumni with React and product engineering experience.",
    postedBy: instituteAdmin._id,
    status: "published"
  });

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
