import type { Handler, HandlerEvent } from "@netlify/functions";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

/**
 * Netlify Function: Stripe Billing Portal
 *
 * Creates a Stripe Billing Portal Session for subscription management.
 * Client calls: POST /api/stripe-portal
 * Body: { tenant_id }
 *
 * Issue: #302
 */

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Verify auth
  const authHeader = event.headers["authorization"];
  if (!authHeader) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "STRIPE_SECRET_KEY not configured" }),
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

  let body: { tenant_id?: string };

  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  if (!body.tenant_id) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "tenant_id is required" }),
    };
  }

  try {
    const stripe = new Stripe(stripeSecretKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up tenant
    const { data: tenant, error: tenantError } = await supabase
      .schema("app")
      .from("tenants")
      .select("id, name, settings")
      .eq("id", body.tenant_id)
      .single();

    if (tenantError || !tenant) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Tenant not found" }),
      };
    }

    const settings = (tenant.settings as Record<string, unknown>) || {};
    const customerId = settings.stripe_customer_id as string | undefined;

    if (!customerId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "No Stripe customer linked to this tenant",
        }),
      };
    }

    // Create Billing Portal Session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${event.headers["origin"] || "https://mejohnc.org"}/admin/settings`,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: portalSession.url }),
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Stripe portal session failed";
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: message }),
    };
  }
};

export { handler };
