import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  const uri = process.env.MONGODB_URI;
  console.log("Connecting to:", uri);
  
  // Connect to alumni-spit explicitly
  const spitUri = uri.replace("/alumni-network", "/alumni-spit");
  const conn = await mongoose.createConnection(spitUri).asPromise();
  console.log("Connected to alumni-spit");

  const groups = await conn.model("CommunityGroup", new mongoose.Schema({}, { strict: false, collection: "communitygroups" })).find({});
  console.log(`Found ${groups.length} groups in alumni-spit`);
  console.log(`- Groups:`, groups.map(g => `${g.name} (${g._id})`));

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
