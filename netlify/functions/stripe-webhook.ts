import type { Handler, HandlerEvent } from "@netlify/functions";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

/**
 * Netlify Function: Stripe Webhook
 *
 * Handles Stripe webhook events for subscription lifecycle.
 * Endpoint: POST /api/stripe-webhook
 *
 * Events handled:
 * - checkout.session.completed → set plan + status from new subscription
 * - customer.subscription.updated → update plan + status on changes
 * - customer.subscription.deleted → downgrade to free
 * - invoice.payment_failed → mark subscription as past_due
 *
 * Issue: #301
 */

/** Map a Stripe price ID to our plan tier name */
function mapPriceToPlan(priceId: string): string {
  const mapping: Record<string, string> = {};

  if (process.env.STRIPE_STARTER_PRICE_ID)
    mapping[process.env.STRIPE_STARTER_PRICE_ID] = "starter";
  if (process.env.STRIPE_BUSINESS_PRICE_ID)
    mapping[process.env.STRIPE_BUSINESS_PRICE_ID] = "business";
  if (process.env.STRIPE_PROFESSIONAL_PRICE_ID)
    mapping[process.env.STRIPE_PROFESSIONAL_PRICE_ID] = "professional";
  if (process.env.STRIPE_ENTERPRISE_PRICE_ID)
    mapping[process.env.STRIPE_ENTERPRISE_PRICE_ID] = "enterprise";

  return mapping[priceId] || "free";
}

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeSecretKey || !webhookSecret) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Stripe not configured" }),
    };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Supabase not configured" }),
    };
  }

  const stripe = new Stripe(stripeSecretKey);
  const signature = event.headers["stripe-signature"];

  if (!signature || !event.body) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing signature or body" }),
    };
  }

  let stripeEvent: Stripe.Event;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      signature,
      webhookSecret,
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Signature verification failed";
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: message }),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    switch (stripeEvent.type) {
      case "checkout.session.completed": {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        if (!session.subscription || !session.customer) break;

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;

        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer.id;

        // Retrieve the full subscription to get the price ID
        const subscription =
          await stripe.subscriptions.retrieve(subscriptionId);

        const priceId = subscription.items.data[0]?.price.id || "";
        const plan = mapPriceToPlan(priceId);

        await supabase.rpc("update_tenant_billing", {
          p_stripe_customer_id: customerId,
          p_stripe_subscription_id: subscriptionId,
          p_plan: plan,
          p_subscription_status: subscription.status,
          p_current_period_end: new Date(
            subscription.current_period_end * 1000,
          ).toISOString(),
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = stripeEvent.data.object as Stripe.Subscription;

        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        const priceId = subscription.items.data[0]?.price.id || "";
        const plan = mapPriceToPlan(priceId);

        await supabase.rpc("update_tenant_billing", {
          p_stripe_customer_id: customerId,
          p_stripe_subscription_id: subscription.id,
          p_plan: plan,
          p_subscription_status: subscription.status,
          p_current_period_end: new Date(
            subscription.current_period_end * 1000,
          ).toISOString(),
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = stripeEvent.data.object as Stripe.Subscription;

        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        await supabase.rpc("update_tenant_billing", {
          p_stripe_customer_id: customerId,
          p_stripe_subscription_id: subscription.id,
          p_plan: "free",
          p_subscription_status: "canceled",
          p_current_period_end: new Date(
            subscription.current_period_end * 1000,
          ).toISOString(),
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        if (!invoice.subscription || !invoice.customer) break;

        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer.id;

        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription.id;

        // Retrieve current subscription to keep plan/period data
        const subscription =
          await stripe.subscriptions.retrieve(subscriptionId);

        const priceId = subscription.items.data[0]?.price.id || "";
        const plan = mapPriceToPlan(priceId);

        await supabase.rpc("update_tenant_billing", {
          p_stripe_customer_id: customerId,
          p_stripe_subscription_id: subscriptionId,
          p_plan: plan,
          p_subscription_status: "past_due",
          p_current_period_end: new Date(
            subscription.current_period_end * 1000,
          ).toISOString(),
        });
        break;
      }
    }
  } catch (err) {
    // Log but still return 200 to prevent Stripe retries for processing errors
    console.error("Webhook processing error:", err);
  }

  // Always return 200 to acknowledge receipt
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ received: true }),
  };
};

export { handler };
