import mongoose from "mongoose";
import dotenv from "dotenv";
import CommunityGroup from "../src/models/CommunityGroup.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/alumni-network");
  console.log("Connected to central DB:", mongoose.connection.name);

  const groups = await CommunityGroup.find({});
  console.log(`Found ${groups.length} groups in CENTRAL DB`);
  console.log(`- Groups:`, groups.map(g => `${g.name} (${g._id})`));

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
