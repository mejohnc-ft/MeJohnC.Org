import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  Building2,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import { useSEO } from "@/lib/seo";
import { captureException } from "@/lib/sentry";
import type { Tenant } from "@/lib/schemas";

const PAGE_SIZE = 20;

const TenantListPage = () => {
  useSEO({ title: "Tenant Management", noIndex: true });
  const { supabase } = useAuthenticatedSupabase();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc("list_tenants", {
        p_search: search || null,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      setTenants((data as Tenant[]) || []);
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "TenantList.fetch",
      });
    } finally {
      setIsLoading(false);
    }
  }, [supabase, search, page]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleToggleStatus = async (tenantId: string, isActive: boolean) => {
    if (!supabase) return;
    setTogglingId(tenantId);
    try {
      const { error } = await supabase.rpc("toggle_tenant_status", {
        p_tenant_id: tenantId,
        p_is_active: !isActive,
      });
      if (error) throw error;
      setTenants((prev) =>
        prev.map((t) =>
          t.id === tenantId ? { ...t, is_active: !isActive } : t,
        ),
      );
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "TenantList.toggleStatus",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const getPlan = (tenant: Tenant) => {
    const settings = tenant.settings as Record<string, unknown> | null;
    return (settings?.plan as string) || "free";
  };

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tenants</h1>
          <p className="text-muted-foreground">
            Manage all workspaces on the platform
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tenants..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border rounded-lg">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No tenants found</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">
                    Slug
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">
                    Plan
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">
                    Created
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tenants.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/platform/tenants/${tenant.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {tenant.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                      {tenant.slug}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs capitalize">
                        {getPlan(tenant)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={tenant.is_active ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {tenant.is_active ? "Active" : "Suspended"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleToggleStatus(tenant.id, tenant.is_active)
                        }
                        disabled={togglingId === tenant.id}
                        className="text-xs"
                      >
                        {togglingId === tenant.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : tenant.is_active ? (
                          "Suspend"
                        ) : (
                          "Activate"
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-sm text-muted-foreground">
                Page {page + 1}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={tenants.length < PAGE_SIZE}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AdminLayout>
  );
};

export default TenantListPage;
