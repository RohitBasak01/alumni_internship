import mongoose from "mongoose";

import AlumniProfile from "../models/AlumniProfile.js";
import Announcement from "../models/Announcement.js";
import Event from "../models/Event.js";
import Job from "../models/Job.js";
import JobApplication from "../models/JobApplication.js";
import MentorshipRequest from "../models/MentorshipRequest.js";
import User from "../models/User.js";

const TENANT_CONNECTION_CACHE = new Map();
const TENANT_MODEL_BUILDERS = {
  User,
  AlumniProfile,
  Announcement,
  Event,
  Job,
  JobApplication,
  MentorshipRequest
};

function sanitizeDatabaseName(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildTenantDatabaseName(institute) {
  const explicitName = sanitizeDatabaseName(institute?.tenantDatabaseName);

  if (explicitName) {
    return explicitName;
  }

  const slug = sanitizeDatabaseName(institute?.subdomain || institute?.name || institute?._id);
  return `alumninet-tenant-${slug}`;
}

function buildTenantMongoUri(institute) {
  if (institute?.tenantDatabaseUri) {
    return institute.tenantDatabaseUri;
  }

  const baseUri =
    process.env.TENANT_MONGODB_BASE_URI ||
    process.env.CENTRAL_MONGODB_URI ||
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/alumni-network";

  const databaseName = buildTenantDatabaseName(institute);

  if (baseUri.startsWith("mongodb+srv://")) {
    const [prefix, query = ""] = baseUri.split("?");
    const prefixWithoutDb = prefix.replace(/\/([^/?]+)?$/, "");
    return `${prefixWithoutDb}/${databaseName}${query ? `?${query}` : ""}`;
  }

  const [prefix, query = ""] = baseUri.split("?");
  const prefixWithoutDb = prefix.replace(/\/([^/?]+)?$/, "");
  return `${prefixWithoutDb}/${databaseName}${query ? `?${query}` : ""}`;
}

function registerTenantModels(connection) {
  const models = {};

  for (const [name, baseModel] of Object.entries(TENANT_MODEL_BUILDERS)) {
    models[name] = connection.models[name] || connection.model(name, baseModel.schema);
  }

  return models;
}

export function buildTenantPersistenceConfig(institute) {
  const isolationMode = institute?.dataIsolationMode || "shared";
  const databaseName = buildTenantDatabaseName(institute);
  const databaseUri = buildTenantMongoUri(institute);

  return {
    isolationMode,
    databaseName,
    databaseUri
  };
}

export async function attachTenantDatabaseContext(req, institute) {
  if (!institute) {
    req.tenantConnection = null;
    req.tenantModels = null;
    return;
  }

  const config = buildTenantPersistenceConfig(institute);
  req.tenantPersistence = config;

  if (config.isolationMode === "shared") {
    req.tenantConnection = mongoose.connection;
    req.tenantModels = registerTenantModels(mongoose.connection);
    return;
  }

  const cacheKey = `${institute._id}:${config.databaseUri}`;
  let cached = TENANT_CONNECTION_CACHE.get(cacheKey);

  if (!cached) {
    const connection = await mongoose.createConnection(config.databaseUri, {
      serverSelectionTimeoutMS: 10000
    }).asPromise();

    cached = {
      connection,
      models: registerTenantModels(connection),
      config
    };

    TENANT_CONNECTION_CACHE.set(cacheKey, cached);
  }

  req.tenantConnection = cached.connection;
  req.tenantModels = cached.models;
}

export function getTenantModels(req) {
  return req.tenantModels || registerTenantModels(mongoose.connection);
}
