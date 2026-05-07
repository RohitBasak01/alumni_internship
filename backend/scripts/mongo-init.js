// MongoDB initialization script for Docker Compose
// Creates initial database and collections

db = db.getSiblingDB('alumni-network');

// Create collections if they don't exist
const collections = [
  'users',
  'alumniprofiles',
  'alumniposts',
  'events',
  'jobs',
  'jobapplications',
  'mentorshiprequests',
  'businesslistings',
  'communitygroups',
  'galleryitems',
  'announcements',
  'notifications',
  'auditlogs',
  'institutes',
  'portalonboardingdrafts',
  'refreshtokens'
];

collections.forEach(colName => {
  if (!db.getCollectionNames().includes(colName)) {
    db.createCollection(colName);
    print(`Created collection: ${colName}`);
  }
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ instituteId: 1 });
db.users.createIndex({ role: 1 });

db.alumniprofiles.createIndex({ userId: 1 }, { unique: true });
db.alumniprofiles.createIndex({ instituteId: 1 });
db.alumniprofiles.createIndex({ graduationYear: 1 });
db.alumniprofiles.createIndex({ location: "2dsphere" });

db.alumniposts.createIndex({ authorId: 1 });
db.alumniposts.createIndex({ instituteId: 1 });
db.alumniposts.createIndex({ createdAt: -1 });

db.events.createIndex({ instituteId: 1 });
db.events.createIndex({ startDate: 1 });
db.events.createIndex({ endDate: 1 });

db.jobs.createIndex({ instituteId: 1 });
db.jobs.createIndex({ postedAt: -1 });
db.jobs.createIndex({ status: 1 });

db.mentorshiprequests.createIndex({ mentorId: 1 });
db.mentorshiprequests.createIndex({ menteeId: 1 });
db.mentorshiprequests.createIndex({ status: 1 });

print('MongoDB initialization completed successfully.');