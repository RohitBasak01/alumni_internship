import crypto from "node:crypto";

export const billingPlans = {
  basic: {
    name: "Basic",
    monthlyAmount: 0,
    currency: "usd",
    stripePriceEnv: "STRIPE_PRICE_BASIC"
  },
  pro: {
    name: "Pro",
    monthlyAmount: 9900,
    currency: "usd",
    stripePriceEnv: "STRIPE_PRICE_PRO"
  },
  enterprise: {
    name: "Enterprise",
    monthlyAmount: 49900,
    currency: "usd",
    stripePriceEnv: "STRIPE_PRICE_ENTERPRISE"
  }
};

export function getBillingPlan(planId) {
  return billingPlans[planId] || billingPlans.basic;
}

export function getPlanMonthlyPrice(planId) {
  return getBillingPlan(planId).monthlyAmount / 100;
}

export function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function buildCheckoutRedirectUrl(path, instituteId) {
  const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173";
  const url = new URL(path, clientUrl);
  url.searchParams.set("instituteId", instituteId.toString());
  return url.toString();
}

export async function createStripeCheckoutSession({ institute, subscriptionPlan, successUrl, cancelUrl }) {
  const plan = getBillingPlan(subscriptionPlan);

  if (plan.monthlyAmount <= 0) {
    const error = new Error("Checkout is available for paid plans only");
    error.statusCode = 400;
    throw error;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      id: `mock_checkout_${Date.now()}`,
      mode: "mock",
      url: buildCheckoutRedirectUrl("/admin/subscriptions/payment-success", institute._id),
      provider: "stripe",
      message: "Stripe is not configured. Returning a mock checkout URL for development."
    };
  }

  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("success_url", successUrl);
  params.set("cancel_url", cancelUrl);
  params.set("client_reference_id", institute._id.toString());
  params.set("customer_email", institute.primaryContactEmail || "");
  params.set("metadata[instituteId]", institute._id.toString());
  params.set("metadata[subscriptionPlan]", subscriptionPlan);
  params.set("metadata[instituteName]", institute.name);
  params.set("line_items[0][quantity]", "1");

  const configuredPriceId = process.env[plan.stripePriceEnv];
  if (configuredPriceId) {
    params.set("line_items[0][price]", configuredPriceId);
  } else {
    params.set("line_items[0][price_data][currency]", plan.currency);
    params.set("line_items[0][price_data][unit_amount]", String(plan.monthlyAmount));
    params.set("line_items[0][price_data][recurring][interval]", "month");
    params.set("line_items[0][price_data][product_data][name]", `${plan.name} Alumni Network plan`);
  }

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params
  });
  const payload = await response.json();

  if (!response.ok) {
    const error = new Error(payload?.error?.message || "Unable to create Stripe checkout session");
    error.statusCode = 502;
    throw error;
  }

  return {
    id: payload.id,
    mode: "live",
    url: payload.url,
    provider: "stripe"
  };
}

export function verifyStripeWebhookSignature(rawBody, signatureHeader) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    const error = new Error("Stripe webhook secret is not configured");
    error.statusCode = 503;
    throw error;
  }

  const parts = String(signatureHeader || "")
    .split(",")
    .map((part) => part.split("="))
    .reduce((accumulator, [key, value]) => {
      accumulator[key] = value;
      return accumulator;
    }, {});

  if (!parts.t || !parts.v1) {
    const error = new Error("Invalid Stripe webhook signature header");
    error.statusCode = 400;
    throw error;
  }

  const signedPayload = `${parts.t}.${rawBody.toString("utf8")}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  const received = Buffer.from(parts.v1, "hex");
  const trusted = Buffer.from(expected, "hex");

  if (received.length !== trusted.length || !crypto.timingSafeEqual(received, trusted)) {
    const error = new Error("Stripe webhook signature verification failed");
    error.statusCode = 400;
    throw error;
  }

  const timestampSeconds = Number(parts.t);
  if (Number.isFinite(timestampSeconds) && Math.abs(Date.now() / 1000 - timestampSeconds) > 300) {
    const error = new Error("Stripe webhook signature is too old");
    error.statusCode = 400;
    throw error;
  }
}

