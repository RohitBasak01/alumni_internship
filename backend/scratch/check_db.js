import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.CENTRAL_MONGODB_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/alumni-network";

async function run() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    
    const institutes = await mongoose.connection.db.collection('institutes').find({}, { projection: { name: 1, subdomain: 1, domain: 1 } }).toArray();
    console.log('Institutions:', JSON.stringify(institutes, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
