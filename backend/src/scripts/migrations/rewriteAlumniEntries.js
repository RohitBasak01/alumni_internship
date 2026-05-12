import dotenv from "dotenv";
import mongoose from "mongoose";

import { attachTenantDatabaseContext, getTenantModels } from "../../db/tenantConnectionManager.js";
import Institute from "../../models/Institute.js";

dotenv.config({ override: true });

const CENTRAL_MONGODB_URI =
  process.env.CENTRAL_MONGODB_URI ||
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/alumni-network";

const SHOULD_DRY_RUN = process.argv.includes("--dry-run");

const COURSE_ALIASES = [
  {
    canonical: "B.Tech. - Bachelor of Technology",
    patterns: [/\bb\.?\s*tech\.?\b/i, /\bbtech\b/i, /bachelor of technology/i]
  },
  {
    canonical: "M.Tech. - Master of Technology",
    patterns: [/\bm\.?\s*tech\.?\b/i, /\bmtech\b/i, /master of technology/i]
  },
  {
    canonical: "MCA - Master of Computer Application",
    patterns: [/\bmca\b/i, /master of computer application/i, /master of computer applications/i]
  },
  {
    canonical: "Ph.D. - Doctor of Philosophy",
    patterns: [/\bph\.?\s*d\b/i, /\bphd\b/i, /doctor of philosophy/i]
  }
];

function clean(value) {
  return String(value || "").trim();
}

function normalizeForMatch(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function flattenDepartmentStreams(departmentStreams) {
  if (!departmentStreams || typeof departmentStreams !== "object" || Array.isArray(departmentStreams)) {
    return [];
  }

  return unique(Object.values(departmentStreams).flatMap((streams) => (Array.isArray(streams) ? streams : [])));
}

function findMatchingCandidate(text, candidates) {
  const normalizedText = normalizeForMatch(text);

  if (!normalizedText || !candidates.length) {
    return "";
  }

  const exactMatch = candidates.find((candidate) => normalizeForMatch(candidate) === normalizedText);
  if (exactMatch) {
    return exactMatch;
  }

  let bestMatch = "";
  let bestScore = 0;

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeForMatch(candidate);
    if (!normalizedCandidate) {
      continue;
    }

    if (normalizedText.includes(normalizedCandidate) && normalizedCandidate.length > bestScore) {
      bestMatch = candidate;
      bestScore = normalizedCandidate.length;
    }
  }

  return bestMatch;
}

function findAliasMatch(text) {
  const sourceText = String(text || "");

  for (const alias of COURSE_ALIASES) {
    if (alias.patterns.some((pattern) => pattern.test(sourceText))) {
      return alias.canonical;
    }
  }

  return "";
}

function buildDepartmentLookup(instituteDepartments) {
  const departments = unique((Array.isArray(instituteDepartments) ? instituteDepartments : []).map(clean));
  const aliasMatches = COURSE_ALIASES
    .map((alias) => departments.find((department) => normalizeForMatch(department) === normalizeForMatch(alias.canonical)) || "")
    .filter(Boolean);

  return unique([...departments, ...aliasMatches]);
}

function resolveDepartment(profile, institute, allStreams) {
  const departments = buildDepartmentLookup(institute.departments);
  const departmentStreams = institute.departmentStreams && typeof institute.departmentStreams === "object" ? institute.departmentStreams : {};
  const normalizedDepartment = clean(profile.department);
  const normalizedSection = clean(profile.section);
  const searchText = [profile.department, profile.section, profile.currentEducation, profile.lastClassAttended].map(clean).filter(Boolean).join(" ");

  let department = findMatchingCandidate(normalizedDepartment, departments);
  if (!department) {
    department = findMatchingCandidate(searchText, departments);
  }

  if (!department) {
    department = findAliasMatch(searchText);
  }

  let section = findMatchingCandidate(normalizedSection, allStreams);
  if (!section) {
    section = findMatchingCandidate(searchText, allStreams);
  }

  if (!department && section) {
    const departmentFromStream = Object.entries(departmentStreams).find(([, streams]) => {
      const list = Array.isArray(streams) ? streams : [];
      return list.some((stream) => normalizeForMatch(stream) === normalizeForMatch(section));
    });

    if (departmentFromStream) {
      department = clean(departmentFromStream[0]);
    }
  }

  if (!department && !section && departments.length === 1) {
    department = departments[0];
  }

  if (!department && departments.length > 0) {
    const aliasDepartment = findAliasMatch(searchText);
    if (aliasDepartment) {
      department = aliasDepartment;
    }
  }

  if (department && !section) {
    const departmentTokens = [department, findAliasMatch(department)].filter(Boolean);
    let residual = clean(normalizedDepartment || searchText);

    for (const token of departmentTokens) {
      const normalizedToken = normalizeForMatch(token);
      if (!normalizedToken) {
        continue;
      }

      residual = residual.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), " ");
      residual = residual.replace(new RegExp(normalizedToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), " ");
    }

    const derivedSection = findMatchingCandidate(residual, allStreams) || findAliasMatch(residual);
    if (derivedSection) {
      section = derivedSection;
    }
  }

  if (!department && section) {
    const matchingDepartments = Object.entries(departmentStreams).filter(([, streams]) => {
      const list = Array.isArray(streams) ? streams : [];
      return list.some((stream) => normalizeForMatch(stream) === normalizeForMatch(section));
    });

    if (matchingDepartments.length === 1) {
      department = clean(matchingDepartments[0][0]);
    }
  }

  if (!department && departments.length === 1 && (normalizedDepartment || normalizedSection || searchText)) {
    department = departments[0];
  }

  return {
    department: clean(department),
    section: clean(section)
  };
}

function buildUpdate(profile, institute, allStreams) {
  if (!profile || profile.isFaculty || institute.educationLevel === "k10" || institute.institutionType === "school") {
    return null;
  }

  const { department, section } = resolveDepartment(profile, institute, allStreams);
  const nextDepartment = department || clean(profile.department);
  const nextSection = section || clean(profile.section);

  if (nextDepartment === clean(profile.department) && nextSection === clean(profile.section)) {
    return null;
  }

  return {
    updateOne: {
      filter: { _id: profile._id },
      update: {
        $set: {
          department: nextDepartment,
          section: nextSection,
          updatedAt: new Date()
        }
      }
    }
  };
}

async function rewriteInstituteAlumni(institute) {
  const tenantContext = {};
  await attachTenantDatabaseContext(tenantContext, institute);
  const tenantModels = getTenantModels(tenantContext);
  const allStreams = unique([
    ...flattenDepartmentStreams(institute.departmentStreams),
    ...(Array.isArray(institute.streams) ? institute.streams.map(clean) : [])
  ]);

  const profiles = await tenantModels.AlumniProfile.find({ instituteId: institute._id }).lean();
  const updates = [];

  for (const profile of profiles) {
    const update = buildUpdate(profile, institute, allStreams);
    if (update) {
      updates.push(update);
    }
  }

  if (!SHOULD_DRY_RUN && updates.length > 0) {
    await tenantModels.AlumniProfile.bulkWrite(updates, { ordered: false });
  }

  if (tenantContext.tenantConnection && tenantContext.tenantConnection !== mongoose.connection) {
    await tenantContext.tenantConnection.close();
  }

  return {
    scanned: profiles.length,
    rewritten: updates.length,
    dryRun: SHOULD_DRY_RUN
  };
}

async function main() {
  await mongoose.connect(CENTRAL_MONGODB_URI, {
    serverSelectionTimeoutMS: 10000
  });

  const institutes = await Institute.find({}).sort({ createdAt: 1 });

  if (!institutes.length) {
    console.log("No institutes found. Nothing to rewrite.");
    await mongoose.disconnect();
    return;
  }

  let totalScanned = 0;
  let totalRewritten = 0;

  for (const institute of institutes) {
    const result = await rewriteInstituteAlumni(institute);
    totalScanned += result.scanned;
    totalRewritten += result.rewritten;
    console.log(
      `[${institute.subdomain}] ${result.dryRun ? "would rewrite" : "rewrote"} ${result.rewritten}/${result.scanned} alumni profiles`
    );
  }

  console.log(
    `${SHOULD_DRY_RUN ? "Dry run complete" : "Rewrite complete"}: ${totalRewritten}/${totalScanned} alumni profiles ${SHOULD_DRY_RUN ? "would be" : "were"} normalized`
  );

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Alumni rewrite migration failed", error);
  await mongoose.disconnect();
  process.exit(1);
});