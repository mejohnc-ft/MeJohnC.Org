import type { Handler, HandlerEvent } from "@netlify/functions";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

/**
 * Netlify Function: Stripe Checkout
 *
 * Creates a Stripe Checkout Session for subscription billing.
 * Client calls: POST /api/stripe-checkout
 * Body: { tenant_id, price_id, success_url?, cancel_url? }
 *
 * Issue: #301
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

  let body: {
    tenant_id?: string;
    price_id?: string;
    success_url?: string;
    cancel_url?: string;
  };

  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  if (!body.tenant_id || !body.price_id) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "tenant_id and price_id are required" }),
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

    // Create or reuse Stripe Customer
    let customerId = settings.stripe_customer_id as string | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: tenant.name,
        metadata: { tenant_id: tenant.id },
      });
      customerId = customer.id;

      // Link customer ID to tenant via RPC
      const { error: linkError } = await supabase.rpc("link_stripe_customer", {
        p_tenant_id: tenant.id,
        p_stripe_customer_id: customerId,
      });

      if (linkError) {
        return {
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Failed to link Stripe customer" }),
        };
      }
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: body.price_id, quantity: 1 }],
      success_url:
        body.success_url ||
        `${event.headers["origin"] || "https://mejohnc.org"}/admin/settings?billing=success`,
      cancel_url:
        body.cancel_url ||
        `${event.headers["origin"] || "https://mejohnc.org"}/admin/settings?billing=cancel`,
      metadata: { tenant_id: tenant.id },
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url, session_id: session.id }),
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Stripe checkout failed";
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: message }),
    };
  }
};

export { handler };
