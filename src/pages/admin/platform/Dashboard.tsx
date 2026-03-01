import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, Users, Activity, Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import AdminLayout from "@/components/AdminLayout";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import { useSEO } from "@/lib/seo";
import { captureException } from "@/lib/sentry";

interface PlatformStats {
  total_tenants: number;
  active_tenants: number;
  total_users: number;
  plan_distribution: Record<string, number>;
}

const PlatformDashboard = () => {
  useSEO({ title: "Platform Dashboard", noIndex: true });
  const { supabase } = useAuthenticatedSupabase();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase.rpc("get_platform_stats");
        if (error) throw error;
        setStats(data as PlatformStats);
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), {
          context: "PlatformDashboard.fetchStats",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, [supabase]);

  const chartData = stats
    ? Object.entries(stats.plan_distribution).map(([plan, count]) => ({
        plan: plan.charAt(0).toUpperCase() + plan.slice(1),
        count,
      }))
    : [];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Platform Dashboard
          </h1>
          <p className="text-muted-foreground">
            Overview of all tenants and platform metrics
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                Total Tenants
              </span>
            </div>
            <div className="text-3xl font-bold text-foreground">
              {stats?.total_tenants ?? 0}
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-green-500" />
              <span className="text-sm text-muted-foreground">
                Active Tenants
              </span>
            </div>
            <div className="text-3xl font-bold text-foreground">
              {stats?.active_tenants ?? 0}
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total Users</span>
            </div>
            <div className="text-3xl font-bold text-foreground">
              {stats?.total_users ?? 0}
            </div>
          </div>
        </div>

        {/* Plan Distribution Chart */}
        {chartData.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Plan Distribution
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis dataKey="plan" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </motion.div>
    </AdminLayout>
  );
};

export default PlatformDashboard;
