import { useState, useRef } from "react";
import { Save, Loader2, Upload, Image, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { uploadFile } from "@/lib/supabase-queries";
import { useTenantSupabase } from "@/lib/supabase";
import { useTenant } from "@/lib/tenant";
import { captureException } from "@/lib/sentry";
import type { TenantBranding } from "@/lib/tenant-settings";

const BrandSection = () => {
  const { settings, saveBranding, isSaving } = useTenantSettings();
  const { supabase } = useTenantSupabase();
  const { tenant } = useTenant();
  const [branding, setBranding] = useState<TenantBranding>(settings.branding);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (
    file: File,
    field: "logo_url" | "favicon_url",
    setUploading: (v: boolean) => void,
  ) => {
    if (!supabase || !tenant) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `brand/${field === "logo_url" ? "logo" : "favicon"}.${ext}`;
      const url = await uploadFile(file, path, supabase, tenant.id);
      setBranding((prev) => ({ ...prev, [field]: url }));
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: `BrandSection.upload.${field}`,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    await saveBranding(branding);
    setSaveMessage("Saved!");
    setTimeout(() => setSaveMessage(""), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Building2 className="w-5 h-5 text-primary" />
        Branding
      </h3>

      {/* Company Name */}
      <div>
        <label className="block text-sm font-medium mb-1">Company Name</label>
        <input
          type="text"
          value={branding.name}
          onChange={(e) => setBranding({ ...branding, name: e.target.value })}
          placeholder="Your company name"
          className="w-full max-w-md px-3 py-2 bg-background border border-border rounded-md text-sm"
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
                if (file) handleUpload(file, "logo_url", setUploadingLogo);
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

      {/* Favicon Upload */}
      <div>
        <label className="block text-sm font-medium mb-2">Favicon</label>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 border border-border rounded-lg bg-muted/30 flex items-center justify-center overflow-hidden">
            {branding.favicon_url ? (
              <img
                src={branding.favicon_url}
                alt="Favicon"
                className="w-full h-full object-contain"
              />
            ) : (
              <Image className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <input
              ref={faviconInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file)
                  handleUpload(file, "favicon_url", setUploadingFavicon);
              }}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => faviconInputRef.current?.click()}
              disabled={uploadingFavicon}
            >
              {uploadingFavicon ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Upload className="w-4 h-4 mr-1" />
              )}
              Upload Favicon
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              32x32 or 64x64 PNG
            </p>
          </div>
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
          Save Branding
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

export default BrandSection;
