/**
 * Cached data service for frequently accessed data
 * Provides caching layer on top of database operations
 */

import cache, { CacheKeys, invalidateCache } from "../utils/cache.js";

export class CachedDataService {
  /**
   * Get institute by ID with caching
   * @param {Model} InstituteModel - Mongoose Institute model
   * @param {string} instituteId - Institute ID
   * @returns {Promise<object|null>} Institute data or null
   */
  static async getInstituteById(InstituteModel, instituteId) {
    const cacheKey = CacheKeys.institute(instituteId);
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from database
    const institute = await InstituteModel.findById(instituteId);
    
    if (institute) {
      // Cache for 10 minutes
      cache.set(cacheKey, institute, 10 * 60 * 1000);
    }
    
    return institute;
  }
  
  /**
   * Get institute by subdomain with caching
   * @param {Model} InstituteModel - Mongoose Institute model
   * @param {string} subdomain - Institute subdomain
   * @returns {Promise<object|null>} Institute data or null
   */
  static async getInstituteBySubdomain(InstituteModel, subdomain) {
    const cacheKey = CacheKeys.instituteBySubdomain(subdomain);
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from database
    const institute = await InstituteModel.findOne({ subdomain });
    
    if (institute) {
      // Cache for 10 minutes
      cache.set(cacheKey, institute, 10 * 60 * 1000);
      // Also cache by ID
      cache.set(CacheKeys.institute(institute._id), institute, 10 * 60 * 1000);
    }
    
    return institute;
  }
  
  /**
   * Get user by ID with caching
   * @param {Model} UserModel - Mongoose User model
   * @param {string} userId - User ID
   * @returns {Promise<object|null>} User data or null
   */
  static async getUserById(UserModel, userId) {
    const cacheKey = CacheKeys.user(userId);
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from database
    const user = await UserModel.findById(userId);
    
    if (user) {
      // Cache for 5 minutes
      cache.set(cacheKey, user, 5 * 60 * 1000);
      // Also cache by email
      cache.set(CacheKeys.userByEmail(user.email), user, 5 * 60 * 1000);
    }
    
    return user;
  }
  
  /**
   * Get user by email with caching
   * @param {Model} UserModel - Mongoose User model
   * @param {string} email - User email
   * @returns {Promise<object|null>} User data or null
   */
  static async getUserByEmail(UserModel, email) {
    const normalizedEmail = email.toLowerCase();
    const cacheKey = CacheKeys.userByEmail(normalizedEmail);
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from database
    const user = await UserModel.findOne({ email: normalizedEmail });
    
    if (user) {
      // Cache for 5 minutes
      cache.set(cacheKey, user, 5 * 60 * 1000);
      // Also cache by ID
      cache.set(CacheKeys.user(user._id), user, 5 * 60 * 1000);
    }
    
    return user;
  }
  
  /**
   * Get alumni profile by user ID with caching
   * @param {Model} AlumniProfileModel - Mongoose AlumniProfile model
   * @param {string} userId - User ID
   * @returns {Promise<object|null>} Alumni profile or null
   */
  static async getAlumniProfileByUserId(AlumniProfileModel, userId) {
    const cacheKey = CacheKeys.alumniProfileByUserId(userId);
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from database
    const profile = await AlumniProfileModel.findOne({ userId });
    
    if (profile) {
      // Cache for 5 minutes
      cache.set(cacheKey, profile, 5 * 60 * 1000);
      // Also cache by profile ID
      cache.set(CacheKeys.alumniProfile(profile._id), profile, 5 * 60 * 1000);
    }
    
    return profile;
  }
  
  /**
   * Get feed data with caching
   * @param {object} tenantModels - Tenant models
   * @param {string} instituteId - Institute ID
   * @param {string} userId - User ID (optional, for personalized feed)
   * @returns {Promise<object>} Feed data
   */
  static async getFeed(tenantModels, instituteId, userId = null) {
    const { Announcement, Event, Job } = tenantModels;
    const cacheKey = CacheKeys.feed(instituteId, userId);
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from database
    const [announcements, events, jobs] = await Promise.all([
      Announcement.find({ instituteId }).sort({ createdAt: -1 }).limit(5),
      Event.find({ instituteId }).sort({ eventDate: 1 }).limit(5),
      Job.find({ 
        instituteId, 
        status: "published",
        ...(userId ? {} : { applicationDeadline: { $gt: new Date() } })
      }).sort({ createdAt: -1 }).limit(5)
    ]);
    
    const feedData = { announcements, events, jobs };
    
    // Cache for 2 minutes (feed updates frequently)
    cache.set(cacheKey, feedData, 2 * 60 * 1000);
    
    return feedData;
  }
  
  /**
   * Get events with caching
   * @param {Model} EventModel - Mongoose Event model
   * @param {string} instituteId - Institute ID
   * @param {object} filters - Event filters
   * @returns {Promise<Array>} Events
   */
  static async getEvents(EventModel, instituteId, filters = {}) {
    const filterString = JSON.stringify(filters);
    const cacheKey = CacheKeys.events(instituteId, filterString);
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Build query
    const query = { instituteId, ...filters };
    
    // Fetch from database
    const events = await EventModel.find(query)
      .populate("registrations.userId", "name email")
      .sort({ eventDate: 1 });
    
    // Cache for 5 minutes
    cache.set(cacheKey, events, 5 * 60 * 1000);
    
    return events;
  }
  
  /**
   * Get jobs with caching
   * @param {Model} JobModel - Mongoose Job model
   * @param {string} instituteId - Institute ID
   * @param {string} role - User role (determines which jobs to show)
   * @returns {Promise<Array>} Jobs
   */
  static async getJobs(JobModel, instituteId, role = "alumni") {
    const cacheKey = CacheKeys.jobs(instituteId, role);
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Build query based on role
    const query = { instituteId };
    
    if (role === "alumni") {
      query.status = "published";
      query.applicationDeadline = { $gt: new Date() };
    }
    // Institute admins can see all jobs
    
    // Fetch from database
    const jobs = await JobModel.find(query)
      .populate("postedBy", "name email")
      .sort({ createdAt: -1 });
    
    // Cache for 5 minutes
    cache.set(cacheKey, jobs, 5 * 60 * 1000);
    
    return jobs;
  }
  
  /**
   * Get mentorship conversations with caching
   * @param {Model} MentorshipRequestModel - Mongoose MentorshipRequest model
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Mentorship conversations
   */
  static async getMentorshipConversations(MentorshipRequestModel, userId) {
    const cacheKey = CacheKeys.mentorshipConversations(userId);
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from database
    const conversations = await MentorshipRequestModel.find({
      $or: [
        { requesterId: userId },
        { mentorId: userId },
        { memberIds: userId }
      ]
    }).sort({ updatedAt: -1 });
    
    // Cache for 1 minute (conversations update frequently)
    cache.set(cacheKey, conversations, 60 * 1000);
    
    return conversations;
  }
  
  /**
   * Get notifications with caching
   * @param {Model} NotificationModel - Mongoose Notification model
   * @param {string} userId - User ID
   * @param {boolean} unreadOnly - Whether to fetch only unread notifications
   * @returns {Promise<Array>} Notifications
   */
  static async getNotifications(NotificationModel, userId, unreadOnly = false) {
    const cacheKey = CacheKeys.notifications(userId, unreadOnly);
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Build query
    const query = { userId };
    if (unreadOnly) {
      query.isRead = false;
      query.dismissedAt = null;
    }
    
    // Fetch from database
    const notifications = await NotificationModel.find(query)
      .populate("actorUserId", "name email")
      .sort({ createdAt: -1 })
      .limit(50);
    
    // Cache for 30 seconds (notifications update frequently)
    cache.set(cacheKey, notifications, 30 * 1000);
    
    return notifications;
  }
  
  /**
   * Invalidate cache for a user
   * @param {string} userId - User ID
   */
  static invalidateUserCache(userId) {
    // Invalidate user-related cache
    cache.delete(CacheKeys.user(userId));
    
    // Invalidate user's notifications cache
    cache.delete(CacheKeys.notifications(userId, true));
    cache.delete(CacheKeys.notifications(userId, false));
    
    // Invalidate user's mentorship conversations cache
    cache.delete(CacheKeys.mentorshipConversations(userId));
    
    // Invalidate alumni profile cache
    cache.delete(CacheKeys.alumniProfileByUserId(userId));
  }
  
  /**
   * Invalidate cache for an institute
   * @param {string} instituteId - Institute ID
   */
  static invalidateInstituteCache(instituteId) {
    // Invalidate institute cache
    cache.delete(CacheKeys.institute(instituteId));
    
    // Invalidate feed cache for this institute
    invalidateCache(`feed:${instituteId}`);
    
    // Invalidate events cache for this institute
    invalidateCache(`events:${instituteId}`);
    
    // Invalidate jobs cache for this institute
    invalidateCache(`jobs:${instituteId}`);
  }
  
  /**
   * Invalidate all cache (use sparingly)
   */
  static invalidateAllCache() {
    cache.clear();
    console.log("[CachedDataService] All cache cleared");
  }
  
  /**
   * Get cache statistics
   * @returns {object} Cache statistics
   */
  static getCacheStats() {
    return cache.stats();
  }
}