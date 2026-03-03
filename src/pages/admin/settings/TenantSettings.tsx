import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, RotateCcw, Loader2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useSEO } from "@/lib/seo";
import { useTenant } from "@/lib/tenant";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { useI18n } from "@/lib/i18n";
import BrandSection from "./sections/BrandSection";
import ThemeSection from "./sections/ThemeSection";
import AppsSection from "./sections/AppsSection";
import DomainSection from "./sections/DomainSection";
import EmailSection from "./sections/EmailSection";
import PlanSection from "./sections/PlanSection";

const TenantSettings = () => {
  useSEO({ title: "Tenant Settings", noIndex: true });
  const { refreshTenant } = useTenant();
  const { saveOnboardingComplete, saveOnboardingStep, isSaving } =
    useTenantSettings();
  const { t } = useI18n();
  const [resetting, setResetting] = useState(false);

  const handleRerunWizard = async () => {
    setResetting(true);
    try {
      await saveOnboardingComplete(false);
      await saveOnboardingStep(0);
      refreshTenant();
    } finally {
      setResetting(false);
    }
  };

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <Settings className="w-8 h-8 text-primary" />
              Tenant Settings
            </h1>
            <p className="text-muted-foreground">
              Customize branding, apps, and configuration for your workspace
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRerunWizard}
            disabled={resetting || isSaving}
          >
            {resetting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <RotateCcw className="w-4 h-4 mr-1" />
            )}
            Run Setup Wizard Again
          </Button>
        </div>

        <Tabs defaultValue="brand" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="brand">Brand</TabsTrigger>
            <TabsTrigger value="theme">Theme</TabsTrigger>
            <TabsTrigger value="apps">Apps</TabsTrigger>
            <TabsTrigger value="domain">Domain</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="plan">Plan</TabsTrigger>
            <TabsTrigger value="language">Language</TabsTrigger>
          </TabsList>

          <TabsContent value="brand">
            <BrandSection />
          </TabsContent>
          <TabsContent value="theme">
            <ThemeSection />
          </TabsContent>
          <TabsContent value="apps">
            <AppsSection />
          </TabsContent>
          <TabsContent value="domain">
            <DomainSection />
          </TabsContent>
          <TabsContent value="email">
            <EmailSection />
          </TabsContent>
          <TabsContent value="plan">
            <PlanSection />
          </TabsContent>
          <TabsContent value="language">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t("settings.language")}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Choose your preferred language for the interface
              </p>
              <div className="flex items-center gap-4">
                <LanguageSwitcher />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </AdminLayout>
  );
};

export default TenantSettings;
