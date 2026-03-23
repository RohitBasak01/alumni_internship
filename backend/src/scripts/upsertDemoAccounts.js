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

async function ensureInstitute() {
  let institute = await Institute.findOne({ subdomain: "spit" });

  if (!institute) {
    const tenantConfig = buildTenantPersistenceConfig({
      name: "SPIT Demo Institute",
      subdomain: "spit",
      dataIsolationMode: process.env.DEFAULT_TENANT_ISOLATION_MODE || "shared"
    });

    institute = await Institute.create({
      name: "SPIT Demo Institute",
      subdomain: "spit",
      domain: "alumni.spit.ac.in",
      dataIsolationMode: process.env.DEFAULT_TENANT_ISOLATION_MODE || "shared",
      tenantDatabaseName: tenantConfig.databaseName,
      status: "active",
      subscriptionPlan: "pro",
      subscriptionStatus: "active",
      primaryContactName: "Rohit Basak",
      primaryContactEmail: "admin@spit.edu",
      primaryContactPhone: ""
    });
  } else if (institute.status !== "active") {
    institute.status = "active";
    institute.subscriptionStatus = "active";
    await institute.save();
  }

  return institute;
}

async function upsertCentralUser({ email, name, password, role, instituteId = null }) {
  const passwordHash = await hashPassword(password);
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    existingUser.name = name;
    existingUser.role = role;
    existingUser.passwordHash = passwordHash;
    existingUser.isActive = true;
    existingUser.passwordSetupCompleted = true;
    existingUser.inviteTokenHash = null;
    existingUser.inviteTokenExpiresAt = null;
    existingUser.instituteId = instituteId;
    await existingUser.save();
    return existingUser;
  }

  return User.create({
    instituteId,
    name,
    email,
    passwordHash,
    role,
    isActive: true,
    passwordSetupCompleted: true,
    inviteTokenHash: null,
    inviteTokenExpiresAt: null
  });
}

async function upsertTenantUser(TenantUser, { email, name, password, role, instituteId }) {
  const passwordHash = await hashPassword(password);
  const existingUser = await TenantUser.findOne({ email });

  if (existingUser) {
    existingUser.name = name;
    existingUser.role = role;
    existingUser.passwordHash = passwordHash;
    existingUser.isActive = true;
    existingUser.passwordSetupCompleted = true;
    existingUser.inviteTokenHash = null;
    existingUser.inviteTokenExpiresAt = null;
    existingUser.instituteId = instituteId;
    await existingUser.save();
    return existingUser;
  }

  return TenantUser.create({
    instituteId,
    name,
    email,
    passwordHash,
    role,
    isActive: true,
    passwordSetupCompleted: true,
    inviteTokenHash: null,
    inviteTokenExpiresAt: null
  });
}

async function upsertDemoAccounts() {
  await mongoose.connect(CENTRAL_MONGODB_URI);

  const institute = await ensureInstitute();
  const tenantContext = {};
  await attachTenantDatabaseContext(tenantContext, institute);
  const { AlumniProfile, User: TenantUser } = getTenantModels(tenantContext);

  const superAdmin = await upsertCentralUser({
    email: "superadmin@alumninetwork.com",
    name: "Platform Super Admin",
    password: "Admin@123",
    role: "super_admin"
  });

  const instituteAdmin = await upsertTenantUser(TenantUser, {
    email: "admin@spit.edu",
    name: "Rohit Basak",
    password: "Institute@123",
    role: "institute_admin",
    instituteId: institute._id
  });

  const alumni = await upsertTenantUser(TenantUser, {
    email: "aarav@spit.edu",
    name: "Aarav Shah",
    password: "Alumni@123",
    role: "alumni",
    instituteId: institute._id
  });

  const existingProfile = await AlumniProfile.findOne({ instituteId: institute._id, userId: alumni._id });

  if (!existingProfile) {
    await AlumniProfile.create({
      instituteId: institute._id,
      userId: alumni._id,
      batch: 2018,
      department: "Computer Engineering",
      company: "Open Systems Labs",
      designation: "Software Engineer",
      location: "Mumbai",
      bio: "Working on scalable alumni communities and internal platforms.",
      skills: ["React", "Node.js", "MongoDB"]
    });
  }

  console.log("Demo accounts are ready:");
  console.log(`Super admin: ${superAdmin.email} / Admin@123`);
  console.log(`Institution admin: ${instituteAdmin.email} / Institute@123`);
  console.log(`Alumni: ${alumni.email} / Alumni@123`);

  await mongoose.disconnect();
}

upsertDemoAccounts().catch(async (error) => {
  console.error("Failed to upsert demo accounts", error);
  await mongoose.disconnect();
  process.exit(1);
});
