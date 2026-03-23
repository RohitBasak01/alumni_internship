import dotenv from "dotenv";
import mongoose from "mongoose";

import { attachTenantDatabaseContext, getTenantModels } from "../db/tenantConnectionManager.js";
import AlumniProfile from "../models/AlumniProfile.js";
import Announcement from "../models/Announcement.js";
import Event from "../models/Event.js";
import Institute from "../models/Institute.js";
import Job from "../models/Job.js";
import JobApplication from "../models/JobApplication.js";
import MentorshipRequest from "../models/MentorshipRequest.js";
import User from "../models/User.js";

dotenv.config();

const CENTRAL_MONGODB_URI =
  process.env.CENTRAL_MONGODB_URI ||
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/alumni-network";

const SHOULD_CLEANUP_SHARED = process.argv.includes("--cleanup-shared");

function toPlainReplacement(document) {
  const plainObject = document.toObject({ depopulate: true });
  delete plainObject.__v;
  return plainObject;
}

async function upsertCollection(TargetModel, documents) {
  if (!documents.length) {
    return 0;
  }

  await TargetModel.bulkWrite(
    documents.map((document) => ({
      replaceOne: {
        filter: { _id: document._id },
        replacement: toPlainReplacement(document),
        upsert: true
      }
    }))
  );

  return documents.length;
}

async function migrateInstitute(institute) {
  const tenantContext = {};
  await attachTenantDatabaseContext(tenantContext, institute);
  const tenantModels = getTenantModels(tenantContext);
  const instituteId = institute._id;

  const [users, alumniProfiles, announcements, events, jobs, mentorshipRequests] = await Promise.all([
    User.find({ instituteId, role: { $in: ["institute_admin", "alumni"] } }),
    AlumniProfile.find({ instituteId }),
    Announcement.find({ instituteId }),
    Event.find({ instituteId }),
    Job.find({ instituteId }),
    MentorshipRequest.find({ instituteId })
  ]);

  const jobIds = jobs.map((job) => job._id);
  const jobApplications = jobIds.length ? await JobApplication.find({ jobId: { $in: jobIds } }) : [];

  const migratedCounts = {
    users: await upsertCollection(tenantModels.User, users),
    alumniProfiles: await upsertCollection(tenantModels.AlumniProfile, alumniProfiles),
    announcements: await upsertCollection(tenantModels.Announcement, announcements),
    events: await upsertCollection(tenantModels.Event, events),
    jobs: await upsertCollection(tenantModels.Job, jobs),
    jobApplications: await upsertCollection(tenantModels.JobApplication, jobApplications),
    mentorshipRequests: await upsertCollection(tenantModels.MentorshipRequest, mentorshipRequests)
  };

  if (SHOULD_CLEANUP_SHARED) {
    await Promise.all([
      User.deleteMany({ instituteId, role: { $in: ["institute_admin", "alumni"] } }),
      AlumniProfile.deleteMany({ instituteId }),
      Announcement.deleteMany({ instituteId }),
      Event.deleteMany({ instituteId }),
      JobApplication.deleteMany({ jobId: { $in: jobIds } }),
      Job.deleteMany({ instituteId }),
      MentorshipRequest.deleteMany({ instituteId })
    ]);
  }

  return migratedCounts;
}

async function main() {
  await mongoose.connect(CENTRAL_MONGODB_URI, {
    serverSelectionTimeoutMS: 10000
  });

  const institutes = await Institute.find({ dataIsolationMode: "dedicated" }).sort({ createdAt: 1 });

  if (!institutes.length) {
    console.log("No dedicated institutes found. Nothing to migrate.");
    await mongoose.disconnect();
    return;
  }

  for (const institute of institutes) {
    const counts = await migrateInstitute(institute);
    console.log(`[${institute.subdomain}] migrated`, counts);
  }

  if (!SHOULD_CLEANUP_SHARED) {
    console.log("Shared central copies were preserved. Re-run with --cleanup-shared after verification if you want to remove them.");
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Dedicated tenant migration failed", error);
  await mongoose.disconnect();
  process.exit(1);
});
