import express from "express";

import Institute from "../models/Institute.js";
import { addMonths, getBillingPlan, verifyStripeWebhookSignature } from "../utils/billing.js";
import { logAuditEvent } from "../utils/audit.js";

const router = express.Router();

async function activateInstituteSubscription({ instituteId, subscriptionPlan, stripeCustomerId, stripeSubscriptionId, externalId }) {
  const institute = await Institute.findById(instituteId);

  if (!institute) {
    return null;
  }

  const plan = getBillingPlan(subscriptionPlan || institute.subscriptionPlan);
  const paidAt = new Date();

  institute.status = "active";
  institute.subscriptionPlan = subscriptionPlan || institute.subscriptionPlan;
  institute.subscriptionStatus = "active";
  institute.subscriptionRenewsAt = addMonths(paidAt, 1);
  institute.lastPaymentAt = paidAt;
  institute.billingProvider = "stripe";
  institute.stripeCustomerId = stripeCustomerId || institute.stripeCustomerId || "";
  institute.stripeSubscriptionId = stripeSubscriptionId || institute.stripeSubscriptionId || "";
  institute.billingHistory = [
    {
      plan: institute.subscriptionPlan,
      status: "active",
      amount: plan.monthlyAmount / 100,
      currency: plan.currency.toUpperCase(),
      paidAt,
      notes: "Stripe checkout completed",
      provider: "stripe",
      externalId: externalId || ""
    },
    ...(institute.billingHistory || [])
  ].slice(0, 25);

  await institute.save();
  return institute;
}

router.post("/stripe/webhook", async (req, res, next) => {
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    verifyStripeWebhookSignature(rawBody, req.headers["stripe-signature"]);

    const event = JSON.parse(rawBody.toString("utf8"));

    if (event.type === "checkout.session.completed") {
      const session = event.data?.object || {};
      const instituteId = session.metadata?.instituteId || session.client_reference_id;
      const subscriptionPlan = session.metadata?.subscriptionPlan;

      if (instituteId && subscriptionPlan) {
        const institute = await activateInstituteSubscription({
          instituteId,
          subscriptionPlan,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          externalId: session.id
        });

        if (institute) {
          await logAuditEvent(
            { user: null, ip: req.ip, headers: req.headers },
            {
              action: "billing.stripe_checkout_completed",
              targetType: "Institute",
              targetId: institute._id.toString(),
              instituteId: institute._id,
              metadata: {
                subscriptionPlan,
                stripeSessionId: session.id,
                stripeCustomerId: session.customer || ""
              }
            }
          );
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});

export default router;

