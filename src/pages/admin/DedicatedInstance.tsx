import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Server,
  Globe,
  CheckCircle2,
  Clock,
  MapPin,
  Database,
  Activity,
  ExternalLink,
  ChevronRight,
  Lock,
  Zap,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSEO } from "@/lib/seo";

// Available AWS regions for dedicated instances
const REGIONS = [
  { id: "us-east-1", name: "US East (N. Virginia)", flag: "🇺🇸" },
  { id: "us-west-2", name: "US West (Oregon)", flag: "🇺🇸" },
  { id: "eu-west-1", name: "EU West (Ireland)", flag: "🇪🇺" },
  { id: "ap-southeast-1", name: "Asia Pacific (Singapore)", flag: "🇸🇬" },
];

// Provisioning steps
const PROVISION_STEPS = [
  { id: 1, label: "Creating Supabase project", duration: 15000 },
  { id: 2, label: "Running migrations", duration: 20000 },
  { id: 3, label: "Migrating data", duration: 30000 },
  { id: 4, label: "Deploying Edge Functions", duration: 15000 },
  { id: 5, label: "Verifying connectivity", duration: 10000 },
];

interface DedicatedInstance {
  id: string;
  project_name: string;
  region: string;
  status: "provisioning" | "active" | "error";
  created_at: string;
  project_url: string;
  anon_key: string;
  db_size_mb: number;
  active_connections: number;
  uptime_percent: number;
  migration_status: "pending" | "in_progress" | "completed";
  migration_progress: number;
}

export default function DedicatedInstance() {
  useSEO({ title: "Dedicated Instance", noIndex: true });

  // For demo: toggle between "no instance" and "has instance" states
  const [instance, setInstance] = useState<DedicatedInstance | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(REGIONS[0].id);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const handleRequestInstance = () => {
    setShowRequestModal(true);
    setSelectedRegion(REGIONS[0].id);
  };

  const handleProvision = async () => {
    setIsProvisioning(true);
    setCurrentStep(0);
    setCompletedSteps([]);

    // Simulate step-by-step provisioning
    for (let i = 0; i < PROVISION_STEPS.length; i++) {
      setCurrentStep(i);
      await new Promise((resolve) =>
        setTimeout(resolve, PROVISION_STEPS[i].duration),
      );
      setCompletedSteps((prev) => [...prev, i]);
    }

    // Create mock instance after all steps complete
    const selectedRegionData =
      REGIONS.find((r) => r.id === selectedRegion) || REGIONS[0];
    const mockInstance: DedicatedInstance = {
      id: `instance_${Date.now()}`,
      project_name: `mejohnc-enterprise-${selectedRegion}`,
      region: selectedRegionData.name,
      status: "active",
      created_at: new Date().toISOString(),
      project_url: `https://${selectedRegion}.supabase.co`,
      anon_key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Math.random().toString(36).substring(2)}`,
      db_size_mb: 245,
      active_connections: 8,
      uptime_percent: 99.99,
      migration_status: "completed",
      migration_progress: 100,
    };

    setInstance(mockInstance);
    setIsProvisioning(false);
    setShowRequestModal(false);
  };

  const maskKey = (key: string) => {
    return `${key.slice(0, 20)}${"•".repeat(20)}${key.slice(-4)}`;
  };

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-400" />
            Dedicated Instance
          </h1>
          <p className="text-muted-foreground">
            Enterprise-grade dedicated Supabase infrastructure for your
            organization
          </p>
        </div>

        {!instance ? (
          // NO INSTANCE STATE - Show benefits and request flow
          <>
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-transparent border border-purple-500/20 rounded-xl p-8">
              <div className="flex items-start gap-6">
                <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <Server className="w-10 h-10 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-3">
                    Complete Data Isolation & Dedicated Resources
                  </h2>
                  <p className="text-muted-foreground mb-6 max-w-3xl">
                    Get your own dedicated Supabase project with isolated
                    database, storage, and Edge Functions. Perfect for
                    enterprises requiring enhanced security, custom regions, and
                    guaranteed SLAs.
                  </p>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleRequestInstance}
                      size="lg"
                      className="gap-2"
                    >
                      Request Dedicated Instance
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Badge className="bg-purple-500/10 text-purple-300 border-purple-500/30 text-sm px-3 py-1">
                      Enterprise Plan Required
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Benefits Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <Lock className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Complete Data Isolation
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your data lives on a dedicated Supabase project, not
                      shared with other tenants. Perfect for compliance
                      requirements and sensitive workloads.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <Zap className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Dedicated Resources
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Guaranteed CPU, memory, and IOPS. No noisy neighbors
                      affecting your performance during peak loads.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <Globe className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Custom Region Selection
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Deploy in the AWS region closest to your users. Choose
                      from US East, US West, EU West, or Asia Pacific regions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <CheckCircle2 className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Enhanced SLA
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      99.99% uptime guarantee with priority support and
                      dedicated account management. We're here when you need us.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Note */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-blue-300 mb-1">
                    Enterprise Plan Pricing
                  </h3>
                  <p className="text-sm text-blue-300/80">
                    Dedicated instances are available on the Enterprise plan
                    ($799+/month). Provisioning typically takes 2-5 minutes and
                    includes automatic data migration from your shared instance.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          // HAS INSTANCE STATE - Show instance details and metrics
          <>
            {/* Instance Status Card */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-b border-border px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Server className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        {instance.project_name}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {instance.region}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge
                    className={
                      instance.status === "active"
                        ? "bg-green-500/10 text-green-400 border-green-500/30"
                        : instance.status === "provisioning"
                          ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                          : "bg-red-500/10 text-red-400 border-red-500/30"
                    }
                  >
                    {instance.status}
                  </Badge>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Connection Details */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Connection Details
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-muted/30 rounded-lg p-3 border border-border">
                      <div className="text-xs text-muted-foreground mb-1">
                        Project URL
                      </div>
                      <code className="text-sm text-foreground font-mono">
                        {instance.project_url}
                      </code>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 border border-border">
                      <div className="text-xs text-muted-foreground mb-1">
                        Anonymous Key
                      </div>
                      <code className="text-sm text-foreground font-mono">
                        {maskKey(instance.anon_key)}
                      </code>
                    </div>
                  </div>
                </div>

                {/* Health Metrics */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Health Metrics
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-muted/30 rounded-lg p-4 border border-border">
                      <div className="flex items-center gap-2 mb-1">
                        <Database className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Database Size
                        </span>
                      </div>
                      <div className="text-xl font-bold text-foreground">
                        {instance.db_size_mb} MB
                      </div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4 border border-border">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Active Connections
                        </span>
                      </div>
                      <div className="text-xl font-bold text-foreground">
                        {instance.active_connections}
                      </div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4 border border-border">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-muted-foreground">
                          Uptime
                        </span>
                      </div>
                      <div className="text-xl font-bold text-foreground">
                        {instance.uptime_percent}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Migration Status */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Migration Status
                  </h3>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-green-400">
                          All data migrated successfully
                        </div>
                        <div className="text-xs text-green-300/70 mt-0.5">
                          Completed on{" "}
                          {new Date(instance.created_at).toLocaleString()}
                        </div>
                      </div>
                      <Badge className="bg-green-500/10 text-green-400 border-green-500/30">
                        100%
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-3 border-t border-border">
                  <Button variant="outline" className="gap-2" asChild>
                    <a
                      href={instance.project_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View in Supabase Dashboard
                    </a>
                  </Button>
                  <div className="flex-1"></div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    Created {new Date(instance.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p className="font-medium mb-1">Dedicated Instance Active</p>
                <p className="text-blue-300/80">
                  Your application is now running on dedicated infrastructure.
                  All new data is automatically stored in your dedicated
                  instance.
                </p>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* Request Instance Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-lg w-full max-w-2xl overflow-hidden"
            >
              {!isProvisioning ? (
                <>
                  {/* Modal Header */}
                  <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground">
                      Request Dedicated Instance
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRequestModal(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Modal Content */}
                  <div className="p-6 space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-3">
                        Select Region
                      </label>
                      <div className="grid grid-cols-1 gap-3">
                        {REGIONS.map((region) => (
                          <button
                            key={region.id}
                            onClick={() => setSelectedRegion(region.id)}
                            className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                              selectedRegion === region.id
                                ? "border-purple-500 bg-purple-500/10"
                                : "border-border bg-muted/30 hover:border-purple-500/50"
                            }`}
                          >
                            <div className="text-2xl">{region.flag}</div>
                            <div className="flex-1 text-left">
                              <div className="font-medium text-foreground">
                                {region.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {region.id}
                              </div>
                            </div>
                            {selectedRegion === region.id && (
                              <CheckCircle2 className="w-5 h-5 text-purple-400" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-4 border border-border">
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-medium text-foreground mb-1">
                            Provisioning Time
                          </div>
                          <div className="text-muted-foreground">
                            Estimated 2-5 minutes to provision and migrate data
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-muted/30">
                    <Button
                      variant="ghost"
                      onClick={() => setShowRequestModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleProvision} className="gap-2">
                      <Server className="w-4 h-4" />
                      Provision Instance
                    </Button>
                  </div>
                </>
              ) : (
                // Provisioning Progress
                <div className="p-8">
                  <div className="text-center mb-8">
                    <div className="inline-flex p-4 bg-purple-500/10 rounded-full mb-4">
                      <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-2">
                      Provisioning Your Dedicated Instance
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      This will take approximately 2-5 minutes. Please do not
                      close this window.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {PROVISION_STEPS.map((step, index) => {
                      const isActive = currentStep === index;
                      const isComplete = completedSteps.includes(index);

                      return (
                        <motion.div
                          key={step.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                            isActive
                              ? "border-purple-500 bg-purple-500/10"
                              : isComplete
                                ? "border-green-500/30 bg-green-500/5"
                                : "border-border bg-muted/30"
                          }`}
                        >
                          <div className="flex-shrink-0">
                            {isComplete ? (
                              <CheckCircle2 className="w-6 h-6 text-green-400" />
                            ) : isActive ? (
                              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                            ) : (
                              <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div
                              className={`text-sm font-medium ${
                                isComplete
                                  ? "text-green-400"
                                  : isActive
                                    ? "text-purple-400"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {step.label}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
