# Query Optimization Guide

This document outlines query optimization patterns and best practices for the Alumni Portal backend.

## Indexing Strategy

### Already Implemented Indexes

1. **User Model**:
   - `instituteId` - For tenant isolation
   - `email` (unique) - For authentication lookups
   - `instituteId + role + isActive` - Compound index for admin queries
   - `resetPasswordTokenHash` - Sparse index for password reset
   - `inviteTokenHash` - Sparse index for invite validation

2. **AlumniProfile Model**:
   - `instituteId` - Tenant isolation
   - `userId` - For user-profile joins
   - `instituteId + registrationReviewStatus + createdAt` - Compound for admin review
   - `batch + department` - Sparse for alumni directory filtering
   - `country + state + city` - Sparse for location-based queries

3. **MentorshipRequest Model**:
   - `instituteId` - Tenant isolation
   - `requesterId + mentorId` - For participant lookups
   - `memberIds` - For group conversation membership
   - `status + updatedAt` - For filtering active conversations
   - `groupName + message` (text) - For search functionality

4. **Event Model**:
   - `instituteId` - Tenant isolation
   - `groupId` - For group-specific events
   - `eventDate` - For date-based sorting
   - `instituteId + eventDate` - Compound for tenant event listings
   - `registrations.userId` - For user registration lookups

5. **Job Model**:
   - `instituteId` - Tenant isolation
   - `applicationDeadline` - For expiration checks
   - `instituteId + status + createdAt` - Compound for job listings
   - `applicationDeadline + status` - For expiration automation
   - `postedBy` - For user job posting history

6. **Notification Model**:
   - `instituteId` - Tenant isolation
   - `userId` - For user notification lookups
   - `category` - For notification type filtering
   - `isRead` - For unread notification counts
   - `dismissedAt` - For notification cleanup

## Query Optimization Patterns

### 1. Use Projection to Limit Returned Fields

**Before:**

```javascript
const user = await User.findById(userId);
```

**After:**

```javascript
const user = await User.findById(userId).select("name email role");
```

### 2. Use Lean Queries for Read-Only Operations

**Before:**

```javascript
const events = await Event.find({ instituteId }).populate("registrations.userId");
```

**After:**

```javascript
const events = await Event.find({ instituteId })
  .populate("registrations.userId", "name email")
  .lean();
```

### 3. Batch Database Operations

**Before:**

```javascript
for (const id of userIds) {
  const user = await User.findById(id);
  users.push(user);
}
```

**After:**

```javascript
const users = await User.find({ _id: { $in: userIds } });
```

### 4. Use Aggregation for Complex Data Transformations

**Before:**

```javascript
const profiles = await AlumniProfile.find({ instituteId });
const counts = {
  pending: 0,
  approved: 0,
  rejected: 0
};
profiles.forEach((profile) => {
  counts[profile.registrationReviewStatus]++;
});
```

**After:**

```javascript
const counts = await AlumniProfile.aggregate([
  { $match: { instituteId } },
  {
    $group: {
      _id: "$registrationReviewStatus",
      count: { $sum: 1 }
    }
  }
]);
```

### 5. Implement Pagination for Large Datasets

**Before:**

```javascript
const allAlumni = await AlumniProfile.find({ instituteId });
```

**After:**

```javascript
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 20;
const skip = (page - 1) * limit;

const alumni = await AlumniProfile.find({ instituteId })
  .skip(skip)
  .limit(limit)
  .sort({ createdAt: -1 });

const total = await AlumniProfile.countDocuments({ instituteId });
```

## Common Performance Issues and Solutions

### Issue 1: N+1 Query Problem

**Problem:** Loading related data in a loop causes multiple database queries.

**Solution:** Use `$in` operator or populate with multiple references.

### Issue 2: Unnecessary Data Transfer

**Problem:** Fetching entire documents when only specific fields are needed.

**Solution:** Use projection (`select()`) to limit returned fields.

### Issue 3: Missing Indexes on Frequently Queried Fields

**Problem:** Slow queries on fields without indexes.

**Solution:** Analyze query patterns and add appropriate indexes.

### Issue 4: Large Result Sets Without Pagination

**Problem:** Loading thousands of records at once.

**Solution:** Implement pagination with `skip()` and `limit()`.

## Caching Strategy

### What to Cache:

1. **Institute data** - 10 minutes TTL
2. **User data** - 5 minutes TTL
3. **Feed data** - 2 minutes TTL
4. **Event listings** - 5 minutes TTL
5. **Job listings** - 5 minutes TTL
6. **Notifications** - 30 seconds TTL

### Cache Invalidation:

- User data: Invalidate on profile updates
- Institute data: Invalidate on institute updates
- Feed data: Invalidate on new posts/events/jobs
- Event data: Invalidate on event creation/updates
- Job data: Invalidate on job creation/updates

## Monitoring and Analysis

### Key Metrics to Monitor:

1. **Query execution time** - Use MongoDB profiler
2. **Index usage** - Check with `db.collection.getIndexes()`
3. **Cache hit rate** - Monitor cache effectiveness
4. **Memory usage** - Watch for memory leaks in caching

### Tools:

- MongoDB Compass for query analysis
- Application logging for slow queries
- Cache statistics endpoint (`GET /api/ops/cache-stats`)

## Example Optimized Queries

### Get Alumni with Pagination and Filters

```javascript
const query = { instituteId: req.tenant._id };

// Apply filters
if (req.query.batch) query.batch = parseInt(req.query.batch);
if (req.query.department) query.department = req.query.department;
if (req.query.status) query.registrationReviewStatus = req.query.status;

const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 20;
const skip = (page - 1) * limit;

const [alumni, total] = await Promise.all([
  AlumniProfile.find(query)
    .populate("userId", "name email")
    .select("batch department registrationReviewStatus createdAt")
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .lean(),
  AlumniProfile.countDocuments(query)
]);
```

### Get User Dashboard Data (Optimized)

```javascript
const [profile, notifications, conversations, events] = await Promise.all([
  CachedDataService.getAlumniProfileByUserId(AlumniProfile, userId),
  CachedDataService.getNotifications(Notification, userId, true),
  CachedDataService.getMentorshipConversations(MentorshipRequest, userId),
  CachedDataService.getEvents(Event, instituteId, {
    eventDate: { $gte: new Date() }
  })
]);
```

## Performance Testing

Run the performance test suite:

```bash
npm run test:performance
```

Key performance tests:

1. Database query response times
2. API endpoint latency under load
3. Cache effectiveness measurements
4. Concurrent user simulation
