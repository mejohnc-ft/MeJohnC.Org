import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CreditCard,
  Loader2,
  Shield,
  Users,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import { useSEO } from "@/lib/seo";
import { captureException } from "@/lib/sentry";
import type { Tenant } from "@/lib/schemas";

const TenantDetailPage = () => {
  useSEO({ title: "Tenant Detail", noIndex: true });
  const { id } = useParams<{ id: string }>();
  const { supabase } = useAuthenticatedSupabase();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    async function fetchTenant() {
      if (!supabase || !id) return;
      try {
        const { data, error } = await supabase
          .schema("app")
          .from("tenants")
          .select("*")
          .eq("id", id)
          .single();
        if (error) throw error;
        setTenant(data as Tenant);
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), {
          context: "TenantDetail.fetch",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchTenant();
  }, [supabase, id]);

  const handleToggleStatus = async () => {
    if (!supabase || !tenant) return;
    setIsToggling(true);
    try {
      const { error } = await supabase.rpc("toggle_tenant_status", {
        p_tenant_id: tenant.id,
        p_is_active: !tenant.is_active,
      });
      if (error) throw error;
      setTenant({ ...tenant, is_active: !tenant.is_active });
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "TenantDetail.toggleStatus",
      });
    } finally {
      setIsToggling(false);
    }
  };

  const settings = tenant?.settings as Record<string, unknown> | null;
  const plan = (settings?.plan as string) || "free";
  const stripeCustomerId = settings?.stripe_customer_id as string | undefined;
  const subscriptionStatus = settings?.subscription_status as
    | string
    | undefined;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!tenant) {
    return (
      <AdminLayout>
        <div className="text-center py-20">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Tenant Not Found
          </h2>
          <Button asChild variant="outline">
            <Link to="/admin/platform/tenants">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tenants
            </Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              to="/admin/platform/tenants"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Tenants
            </Link>
            <h1 className="text-2xl font-bold text-foreground">
              {tenant.name}
            </h1>
            <p className="text-muted-foreground font-mono text-sm">
              {tenant.slug}
            </p>
          </div>
          <Button
            variant={tenant.is_active ? "outline" : "default"}
            onClick={handleToggleStatus}
            disabled={isToggling}
          >
            {isToggling ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            {tenant.is_active ? "Suspend Tenant" : "Activate Tenant"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overview */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Overview
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Type</span>
                <div className="font-medium text-foreground capitalize">
                  {tenant.type}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Status</span>
                <div>
                  <Badge
                    variant={tenant.is_active ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {tenant.is_active ? "Active" : "Suspended"}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Created</span>
                <div className="font-medium text-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(tenant.created_at).toLocaleDateString()}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">ID</span>
                <div className="font-mono text-xs text-muted-foreground truncate">
                  {tenant.id}
                </div>
              </div>
            </div>
          </div>

          {/* Billing */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Billing
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Plan</span>
                <div>
                  <Badge variant="outline" className="text-xs capitalize">
                    {plan}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Subscription</span>
                <div className="font-medium text-foreground capitalize">
                  {subscriptionStatus || "N/A"}
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">
                  Stripe Customer ID
                </span>
                <div className="font-mono text-xs text-muted-foreground">
                  {stripeCustomerId || "Not connected"}
                </div>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4 lg:col-span-2">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Admin Users
            </h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>
                User management is handled through Clerk organization settings.
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </AdminLayout>
  );
};

export default TenantDetailPage;
