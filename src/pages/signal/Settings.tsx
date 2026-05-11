import { useState } from "react";
import { Bell, Clock, Key } from "lucide-react";
import SignalLayout from "@/components/SignalLayout";
import { useSEO } from "@/lib/seo";

type Tab = "notifications" | "sources" | "integrations";

interface NotifChannel {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  minSeverity: "monitor" | "alert" | "urgent";
}

const defaultChannels: NotifChannel[] = [
  {
    id: "in_app",
    label: "In-app",
    description: "Real-time alerts in the Signal workspace",
    enabled: true,
    minSeverity: "monitor",
  },
  {
    id: "email",
    label: "Email",
    description: "Alerts sent to your account email via Resend",
    enabled: false,
    minSeverity: "alert",
  },
  {
    id: "sms",
    label: "SMS",
    description: "Urgent-tier alerts via Twilio",
    enabled: false,
    minSeverity: "urgent",
  },
];

const integrations = [
  {
    id: "polygon",
    label: "Polygon.io",
    description: "Real-time and delayed market data",
    envKey: "POLYGON_API_KEY",
    required: true,
  },
  {
    id: "capitol_trades",
    label: "Capitol Trades",
    description: "Congressional PTR filings API",
    envKey: "CAPITOL_TRADES_API_KEY",
    required: true,
  },
  {
    id: "resend",
    label: "Resend",
    description: "Transactional email for alerts",
    envKey: "RESEND_API_KEY",
    required: false,
  },
  {
    id: "twilio",
    label: "Twilio",
    description: "SMS alerts for urgent firings",
    envKey: "TWILIO_ACCOUNT_SID",
    required: false,
  },
];

export default function SignalSettings() {
  useSEO({ title: "Signal — Settings", noIndex: true });
  const [activeTab, setActiveTab] = useState<Tab>("notifications");
  const [channels, setChannels] = useState(defaultChannels);
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("08:00");

  const toggleChannel = (id: string) =>
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)),
    );

  const setSeverity = (id: string, sev: NotifChannel["minSeverity"]) =>
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, minSeverity: sev } : c)),
    );

  const tabs: { id: Tab; label: string }[] = [
    { id: "notifications", label: "Notifications" },
    { id: "sources", label: "Signal sources" },
    { id: "integrations", label: "Integrations" },
  ];

  return (
    <SignalLayout>
      <div className="p-6 max-w-3xl space-y-5">
        <div>
          <h1 className="text-lg font-medium">Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Alert thresholds, notification channels, and API keys
          </p>
        </div>

        {/* Tab nav */}
        <div className="flex items-center gap-1 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
                activeTab === t.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Notifications tab */}
        {activeTab === "notifications" && (
          <div className="space-y-4">
            {channels.map((ch) => (
              <div
                key={ch.id}
                className="bg-card border border-border rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium">{ch.label}</p>
                  </div>
                  <button
                    onClick={() => toggleChannel(ch.id)}
                    className={`w-10 h-5 rounded-full transition-colors ${
                      ch.enabled ? "bg-primary" : "bg-muted"
                    }`}
                    aria-label={ch.enabled ? "Disable" : "Enable"}
                  >
                    <span
                      className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${
                        ch.enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">
                  {ch.description}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    Minimum severity:
                  </p>
                  <div className="flex items-center gap-1">
                    {(["monitor", "alert", "urgent"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSeverity(ch.id, s)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                          ch.minSeverity === s
                            ? s === "monitor"
                              ? "bg-amber-500/20 text-amber-500"
                              : s === "alert"
                                ? "bg-orange-500/20 text-orange-500"
                                : "bg-red-500/20 text-red-500"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Quiet hours */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-medium">Quiet hours</p>
              </div>
              <p className="text-[11px] text-muted-foreground mb-4">
                No alerts delivered during this window (all channels).
              </p>
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Start
                  </label>
                  <input
                    type="time"
                    value={quietStart}
                    onChange={(e) => setQuietStart(e.target.value)}
                    className="px-3 py-2 bg-background border border-border rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                    End
                  </label>
                  <input
                    type="time"
                    value={quietEnd}
                    onChange={(e) => setQuietEnd(e.target.value)}
                    className="px-3 py-2 bg-background border border-border rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Signal sources tab */}
        {activeTab === "sources" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Each source is a Supabase Edge Function on a cron schedule.
              Configure them in{" "}
              <code className="font-mono bg-muted px-1 py-0.5 rounded text-[11px]">
                supabase/functions/
              </code>
              .
            </p>
            {[
              {
                id: "edgar_8k",
                label: "SEC EDGAR — 8-K",
                schedule: "every 5 min",
                status: "pending",
              },
              {
                id: "edgar_form4",
                label: "SEC EDGAR — Form 4",
                schedule: "every 15 min",
                status: "pending",
              },
              {
                id: "edgar_13dg",
                label: "SEC EDGAR — 13D/G",
                schedule: "every 30 min",
                status: "pending",
              },
              {
                id: "whitehouse",
                label: "White House press releases",
                schedule: "every 15 min",
                status: "pending",
              },
              {
                id: "fed_register",
                label: "Federal Register",
                schedule: "hourly",
                status: "pending",
              },
              {
                id: "dod",
                label: "DOD contract announcements",
                schedule: "daily 5pm ET",
                status: "pending",
              },
              {
                id: "capitol_trades",
                label: "Capitol Trades",
                schedule: "every 30 min",
                status: "pending",
              },
              {
                id: "substack",
                label: "Substack RSS (configurable)",
                schedule: "hourly",
                status: "pending",
              },
              {
                id: "earnings",
                label: "NASDAQ earnings calendar",
                schedule: "daily",
                status: "pending",
              },
              {
                id: "fomc",
                label: "FOMC / macro calendar",
                schedule: "weekly",
                status: "pending",
              },
            ].map((src) => (
              <div
                key={src.id}
                className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-medium">{src.label}</p>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    {src.schedule}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground/60 border border-border px-2 py-0.5 rounded-full">
                  {src.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Integrations tab */}
        {activeTab === "integrations" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Set these as environment variables in Netlify and Supabase Vault.
            </p>
            {integrations.map((int) => (
              <div
                key={int.id}
                className="bg-card border border-border rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">{int.label}</p>
                  {int.required && (
                    <span className="text-[10px] text-red-500 font-mono">
                      required
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">
                  {int.description}
                </p>
                <div className="flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <code className="text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {int.envKey}
                  </code>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SignalLayout>
  );
}
