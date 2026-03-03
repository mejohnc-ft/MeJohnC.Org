import { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Users,
  DollarSign,
  Handshake,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Calendar,
  Building2,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useSEO } from "@/lib/seo";

interface PartnerTier {
  name: string;
  commission: number;
  maxTenants: number | null;
  features: string[];
  isCurrent: boolean;
}

interface Referral {
  id: string;
  name: string;
  email: string;
  status: "pending" | "converted" | "expired";
  date: string;
  revenue: number;
}

interface ManagedTenant {
  id: string;
  name: string;
  plan: string;
  status: "active" | "suspended" | "trial";
  monthlyRevenue: number;
  createdDate: string;
}

interface Payout {
  id: string;
  month: string;
  grossRevenue: number;
  commissionRate: number;
  payoutAmount: number;
  status: "paid" | "pending";
}

const PartnerProgram = () => {
  useSEO({ title: "Partner Program", noIndex: true });

  const [copiedLink, setCopiedLink] = useState(false);

  // Mock data - would come from API in production
  const partnerCode = "PARTNER2024";
  const referralLink = `https://app.businessos.com/r/${partnerCode}`;

  const stats = [
    {
      label: "Total Partners",
      value: "12",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Active Tenants",
      value: "47",
      icon: Building2,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Monthly Revenue",
      value: "$12,450",
      icon: DollarSign,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Commission Payouts",
      value: "$2,490",
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  const tiers: PartnerTier[] = [
    {
      name: "Referral Partner",
      commission: 10,
      maxTenants: 5,
      features: [
        "Up to 5 tenants",
        "10% commission",
        "Basic support",
        "Partner dashboard access",
      ],
      isCurrent: true,
    },
    {
      name: "Agency Partner",
      commission: 20,
      maxTenants: 25,
      features: [
        "Up to 25 tenants",
        "20% commission",
        "Priority support",
        "White-label options",
        "Marketing materials",
      ],
      isCurrent: false,
    },
    {
      name: "Enterprise Partner",
      commission: 30,
      maxTenants: null,
      features: [
        "Unlimited tenants",
        "30% commission",
        "Dedicated account manager",
        "Custom pricing",
        "Co-marketing opportunities",
      ],
      isCurrent: false,
    },
  ];

  const referralStats = {
    total: 24,
    converted: 12,
    pending: 8,
    revenueGenerated: 8450,
  };

  const recentReferrals: Referral[] = [
    {
      id: "1",
      name: "Acme Corp",
      email: "contact@acme.com",
      status: "converted",
      date: "2026-02-28",
      revenue: 499,
    },
    {
      id: "2",
      name: "Tech Startup Inc",
      email: "info@techstartup.com",
      status: "pending",
      date: "2026-02-25",
      revenue: 0,
    },
    {
      id: "3",
      name: "Design Agency",
      email: "hello@designagency.com",
      status: "converted",
      date: "2026-02-20",
      revenue: 999,
    },
    {
      id: "4",
      name: "Marketing Solutions",
      email: "contact@marketing.com",
      status: "expired",
      date: "2026-02-10",
      revenue: 0,
    },
  ];

  const managedTenants: ManagedTenant[] = [
    {
      id: "1",
      name: "Acme Corp",
      plan: "Business",
      status: "active",
      monthlyRevenue: 499,
      createdDate: "2026-01-15",
    },
    {
      id: "2",
      name: "Design Agency",
      plan: "Professional",
      status: "active",
      monthlyRevenue: 999,
      createdDate: "2026-01-22",
    },
    {
      id: "3",
      name: "Consulting Firm",
      plan: "Business",
      status: "trial",
      monthlyRevenue: 0,
      createdDate: "2026-02-28",
    },
  ];

  const payoutHistory: Payout[] = [
    {
      id: "1",
      month: "February 2026",
      grossRevenue: 12450,
      commissionRate: 10,
      payoutAmount: 1245,
      status: "pending",
    },
    {
      id: "2",
      month: "January 2026",
      grossRevenue: 11250,
      commissionRate: 10,
      payoutAmount: 1125,
      status: "paid",
    },
    {
      id: "3",
      month: "December 2025",
      grossRevenue: 8900,
      commissionRate: 10,
      payoutAmount: 890,
      status: "paid",
    },
  ];

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleAddTenant = () => {
    // Show coming soon toast - in production would open modal
    alert("Coming soon: Add new tenant");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        label: string;
      }
    > = {
      active: { variant: "default", label: "Active" },
      suspended: { variant: "destructive", label: "Suspended" },
      trial: { variant: "secondary", label: "Trial" },
      pending: { variant: "secondary", label: "Pending" },
      converted: { variant: "default", label: "Converted" },
      expired: { variant: "outline", label: "Expired" },
      paid: { variant: "default", label: "Paid" },
    };
    const config = variants[status] || variants.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Partner Program
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your partnerships, referrals, and commission payouts.
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {stat.label}
                        </p>
                        <p className="text-3xl font-bold text-foreground mt-1">
                          {stat.value}
                        </p>
                      </div>
                      <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                        <Icon className={`w-6 h-6 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Partner Tiers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Partner Tiers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tiers.map((tier) => (
              <Card
                key={tier.name}
                className={tier.isCurrent ? "border-primary border-2" : ""}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{tier.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {tier.maxTenants
                          ? `Up to ${tier.maxTenants} tenants`
                          : "Unlimited tenants"}
                      </CardDescription>
                    </div>
                    {tier.isCurrent && <Badge variant="default">Current</Badge>}
                  </div>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-primary">
                      {tier.commission}%
                    </span>
                    <span className="text-muted-foreground ml-2">
                      commission
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {tier.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {!tier.isCurrent && (
                    <Button className="w-full mt-4" variant="outline">
                      Apply for Upgrade
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Referral Tracking */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Handshake className="w-5 h-5" />
                Referral Tracking
              </CardTitle>
              <CardDescription>
                Share your referral link and track conversions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Referral Link */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Your Referral Link
                </label>
                <div className="flex gap-2">
                  <Input
                    value={referralLink}
                    readOnly
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    onClick={copyReferralLink}
                    variant="outline"
                    size="icon"
                  >
                    {copiedLink ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a
                      href={referralLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>

              {/* Referral Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Total Referrals
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {referralStats.total}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Converted</p>
                  <p className="text-2xl font-bold text-green-500 mt-1">
                    {referralStats.converted}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-orange-500 mt-1">
                    {referralStats.pending}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Revenue Generated
                  </p>
                  <p className="text-2xl font-bold text-primary mt-1">
                    ${referralStats.revenueGenerated.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Recent Referrals Table */}
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3">
                  Recent Referrals
                </h3>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Revenue
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {recentReferrals.map((referral) => (
                        <tr key={referral.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {referral.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {referral.email}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(referral.status)}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {new Date(referral.date).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground text-right font-medium">
                            {referral.revenue > 0
                              ? `$${referral.revenue}`
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Managed Tenants */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Managed Tenants
                  </CardTitle>
                  <CardDescription>Tenant instances you manage</CardDescription>
                </div>
                <Button onClick={handleAddTenant} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Tenant
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Tenant
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Monthly Revenue
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {managedTenants.map((tenant) => (
                      <tr key={tenant.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-sm font-medium text-foreground">
                          {tenant.name}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{tenant.plan}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(tenant.status)}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground text-right font-medium">
                          {tenant.monthlyRevenue > 0
                            ? `$${tenant.monthlyRevenue}`
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(tenant.createdDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Payout History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Payout History
              </CardTitle>
              <CardDescription>Track your commission payouts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Month
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Gross Revenue
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Commission Rate
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Payout Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payoutHistory.map((payout) => (
                      <tr key={payout.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-sm text-foreground font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {payout.month}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground text-right">
                          ${payout.grossRevenue.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-primary text-center font-semibold">
                          {payout.commissionRate}%
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground text-right font-bold">
                          ${payout.payoutAmount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(payout.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default PartnerProgram;
