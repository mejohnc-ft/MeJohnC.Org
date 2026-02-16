// Supabase Edge Function to sync metrics from various sources
// Deploy with: supabase functions deploy metrics-sync
// Invoke manually: supabase functions invoke metrics-sync
// Set up cron with pg_cron for automatic syncing

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { CORS_ORIGIN } from '../_shared/cors.ts'

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Tables to track for Supabase stats
const TRACKED_TABLES = [
  'apps',
  'projects',
  'blog_posts',
  'contacts',
  'interactions',
  'bookmarks',
  'news_articles',
  'agent_commands',
  'agent_responses',
  'metrics_data',
]

interface MetricDataPoint {
  source_id: string
  metric_name: string
  metric_type: 'counter' | 'gauge'
  value: number
  unit: string | null
  dimensions: Record<string, string>
  recorded_at: string
}

interface SyncResult {
  source: string
  success: boolean
  metrics_count: number
  error?: string
}

// Fetch Supabase table statistics
async function fetchSupabaseStats(
  supabase: ReturnType<typeof createClient>,
  sourceId: string
): Promise<MetricDataPoint[]> {
  const metrics: MetricDataPoint[] = []
  const now = new Date().toISOString()

  // Get row counts for each tracked table
  for (const tableName of TRACKED_TABLES) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })

      if (!error && count !== null) {
        metrics.push({
          source_id: sourceId,
          metric_name: 'supabase_table_rows',
          metric_type: 'gauge',
          value: count,
          unit: 'count',
          dimensions: { table: tableName },
          recorded_at: now,
        })
      }
    } catch (err) {
      console.warn(`Failed to count ${tableName}:`, err)
    }
  }

  // Get blog post stats by status
  try {
    const statuses = ['draft', 'published', 'scheduled']
    for (const status of statuses) {
      const { count } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .eq('status', status)

      if (count !== null) {
        metrics.push({
          source_id: sourceId,
          metric_name: 'blog_posts_by_status',
          metric_type: 'gauge',
          value: count,
          unit: 'count',
          dimensions: { status },
          recorded_at: now,
        })
      }
    }
  } catch (err) {
    console.warn('Failed to get blog post stats:', err)
  }

  // Get contact stats by type
  try {
    const types = ['lead', 'contact', 'client', 'partner', 'other']
    for (const contactType of types) {
      const { count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('contact_type', contactType)
        .eq('status', 'active')

      if (count !== null) {
        metrics.push({
          source_id: sourceId,
          metric_name: 'contacts_by_type',
          metric_type: 'gauge',
          value: count,
          unit: 'count',
          dimensions: { type: contactType },
          recorded_at: now,
        })
      }
    }
  } catch (err) {
    console.warn('Failed to get contact stats:', err)
  }

  // Get bookmark stats
  try {
    const { count: totalBookmarks } = await supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })

    const { count: favoriteBookmarks } = await supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('is_favorite', true)

    const { count: publicBookmarks } = await supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('is_public', true)

    if (totalBookmarks !== null) {
      metrics.push({
        source_id: sourceId,
        metric_name: 'bookmarks_total',
        metric_type: 'gauge',
        value: totalBookmarks,
        unit: 'count',
        dimensions: {},
        recorded_at: now,
      })
    }

    if (favoriteBookmarks !== null) {
      metrics.push({
        source_id: sourceId,
        metric_name: 'bookmarks_favorites',
        metric_type: 'gauge',
        value: favoriteBookmarks,
        unit: 'count',
        dimensions: {},
        recorded_at: now,
      })
    }

    if (publicBookmarks !== null) {
      metrics.push({
        source_id: sourceId,
        metric_name: 'bookmarks_public',
        metric_type: 'gauge',
        value: publicBookmarks,
        unit: 'count',
        dimensions: {},
        recorded_at: now,
      })
    }
  } catch (err) {
    console.warn('Failed to get bookmark stats:', err)
  }

  // Get agent activity stats (last 24 hours)
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { count: recentCommands } = await supabase
      .from('agent_commands')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday)

    const { count: recentResponses } = await supabase
      .from('agent_responses')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday)

    if (recentCommands !== null) {
      metrics.push({
        source_id: sourceId,
        metric_name: 'agent_commands_24h',
        metric_type: 'gauge',
        value: recentCommands,
        unit: 'count',
        dimensions: {},
        recorded_at: now,
      })
    }

    if (recentResponses !== null) {
      metrics.push({
        source_id: sourceId,
        metric_name: 'agent_responses_24h',
        metric_type: 'gauge',
        value: recentResponses,
        unit: 'count',
        dimensions: {},
        recorded_at: now,
      })
    }
  } catch (err) {
    console.warn('Failed to get agent stats:', err)
  }

  return metrics
}

// Main sync function
async function syncSource(
  supabase: ReturnType<typeof createClient>,
  source: { id: string; slug: string; source_type: string }
): Promise<SyncResult> {
  const result: SyncResult = {
    source: source.slug,
    success: false,
    metrics_count: 0,
  }

  try {
    let metrics: MetricDataPoint[] = []

    switch (source.source_type) {
      case 'supabase':
        metrics = await fetchSupabaseStats(supabase, source.id)
        break

      // Add more source types here as needed
      // case 'github':
      //   metrics = await fetchGitHubStats(supabase, source)
      //   break

      default:
        result.error = `Unknown source type: ${source.source_type}`
        return result
    }

    if (metrics.length > 0) {
      // Insert metrics
      const { error: insertError } = await supabase
        .from('metrics_data')
        .insert(metrics)

      if (insertError) {
        result.error = insertError.message
        return result
      }
    }

    // Update source's last_refresh_at
    const now = new Date().toISOString()
    await supabase
      .from('metrics_sources')
      .update({
        last_refresh_at: now,
        next_refresh_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        error_count: 0,
        last_error: null,
      })
      .eq('id', source.id)

    result.success = true
    result.metrics_count = metrics.length
  } catch (error) {
    result.error = error.message

    // Update source with error
    await supabase
      .from('metrics_sources')
      .update({
        last_error: error.message,
        error_count: supabase.rpc('increment_error_count', { source_id: source.id }),
      })
      .eq('id', source.id)
  }

  return result
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse optional request body for specific source
    let targetSourceSlug: string | null = null
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        targetSourceSlug = body.source_slug || null
      } catch {
        // No body or invalid JSON, sync all sources
      }
    }

    // Get sources to sync
    let query = supabase
      .from('metrics_sources')
      .select('id, slug, source_type')
      .eq('is_active', true)

    if (targetSourceSlug) {
      query = query.eq('slug', targetSourceSlug)
    } else {
      // Only sync sources that are due for refresh
      query = query.or(`next_refresh_at.is.null,next_refresh_at.lte.${new Date().toISOString()}`)
    }

    const { data: sources, error: sourcesError } = await query

    if (sourcesError) {
      return new Response(
        JSON.stringify({ success: false, message: sourcesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!sources || sources.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No sources to sync',
          results: [],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sync each source
    const results: SyncResult[] = []
    for (const source of sources) {
      const result = await syncSource(supabase, source)
      results.push(result)
    }

    // Summary
    const successCount = results.filter(r => r.success).length
    const totalMetrics = results.reduce((sum, r) => sum + r.metrics_count, 0)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${successCount}/${sources.length} sources, ${totalMetrics} metrics total`,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ success: false, message: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
