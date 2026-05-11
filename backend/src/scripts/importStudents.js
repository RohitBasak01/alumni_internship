import path from "node:path";
import crypto from "node:crypto";
import dotenv from "dotenv";
import mongoose from "mongoose";
import xlsx from "xlsx";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import Institute from "../models/Institute.js";
import { attachTenantDatabaseContext, getTenantModels } from "../db/tenantConnectionManager.js";
import { hashPassword } from "../utils/auth.js";

const EXCEL_FILE_PATH = path.resolve(process.cwd(), "../FINAL FY STUDENTS LIST 25-26 (1).xlsx");

async function run() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    // Find the SPIT institute
    const institute = await Institute.findOne({ 
      $or: [
        { name: /SPIT/i },
        { name: /Sardar Patel/i },
        { subdomain: "spit" }
      ],
      status: "active" 
    });

    if (!institute) {
      console.log("Could not find an active institute matching SPIT. Here are the active institutes:");
      const institutes = await Institute.find({ status: "active" });
      console.log(institutes.map(i => ({ name: i.name, subdomain: i.subdomain })));
      process.exit(1);
    }

    console.log(`Found Institute: ${institute.name} (${institute.subdomain})`);

    // Attach tenant context
    const tenantContext = {};
    await attachTenantDatabaseContext(tenantContext, institute);
    const { User: TenantUser, AlumniProfile: TenantAlumniProfile } = getTenantModels(tenantContext);

    console.log(`Reading Excel file from ${EXCEL_FILE_PATH}...`);
    const workbook = xlsx.readFile(EXCEL_FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    console.log(`Found ${rows.length} rows in the Excel sheet.`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
      try {
        const firstName = String(row["First Name"] || "").trim();
        const lastName = String(row["Last Name"] || "").trim();
        const orgEmail = String(row["Organization Email"] || "").trim().toLowerCase();
        const personalEmail = String(row["Personal Email"] || "").trim().toLowerCase();
        const program = String(row["Program"] || "").trim();
        const mobileNumber = String(row["Mobile Number"] || "").trim();
        const gender = String(row["Gender"] || "").trim() || "prefer_not_to_disclose";
        
        let dateOfBirthStr = row["Date of Birth"];
        let dateOfBirth = null;
        if (dateOfBirthStr) {
          // Could be a string DD-MM-YYYY or an excel serial date
          if (typeof dateOfBirthStr === "number") {
             // Excel serial date to JS Date
             dateOfBirth = new Date((dateOfBirthStr - (25567 + 2)) * 86400 * 1000);
          } else {
             const parts = String(dateOfBirthStr).split("-");
             if (parts.length === 3) {
               dateOfBirth = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`);
             }
          }
        }
        if (!dateOfBirth || isNaN(dateOfBirth.getTime())) {
           dateOfBirth = new Date("2005-01-01T00:00:00Z"); // Fallback
        }

        // Academic Year is "2025-26", B.Tech is 4 years, so passing year 2029
        const academicYear = String(row["Academic Year"] || "");
        let batch = 2029; 
        if (academicYear.startsWith("2025")) {
           batch = 2029;
        }

        const emailToUse = orgEmail || personalEmail;

        if (!emailToUse || !firstName) {
          console.warn(`Skipping row due to missing email or first name: ${JSON.stringify(row)}`);
          skippedCount++;
          continue;
        }

        const existingUser = await TenantUser.findOne({ email: emailToUse });
        if (existingUser) {
          console.log(`User already exists: ${emailToUse}`);
          skippedCount++;
          continue;
        }

        // Create User
        const randomPassword = `Pending@${crypto.randomBytes(4).toString("hex")}`;
        const user = await TenantUser.create({
          instituteId: institute._id,
          name: `${firstName} ${lastName}`.trim(),
          email: emailToUse,
          passwordHash: await hashPassword(randomPassword),
          role: "alumni", // using alumni role for students in this context
          isActive: false, // inactive until they set password
          passwordSetupCompleted: false,
          inviteTokenHash: null,
          inviteTokenExpiresAt: null,
          oauthAccounts: []
        });

        // Create AlumniProfile
        await TenantAlumniProfile.create({
          instituteId: institute._id,
          userId: user._id,
          gender: gender,
          dateOfBirth: dateOfBirth,
          mobileNumber: mobileNumber,
          authProvider: "email",
          batch: batch,
          department: program,
          leavingYear: batch,
          lastClassAttended: program,
          section: "",
          currentEducation: "B.Tech",
          currentInstitution: institute.name,
          occupation: "Student",
          company: "",
          designation: "",
          country: "India", // Defaulting based on context
          city: "Mumbai",   // Defaulting based on context
          location: "Mumbai, India",
          bio: "",
          skills: [],
          registrationReviewStatus: "approved", // auto approved since imported by admin
          registrationReviewedAt: new Date()
        });

        createdCount++;
        if (createdCount % 10 === 0) {
          console.log(`Created ${createdCount} users...`);
        }
      } catch (err) {
        console.error(`Error importing row:`, err);
        skippedCount++;
      }
    }

    console.log(`\nImport complete!`);
    console.log(`Created: ${createdCount}`);
    console.log(`Skipped/Failed: ${skippedCount}`);

    process.exit(0);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

run();
