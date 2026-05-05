import mongoose from "mongoose";
import Institute from "../src/models/Institute.js";
import { attachTenantDatabaseContext } from "../src/db/tenantConnectionManager.js";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/alumni-network");
  console.log("Connected to central DB");

  const institutes = await Institute.find({});
  console.log(`Found ${institutes.length} institutes`);

  for (const inst of institutes) {
    console.log(`Checking tenant: ${inst.subdomain || inst.name}`);
    const req = { tenant: inst };
    const models = await attachTenantDatabaseContext(req, inst);
    const groups = await models.CommunityGroup.find({});
    console.log(`- Groups:`, groups.map(g => `${g.name} (${g._id})`));
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
