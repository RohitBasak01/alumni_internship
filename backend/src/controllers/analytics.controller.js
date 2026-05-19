import { getTenantModels } from "../db/tenantConnectionManager.js";
import mongoose from "mongoose";

const DEFAULT_RANGE_DAYS = 30;

function parseDateRange(query) {
  const now = new Date();
  const requestedEnd = query.endDate ? new Date(query.endDate) : now;
  const endDate = Number.isNaN(requestedEnd.getTime()) ? now : requestedEnd;
  endDate.setHours(23, 59, 59, 999);

  const fallbackStart = new Date(endDate);
  fallbackStart.setDate(fallbackStart.getDate() - (DEFAULT_RANGE_DAYS - 1));
  fallbackStart.setHours(0, 0, 0, 0);

  const requestedStart = query.startDate ? new Date(query.startDate) : fallbackStart;
  const startDate = Number.isNaN(requestedStart.getTime()) ? fallbackStart : requestedStart;
  startDate.setHours(0, 0, 0, 0);

  if (startDate > endDate) {
    return parseDateRange({});
  }

  const duration = endDate.getTime() - startDate.getTime();
  const previousEndDate = new Date(startDate.getTime() - 1);
  const previousStartDate = new Date(previousEndDate.getTime() - duration);

  return {
    startDate,
    endDate,
    previousStartDate,
    previousEndDate
  };
}

function dateMatch(startDate, endDate) {
  return { createdAt: { $gte: startDate, $lte: endDate } };
}

function calculateDelta(current, previous) {
  if (!previous && !current) return 0;
  if (!previous) return 100;
  return Math.round(((current - previous) / previous) * 100);
}

function monthLabel(period) {
  return `${period.month}/${period.year}`;
}

export const getAdminAnalytics = async (req, res, next) => {
  try {
    const { 
      User, 
      AlumniProfile,
      Donation, 
      Campaign, 
      Event, 
      Job, 
      MentorshipSession,
      Message,
      ForumThread,
      ForumReply
    } = getTenantModels(req);

    const instituteId = req.tenant._id;
    const instituteObjectId = new mongoose.Types.ObjectId(instituteId);
    const {
      startDate,
      endDate,
      previousStartDate,
      previousEndDate
    } = parseDateRange(req.query);
    const currentRange = dateMatch(startDate, endDate);
    const previousRange = dateMatch(previousStartDate, previousEndDate);
    const baseMatch = { instituteId: instituteObjectId };

    const countWithDelta = async (Model, filter = {}) => {
      const [current, previous] = await Promise.all([
        Model.countDocuments({ ...filter, ...currentRange }),
        Model.countDocuments({ ...filter, ...previousRange })
      ]);
      return { value: current, delta: calculateDelta(current, previous) };
    };

    const sumDonations = async (range) => {
      const stats = await Donation.aggregate([
        { $match: { ...baseMatch, status: "success", ...range } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
            avgAmount: { $avg: "$amount" }
          }
        }
      ]);
      return stats[0] || { totalAmount: 0, count: 0, avgAmount: 0 };
    };

    const [
      totalAlumniCount,
      newAlumni,
      currentDonationStats,
      previousDonationStats,
      activeJobsMetric,
      totalSessionsMetric,
      activeUsersMetric,
      messageMetric,
      forumThreadsMetric,
      forumRepliesMetric,
      previousForumThreads,
      previousForumReplies
    ] = await Promise.all([
      User.countDocuments({ instituteId, role: "alumni" }),
      countWithDelta(User, { instituteId, role: "alumni" }),
      sumDonations(currentRange),
      sumDonations(previousRange),
      countWithDelta(Job, { instituteId, status: { $in: ["active", "published"] } }),
      countWithDelta(MentorshipSession, { instituteId }),
      User.countDocuments({
        instituteId,
        role: "alumni",
        isActive: true,
        updatedAt: { $gte: startDate, $lte: endDate }
      }).then(async (current) => {
        const previous = await User.countDocuments({
          instituteId,
          role: "alumni",
          isActive: true,
          updatedAt: { $gte: previousStartDate, $lte: previousEndDate }
        });
        return { value: current, delta: calculateDelta(current, previous) };
      }),
      countWithDelta(Message, { instituteId }),
      countWithDelta(ForumThread, { instituteId }),
      countWithDelta(ForumReply, { instituteId }),
      ForumThread.countDocuments({ instituteId, ...previousRange }),
      ForumReply.countDocuments({ instituteId, ...previousRange })
    ]);

    const eventAttendance = await Event.aggregate([
      { $match: { ...baseMatch, eventDate: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: null,
          registered: { $sum: { $size: { $ifNull: ["$registrations", []] } } },
          checkedIn: {
            $sum: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$registrations", []] },
                  as: "registration",
                  cond: { $ne: ["$$registration.checkedInAt", null] }
                }
              }
            }
          }
        }
      }
    ]);
    const attendanceSnapshot = eventAttendance[0] || { registered: 0, checkedIn: 0 };
    const attendanceRate = attendanceSnapshot.registered
      ? Math.round((attendanceSnapshot.checkedIn / attendanceSnapshot.registered) * 100)
      : 0;

    const donationTrends = await Donation.aggregate([
      { 
        $match: { 
          instituteId: instituteObjectId, 
          status: "success",
          createdAt: { $gte: startDate, $lte: endDate }
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          total: { $sum: "$amount" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const registrationTrends = await User.aggregate([
      { 
        $match: { 
          instituteId: instituteObjectId,
          role: "alumni",
          createdAt: { $gte: startDate, $lte: endDate }
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const alumniDistribution = await AlumniProfile.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            department: { $ifNull: ["$department", "Unspecified"] },
            batch: { $ifNull: ["$batch", "Unspecified"] }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

    const topCampaigns = await Campaign.find({ instituteId })
      .sort({ raisedAmount: -1 })
      .limit(5)
      .select("title raisedAmount goalAmount");

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalAlumni: totalAlumniCount,
          newAlumni: newAlumni.value,
          totalDonations: currentDonationStats.totalAmount || 0,
          donationCount: currentDonationStats.count || 0,
          avgDonation: currentDonationStats.avgAmount || 0,
          activeJobs: activeJobsMetric.value,
          totalSessions: totalSessionsMetric.value,
          activeUsers: activeUsersMetric.value,
          eventAttendanceRate: attendanceRate,
          messagesSent: messageMetric.value,
          forumEngagement: forumThreadsMetric.value + forumRepliesMetric.value
        },
        deltas: {
          totalAlumni: newAlumni.delta,
          totalDonations: calculateDelta(
            currentDonationStats.totalAmount || 0,
            previousDonationStats.totalAmount || 0
          ),
          activeJobs: activeJobsMetric.delta,
          totalSessions: totalSessionsMetric.delta,
          activeUsers: activeUsersMetric.delta,
          eventAttendanceRate: 0,
          messagesSent: messageMetric.delta,
          forumEngagement: calculateDelta(
            forumThreadsMetric.value + forumRepliesMetric.value,
            previousForumThreads + previousForumReplies
          )
        },
        trends: {
          donations: donationTrends.map(t => ({
            name: monthLabel(t._id),
            amount: t.total
          })),
          registrations: registrationTrends.map(t => ({
            name: monthLabel(t._id),
            count: t.count
          }))
        },
        distribution: alumniDistribution.map((item) => ({
          name: item._id.department || "Unspecified",
          batch: item._id.batch || "Unspecified",
          value: item.count
        })),
        range: {
          startDate,
          endDate,
          previousStartDate,
          previousEndDate
        },
        topCampaigns
      }
    });
  } catch (error) {
    next(error);
  }
};
