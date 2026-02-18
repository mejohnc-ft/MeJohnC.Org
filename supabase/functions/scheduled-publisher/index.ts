// Supabase Edge Function for scheduled blog post publishing
// Deploy with: supabase functions deploy scheduled-publisher
// Invoke: POST /functions/v1/scheduled-publisher (via pg_cron or external cron)
//
// This function publishes blog posts whose scheduled_for time has passed.
// Should be invoked periodically (every 1-5 minutes) by a cron scheduler.
//
// @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/256

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { CORS_ORIGIN } from "../_shared/cors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": CORS_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();

    // Find all scheduled posts whose time has passed
    const { data: posts, error: fetchError } = await supabase
      .from("blog_posts")
      .select("id, title, slug, scheduled_for")
      .eq("status", "scheduled")
      .lte("scheduled_for", now)
      .order("scheduled_for", { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch scheduled posts: ${fetchError.message}`);
    }

    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({
          published: 0,
          message: "No posts ready for publishing",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Publish each post
    const results: {
      id: string;
      title: string;
      status: "published" | "failed";
      error?: string;
    }[] = [];

    for (const post of posts) {
      const { error: updateError } = await supabase
        .from("blog_posts")
        .update({
          status: "published",
          published_at: post.scheduled_for || now,
          updated_at: now,
        })
        .eq("id", post.id);

      if (updateError) {
        results.push({
          id: post.id,
          title: post.title,
          status: "failed",
          error: updateError.message,
        });
      } else {
        results.push({ id: post.id, title: post.title, status: "published" });
      }
    }

    const published = results.filter((r) => r.status === "published").length;
    const failed = results.filter((r) => r.status === "failed").length;

    console.log(
      `[scheduled-publisher] Published ${published} posts, ${failed} failed`,
    );

    return new Response(
      JSON.stringify({
        published,
        failed,
        results,
        timestamp: now,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[scheduled-publisher] Error:", error.message);

    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
