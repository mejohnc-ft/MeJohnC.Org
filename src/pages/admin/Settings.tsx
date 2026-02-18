import { Loader2 } from "lucide-react";
import { useTenant } from "@/lib/tenant";
import PlatformSettings from "./settings/PlatformSettings";
import TenantSettings from "./settings/TenantSettings";

const Settings = () => {
  const { status, isMainSite } = useTenant();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return isMainSite ? <PlatformSettings /> : <TenantSettings />;
};

export default Settings;
