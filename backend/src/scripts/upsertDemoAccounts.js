import dotenv from "dotenv";
import mongoose from "mongoose";

import AlumniProfile from "../models/AlumniProfile.js";
import Institute from "../models/Institute.js";
import User from "../models/User.js";
import { hashPassword } from "../utils/auth.js";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/alumni-network";

async function ensureInstitute() {
  let institute = await Institute.findOne({ subdomain: "spit" });

  if (!institute) {
    institute = await Institute.create({
      name: "SPIT Demo Institute",
      subdomain: "spit",
      domain: "alumni.spit.ac.in",
      status: "active",
      subscriptionPlan: "pro",
      subscriptionStatus: "active",
      primaryContactName: "Rohit Basak",
      primaryContactEmail: "admin@spit.ac.in",
      primaryContactPhone: ""
    });
  } else if (institute.status !== "active") {
    institute.status = "active";
    institute.subscriptionStatus = "active";
    await institute.save();
  }

  return institute;
}

async function upsertUser({ email, name, password, role, instituteId = null }) {
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

async function ensureAlumniProfile({ instituteId, userId }) {
  const existingProfile = await AlumniProfile.findOne({ instituteId, userId });

  if (existingProfile) {
    return existingProfile;
  }

  return AlumniProfile.create({
    instituteId,
    userId,
    batch: 2018,
    department: "Computer Engineering",
    company: "Open Systems Labs",
    designation: "Software Engineer",
    location: "Mumbai",
    bio: "Working on scalable alumni communities and internal platforms.",
    skills: ["React", "Node.js", "MongoDB"]
  });
}

async function upsertDemoAccounts() {
  await mongoose.connect(MONGODB_URI);

  const institute = await ensureInstitute();

  const superAdmin = await upsertUser({
    email: "superadmin@alumninetwork.com",
    name: "Platform Super Admin",
    password: "Admin@123",
    role: "super_admin"
  });

  const instituteAdmin = await upsertUser({
    email: "admin@spit.ac.in",
    name: "Rohit Basak",
    password: "institution123",
    role: "institute_admin",
    instituteId: institute._id
  });

  const alumni = await upsertUser({
    email: "aarav@spit.edu",
    name: "Aarav Shah",
    password: "Alumni@123",
    role: "alumni",
    instituteId: institute._id
  });

  await ensureAlumniProfile({
    instituteId: institute._id,
    userId: alumni._id
  });

  console.log("Demo accounts are ready:");
  console.log(`Super admin: ${superAdmin.email} / Admin@123`);
  console.log(`Institution admin: ${instituteAdmin.email} / institution123`);
  console.log(`Alumni: ${alumni.email} / Alumni@123`);

  await mongoose.disconnect();
}

upsertDemoAccounts().catch(async (error) => {
  console.error("Failed to upsert demo accounts", error);
  await mongoose.disconnect();
  process.exit(1);
});
