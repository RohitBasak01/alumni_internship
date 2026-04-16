import mongoose from "mongoose";

import AlumniProfile from "../models/AlumniProfile.js";
import AlumniPost from "../models/AlumniPost.js";
import Announcement from "../models/Announcement.js";
import BusinessListing from "../models/BusinessListing.js";
import CommunityGroup from "../models/CommunityGroup.js";
import Event from "../models/Event.js";
import GalleryItem from "../models/GalleryItem.js";
import Job from "../models/Job.js";
import JobApplication from "../models/JobApplication.js";
import MentorshipRequest from "../models/MentorshipRequest.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

const TENANT_CONNECTION_CACHE = new Map();

const TENANT_MODEL_BUILDERS = {
  User,
  AlumniProfile,
  AlumniPost,
  Announcement,
  BusinessListing,
  CommunityGroup,
  Event,
  GalleryItem,
  Job,
  JobApplication,
  MentorshipRequest,
  Notification
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

  const slug = sanitizeDatabaseName(institute?.subdomain || institute?.name || institute?._id || "tenant");
  return `alumni-${slug}`;
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
  const isolationMode = institute?.dataIsolationMode === "dedicated" ? "dedicated" : "shared";
  const databaseName = buildTenantDatabaseName(institute);
  const databaseUri = buildTenantMongoUri(institute);

  return {
    isolationMode,
    databaseName,
    databaseUri
  };
}

export async function attachTenantDatabaseContext(req, institute) {
  if (!req) {
    return null;
  }

  if (!institute) {
    req.tenantConnection = mongoose.connection;
    req.tenantModels = registerTenantModels(mongoose.connection);
    req.tenantPersistence = {
      isolationMode: "shared",
      databaseName: mongoose.connection?.name || null,
      databaseUri: mongoose.connection?.client?.s?.url || null
    };
    return req.tenantModels;
  }

  const config = buildTenantPersistenceConfig(institute);
  req.tenantPersistence = config;

  if (config.isolationMode === "shared") {
    req.tenantConnection = mongoose.connection;
    req.tenantModels = registerTenantModels(mongoose.connection);
    return req.tenantModels;
  }

  const cacheKey = `${institute._id}:${config.databaseUri}`;
  let cached = TENANT_CONNECTION_CACHE.get(cacheKey);

  if (!cached) {
    const connection = await mongoose
      .createConnection(config.databaseUri, {
        serverSelectionTimeoutMS: 10000
      })
      .asPromise();

    cached = {
      connection,
      models: registerTenantModels(connection),
      config
    };

    TENANT_CONNECTION_CACHE.set(cacheKey, cached);
  }

  req.tenantConnection = cached.connection;
  req.tenantModels = cached.models;
  return req.tenantModels;
}

export function getTenantModels(req) {
  if (req?.tenantModels) {
    return req.tenantModels;
  }

  return registerTenantModels(mongoose.connection);
}

