import { Globe, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { useTenant } from "@/lib/tenant";

const DomainSection = () => {
  const { settings } = useTenantSettings();
  const { tenant } = useTenant();
  const subdomain = settings.domain.subdomain || tenant?.slug || "";

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Globe className="w-5 h-5 text-primary" />
        Domain
      </h3>

      {/* Subdomain */}
      <div>
        <label className="block text-sm font-medium mb-2">Subdomain</label>
        <div className="flex items-center gap-2 max-w-md">
          <div className="flex-1 flex items-center bg-muted/50 border border-border rounded-md overflow-hidden">
            <span className="px-3 py-2 text-sm font-mono bg-muted border-r border-border text-muted-foreground">
              https://
            </span>
            <span className="px-3 py-2 text-sm font-mono font-medium">
              {subdomain || "—"}
            </span>
            <span className="px-3 py-2 text-sm font-mono text-muted-foreground">
              .mejohnc.org
            </span>
          </div>
          {subdomain && (
            <a
              href={`https://${subdomain}.mejohnc.org`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Your subdomain is set when your workspace is created and cannot be
          changed.
        </p>
      </div>

      {/* Custom Domain */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-sm font-medium">Custom Domain</label>
          <Badge variant="outline" className="text-[10px]">
            Coming Soon
          </Badge>
        </div>
        <input
          type="text"
          value={settings.domain.custom_domain || ""}
          disabled
          placeholder="yourdomain.com"
          className="w-full max-w-md px-3 py-2 bg-muted/30 border border-border rounded-md text-sm text-muted-foreground cursor-not-allowed"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Custom domain support will allow you to point your own domain to your
          workspace.
        </p>
      </div>
    </div>
  );
};

export default DomainSection;
