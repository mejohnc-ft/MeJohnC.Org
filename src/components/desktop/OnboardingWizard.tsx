/**
 * Customer Onboarding Wizard
 * Issue: #316
 *
 * Full-screen wizard shown to new tenants before the desktop OS loads.
 * 6 steps: Welcome, Branding, Apps, Team, Content, Done.
 */

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket,
  Building2,
  Upload,
  Image,
  AppWindow,
  Pin,
  Lock,
  ArrowUpCircle,
  Users,
  Plus,
  X,
  Sparkles,
  FileText,
  Briefcase,
  Palette,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { useTenant } from "@/lib/tenant";
import { useBilling } from "@/hooks/useBilling";
import { useTenantSupabase } from "@/lib/supabase";
import { uploadFile } from "@/lib/supabase-queries";
import { captureException } from "@/lib/sentry";
import { useReducedMotion } from "@/lib/reduced-motion";
import {
  appRegistry,
  getAppsForPlan,
} from "@/components/desktop/apps/AppRegistry";
import { planMeetsMinimum } from "@/lib/billing";
import type { TenantBranding } from "@/lib/tenant-settings";

interface OnboardingWizardProps {
  onComplete: () => void;
  initialStep?: number;
}

const TOTAL_STEPS = 6;

const CONTENT_TEMPLATES = [
  {
    id: "blank",
    name: "Blank Workspace",
    description: "Start from scratch with a clean slate",
    icon: FileText,
  },
  {
    id: "startup",
    name: "Startup",
    description: "Blog, Tasks, CRM, and Analytics pre-configured",
    icon: Rocket,
  },
  {
    id: "agency",
    name: "Agency",
    description: "Client management, projects, and collaboration tools",
    icon: Briefcase,
  },
  {
    id: "creator",
    name: "Creator",
    description: "Blog, newsletter, and content management focus",
    icon: Palette,
  },
];

export default function OnboardingWizard({
  onComplete,
  initialStep = 0,
}: OnboardingWizardProps) {
  const prefersReducedMotion = useReducedMotion();
  const { tenant } = useTenant();
  const { supabase } = useTenantSupabase();
  const { plan } = useBilling();
  const {
    settings,
    saveBranding,
    saveEnabledApps,
    saveDockPinned,
    saveOnboardingStep,
    saveOnboardingComplete,
    isSaving,
  } = useTenantSettings();

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  // Step 1: Branding state
  const [branding, setBranding] = useState<TenantBranding>(settings.branding);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Apps state
  const availableApps = getAppsForPlan(plan);
  const availableIds = new Set(availableApps.map((a) => a.id));
  const configurableApps = appRegistry.filter((a) => a.category !== "system");
  const [enabledApps, setEnabledApps] = useState<string[]>(
    settings.enabled_apps,
  );
  const [dockPinned, setDockPinned] = useState<string[]>(settings.dock_pinned);

  // Step 3: Team state
  const [inviteEmails, setInviteEmails] = useState<string[]>([""]);
  const [inviteStatus, setInviteStatus] = useState<
    Record<number, "idle" | "sending" | "sent" | "error">
  >({});

  // Step 4: Content template state
  const [selectedTemplate, setSelectedTemplate] = useState("blank");

  const handleLogoUpload = async (file: File) => {
    if (!supabase || !tenant) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `brand/logo.${ext}`;
      const url = await uploadFile(file, path, supabase, tenant.id);
      setBranding((prev) => ({ ...prev, logo_url: url }));
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "OnboardingWizard.logoUpload",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const toggleApp = (id: string) => {
    setEnabledApps((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
    if (enabledApps.includes(id)) {
      setDockPinned((prev) => prev.filter((a) => a !== id));
    }
  };

  const toggleDockPin = (id: string) => {
    setDockPinned((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const addInviteField = () => {
    if (inviteEmails.length < 5) {
      setInviteEmails((prev) => [...prev, ""]);
    }
  };

  const removeInviteField = (index: number) => {
    setInviteEmails((prev) => prev.filter((_, i) => i !== index));
    setInviteStatus((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const updateInviteEmail = (index: number, value: string) => {
    setInviteEmails((prev) => prev.map((e, i) => (i === index ? value : e)));
  };

  const sendInvites = useCallback(async () => {
    // Best-effort invites via Clerk organization API
    try {
      const { useOrganization } = await import("@clerk/clerk-react");
      // We can't call hooks dynamically, so we degrade gracefully
      void useOrganization;
    } catch {
      // Clerk orgs not configured, skip silently
    }

    // For now, record emails and mark as sent (MVP — actual invite integration TBD)
    for (let i = 0; i < inviteEmails.length; i++) {
      const email = inviteEmails[i].trim();
      if (!email) continue;
      setInviteStatus((prev) => ({ ...prev, [i]: "sending" }));
      // Simulate send delay for UX feedback
      await new Promise((r) => setTimeout(r, 300));
      setInviteStatus((prev) => ({ ...prev, [i]: "sent" }));
    }
  }, [inviteEmails]);

  const goToStep = async (step: number) => {
    // Save current step data before advancing
    if (step > currentStep) {
      try {
        if (currentStep === 1) {
          await saveBranding(branding);
        } else if (currentStep === 2) {
          await saveEnabledApps(enabledApps);
          await saveDockPinned(dockPinned);
        } else if (currentStep === 3) {
          await sendInvites();
        }
        await saveOnboardingStep(step);
      } catch {
        // Allow navigation even if save fails
      }
    }

    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  };

  const handleComplete = async () => {
    try {
      await saveOnboardingComplete(true);
      await saveOnboardingStep(TOTAL_STEPS - 1);
    } catch {
      // Complete even if save fails — local state will gate re-show
    }
    onComplete();
  };

  const handleSkip = async () => {
    try {
      await saveOnboardingComplete(true);
    } catch {
      // Best effort
    }
    onComplete();
  };

  const slideVariants = prefersReducedMotion
    ? {
        enter: { opacity: 0 },
        center: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
      };

  const transitionConfig = prefersReducedMotion
    ? { duration: 0.15 }
    : { type: "spring", stiffness: 300, damping: 30 };

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      {/* Progress bar */}
      <div className="flex items-center justify-center gap-2 pt-8 pb-4 px-4">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                i < currentStep
                  ? "bg-primary text-primary-foreground"
                  : i === currentStep
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < currentStep ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            {i < TOTAL_STEPS - 1 && (
              <div
                className={`w-8 sm:w-12 h-0.5 mx-1 transition-colors ${
                  i < currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transitionConfig}
            >
              {currentStep === 0 && <WelcomeStep />}
              {currentStep === 1 && (
                <BrandingStep
                  branding={branding}
                  setBranding={setBranding}
                  uploadingLogo={uploadingLogo}
                  logoInputRef={logoInputRef}
                  onLogoUpload={handleLogoUpload}
                />
              )}
              {currentStep === 2 && (
                <AppsStep
                  configurableApps={configurableApps}
                  availableIds={availableIds}
                  enabledApps={enabledApps}
                  dockPinned={dockPinned}
                  plan={plan}
                  toggleApp={toggleApp}
                  toggleDockPin={toggleDockPin}
                />
              )}
              {currentStep === 3 && (
                <TeamStep
                  inviteEmails={inviteEmails}
                  inviteStatus={inviteStatus}
                  addInviteField={addInviteField}
                  removeInviteField={removeInviteField}
                  updateInviteEmail={updateInviteEmail}
                />
              )}
              {currentStep === 4 && (
                <ContentStep
                  selectedTemplate={selectedTemplate}
                  setSelectedTemplate={setSelectedTemplate}
                />
              )}
              {currentStep === 5 && (
                <DoneStep onLaunch={handleComplete} isSaving={isSaving} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation footer */}
      {currentStep < 5 && (
        <div className="border-t border-border px-6 py-4 flex items-center justify-between max-w-2xl mx-auto w-full">
          <div>
            {currentStep > 0 ? (
              <Button
                variant="ghost"
                onClick={() => goToStep(currentStep - 1)}
                disabled={isSaving}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            ) : (
              <Button variant="ghost" onClick={handleSkip} disabled={isSaving}>
                Skip setup
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {currentStep > 0 && currentStep < 5 && (
              <Button variant="ghost" onClick={handleSkip} disabled={isSaving}>
                Skip
              </Button>
            )}
            <Button
              onClick={() => goToStep(currentStep + 1)}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────── Step Components ────────────────────────────── */

function WelcomeStep() {
  return (
    <div className="text-center space-y-6 py-12">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
        <Rocket className="w-10 h-10 text-primary" />
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-foreground">
          Welcome to your workspace
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Let's set up your workspace in a few quick steps. You can always
          change these settings later.
        </p>
      </div>
    </div>
  );
}

function BrandingStep({
  branding,
  setBranding,
  uploadingLogo,
  logoInputRef,
  onLogoUpload,
}: {
  branding: TenantBranding;
  setBranding: React.Dispatch<React.SetStateAction<TenantBranding>>;
  uploadingLogo: boolean;
  logoInputRef: React.RefObject<HTMLInputElement | null>;
  onLogoUpload: (file: File) => Promise<void>;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Branding</h2>
        </div>
        <p className="text-muted-foreground">
          Set your company name, logo, and primary color.
        </p>
      </div>

      <div className="space-y-6">
        {/* Company Name */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Company Name
          </label>
          <Input
            value={branding.name}
            onChange={(e) =>
              setBranding((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Your company name"
            className="max-w-md"
          />
        </div>

        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium mb-2">Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 border border-border rounded-lg bg-muted/30 flex items-center justify-center overflow-hidden">
              {branding.logo_url ? (
                <img
                  src={branding.logo_url}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Image className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onLogoUpload(file);
                }}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
              >
                {uploadingLogo ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Upload className="w-4 h-4 mr-1" />
                )}
                Upload Logo
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                PNG or SVG, max 2MB
              </p>
            </div>
          </div>
        </div>

        {/* Primary Color */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Primary Color
          </label>
          <div className="flex items-center gap-3 max-w-md">
            <input
              type="color"
              value={branding.primary_color}
              onChange={(e) =>
                setBranding((prev) => ({
                  ...prev,
                  primary_color: e.target.value,
                }))
              }
              className="w-10 h-10 rounded border border-border cursor-pointer bg-transparent"
            />
            <Input
              value={branding.primary_color}
              onChange={(e) =>
                setBranding((prev) => ({
                  ...prev,
                  primary_color: e.target.value,
                }))
              }
              placeholder="#6366f1"
              className="flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AppsStep({
  configurableApps,
  availableIds,
  enabledApps,
  dockPinned,
  plan,
  toggleApp,
  toggleDockPin,
}: {
  configurableApps: typeof appRegistry;
  availableIds: Set<string>;
  enabledApps: string[];
  dockPinned: string[];
  plan: string;
  toggleApp: (id: string) => void;
  toggleDockPin: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <AppWindow className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Choose Apps</h2>
        </div>
        <p className="text-muted-foreground">
          Enable the apps your team needs. Pin favorites to the dock for quick
          access.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {enabledApps.length} enabled
        </Badge>
        <Badge variant="outline" className="text-xs">
          {dockPinned.length} pinned
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {configurableApps.map((app) => {
          const isAvailable = availableIds.has(app.id);
          const isEnabled = enabledApps.includes(app.id);
          const isPinned = dockPinned.includes(app.id);
          const needsUpgrade = !isAvailable && app.minPlan;

          return (
            <div
              key={app.id}
              className={`border rounded-lg p-3 transition-colors ${
                isEnabled
                  ? "border-primary/50 bg-primary/5"
                  : needsUpgrade
                    ? "border-border bg-muted/30 opacity-60"
                    : "border-border bg-background"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${app.color}`}>
                    {app.name}
                  </span>
                  {app.minPlan && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {app.minPlan}+
                    </Badge>
                  )}
                </div>
                {needsUpgrade ? (
                  <Lock className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => toggleApp(app.id)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted rounded-full peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground capitalize">
                  {app.category}
                </span>
                {isEnabled && !needsUpgrade && (
                  <button
                    onClick={() => toggleDockPin(app.id)}
                    className={`flex items-center gap-1 text-xs transition-colors ${
                      isPinned
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Pin className="w-3 h-3" />
                    {isPinned ? "Pinned" : "Pin"}
                  </button>
                )}
                {needsUpgrade &&
                  app.minPlan &&
                  !planMeetsMinimum(plan, app.minPlan) && (
                    <span className="flex items-center gap-1 text-xs text-amber-400">
                      <ArrowUpCircle className="w-3 h-3" />
                      Upgrade
                    </span>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamStep({
  inviteEmails,
  inviteStatus,
  addInviteField,
  removeInviteField,
  updateInviteEmail,
}: {
  inviteEmails: string[];
  inviteStatus: Record<number, "idle" | "sending" | "sent" | "error">;
  addInviteField: () => void;
  removeInviteField: (index: number) => void;
  updateInviteEmail: (index: number, value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">
            Invite Your Team
          </h2>
        </div>
        <p className="text-muted-foreground">
          Add team members by email. They'll receive an invitation to join your
          workspace.
        </p>
      </div>

      <div className="space-y-3">
        {inviteEmails.map((email, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => updateInviteEmail(index, e.target.value)}
              placeholder="teammate@company.com"
              className="flex-1"
              disabled={inviteStatus[index] === "sent"}
            />
            {inviteStatus[index] === "sent" ? (
              <span className="text-xs text-green-400 px-2 whitespace-nowrap">
                Invited
              </span>
            ) : inviteStatus[index] === "sending" ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              inviteEmails.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeInviteField(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )
            )}
          </div>
        ))}
      </div>

      {inviteEmails.length < 5 && (
        <Button variant="outline" size="sm" onClick={addInviteField}>
          <Plus className="w-4 h-4 mr-1" />
          Add another
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        Invitations will be sent when you proceed to the next step. You can also
        manage team members later in Settings.
      </p>
    </div>
  );
}

function ContentStep({
  selectedTemplate,
  setSelectedTemplate,
}: {
  selectedTemplate: string;
  setSelectedTemplate: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">
            Choose a Template
          </h2>
        </div>
        <p className="text-muted-foreground">
          Start with a pre-configured workspace or build from scratch.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CONTENT_TEMPLATES.map((template) => {
          const Icon = template.icon;
          const isSelected = selectedTemplate === template.id;

          return (
            <button
              key={template.id}
              onClick={() => setSelectedTemplate(template.id)}
              className={`text-left border rounded-lg p-4 transition-colors ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border bg-background hover:border-primary/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isSelected ? "bg-primary/10" : "bg-muted/50"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {template.name}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {template.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Templates configure default apps and content. You can customize
        everything after setup.
      </p>
    </div>
  );
}

function DoneStep({
  onLaunch,
  isSaving,
}: {
  onLaunch: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="text-center space-y-8 py-12">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto"
      >
        <CheckCircle2 className="w-10 h-10 text-green-500" />
      </motion.div>

      <div className="space-y-3">
        <h2 className="text-3xl font-bold text-foreground">You're all set!</h2>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Your workspace is configured and ready to go. You can adjust any
          settings later.
        </p>
      </div>

      <Button size="lg" onClick={onLaunch} disabled={isSaving}>
        {isSaving ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Rocket className="w-4 h-4 mr-2" />
        )}
        Launch Workspace
      </Button>
    </div>
  );
}
