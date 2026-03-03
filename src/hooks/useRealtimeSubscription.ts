import { useEffect } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

interface UseRealtimeOptions {
  supabase: SupabaseClient | null;
  channelName: string;
  schema?: string;
  table: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  filter?: string;
  onData: () => void;
  enabled?: boolean;
}

export function useRealtimeSubscription({
  supabase,
  channelName,
  schema = "app",
  table,
  event = "*",
  filter,
  onData,
  enabled = true,
}: UseRealtimeOptions) {
  useEffect(() => {
    if (!supabase || !enabled) return;

    const channelConfig: Record<string, unknown> = {
      event,
      schema,
      table,
    };
    if (filter) channelConfig.filter = filter;

    const channel = supabase
      .channel(channelName)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on("postgres_changes", channelConfig as Record<string, any>, () => {
        onData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, channelName, schema, table, event, filter, onData, enabled]);
}
