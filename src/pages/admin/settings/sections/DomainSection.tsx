import { useState } from "react";
import {
  Globe,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { useTenant } from "@/lib/tenant";
import { useAuth } from "@/lib/auth";
import { useBilling } from "@/hooks/useBilling";
import type { DomainVerificationStatus } from "@/lib/tenant-settings";

const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN || "mejohnc.org";

async function domainApi(
  action: string,
  tenantId: string,
  token: string,
  extra: Record<string, unknown> = {},
) {
  const res = await fetch("/api/domain-provision", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, tenant_id: tenantId, ...extra }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Request failed");
  return body;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

function DnsRecordTable({
  records,
}: {
  records: { type: string; name: string; value: string }[];
}) {
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
              Type
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
              Name
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
              Value
            </th>
            <th className="px-3 py-2 w-8" />
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              <td className="px-3 py-2 font-mono">{r.type}</td>
              <td className="px-3 py-2 font-mono break-all">{r.name}</td>
              <td className="px-3 py-2 font-mono break-all">{r.value}</td>
              <td className="px-3 py-2">
                <CopyButton text={r.value} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: DomainVerificationStatus }) {
  switch (status) {
    case "verified":
      return (
        <Badge className="bg-green-500/15 text-green-500 border-green-500/30 gap-1">
          <CheckCircle2 className="w-3 h-3" /> Verified
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-yellow-500/15 text-yellow-500 border-yellow-500/30 gap-1">
          <Clock className="w-3 h-3" /> Pending
        </Badge>
      );
    case "failed":
      return (
        <Badge className="bg-red-500/15 text-red-500 border-red-500/30 gap-1">
          <AlertCircle className="w-3 h-3" /> Failed
        </Badge>
      );
    default:
      return null;
  }
}

const DomainSection = () => {
  const { settings } = useTenantSettings();
  const { tenant, refreshTenant } = useTenant();
  const { getToken } = useAuth();
  const { limits } = useBilling();
  const subdomain = settings.domain.subdomain || tenant?.slug || "";
  const tenantId = tenant?.id;

  const [domainInput, setDomainInput] = useState("");
  const [purchaseInput, setPurchaseInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availabilityResult, setAvailabilityResult] = useState<{
    domain: string;
    available: boolean;
    premium: boolean;
  } | null>(null);

  const domainSettings = settings.domain;
  const verificationStatus = domainSettings.verification_status;

  async function callApi(action: string, extra: Record<string, unknown> = {}) {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const result = await domainApi(action, tenantId, token, extra);
      refreshTenant();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleInitiateByo() {
    if (!domainInput.trim()) return;
    await callApi("initiate_byo", { domain: domainInput.trim().toLowerCase() });
  }

  async function handleVerifyDns() {
    await callApi("verify_dns");
  }

  async function handleProvisionNetlify() {
    await callApi("provision_netlify");
  }

  async function handleCheckAvailability() {
    if (!purchaseInput.trim()) return;
    const result = await callApi("check_availability", {
      domain: purchaseInput.trim().toLowerCase(),
    });
    if (result) setAvailabilityResult(result);
  }

  async function handlePurchase() {
    if (!purchaseInput.trim()) return;
    await callApi("purchase_domain", {
      domain: purchaseInput.trim().toLowerCase(),
    });
  }

  async function handleRemoveDomain() {
    await callApi("remove_domain");
  }

  // --- Render ---

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Globe className="w-5 h-5 text-primary" />
        Domain
      </h3>

      {/* Subdomain (always shown) */}
      <div>
        <label className="block text-sm font-medium mb-2">Subdomain</label>
        <div className="flex items-center gap-2 max-w-md">
          <div className="flex-1 flex items-center bg-muted/50 border border-border rounded-md overflow-hidden">
            <span className="px-3 py-2 text-sm font-mono bg-muted border-r border-border text-muted-foreground">
              https://
            </span>
            <span className="px-3 py-2 text-sm font-mono font-medium">
              {subdomain || "\u2014"}
            </span>
            <span className="px-3 py-2 text-sm font-mono text-muted-foreground">
              .{BASE_DOMAIN}
            </span>
          </div>
          {subdomain && (
            <a
              href={`https://${subdomain}.${BASE_DOMAIN}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Your subdomain is set when your workspace is created and cannot be
          changed.
        </p>
      </div>

      {/* Custom Domain */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Custom Domain</label>
          {verificationStatus !== "none" && (
            <StatusBadge status={verificationStatus} />
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md p-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Plan gate: no access */}
        {!limits.customDomain && verificationStatus === "none" && (
          <div className="bg-muted/30 border border-border rounded-md p-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Custom domains are available on the Business plan and above.
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href="/admin/settings?tab=billing">
                <ArrowUpRight className="w-3.5 h-3.5" />
                Upgrade Plan
              </a>
            </Button>
          </div>
        )}

        {/* State: none — setup form */}
        {limits.customDomain && verificationStatus === "none" && (
          <>
            {limits.domainProcurement ? (
              <Tabs defaultValue="byo" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="byo">Bring Your Domain</TabsTrigger>
                  <TabsTrigger value="purchase">Buy a Domain</TabsTrigger>
                </TabsList>

                <TabsContent value="byo" className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Point your existing domain to your workspace. You&apos;ll
                    need to add DNS records to verify ownership.
                  </p>
                  <div className="flex gap-2 max-w-md">
                    <input
                      type="text"
                      value={domainInput}
                      onChange={(e) => setDomainInput(e.target.value)}
                      placeholder="yourdomain.com"
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={handleInitiateByo}
                      loading={loading}
                      disabled={!domainInput.trim()}
                    >
                      Start Verification
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="purchase" className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Search for and purchase a new domain. DNS will be configured
                    automatically.
                  </p>
                  <div className="flex gap-2 max-w-md">
                    <input
                      type="text"
                      value={purchaseInput}
                      onChange={(e) => {
                        setPurchaseInput(e.target.value);
                        setAvailabilityResult(null);
                      }}
                      placeholder="yourdomain.com"
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCheckAvailability}
                      loading={loading}
                      disabled={!purchaseInput.trim()}
                    >
                      Check Availability
                    </Button>
                  </div>

                  {availabilityResult && (
                    <div className="max-w-md border border-border rounded-md p-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-mono">
                          {availabilityResult.domain}
                        </span>
                        <Badge
                          variant={
                            availabilityResult.available ? "default" : "outline"
                          }
                          className={
                            availabilityResult.available
                              ? "bg-green-500/15 text-green-500"
                              : ""
                          }
                        >
                          {availabilityResult.available
                            ? "Available"
                            : "Unavailable"}
                        </Badge>
                      </div>
                      {availabilityResult.premium && (
                        <p className="text-xs text-yellow-500">
                          This is a premium domain and may cost more.
                        </p>
                      )}
                      {availabilityResult.available && (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={handlePurchase}
                          loading={loading}
                        >
                          Purchase Domain
                        </Button>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              /* BYO only (no procurement on this plan) */
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Point your existing domain to your workspace. You&apos;ll need
                  to add DNS records to verify ownership.
                </p>
                <div className="flex gap-2 max-w-md">
                  <input
                    type="text"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    placeholder="yourdomain.com"
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleInitiateByo}
                    loading={loading}
                    disabled={!domainInput.trim()}
                  >
                    Start Verification
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* State: pending / failed — DNS verification in progress */}
        {(verificationStatus === "pending" ||
          verificationStatus === "failed") && (
          <div className="space-y-4">
            <div className="bg-muted/30 border border-border rounded-md p-4 space-y-3">
              <p className="text-sm font-medium">
                Configure these DNS records at your domain registrar:
              </p>
              <DnsRecordTable records={domainSettings.dns_records} />
              <p className="text-xs text-muted-foreground">
                DNS changes can take up to 48 hours to propagate.
              </p>
            </div>

            {domainSettings.verification_error && (
              <div className="flex items-start gap-2 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{domainSettings.verification_error}</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button size="sm" onClick={handleVerifyDns} loading={loading}>
                Check DNS
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveDomain}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* State: verified — domain is live */}
        {verificationStatus === "verified" && domainSettings.custom_domain && (
          <div className="space-y-4">
            {/* If not yet provisioned on Netlify, show provision button */}
            {!tenant?.settings?.custom_domain ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 max-w-md bg-muted/50 border border-border rounded-md px-3 py-2">
                  <span className="text-sm font-mono font-medium">
                    {domainSettings.custom_domain}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  DNS verified. Click below to activate the domain on your
                  workspace.
                </p>
                <Button
                  size="sm"
                  onClick={handleProvisionNetlify}
                  loading={loading}
                >
                  Activate Domain
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 max-w-md">
                  <div className="flex-1 flex items-center bg-muted/50 border border-border rounded-md overflow-hidden">
                    <span className="px-3 py-2 text-sm font-mono bg-muted border-r border-border text-muted-foreground">
                      https://
                    </span>
                    <span className="px-3 py-2 text-sm font-mono font-medium">
                      {domainSettings.custom_domain}
                    </span>
                  </div>
                  <a
                    href={`https://${domainSettings.custom_domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  SSL certificate will be provisioned automatically by Netlify.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveDomain}
                  loading={loading}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove Domain
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DomainSection;
