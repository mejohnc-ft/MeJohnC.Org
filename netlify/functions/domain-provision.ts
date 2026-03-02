import type { Handler, HandlerEvent } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import * as crypto from "crypto";
import * as dns from "dns";

/**
 * Netlify Function: Domain Provisioning
 *
 * Handles BYO domain verification and domain procurement workflows.
 * Client calls: POST /api/domain-provision
 * Body: { action, tenant_id, ...params }
 *
 * Issue: #313
 */

type Action =
  | "initiate_byo"
  | "verify_dns"
  | "provision_netlify"
  | "check_availability"
  | "purchase_domain"
  | "remove_domain";

interface RequestBody {
  action: Action;
  tenant_id: string;
  domain?: string;
}

// Plan tiers that allow each feature
const CUSTOM_DOMAIN_PLANS = ["business", "professional", "enterprise"];
const DOMAIN_PROCUREMENT_PLANS = ["professional", "enterprise"];

const BASE_DOMAIN = process.env.VITE_BASE_DOMAIN || "businessos.app";

function json(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function getSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function getTenantWithPlan(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
) {
  const { data, error } = await supabase
    .schema("app")
    .from("tenants")
    .select("id, name, slug, settings")
    .eq("id", tenantId)
    .single();

  if (error || !data) return null;

  const settings = (data.settings as Record<string, unknown>) || {};
  const plan = typeof settings.plan === "string" ? settings.plan : "free";
  return { ...data, plan, settings };
}

function checkPlanGate(plan: string, requiredPlans: string[]): boolean {
  return requiredPlans.includes(plan);
}

// --- Action handlers ---

async function initiateByo(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  domain: string,
  plan: string,
) {
  if (!checkPlanGate(plan, CUSTOM_DOMAIN_PLANS)) {
    return json(403, {
      error: "Custom domains require a Business plan or higher",
    });
  }

  // Validate domain format
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
  if (!domainRegex.test(domain)) {
    return json(400, { error: "Invalid domain format" });
  }

  // Reject attempts to use the platform domain
  if (domain.endsWith(`.${BASE_DOMAIN}`) || domain === BASE_DOMAIN) {
    return json(400, { error: "Cannot use the platform domain" });
  }

  // Check domain is not already claimed
  const { data: existing } = await supabase
    .schema("app")
    .from("tenants")
    .select("id")
    .eq("custom_domain", domain.toLowerCase())
    .maybeSingle();

  if (existing && existing.id !== tenantId) {
    return json(409, { error: "Domain is already claimed by another tenant" });
  }

  // Generate verification token
  const token = crypto.randomBytes(16).toString("hex");

  // Compute required DNS records
  const dnsRecords = [
    { type: "CNAME" as const, name: domain, value: `${BASE_DOMAIN}.` },
    {
      type: "TXT" as const,
      name: `_businessos-verify.${domain}`,
      value: `businessos-verify=${token}`,
    },
  ];

  // Save pending state to tenant settings JSONB
  const domainSettings = {
    subdomain: "", // preserved from existing — will be merged
    custom_domain: domain.toLowerCase(),
    verification_status: "pending",
    verification_token: token,
    verification_error: null,
    verified_at: null,
    dns_records: dnsRecords,
    provisioned_via: "byo",
  };

  const { error: rpcError } = await supabase.rpc("update_tenant_settings", {
    p_domain: domainSettings,
  });

  // update_tenant_settings requires authenticated + is_admin, but we're service_role
  // so call it directly if the RPC doesn't work
  if (rpcError) {
    const { error: updateErr } = await supabase
      .schema("app")
      .from("tenants")
      .update({
        settings: supabase.rpc ? undefined : undefined, // fallback: raw update
      })
      .eq("id", tenantId);

    // Direct JSONB merge
    const { error: directErr } = await supabase.rpc(
      "set_tenant_custom_domain",
      {
        p_tenant_id: tenantId,
        p_domain: null, // don't set column yet — not verified
      },
    );

    // Update settings directly
    const { data: tenant } = await supabase
      .schema("app")
      .from("tenants")
      .select("settings")
      .eq("id", tenantId)
      .single();

    const currentSettings = (tenant?.settings as Record<string, unknown>) || {};
    const { error: mergeErr } = await supabase
      .schema("app")
      .from("tenants")
      .update({
        settings: { ...currentSettings, domain: domainSettings },
        updated_at: new Date().toISOString(),
      })
      .eq("id", tenantId);

    if (mergeErr) {
      return json(500, { error: "Failed to save domain settings" });
    }
  }

  return json(200, {
    verification_status: "pending",
    dns_records: dnsRecords,
    verification_token: token,
  });
}

async function verifyDns(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  plan: string,
) {
  if (!checkPlanGate(plan, CUSTOM_DOMAIN_PLANS)) {
    return json(403, {
      error: "Custom domains require a Business plan or higher",
    });
  }

  // Load current domain settings
  const { data: tenant } = await supabase
    .schema("app")
    .from("tenants")
    .select("settings")
    .eq("id", tenantId)
    .single();

  if (!tenant) return json(404, { error: "Tenant not found" });

  const settings = (tenant.settings as Record<string, unknown>) || {};
  const domain = settings.domain as Record<string, unknown> | undefined;

  if (!domain?.verification_token || !domain?.custom_domain) {
    return json(400, { error: "No domain verification in progress" });
  }

  const customDomain = domain.custom_domain as string;
  const expectedToken = domain.verification_token as string;
  const expectedValue = `businessos-verify=${expectedToken}`;

  // Check TXT record
  let verified = false;
  try {
    const records = await dns.promises.resolveTxt(
      `_businessos-verify.${customDomain}`,
    );
    // records is an array of arrays of strings
    for (const record of records) {
      const joined = record.join("");
      if (joined === expectedValue) {
        verified = true;
        break;
      }
    }
  } catch {
    // DNS resolution failed — record not found
  }

  if (verified) {
    const updatedDomain = {
      ...domain,
      verification_status: "verified",
      verification_error: null,
      verified_at: new Date().toISOString(),
    };

    await supabase
      .schema("app")
      .from("tenants")
      .update({
        settings: { ...settings, domain: updatedDomain },
        updated_at: new Date().toISOString(),
      })
      .eq("id", tenantId);

    return json(200, { verification_status: "verified" });
  } else {
    const updatedDomain = {
      ...domain,
      verification_status: "failed",
      verification_error:
        "TXT record not found or does not match. DNS propagation can take up to 48 hours.",
    };

    await supabase
      .schema("app")
      .from("tenants")
      .update({
        settings: { ...settings, domain: updatedDomain },
        updated_at: new Date().toISOString(),
      })
      .eq("id", tenantId);

    return json(200, {
      verification_status: "failed",
      verification_error: updatedDomain.verification_error,
    });
  }
}

async function provisionNetlify(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  plan: string,
) {
  if (!checkPlanGate(plan, CUSTOM_DOMAIN_PLANS)) {
    return json(403, {
      error: "Custom domains require a Business plan or higher",
    });
  }

  const netlifyToken = process.env.NETLIFY_API_TOKEN;
  const netlifySiteId = process.env.NETLIFY_SITE_ID;
  if (!netlifyToken || !netlifySiteId) {
    return json(500, { error: "Netlify API not configured" });
  }

  // Load current domain settings
  const { data: tenant } = await supabase
    .schema("app")
    .from("tenants")
    .select("settings")
    .eq("id", tenantId)
    .single();

  if (!tenant) return json(404, { error: "Tenant not found" });

  const settings = (tenant.settings as Record<string, unknown>) || {};
  const domain = settings.domain as Record<string, unknown> | undefined;

  if (domain?.verification_status !== "verified") {
    return json(400, { error: "Domain must be verified before provisioning" });
  }

  const customDomain = domain.custom_domain as string;

  // GET existing site to read current domain_aliases
  const siteRes = await fetch(
    `https://api.netlify.com/api/v1/sites/${netlifySiteId}`,
    { headers: { Authorization: `Bearer ${netlifyToken}` } },
  );

  if (!siteRes.ok) {
    return json(502, { error: "Failed to read Netlify site" });
  }

  const site = (await siteRes.json()) as { domain_aliases?: string[] };
  const existingAliases = site.domain_aliases || [];

  // Append domain if not already present
  if (!existingAliases.includes(customDomain)) {
    const patchRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${netlifySiteId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${netlifyToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domain_aliases: [...existingAliases, customDomain],
        }),
      },
    );

    if (!patchRes.ok) {
      return json(502, { error: "Failed to add domain to Netlify" });
    }
  }

  // Set the indexed column via RPC
  const { error: rpcErr } = await supabase.rpc("set_tenant_custom_domain", {
    p_tenant_id: tenantId,
    p_domain: customDomain,
  });

  if (rpcErr) {
    return json(500, { error: "Failed to set custom domain on tenant record" });
  }

  return json(200, { provisioned: true, domain: customDomain });
}

async function checkAvailability(domain: string, plan: string) {
  if (!checkPlanGate(plan, DOMAIN_PROCUREMENT_PLANS)) {
    return json(403, {
      error: "Domain procurement requires a Professional plan or higher",
    });
  }

  const dnsimpleToken = process.env.DNSIMPLE_API_TOKEN;
  const dnsimpleAccount = process.env.DNSIMPLE_ACCOUNT_ID;
  if (!dnsimpleToken || !dnsimpleAccount) {
    return json(500, { error: "DNSimple API not configured" });
  }

  const res = await fetch(
    `https://api.dnsimple.com/v2/${dnsimpleAccount}/registrar/domains/${encodeURIComponent(domain)}/check`,
    { headers: { Authorization: `Bearer ${dnsimpleToken}` } },
  );

  if (!res.ok) {
    return json(502, { error: "Failed to check domain availability" });
  }

  const body = (await res.json()) as {
    data?: { available?: boolean; premium?: boolean };
  };
  return json(200, {
    domain,
    available: body.data?.available ?? false,
    premium: body.data?.premium ?? false,
  });
}

async function purchaseDomain(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  domain: string,
  plan: string,
) {
  if (!checkPlanGate(plan, DOMAIN_PROCUREMENT_PLANS)) {
    return json(403, {
      error: "Domain procurement requires a Professional plan or higher",
    });
  }

  const dnsimpleToken = process.env.DNSIMPLE_API_TOKEN;
  const dnsimpleAccount = process.env.DNSIMPLE_ACCOUNT_ID;
  const netlifyToken = process.env.NETLIFY_API_TOKEN;
  const netlifySiteId = process.env.NETLIFY_SITE_ID;

  if (!dnsimpleToken || !dnsimpleAccount) {
    return json(500, { error: "DNSimple API not configured" });
  }
  if (!netlifyToken || !netlifySiteId) {
    return json(500, { error: "Netlify API not configured" });
  }

  // 1. Register domain via DNSimple
  const registerRes = await fetch(
    `https://api.dnsimple.com/v2/${dnsimpleAccount}/registrar/domains/${encodeURIComponent(domain)}/registrations`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dnsimpleToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        registrant_id: Number(dnsimpleAccount),
        auto_renew: true,
      }),
    },
  );

  if (!registerRes.ok) {
    const err = await registerRes.text();
    return json(502, { error: `Domain registration failed: ${err}` });
  }

  // 2. Create DNS records pointing to Netlify
  // Find or create zone
  const zoneRes = await fetch(
    `https://api.dnsimple.com/v2/${dnsimpleAccount}/zones/${encodeURIComponent(domain)}/records`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dnsimpleToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "",
        type: "ALIAS",
        content: `${BASE_DOMAIN}`,
        ttl: 3600,
      }),
    },
  );

  // Non-fatal if DNS record creation fails — user can fix manually
  const dnsCreated = zoneRes.ok;

  // 3. Add to Netlify site aliases
  const siteRes = await fetch(
    `https://api.netlify.com/api/v1/sites/${netlifySiteId}`,
    { headers: { Authorization: `Bearer ${netlifyToken}` } },
  );

  if (siteRes.ok) {
    const site = (await siteRes.json()) as { domain_aliases?: string[] };
    const aliases = site.domain_aliases || [];
    if (!aliases.includes(domain)) {
      await fetch(`https://api.netlify.com/api/v1/sites/${netlifySiteId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${netlifyToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain_aliases: [...aliases, domain] }),
      });
    }
  }

  // 4. Set tenant custom domain column + JSONB
  await supabase.rpc("set_tenant_custom_domain", {
    p_tenant_id: tenantId,
    p_domain: domain,
  });

  // 5. Update JSONB domain settings to verified (purchased = auto-verified)
  const { data: tenant } = await supabase
    .schema("app")
    .from("tenants")
    .select("settings")
    .eq("id", tenantId)
    .single();

  const currentSettings = (tenant?.settings as Record<string, unknown>) || {};
  const domainSettings = {
    subdomain:
      ((currentSettings.domain as Record<string, unknown>)
        ?.subdomain as string) || "",
    custom_domain: domain.toLowerCase(),
    verification_status: "verified",
    verification_token: null,
    verification_error: null,
    verified_at: new Date().toISOString(),
    dns_records: [],
    provisioned_via: "purchased",
  };

  await supabase
    .schema("app")
    .from("tenants")
    .update({
      settings: { ...currentSettings, domain: domainSettings },
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId);

  return json(200, {
    purchased: true,
    domain,
    dns_created: dnsCreated,
  });
}

async function removeDomain(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  plan: string,
) {
  if (!checkPlanGate(plan, CUSTOM_DOMAIN_PLANS)) {
    return json(403, {
      error: "Custom domains require a Business plan or higher",
    });
  }

  // Load current domain settings
  const { data: tenant } = await supabase
    .schema("app")
    .from("tenants")
    .select("settings")
    .eq("id", tenantId)
    .single();

  if (!tenant) return json(404, { error: "Tenant not found" });

  const settings = (tenant.settings as Record<string, unknown>) || {};
  const domain = settings.domain as Record<string, unknown> | undefined;
  const customDomain = domain?.custom_domain as string | undefined;

  // Remove from Netlify aliases if configured
  const netlifyToken = process.env.NETLIFY_API_TOKEN;
  const netlifySiteId = process.env.NETLIFY_SITE_ID;

  if (customDomain && netlifyToken && netlifySiteId) {
    const siteRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${netlifySiteId}`,
      { headers: { Authorization: `Bearer ${netlifyToken}` } },
    );

    if (siteRes.ok) {
      const site = (await siteRes.json()) as { domain_aliases?: string[] };
      const aliases = (site.domain_aliases || []).filter(
        (a: string) => a !== customDomain,
      );

      await fetch(`https://api.netlify.com/api/v1/sites/${netlifySiteId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${netlifyToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain_aliases: aliases }),
      });
    }
  }

  // Clear custom_domain column via RPC
  await supabase.rpc("set_tenant_custom_domain", {
    p_tenant_id: tenantId,
    p_domain: null,
  });

  // Reset JSONB domain fields
  const subdomain = (domain?.subdomain as string) || "";
  const resetDomain = {
    subdomain,
    custom_domain: null,
    verification_status: "none",
    verification_token: null,
    verification_error: null,
    verified_at: null,
    dns_records: [],
    provisioned_via: null,
  };

  await supabase
    .schema("app")
    .from("tenants")
    .update({
      settings: { ...settings, domain: resetDomain },
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId);

  return json(200, { removed: true });
}

// --- Main handler ---

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  // Verify auth header present
  const authHeader = event.headers["authorization"];
  if (!authHeader) {
    return json(401, { error: "Unauthorized" });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return json(500, { error: "Supabase not configured" });
  }

  let body: RequestBody;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  if (!body.action || !body.tenant_id) {
    return json(400, { error: "action and tenant_id are required" });
  }

  // Load tenant + plan for gating
  const tenant = await getTenantWithPlan(supabase, body.tenant_id);
  if (!tenant) {
    return json(404, { error: "Tenant not found" });
  }

  switch (body.action) {
    case "initiate_byo": {
      if (!body.domain) return json(400, { error: "domain is required" });
      return initiateByo(supabase, body.tenant_id, body.domain, tenant.plan);
    }
    case "verify_dns":
      return verifyDns(supabase, body.tenant_id, tenant.plan);
    case "provision_netlify":
      return provisionNetlify(supabase, body.tenant_id, tenant.plan);
    case "check_availability": {
      if (!body.domain) return json(400, { error: "domain is required" });
      return checkAvailability(body.domain, tenant.plan);
    }
    case "purchase_domain": {
      if (!body.domain) return json(400, { error: "domain is required" });
      return purchaseDomain(supabase, body.tenant_id, body.domain, tenant.plan);
    }
    case "remove_domain":
      return removeDomain(supabase, body.tenant_id, tenant.plan);
    default:
      return json(400, { error: `Unknown action: ${body.action}` });
  }
};

export { handler };
