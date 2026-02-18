import { useState } from "react";
import {
  CreditCard,
  Loader2,
  AlertTriangle,
  ArrowUpCircle,
  Check,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBilling } from "@/hooks/useBilling";
import { useTenant } from "@/lib/tenant";
import { type PlanTier } from "@/lib/billing";
import { captureException } from "@/lib/sentry";

const PLAN_DISPLAY: Record<PlanTier, { label: string; color: string }> = {
  free: { label: "Free", color: "bg-gray-500/20 text-gray-400" },
  starter: { label: "Starter", color: "bg-blue-500/20 text-blue-400" },
  business: { label: "Business", color: "bg-purple-500/20 text-purple-400" },
  professional: {
    label: "Professional",
    color: "bg-amber-500/20 text-amber-400",
  },
  enterprise: {
    label: "Enterprise",
    color: "bg-emerald-500/20 text-emerald-400",
  },
};

const PlanSection = () => {
  const { plan, limits, isPastDue, isFreePlan } = useBilling();
  const { tenant } = useTenant();
  const [portalLoading, setPortalLoading] = useState(false);
  const display = PLAN_DISPLAY[plan];

  const openStripePortal = async () => {
    if (!tenant) return;
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenant.id }),
      });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error(data.error || "Failed to open portal");
      }
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "PlanSection.openStripePortal",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const openCheckout = async () => {
    if (!tenant) return;
    // Redirect to the upgrade flow (stripe-checkout function)
    try {
      const res = await fetch("/api/stripe-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenant.id,
          price_id: "price_starter_monthly", // placeholder
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "PlanSection.openCheckout",
      });
    }
  };

  const limitItems = [
    {
      label: "Users",
      value:
        limits.maxUsers === Infinity ? "Unlimited" : String(limits.maxUsers),
    },
    {
      label: "Apps",
      value: limits.maxApps === Infinity ? "Unlimited" : String(limits.maxApps),
    },
    {
      label: "AI Chats/mo",
      value:
        limits.maxAiChats === Infinity
          ? "Unlimited"
          : String(limits.maxAiChats),
    },
    { label: "Custom Subdomain", value: limits.customSubdomain },
    { label: "Custom Domain", value: limits.customDomain },
    { label: "Domain Procurement", value: limits.domainProcurement },
    { label: "Dedicated DB", value: limits.dedicatedDb },
    { label: "SLA", value: limits.sla },
  ];

  return (
    <div className="space-y-4">
      {/* Past Due Warning */}
      {isPastDue && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400">Payment Past Due</p>
            <p className="text-xs text-red-400/80 mt-1">
              Your subscription payment has failed. Please update your payment
              method to avoid service interruption.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
              onClick={openStripePortal}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : null}
              Update Payment Method
            </Button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Current Plan
          </h3>
          <Badge className={`${display.color} text-sm px-3 py-1`}>
            {display.label}
          </Badge>
        </div>

        {/* Limits Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {limitItems.map((item) => (
            <div key={item.label} className="bg-muted/30 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">
                {item.label}
              </div>
              <div className="font-medium text-sm">
                {typeof item.value === "boolean" ? (
                  item.value ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )
                ) : (
                  item.value
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          {!isFreePlan && (
            <Button
              variant="outline"
              onClick={openStripePortal}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-1" />
              )}
              Manage Subscription
            </Button>
          )}
          {isFreePlan && (
            <Button onClick={openCheckout}>
              <ArrowUpCircle className="w-4 h-4 mr-1" />
              Upgrade Plan
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanSection;
