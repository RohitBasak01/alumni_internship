import { getTenantModels } from "../db/tenantConnectionManager.js";
import mongoose from "mongoose";

export const getAdminAnalytics = async (req, res, next) => {
  try {
    const { 
      User, 
      Donation, 
      Campaign, 
      Event, 
      Job, 
      MentorshipSession 
    } = getTenantModels(req);

    const instituteId = req.tenant._id;

    // 1. Total Alumni Count
    const totalAlumni = await User.countDocuments({ 
      instituteId, 
      role: "alumni" 
    });

    // 2. Donation Stats
    const donationStats = await Donation.aggregate([
      { $match: { instituteId: new mongoose.Types.ObjectId(instituteId), status: "success" } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
          avgAmount: { $avg: "$amount" }
        }
      }
    ]);

    // 3. Donation Trends (Last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const donationTrends = await Donation.aggregate([
      { 
        $match: { 
          instituteId: new mongoose.Types.ObjectId(instituteId), 
          status: "success",
          createdAt: { $gte: sixMonthsAgo }
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

    // 4. Registration Trends (Last 6 months)
    const registrationTrends = await User.aggregate([
      { 
        $match: { 
          instituteId: new mongoose.Types.ObjectId(instituteId),
          role: "alumni",
          createdAt: { $gte: sixMonthsAgo }
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

    // 5. Active Jobs
    const activeJobs = await Job.countDocuments({ 
      instituteId, 
      status: "active" 
    });

    // 6. Total Events
    const totalEvents = await Event.countDocuments({ 
      instituteId 
    });

    // 7. Mentorship Sessions
    const totalSessions = await MentorshipSession.countDocuments({ 
      instituteId 
    });

    // 8. Top Campaigns
    const topCampaigns = await Campaign.find({ instituteId })
      .sort({ raisedAmount: -1 })
      .limit(5)
      .select("title raisedAmount goalAmount");

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalAlumni,
          totalDonations: donationStats[0]?.totalAmount || 0,
          donationCount: donationStats[0]?.count || 0,
          avgDonation: donationStats[0]?.avgAmount || 0,
          activeJobs,
          totalEvents,
          totalSessions
        },
        trends: {
          donations: donationTrends.map(t => ({
            name: `${t._id.month}/${t._id.year}`,
            amount: t.total
          })),
          registrations: registrationTrends.map(t => ({
            name: `${t._id.month}/${t._id.year}`,
            count: t.count
          }))
        },
        topCampaigns
      }
    });
  } catch (error) {
    next(error);
  }
};
