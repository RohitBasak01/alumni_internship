import Razorpay from "razorpay";
import crypto from "crypto";
import { getTenantModels } from "../db/tenantConnectionManager.js";
import { isObjectIdLike } from "../utils/validation.js";

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "mock_key",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "mock_secret",
});

export const getCampaigns = async (req, res, next) => {
  try {
    const { Campaign } = getTenantModels(req);
    const filter = { instituteId: req.tenant._id };

    if (req.user?.role === "alumni") {
      filter.status = "active";
    } else if (req.query.status) {
      filter.status = req.query.status;
    }

    const campaigns = await Campaign.find(filter).sort({ featured: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: campaigns,
    });
  } catch (error) {
    next(error);
  }
};

export const getCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectIdLike(id)) {
      return res.status(400).json({ success: false, message: "Invalid campaign ID" });
    }

    const { Campaign, Donation, User } = getTenantModels(req);

    const campaign = await Campaign.findOne({ _id: id, instituteId: req.tenant._id });
    if (!campaign) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    // Fetch successful donations for the donor wall
    const rawDonations = await Donation.find({
      campaignId: id,
      status: "succeeded",
    })
      .populate("userId", "name profilePicture")
      .sort({ createdAt: -1 })
      .limit(50);

    const donations = rawDonations.map((d) => {
      const doc = d.toObject();
      if (doc.isAnonymous) {
        doc.userId = null;
        doc.donorMessage = doc.donorMessage || "Anonymous donor";
      }
      return doc;
    });

    res.status(200).json({
      success: true,
      data: {
        campaign,
        recentDonors: donations,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createCampaign = async (req, res, next) => {
  try {
    const { Campaign } = getTenantModels(req);
    
    const campaign = new Campaign({
      ...req.body,
      instituteId: req.tenant._id,
      raisedAmount: 0,
    });

    await campaign.save();

    res.status(201).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectIdLike(id)) {
      return res.status(400).json({ success: false, message: "Invalid campaign ID" });
    }

    const { Campaign } = getTenantModels(req);

    const campaign = await Campaign.findOneAndUpdate(
      { _id: id, instituteId: req.tenant._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!campaign) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    res.status(200).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
};

export const initiateDonation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, currency = "INR", isAnonymous = false, donorMessage = "" } = req.body;

    if (!isObjectIdLike(id)) {
      return res.status(400).json({ success: false, message: "Invalid campaign ID" });
    }
    
    if (!amount || amount < 1) {
      return res.status(400).json({ success: false, message: "Invalid donation amount" });
    }

    const { Campaign, Donation } = getTenantModels(req);

    const campaign = await Campaign.findOne({ _id: id, instituteId: req.tenant._id });
    if (!campaign || campaign.status !== "active") {
      return res.status(404).json({ success: false, message: "Campaign is not active or not found" });
    }

    // Razorpay accepts amount in subunits (paise)
    const options = {
      amount: amount * 100,
      currency,
      receipt: `receipt_${Date.now()}_${req.user._id}`,
    };

    const order = await razorpayInstance.orders.create(options);

    const donation = new Donation({
      instituteId: req.tenant._id,
      campaignId: campaign._id,
      userId: req.user._id,
      amount,
      currency,
      razorpayOrderId: order.id,
      status: "pending",
      isAnonymous,
      donorMessage,
    });

    await donation.save();

    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyDonation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const { Campaign, Donation } = getTenantModels(req);

    const donation = await Donation.findOne({ razorpayOrderId: razorpay_order_id });
    if (!donation) {
      return res.status(404).json({ success: false, message: "Donation record not found" });
    }

    // Verify signature
    const text = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      donation.status = "failed";
      await donation.save();
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    donation.razorpayPaymentId = razorpay_payment_id;
    donation.razorpaySignature = razorpay_signature;
    donation.status = "succeeded";
    await donation.save();

    // Update campaign raised amount
    await Campaign.updateOne(
      { _id: donation.campaignId },
      { $inc: { raisedAmount: donation.amount } }
    );

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (error) {
    next(error);
  }
};
