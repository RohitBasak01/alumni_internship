import mongoose from "mongoose";
import dotenv from "dotenv";
import { getTenantModels } from "../../db/tenantConnectionManager.js";
import Institute from "../../models/Institute.js";
import User from "../../models/User.js";
import RefreshToken from "../../models/RefreshToken.js";

dotenv.config();

async function addIndexesToModel(model, indexes, modelName) {
  try {
    console.log(`Adding ${indexes.length} indexes to ${modelName}...`);
    
    for (const index of indexes) {
      const indexName = await model.collection.createIndex(index.keys, index.options);
      console.log(`  ✓ Created index: ${indexName}`);
    }
    
    console.log(`✅ ${modelName} indexes added successfully\n`);
  } catch (error) {
    console.error(`❌ Error adding indexes to ${modelName}:`, error.message);
  }
}

async function addPerformanceIndexes() {
  console.log("Starting performance index migration...\n");
  
  // Connect to main database
  const mainDbUri = process.env.MONGODB_URI || "mongodb://localhost:27017/alumni_portal";
  await mongoose.connect(mainDbUri);
  console.log("Connected to main database");
  
  // 1. User model indexes
  await addIndexesToModel(User, [
    // Compound index for institute admin queries
    {
      keys: { instituteId: 1, role: 1, isActive: 1 },
      options: { name: "institute_role_active" }
    },
    // Index for password reset tokens
    {
      keys: { resetPasswordTokenHash: 1 },
      options: { 
        name: "reset_password_token",
        sparse: true,
        partialFilterExpression: { resetPasswordTokenHash: { $exists: true } }
      }
    },
    // Index for invite tokens
    {
      keys: { inviteTokenHash: 1 },
      options: { 
        name: "invite_token",
        sparse: true,
        partialFilterExpression: { inviteTokenHash: { $exists: true } }
      }
    }
  ], "User");
  
  // 2. Institute model indexes
  await addIndexesToModel(Institute, [
    // Compound index for subdomain/domain lookups
    {
      keys: { subdomain: 1, domain: 1 },
      options: { name: "subdomain_domain", unique: true }
    },
    // Index for status filtering
    {
      keys: { status: 1, createdAt: -1 },
      options: { name: "status_created" }
    }
  ], "Institute");
  
  // 3. RefreshToken model already has TTL index
  
  // Now we need to add indexes to tenant-specific models
  // We'll need to iterate through all institutes and their connections
  console.log("Adding indexes to tenant-specific models...");
  
  const institutes = await Institute.find({ status: "active" });
  
  for (const institute of institutes) {
    console.log(`\nProcessing institute: ${institute.name} (${institute._id})`);
    
    try {
      // Get tenant models
      const tenantModels = await getTenantModels({ tenant: institute });
      
      // AlumniProfile indexes
      await addIndexesToModel(tenantModels.AlumniProfile, [
        // User ID index for quick lookups
        {
          keys: { userId: 1 },
          options: { name: "user_id" }
        },
        // Compound index for admin review queries
        {
          keys: { instituteId: 1, registrationReviewStatus: 1, createdAt: -1 },
          options: { name: "institute_review_status_created" }
        },
        // Index for batch/department queries
        {
          keys: { batch: 1, department: 1 },
          options: { 
            name: "batch_department",
            sparse: true,
            partialFilterExpression: { batch: { $exists: true } }
          }
        },
        // Index for location-based queries
        {
          keys: { country: 1, state: 1, city: 1 },
          options: { 
            name: "location",
            sparse: true 
          }
        }
      ], "AlumniProfile");
      
      // MentorshipRequest indexes
      await addIndexesToModel(tenantModels.MentorshipRequest, [
        // Participant lookup indexes
        {
          keys: { requesterId: 1, mentorId: 1 },
          options: { 
            name: "participants",
            sparse: true 
          }
        },
        // Member IDs index for group conversations
        {
          keys: { memberIds: 1 },
          options: { 
            name: "member_ids",
            sparse: true 
          }
        },
        // Status and date for filtering
        {
          keys: { status: 1, updatedAt: -1 },
          options: { name: "status_updated" }
        },
        // Text search index for conversation content
        {
          keys: { groupName: "text", message: "text" },
          options: {
            name: "conversation_search",
            weights: {
              groupName: 10,
              message: 5
            }
          }
        }
      ], "MentorshipRequest");
      
      // Event indexes
      await addIndexesToModel(tenantModels.Event, [
        // Date-based queries
        {
          keys: { eventDate: 1 },
          options: { name: "event_date" }
        },
        // Compound index for institute events with date
        {
          keys: { instituteId: 1, eventDate: -1 },
          options: { name: "institute_event_date" }
        },
        // Registration user lookup
        {
          keys: { "registrations.userId": 1 },
          options: { 
            name: "registration_user",
            sparse: true 
          }
        }
      ], "Event");
      
      // Job indexes
      await addIndexesToModel(tenantModels.Job, [
        // Status filtering for alumni view
        {
          keys: { instituteId: 1, status: 1, createdAt: -1 },
          options: { name: "institute_status_created" }
        },
        // Application deadline for expiration checks
        {
          keys: { applicationDeadline: 1, status: 1 },
          options: { name: "deadline_status" }
        },
        // Posted by user
        {
          keys: { postedBy: 1 },
          options: { name: "posted_by" }
        }
      ], "Job");
      
      // AlumniPost indexes
      await addIndexesToModel(tenantModels.AlumniPost, [
        // User posts
        {
          keys: { userId: 1, createdAt: -1 },
          options: { name: "user_posts" }
        },
        // Comments user lookup
        {
          keys: { "comments.userId": 1 },
          options: { 
            name: "comment_user",
            sparse: true 
          }
        }
      ], "AlumniPost");
      
      console.log(`✅ Institute ${institute.name} indexes completed`);
      
    } catch (error) {
      console.error(`❌ Error processing institute ${institute.name}:`, error.message);
    }
  }
  
  console.log("\n🎉 Performance index migration completed!");
  await mongoose.disconnect();
  process.exit(0);
}

// Run migration
addPerformanceIndexes().catch(async (error) => {
  console.error("Migration failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});