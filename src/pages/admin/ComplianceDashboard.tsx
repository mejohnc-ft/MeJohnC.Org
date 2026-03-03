import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Circle,
  Download,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Shield,
  Activity,
  Lock,
  Eye,
  UserCheck,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSEO } from "@/lib/seo";

type ControlStatus = "complete" | "in-progress" | "not-started";

interface ControlItem {
  id: string;
  name: string;
  status: ControlStatus;
  description?: string;
  link?: string;
}

interface ControlCategory {
  id: string;
  name: string;
  icon: typeof Shield;
  description: string;
  controls: ControlItem[];
}

// Status configuration
const statusConfig: Record<
  ControlStatus,
  {
    icon: typeof CheckCircle2;
    color: string;
    bgColor: string;
    label: string;
  }
> = {
  complete: {
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-500/10",
    label: "Complete",
  },
  "in-progress": {
    icon: Clock,
    color: "text-yellow-600",
    bgColor: "bg-yellow-500/10",
    label: "In Progress",
  },
  "not-started": {
    icon: Circle,
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
    label: "Not Started",
  },
};

// SOC 2 Controls organized by Trust Service Criteria
const controlCategories: ControlCategory[] = [
  {
    id: "security",
    name: "Security",
    icon: Shield,
    description: "Protection against unauthorized access",
    controls: [
      {
        id: "access-control",
        name: "Access Control Documentation",
        status: "complete",
        description: "Clerk authentication and authorization",
        link: "/admin/settings",
      },
      {
        id: "encryption-rest",
        name: "Encryption at Rest",
        status: "complete",
        description: "Supabase encryption for stored data",
      },
      {
        id: "network-security",
        name: "Network Security",
        status: "in-progress",
        description: "Firewall rules and DDoS protection",
      },
      {
        id: "vulnerability-mgmt",
        name: "Vulnerability Management",
        status: "not-started",
        description: "Regular security scans and patching process",
      },
    ],
  },
  {
    id: "availability",
    name: "Availability",
    icon: Activity,
    description: "System accessibility and uptime",
    controls: [
      {
        id: "uptime-monitoring",
        name: "Uptime Monitoring",
        status: "complete",
        description: "Infrastructure monitoring dashboard",
        link: "/admin/infrastructure",
      },
      {
        id: "incident-response",
        name: "Incident Response Procedure",
        status: "not-started",
        description: "Documented process for handling incidents",
      },
      {
        id: "disaster-recovery",
        name: "Disaster Recovery Plan",
        status: "not-started",
        description: "Backup and recovery procedures",
      },
    ],
  },
  {
    id: "processing-integrity",
    name: "Processing Integrity",
    icon: CheckCircle2,
    description: "System processing completeness and accuracy",
    controls: [
      {
        id: "audit-logging",
        name: "Audit Logging",
        status: "complete",
        description: "Comprehensive activity tracking",
        link: "/admin/audit",
      },
      {
        id: "data-validation",
        name: "Data Validation",
        status: "complete",
        description: "Zod schemas for input validation",
      },
      {
        id: "error-handling",
        name: "Error Handling",
        status: "complete",
        description: "Sentry integration for error tracking",
      },
    ],
  },
  {
    id: "confidentiality",
    name: "Confidentiality",
    icon: Lock,
    description: "Protection of confidential information",
    controls: [
      {
        id: "data-classification",
        name: "Data Classification",
        status: "not-started",
        description: "Classify data by sensitivity level",
      },
      {
        id: "encryption-transit",
        name: "Encryption in Transit",
        status: "complete",
        description: "HTTPS for all communications",
      },
      {
        id: "access-reviews",
        name: "Access Reviews",
        status: "not-started",
        description: "Periodic review of user permissions",
      },
    ],
  },
  {
    id: "privacy",
    name: "Privacy",
    icon: Eye,
    description: "Collection, use, and disposal of personal information",
    controls: [
      {
        id: "privacy-policy",
        name: "Privacy Policy",
        status: "not-started",
        description: "Published privacy notice",
      },
      {
        id: "dpa",
        name: "Data Processing Agreement",
        status: "not-started",
        description: "DPA template for customers",
      },
      {
        id: "data-retention",
        name: "Data Retention Policy",
        status: "not-started",
        description: "Documented retention and deletion procedures",
      },
      {
        id: "consent-management",
        name: "Consent Management",
        status: "not-started",
        description: "User consent tracking and management",
      },
    ],
  },
];

// Document templates
const documentTemplates = [
  {
    id: "dpa",
    name: "Data Processing Agreement",
    description: "Template DPA for customer contracts",
    icon: FileText,
  },
  {
    id: "privacy-policy",
    name: "Privacy Policy",
    description: "Privacy notice template",
    icon: Eye,
  },
  {
    id: "vulnerability-disclosure",
    name: "Vulnerability Disclosure Policy",
    description: "Responsible disclosure guidelines",
    icon: Shield,
  },
  {
    id: "incident-response",
    name: "Incident Response Procedure",
    description: "Step-by-step incident handling guide",
    icon: Activity,
  },
];

export default function ComplianceDashboard() {
  useSEO({ title: "Compliance Dashboard", noIndex: true });

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(controlCategories.map((c) => c.id)),
  );

  // Calculate overall readiness
  const totalControls = controlCategories.reduce(
    (sum, cat) => sum + cat.controls.length,
    0,
  );
  const completeControls = controlCategories.reduce(
    (sum, cat) =>
      sum + cat.controls.filter((c) => c.status === "complete").length,
    0,
  );
  const inProgressControls = controlCategories.reduce(
    (sum, cat) =>
      sum + cat.controls.filter((c) => c.status === "in-progress").length,
    0,
  );
  const readinessPercentage = Math.round(
    (completeControls / totalControls) * 100,
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleDownloadTemplate = () => {
    alert("Template generation coming soon");
  };

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-green-600" />
            <div>
              <h1 className="text-3xl font-bold">Compliance Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">
                SOC 2 Type I preparation tracking
              </p>
            </div>
          </div>
        </div>

        {/* Overview Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Readiness Score */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Overall Readiness
              </h3>
              <UserCheck className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <div className="text-4xl font-bold text-foreground mb-2">
                  {readinessPercentage}%
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-green-600 rounded-full h-2 transition-all duration-500"
                    style={{ width: `${readinessPercentage}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              {completeControls} of {totalControls} controls complete
            </div>
          </Card>

          {/* Key Dates */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Key Dates
              </h3>
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground">
                  SOC 2 Type I Target
                </div>
                <div className="text-sm font-medium">Q2 2026</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Last Audit</div>
                <div className="text-sm font-medium text-muted-foreground">
                  Not yet conducted
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Next Review</div>
                <div className="text-sm font-medium">Monthly</div>
              </div>
            </div>
          </Card>

          {/* Status Summary */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Status Summary
              </h3>
              <Activity className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Complete</span>
                </div>
                <span className="text-sm font-semibold">
                  {completeControls}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm">In Progress</span>
                </div>
                <span className="text-sm font-semibold">
                  {inProgressControls}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Circle className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">Not Started</span>
                </div>
                <span className="text-sm font-semibold">
                  {totalControls - completeControls - inProgressControls}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Controls Checklist */}
        <Card className="bg-card border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold">Controls Checklist</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Organized by SOC 2 Trust Service Criteria
            </p>
          </div>

          <div className="divide-y divide-border">
            {controlCategories.map((category, idx) => {
              const isExpanded = expandedCategories.has(category.id);
              const CategoryIcon = category.icon;
              const categoryComplete = category.controls.filter(
                (c) => c.status === "complete",
              ).length;
              const categoryTotal = category.controls.length;
              const categoryProgress = Math.round(
                (categoryComplete / categoryTotal) * 100,
              );

              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full p-6 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <CategoryIcon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold">
                            {category.name}
                          </h3>
                          <Badge
                            variant="outline"
                            className={
                              categoryProgress === 100
                                ? "bg-green-500/10 text-green-600 border-green-500/30"
                                : categoryProgress > 0
                                  ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                                  : "bg-gray-500/10 text-gray-500 border-gray-500/30"
                            }
                          >
                            {categoryComplete}/{categoryTotal} complete
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {category.description}
                        </p>
                        <div className="mt-2 w-48 bg-muted rounded-full h-1.5">
                          <div
                            className="bg-primary rounded-full h-1.5 transition-all duration-500"
                            style={{ width: `${categoryProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Category Controls */}
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-muted/30"
                    >
                      <div className="p-6 pt-0 space-y-3">
                        {category.controls.map((control) => {
                          const statusInfo = statusConfig[control.status];
                          const StatusIcon = statusInfo.icon;

                          return (
                            <div
                              key={control.id}
                              className="flex items-start gap-3 p-4 bg-card rounded-lg border border-border"
                            >
                              <div
                                className={`p-2 rounded-lg ${statusInfo.bgColor}`}
                              >
                                <StatusIcon
                                  className={`w-4 h-4 ${statusInfo.color}`}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-sm font-semibold">
                                    {control.name}
                                  </h4>
                                  <Badge
                                    variant="outline"
                                    className={`${statusInfo.bgColor} ${statusInfo.color} border-${statusInfo.color.replace("text-", "")}/30 text-xs`}
                                  >
                                    {statusInfo.label}
                                  </Badge>
                                </div>
                                {control.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {control.description}
                                  </p>
                                )}
                              </div>
                              {control.link && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                  className="flex-shrink-0"
                                >
                                  <a href={control.link}>
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </Card>

        {/* Document Templates */}
        <Card className="bg-card border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold">Document Templates</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Download policy and procedure templates
            </p>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {documentTemplates.map((template) => {
              const TemplateIcon = template.icon;
              return (
                <div
                  key={template.id}
                  className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border border-border"
                >
                  <div className="p-3 rounded-lg bg-primary/10">
                    <TemplateIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold mb-1">
                      {template.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      {template.description}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadTemplate()}
                    >
                      <Download className="w-3 h-3 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </motion.div>
    </AdminLayout>
  );
}
