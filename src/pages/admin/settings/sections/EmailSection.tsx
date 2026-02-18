import { useState } from "react";
import { Save, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import type { TenantEmail } from "@/lib/tenant-settings";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EmailSection = () => {
  const { settings, saveEmail, isSaving } = useTenantSettings();
  const [email, setEmail] = useState<TenantEmail>(settings.email);
  const [saveMessage, setSaveMessage] = useState("");
  const [validationError, setValidationError] = useState("");

  const handleSave = async () => {
    if (email.from_address && !EMAIL_REGEX.test(email.from_address)) {
      setValidationError("Please enter a valid email address");
      return;
    }
    setValidationError("");
    await saveEmail(email);
    setSaveMessage("Saved!");
    setTimeout(() => setSaveMessage(""), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Mail className="w-5 h-5 text-primary" />
        Email Settings
      </h3>

      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-1">From Name</label>
          <input
            type="text"
            value={email.from_name}
            onChange={(e) => setEmail({ ...email, from_name: e.target.value })}
            placeholder="Your Company"
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            The name that appears in the "From" field of emails sent from your
            workspace.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">From Address</label>
          <input
            type="email"
            value={email.from_address}
            onChange={(e) => {
              setEmail({ ...email, from_address: e.target.value });
              if (validationError) setValidationError("");
            }}
            placeholder="noreply@yourcompany.com"
            className={`w-full px-3 py-2 bg-background border rounded-md text-sm ${
              validationError ? "border-red-500" : "border-border"
            }`}
          />
          {validationError && (
            <p className="text-xs text-red-400 mt-1">{validationError}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            The email address used as the sender for outgoing emails.
          </p>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
          ) : (
            <Save className="w-4 h-4 mr-1" />
          )}
          Save Email Settings
        </Button>
        {saveMessage && (
          <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
            {saveMessage}
          </span>
        )}
      </div>
    </div>
  );
};

export default EmailSection;
