import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.CENTRAL_MONGODB_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/alumni-network";

async function run() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    
    const admins = await mongoose.connection.db.collection('users').find({ role: 'institute_admin' }, { projection: { name: 1, email: 1, instituteId: 1 } }).toArray();
    console.log('Admins:', JSON.stringify(admins, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
