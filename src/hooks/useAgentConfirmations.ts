import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import type { AgentConfirmation } from "@/lib/schemas";

interface UseAgentConfirmationsReturn {
  pending: AgentConfirmation[];
  pendingCount: number;
  isLoading: boolean;
  respond: (id: string, approved: boolean) => Promise<void>;
  refresh: () => void;
}

/**
 * Hook to subscribe to pending agent confirmations via Supabase Realtime.
 * Returns live pending confirmations, count, and a respond function.
 */
export function useAgentConfirmations(): UseAgentConfirmationsReturn {
  const { supabase } = useAuthenticatedSupabase();
  const [pending, setPending] = useState<AgentConfirmation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadKey, setLoadKey] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Fetch all current pending confirmations
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase!
          .from("agent_confirmations")
          .select("*")
          .eq("status", "pending")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: true });

        if (!cancelled && !error && data) {
          setPending(data as AgentConfirmation[]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();

    return () => {
      cancelled = true;
    };
  }, [supabase, loadKey]);

  // Subscribe to realtime changes on agent_confirmations
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel("hitl-confirmations")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agent_confirmations",
        },
        (payload) => {
          const newRow = payload.new as AgentConfirmation;
          if (
            newRow.status === "pending" &&
            new Date(newRow.expires_at) > new Date()
          ) {
            setPending((prev) => [...prev, newRow]);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "agent_confirmations",
        },
        (payload) => {
          const updated = payload.new as AgentConfirmation;
          if (updated.status !== "pending") {
            // Remove from pending list
            setPending((prev) => prev.filter((c) => c.id !== updated.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Expire confirmations client-side every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setPending((prev) => prev.filter((c) => new Date(c.expires_at) > now));
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const respond = useCallback(
    async (id: string, approved: boolean) => {
      if (!supabase) return;

      const { error } = await supabase
        .from("agent_confirmations")
        .update({
          status: approved ? "approved" : "rejected",
          responded_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "pending");

      if (!error) {
        setPending((prev) => prev.filter((c) => c.id !== id));
      }
    },
    [supabase],
  );

  const refresh = useCallback(() => setLoadKey((k) => k + 1), []);

  return {
    pending,
    pendingCount: pending.length,
    isLoading,
    respond,
    refresh,
  };
}
