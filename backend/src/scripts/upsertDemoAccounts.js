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

async function ensureInstitute({
  name,
  subdomain,
  domain,
  institutionType,
  educationLevel,
  subscriptionPlan,
  primaryContactName,
  primaryContactEmail
}) {
  let institute = await Institute.findOne({ subdomain });

  if (!institute) {
    const tenantConfig = buildTenantPersistenceConfig({
      name,
      subdomain,
      dataIsolationMode: process.env.DEFAULT_TENANT_ISOLATION_MODE || "shared"
    });

    institute = await Institute.create({
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
      primaryContactName,
      primaryContactEmail,
      primaryContactPhone: ""
    });
  } else {
    institute.name = name;
    institute.domain = domain;
    institute.institutionType = institutionType;
    institute.educationLevel = educationLevel;
    institute.communityLabels = {
      ...getDefaultCommunityLabels(institutionType),
      ...(institute.communityLabels || {})
    };
    institute.featureFlags = {
      ...getDefaultFeatureFlags(institutionType),
      ...(institute.featureFlags || {})
    };
    institute.branding = {
      ...getDefaultBranding(institutionType),
      ...(institute.branding || {})
    };
    institute.status = "active";
    institute.subscriptionPlan = subscriptionPlan;
    institute.subscriptionStatus = "active";
    institute.primaryContactName = primaryContactName;
    institute.primaryContactEmail = primaryContactEmail;
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

async function upsertCollegeProfiles(AlumniProfile, instituteId, users) {
  const profiles = [
    {
      email: "aarav@spit.edu",
      batch: 2018,
      department: "Computer Engineering",
      company: "Open Systems Labs",
      designation: "Software Engineer",
      location: "Mumbai",
      bio: "Working on scalable alumni communities and internal platforms.",
      skills: ["React", "Node.js", "MongoDB"]
    }
  ];

  for (const profile of profiles) {
    const user = users.find((item) => item.email === profile.email);
    if (!user) {
      continue;
    }

    const existingProfile = await AlumniProfile.findOne({ instituteId, userId: user._id });
    if (existingProfile) {
      continue;
    }

    await AlumniProfile.create({
      instituteId,
      userId: user._id,
      batch: profile.batch,
      department: profile.department,
      company: profile.company,
      designation: profile.designation,
      location: profile.location,
      bio: profile.bio,
      skills: profile.skills
    });
  }
}

async function upsertSchoolProfiles(AlumniProfile, instituteId, users) {
  const profiles = [
    {
      email: "maya@greenwoodschool.edu",
      leavingYear: 2020,
      lastClassAttended: "Class 12 Science",
      section: "Aster House",
      currentEducation: "B.Sc. Psychology",
      currentInstitution: "St. Xavier's College",
      occupation: "Undergraduate Student",
      location: "Goa",
      bio: "Looking to reconnect with teachers and classmates from Greenwood."
    },
    {
      email: "rohan@greenwoodschool.edu",
      leavingYear: 2019,
      lastClassAttended: "Class 10",
      section: "Blue House",
      currentEducation: "",
      currentInstitution: "Mehta Family Ventures",
      occupation: "Operations Associate",
      location: "Pune",
      bio: "Happy to support school events and community initiatives."
    }
  ];

  for (const profile of profiles) {
    const user = users.find((item) => item.email === profile.email);
    if (!user) {
      continue;
    }

    const existingProfile = await AlumniProfile.findOne({ instituteId, userId: user._id });
    if (existingProfile) {
      continue;
    }

    await AlumniProfile.create({
      instituteId,
      userId: user._id,
      batch: null,
      department: "",
      leavingYear: profile.leavingYear,
      lastClassAttended: profile.lastClassAttended,
      section: profile.section,
      currentEducation: profile.currentEducation,
      currentInstitution: profile.currentInstitution,
      occupation: profile.occupation,
      location: profile.location,
      bio: profile.bio,
      skills: [],
      allowMentorRequests: false
    });
  }
}

async function setupTenantAccounts(institute, accounts, upsertProfiles) {
  const tenantContext = {};
  await attachTenantDatabaseContext(tenantContext, institute);
  const { AlumniProfile, User: TenantUser } = getTenantModels(tenantContext);

  const users = [];
  for (const account of accounts) {
    users.push(
      await upsertTenantUser(TenantUser, {
        ...account,
        instituteId: institute._id
      })
    );
  }

  await upsertProfiles(AlumniProfile, institute._id, users);
  return users;
}

async function upsertDemoAccounts() {
  await mongoose.connect(CENTRAL_MONGODB_URI);

  const collegeInstitute = await ensureInstitute({
    name: "SPIT Demo Institute",
    subdomain: "spit",
    domain: "alumni.spit.ac.in",
    institutionType: "college",
    educationLevel: "higher_ed",
    subscriptionPlan: "pro",
    primaryContactName: "Rohit Basak",
    primaryContactEmail: "admin@spit.edu"
  });

  const schoolInstitute = await ensureInstitute({
    name: "Greenwood School Network",
    subdomain: "greenwood",
    domain: "alumni.greenwoodschool.edu",
    institutionType: "school",
    educationLevel: "k12",
    subscriptionPlan: "basic",
    primaryContactName: "Anita D'Souza",
    primaryContactEmail: "admin@greenwoodschool.edu"
  });

  const superAdmin = await upsertCentralUser({
    email: "superadmin@alumninetwork.com",
    name: "Platform Super Admin",
    password: "Admin@123",
    role: "super_admin"
  });

  const [collegeAdmin, collegeAlumni] = await setupTenantAccounts(
    collegeInstitute,
    [
      {
        email: "admin@spit.edu",
        name: "Rohit Basak",
        password: "Institute@123",
        role: "institute_admin"
      },
      {
        email: "aarav@spit.edu",
        name: "Aarav Shah",
        password: "Alumni@123",
        role: "alumni"
      }
    ],
    upsertCollegeProfiles
  );

  const [schoolAdmin, schoolMemberOne, schoolMemberTwo] = await setupTenantAccounts(
    schoolInstitute,
    [
      {
        email: "admin@greenwoodschool.edu",
        name: "Anita D'Souza",
        password: "School@123",
        role: "institute_admin"
      },
      {
        email: "maya@greenwoodschool.edu",
        name: "Maya Fernandes",
        password: "FormerStudent@123",
        role: "alumni"
      },
      {
        email: "rohan@greenwoodschool.edu",
        name: "Rohan Mehta",
        password: "FormerStudent@123",
        role: "alumni"
      }
    ],
    upsertSchoolProfiles
  );

  console.log("Demo accounts are ready:");
  console.log(`Super admin: ${superAdmin.email} / Admin@123`);
  console.log(`College admin: ${collegeAdmin.email} / Institute@123`);
  console.log(`College member: ${collegeAlumni.email} / Alumni@123`);
  console.log(`School admin: ${schoolAdmin.email} / School@123`);
  console.log(`School member: ${schoolMemberOne.email} / FormerStudent@123`);
  console.log(`School member: ${schoolMemberTwo.email} / FormerStudent@123`);

  await mongoose.disconnect();
}

upsertDemoAccounts().catch(async (error) => {
  console.error("Failed to upsert demo accounts", error);
  await mongoose.disconnect();
  process.exit(1);
});
