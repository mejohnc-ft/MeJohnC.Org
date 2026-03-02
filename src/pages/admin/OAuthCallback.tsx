import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import { useSEO } from "@/lib/seo";

type CallbackStatus = "processing" | "success" | "error";

export default function OAuthCallback() {
  useSEO({ title: "OAuth Callback", noIndex: true });

  const { supabase } = useAuthenticatedSupabase();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<CallbackStatus>("processing");
  const [message, setMessage] = useState("Completing authorization...");
  const [errorDetail, setErrorDetail] = useState("");

  useEffect(() => {
    async function handleCallback() {
      if (!supabase) return;

      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      // Provider returned an error
      if (error) {
        setStatus("error");
        setMessage("Authorization denied");
        setErrorDetail(errorDescription || error);
        return;
      }

      if (!code || !state) {
        setStatus("error");
        setMessage("Invalid callback");
        setErrorDetail("Missing authorization code or state parameter.");
        return;
      }

      // Retrieve the stored OAuth state to get integration_id
      const storedIntegrationId = sessionStorage.getItem(
        `oauth_integration_${state}`,
      );
      const storedAgentId = sessionStorage.getItem(`oauth_agent_${state}`);

      if (!storedIntegrationId) {
        setStatus("error");
        setMessage("Session expired");
        setErrorDetail(
          "OAuth state not found in session. Please try connecting again.",
        );
        return;
      }

      try {
        setMessage("Exchanging authorization code...");

        // Call the integration-auth callback via the edge function
        const { error: fnError } = await supabase.functions.invoke(
          "integration-auth",
          {
            body: {
              action: "callback",
              integration_id: storedIntegrationId,
              code,
              state,
              agent_id: storedAgentId,
            },
          },
        );

        if (fnError) {
          throw new Error(fnError.message || "Token exchange failed");
        }

        // Clean up session storage
        sessionStorage.removeItem(`oauth_integration_${state}`);
        sessionStorage.removeItem(`oauth_agent_${state}`);

        setStatus("success");
        setMessage("Connected successfully");
      } catch (err) {
        setStatus("error");
        setMessage("Connection failed");
        setErrorDetail(
          err instanceof Error ? err.message : "An unexpected error occurred.",
        );
      }
    }

    handleCallback();
  }, [supabase, searchParams]);

  return (
    <AdminLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 max-w-md w-full text-center">
          {status === "processing" && (
            <>
              <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
              <h2 className="text-xl font-semibold mb-2">{message}</h2>
              <p className="text-sm text-muted-foreground">
                Please wait while we complete the authorization.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">{message}</h2>
              <p className="text-sm text-muted-foreground mb-6">
                The integration has been authorized and tokens stored securely.
              </p>
              <Button onClick={() => navigate("/admin/integrations")}>
                Back to Integrations
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">{message}</h2>
              {errorDetail && (
                <p className="text-sm text-muted-foreground mb-6">
                  {errorDetail}
                </p>
              )}
              <div className="flex gap-2 justify-center">
                <Button onClick={() => navigate("/admin/integrations")}>
                  Back to Integrations
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
