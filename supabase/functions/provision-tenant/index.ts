// Supabase Edge Function: Provision Tenant
// Deploy with: supabase functions deploy provision-tenant
// Invoke: POST /functions/v1/provision-tenant
//
// Provisions a new tenant atomically:
// 1. Validate input (name, slug, plan, admin_email, branding)
// 2. Call app.provision_tenant() RPC (atomic DB work)
// 3. Create Clerk Organization via REST API
// 4. Send welcome email via Resend/SendGrid
// 5. Audit log
//
// Auth: x-provisioning-secret header
//
// Required env vars:
//   PROVISIONING_SECRET — shared secret for endpoint auth
//   CLERK_SECRET_KEY    — Clerk backend API key
//   RESEND_API_KEY or SENDGRID_API_KEY — email provider
//   EMAIL_FROM          — sender address
//
// Issue: #299

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { Logger } from "../_shared/logger.ts";
import { validateInput, validateFields } from "../_shared/input-validator.ts";
import { CORS_ORIGIN } from "../_shared/cors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": CORS_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-provisioning-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Look up a Clerk user by email address.
 * Returns the Clerk user_id or null if not found.
 */
async function lookupClerkUserByEmail(
  email: string,
  clerkSecretKey: string,
  logger: Logger,
): Promise<string | null> {
  try {
    const url = `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.warn("Clerk user lookup failed", {
        status: response.status,
        error: errorBody,
      });
      return null;
    }

    const users = await response.json();
    if (Array.isArray(users) && users.length > 0) {
      return users[0].id;
    }

    logger.warn("No Clerk user found for email", { email });
    return null;
  } catch (error) {
    logger.warn("Clerk user lookup error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Add a user as a member of a Clerk Organization.
 * Non-fatal: logs warning on failure.
 */
async function addOrgMembership(
  orgId: string,
  userId: string,
  role: string,
  clerkSecretKey: string,
  logger: Logger,
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.clerk.com/v1/organizations/${orgId}/memberships`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: userId, role }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      logger.warn("Clerk org membership creation failed", {
        status: response.status,
        error: errorBody,
        orgId,
        userId,
      });
      return false;
    }

    logger.info("Clerk org membership created", { orgId, userId, role });
    return true;
  } catch (error) {
    logger.warn("Clerk org membership error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Create a Clerk Organization via REST API.
 * Sets publicMetadata.tenant_id so the frontend can resolve it.
 */
async function createClerkOrganization(
  tenantId: string,
  name: string,
  slug: string,
  adminEmail: string | null,
  clerkSecretKey: string,
  logger: Logger,
): Promise<{ clerk_org_id: string } | null> {
  try {
    const response = await fetch("https://api.clerk.com/v1/organizations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        slug,
        public_metadata: { tenant_id: tenantId },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error("Clerk organization creation failed", new Error(errorBody), {
        status: response.status,
      });
      return null;
    }

    const data = await response.json();
    logger.info("Clerk organization created", {
      clerk_org_id: data.id,
      tenant_id: tenantId,
    });
    return { clerk_org_id: data.id };
  } catch (error) {
    logger.error(
      "Clerk API call failed",
      error instanceof Error ? error : new Error(String(error)),
    );
    return null;
  }
}

/**
 * Send a welcome email via Resend (preferred) or SendGrid.
 */
async function sendWelcomeEmail(
  adminEmail: string,
  tenantName: string,
  slug: string,
  logger: Logger,
): Promise<boolean> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const sendgridKey = Deno.env.get("SENDGRID_API_KEY");
  const emailFrom = Deno.env.get("EMAIL_FROM") || "noreply@mejohnc.org";

  if (!adminEmail) return true; // No email to send

  const subject = `Welcome to ${tenantName}!`;
  const htmlBody = `
    <h1>Welcome to ${tenantName}</h1>
    <p>Your workspace has been provisioned and is ready to use.</p>
    <p>Workspace slug: <strong>${slug}</strong></p>
    <p>You can sign in at your organization dashboard to get started.</p>
  `;

  try {
    if (resendKey) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: emailFrom,
          to: [adminEmail],
          subject,
          html: htmlBody,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.warn("Resend email failed", {
          status: response.status,
          error: errorBody,
        });
        return false;
      }

      logger.info("Welcome email sent via Resend", { to: adminEmail });
      return true;
    }

    if (sendgridKey) {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: adminEmail }] }],
          from: { email: emailFrom },
          subject,
          content: [{ type: "text/html", value: htmlBody }],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.warn("SendGrid email failed", {
          status: response.status,
          error: errorBody,
        });
        return false;
      }

      logger.info("Welcome email sent via SendGrid", { to: adminEmail });
      return true;
    }

    logger.warn(
      "No email provider configured (RESEND_API_KEY or SENDGRID_API_KEY)",
    );
    return false;
  } catch (error) {
    logger.warn("Welcome email failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const logger = Logger.fromRequest(req);
  logger.logRequest();
  const start = performance.now();

  try {
    // ── Auth: verify provisioning secret ──
    const provisioningSecret = Deno.env.get("PROVISIONING_SECRET");
    if (!provisioningSecret) {
      logger.error("PROVISIONING_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const headerSecret = req.headers.get("x-provisioning-secret");
    if (!headerSecret || headerSecret !== provisioningSecret) {
      logger.warn("Unauthorized provisioning attempt");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Validate input ──
    const validation = await validateInput(req, { maxBodySize: 64 * 1024 });
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          error: "Validation error",
          message: validation.error,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = validation.data as Record<string, unknown>;

    const fieldError = validateFields(body, {
      name: { required: true, type: "string", minLength: 1, maxLength: 255 },
      slug: {
        required: true,
        type: "string",
        minLength: 3,
        maxLength: 100,
        pattern: /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
      },
      plan: {
        type: "string",
        enum: ["free", "starter", "business", "professional", "enterprise"],
      },
      admin_email: {
        type: "string",
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
      branding: { type: "object" },
    });

    if (fieldError) {
      return new Response(
        JSON.stringify({ error: "Validation error", message: fieldError }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const name = body.name as string;
    const slug = body.slug as string;
    const plan = (body.plan as string) || "free";
    const adminEmail = (body.admin_email as string) || null;
    const branding = (body.branding as Record<string, unknown>) || {};

    // ── Supabase client ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Step 1: Call app.provision_tenant() RPC ──
    const { data: provisionResult, error: provisionError } = await supabase.rpc(
      "provision_tenant",
      {
        p_name: name,
        p_slug: slug,
        p_type: "organization",
        p_admin_email: adminEmail,
        p_plan: plan,
        p_branding: branding,
      },
    );

    if (provisionError) {
      const isConflict = provisionError.message?.includes("already taken");
      const status = isConflict ? 409 : 500;
      logger.error(
        "provision_tenant RPC failed",
        new Error(provisionError.message),
      );
      return new Response(
        JSON.stringify({
          error: isConflict ? "Slug already taken" : "Provisioning failed",
          message: provisionError.message,
          correlationId: logger.getCorrelationId(),
        }),
        {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const tenantId = provisionResult?.[0]?.tenant_id;
    const tenantCreatedAt = provisionResult?.[0]?.created_at;

    if (!tenantId) {
      logger.error("provision_tenant returned no tenant_id");
      return new Response(
        JSON.stringify({
          error: "Provisioning failed",
          message: "No tenant_id returned from RPC",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    logger.info("Tenant provisioned in database", {
      tenant_id: tenantId,
      slug,
    });

    // ── Step 2: Create Clerk Organization ──
    let clerkOrgId: string | null = null;
    const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");

    if (clerkSecretKey) {
      const clerkResult = await createClerkOrganization(
        tenantId,
        name,
        slug,
        adminEmail,
        clerkSecretKey,
        logger,
      );

      if (clerkResult) {
        clerkOrgId = clerkResult.clerk_org_id;

        // Add the admin user as org:admin member
        if (adminEmail) {
          const clerkUserId = await lookupClerkUserByEmail(
            adminEmail,
            clerkSecretKey,
            logger,
          );
          if (clerkUserId) {
            await addOrgMembership(
              clerkOrgId,
              clerkUserId,
              "org:admin",
              clerkSecretKey,
              logger,
            );
          } else {
            logger.warn(
              "Could not add org membership — admin user not found in Clerk",
              {
                email: adminEmail,
              },
            );
          }
        }
      } else {
        // Mark tenant as clerk_failed so it can be retried
        await supabase
          .from("tenants")
          .update({
            settings: supabase.rpc("jsonb_set_key", {
              target_json: null, // Unused; we use raw SQL below
            }),
          })
          .eq("id", tenantId);

        // Direct update to mark clerk failure in settings
        await supabase.rpc("log_audit_event", {
          p_actor_type: "system",
          p_actor_id: null,
          p_action: "tenant.clerk_failed",
          p_resource_type: "tenant",
          p_resource_id: tenantId,
          p_details: { slug, name },
        });

        // Update settings to indicate clerk_failed
        const { error: updateError } = await supabase
          .schema("app")
          .from("tenants")
          .update({
            settings: {
              plan,
              branding,
              provisioning_status: "clerk_failed",
              provisioned_at: tenantCreatedAt,
            },
          })
          .eq("id", tenantId);

        if (updateError) {
          logger.warn("Failed to update tenant settings for clerk_failed", {
            error: updateError.message,
          });
        }

        const duration = Math.round(performance.now() - start);
        logger.logResponse(500, duration);

        return new Response(
          JSON.stringify({
            error: "Clerk organization creation failed",
            tenant_id: tenantId,
            message:
              "Tenant was created in DB but Clerk org failed. Retry or fix manually.",
            correlationId: logger.getCorrelationId(),
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              ...logger.getResponseHeaders(),
            },
          },
        );
      }
    } else {
      logger.warn(
        "CLERK_SECRET_KEY not configured — skipping Clerk org creation",
      );
    }

    // ── Step 3: Send welcome email (non-critical) ──
    let emailSent = false;
    if (adminEmail) {
      emailSent = await sendWelcomeEmail(adminEmail, name, slug, logger);
    }

    // ── Step 4: Audit log ──
    await supabase.rpc("log_audit_event", {
      p_actor_type: "system",
      p_actor_id: null,
      p_action: "tenant.provisioned",
      p_resource_type: "tenant",
      p_resource_id: tenantId,
      p_details: {
        slug,
        name,
        plan,
        admin_email: adminEmail,
        clerk_org_id: clerkOrgId,
        email_sent: emailSent,
      },
    });

    const duration = Math.round(performance.now() - start);
    logger.logResponse(201, duration);

    return new Response(
      JSON.stringify({
        tenant_id: tenantId,
        slug,
        name,
        plan,
        clerk_org_id: clerkOrgId,
        email_sent: emailSent,
        created_at: tenantCreatedAt,
        correlationId: logger.getCorrelationId(),
      }),
      {
        status: 201,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          ...logger.getResponseHeaders(),
        },
      },
    );
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    logger.error(
      "Provision tenant error",
      error instanceof Error ? error : new Error(String(error)),
    );
    logger.logResponse(500, duration);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        correlationId: logger.getCorrelationId(),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          ...logger.getResponseHeaders(),
        },
      },
    );
  }
});
