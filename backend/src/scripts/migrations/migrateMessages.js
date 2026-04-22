import mongoose from "mongoose";
import dotenv from "dotenv";
import { attachTenantDatabaseContext, getTenantModels } from "../../db/tenantConnectionManager.js";
import Institute from "../../models/Institute.js";

dotenv.config();

async function migrateTenantMessages(institute) {
  console.log(`Migrating messages for institute: ${institute.name} (${institute.subdomain})`);
  
  const tenantContext = {};
  await attachTenantDatabaseContext(tenantContext, institute);
  const { MentorshipRequest, Message } = getTenantModels(tenantContext);

  const mentorships = await MentorshipRequest.find({
    "messages.0": { $exists: true } // Only those with legacy messages
  });

  console.log(`Found ${mentorships.length} conversations with legacy messages.`);

  for (const mentorship of mentorships) {
    const legacyMessages = mentorship.messages;
    const newMessages = [];

    for (const legacy of legacyMessages) {
      newMessages.push({
        instituteId: institute._id,
        conversationId: mentorship._id,
        senderId: legacy.senderId,
        content: legacy.content,
        attachments: legacy.attachments || [],
        clientId: legacy.clientId,
        sentAt: legacy.sentAt || legacy.createdAt || new Date(),
        deliveredTo: legacy.deliveredTo || [],
        readBy: legacy.readBy || [],
        reactions: legacy.reactions || [],
        replyToMessageId: legacy.replyToMessageId,
        isSystemMessage: legacy.isSystemMessage || false
      });
    }

    if (newMessages.length > 0) {
      await Message.insertMany(newMessages);
      // Clear legacy messages to free up space in the MentorshipRequest document
      mentorship.messages = []; 
      await mentorship.save();
      console.log(`Migrated ${newMessages.length} messages for conversation ${mentorship._id}`);
    }
  }
}

async function runMigration() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to Central MongoDB");

    const institutes = await Institute.find({ status: "active" });
    console.log(`Starting migration for ${institutes.length} institutes...`);

    for (const institute of institutes) {
      await migrateTenantMessages(institute);
    }

    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
