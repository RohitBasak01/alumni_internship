import { getTenantModels } from "../db/tenantConnectionManager.js";
import { isObjectIdLike } from "../utils/validation.js";
// --- Mentor Profiles ---

export const optInAsMentor = async (req, res, next) => {
  try {
    const { MentorProfile } = getTenantModels(req);
    const { expertise, bio, availabilityText, maxSessionsPerMonth } = req.body;

    let profile = await MentorProfile.findOne({ userId: req.user._id, instituteId: req.tenant._id });

    if (profile) {
      profile.expertise = expertise || profile.expertise;
      profile.bio = bio || profile.bio;
      profile.availabilityText = availabilityText || profile.availabilityText;
      if (maxSessionsPerMonth) profile.maxSessionsPerMonth = maxSessionsPerMonth;
      profile.isActive = true;
      await profile.save();
    } else {
      profile = new MentorProfile({
        instituteId: req.tenant._id,
        userId: req.user._id,
        expertise,
        bio,
        availabilityText,
        maxSessionsPerMonth: maxSessionsPerMonth || 4,
      });
      await profile.save();
    }

    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

export const getMentors = async (req, res, next) => {
  try {
    const { MentorProfile } = getTenantModels(req);
    const { expertise } = req.query;

    const filter = { instituteId: req.tenant._id, isActive: true };
    if (expertise) {
      filter.expertise = { $in: [expertise] };
    }

    const mentors = await MentorProfile.find(filter)
      .populate("userId", "name profilePicture headline location")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: mentors });
  } catch (error) {
    next(error);
  }
};

export const getMyMentorProfile = async (req, res, next) => {
  try {
    const { MentorProfile } = getTenantModels(req);
    const profile = await MentorProfile.findOne({ userId: req.user._id, instituteId: req.tenant._id });
    
    if (!profile) {
      return res.status(404).json({ success: false, message: "Not opted in as mentor" });
    }

    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

export const toggleMentorStatus = async (req, res, next) => {
  try {
    const { MentorProfile } = getTenantModels(req);
    const profile = await MentorProfile.findOne({ userId: req.user._id, instituteId: req.tenant._id });
    
    if (!profile) {
      return res.status(404).json({ success: false, message: "Mentor profile not found" });
    }

    profile.isActive = !profile.isActive;
    await profile.save();

    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};


// --- Mentorship Sessions ---

export const getMySessions = async (req, res, next) => {
  try {
    const { MentorshipSession } = getTenantModels(req);
    const userId = req.user._id;

    // Fetch sessions where user is mentor OR mentee
    const sessions = await MentorshipSession.find({
      instituteId: req.tenant._id,
      $or: [{ mentorId: userId }, { menteeId: userId }]
    })
      .populate("mentorId", "name profilePicture")
      .populate("menteeId", "name profilePicture")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
};

export const requestSession = async (req, res, next) => {
  try {
    const { MentorshipSession, MentorProfile } = getTenantModels(req);
    const { mentorId, proposedTimes, agenda } = req.body;

    if (!isObjectIdLike(mentorId)) {
      return res.status(400).json({ success: false, message: "Invalid mentor ID" });
    }

    if (String(mentorId) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: "Cannot request session with yourself" });
    }

    const mentorProfile = await MentorProfile.findOne({ userId: mentorId, isActive: true });
    if (!mentorProfile) {
      return res.status(404).json({ success: false, message: "Mentor is not active or found" });
    }

    const session = new MentorshipSession({
      instituteId: req.tenant._id,
      mentorId,
      menteeId: req.user._id,
      proposedTimes,
      agenda,
    });

    await session.save();

    res.status(201).json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

export const respondToSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, confirmedTime, meetingLink, generateJitsi } = req.body;

    if (!isObjectIdLike(id)) {
      return res.status(400).json({ success: false, message: "Invalid session ID" });
    }

    const { MentorshipSession } = getTenantModels(req);
    const session = await MentorshipSession.findOne({ _id: id, instituteId: req.tenant._id });

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    if (String(session.mentorId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Only the mentor can respond" });
    }

    if (action === "accept") {
      session.status = "confirmed";
      session.confirmedTime = confirmedTime;
      
      if (generateJitsi) {
        session.meetingLink = `https://meet.jit.si/alumni-network-${session._id}`;
      } else {
        session.meetingLink = meetingLink;
      }
    } else if (action === "decline") {
      session.status = "declined";
    } else {
      return res.status(400).json({ success: false, message: "Invalid action" });
    }

    await session.save();

    res.status(200).json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

export const cancelSession = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isObjectIdLike(id)) {
      return res.status(400).json({ success: false, message: "Invalid session ID" });
    }

    const { MentorshipSession } = getTenantModels(req);
    const session = await MentorshipSession.findOne({ _id: id, instituteId: req.tenant._id });

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    if (String(session.mentorId) !== String(req.user._id) && String(session.menteeId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    session.status = "cancelled";
    await session.save();

    res.status(200).json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};
