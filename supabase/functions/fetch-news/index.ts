// Supabase Edge Function to fetch RSS feeds and store articles
// Deploy with: supabase functions deploy fetch-news
// Invoke manually: supabase functions invoke fetch-news
// Set up cron: Use Supabase Dashboard > Database > Extensions > pg_cron

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.43/deno-dom-wasm.ts'

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NewsSource {
  id: string
  name: string
  source_type: 'rss' | 'api'
  url: string
  api_key: string | null
  category_slug: string | null
  is_active: boolean
  refresh_interval_minutes: number
  last_fetched_at: string | null
}

interface ParsedArticle {
  source_id: string
  external_id: string
  title: string
  description: string | null
  content: string | null
  url: string
  image_url: string | null
  author: string | null
  published_at: string | null
}

// Parse RSS/Atom feed XML
function parseRssFeed(xml: string, sourceId: string): ParsedArticle[] {
  const articles: ParsedArticle[] = []

  try {
    const doc = new DOMParser().parseFromString(xml, 'text/xml')
    if (!doc) return articles

    // Try RSS 2.0 format first
    let items = doc.querySelectorAll('item')

    // If no items, try Atom format
    if (items.length === 0) {
      items = doc.querySelectorAll('entry')
    }

    for (const item of items) {
      try {
        // RSS 2.0 fields
        let title = item.querySelector('title')?.textContent?.trim() || ''
        let link = item.querySelector('link')?.textContent?.trim() || ''
        let description = item.querySelector('description')?.textContent?.trim() || null
        let content = item.querySelector('content\\:encoded')?.textContent?.trim() || null
        let pubDate = item.querySelector('pubDate')?.textContent?.trim() || null
        const author = item.querySelector('author')?.textContent?.trim() ||
                       item.querySelector('dc\\:creator')?.textContent?.trim() || null
        let guid = item.querySelector('guid')?.textContent?.trim() || link

        // Atom format fallbacks
        if (!title) {
          title = item.querySelector('title')?.textContent?.trim() || ''
        }
        if (!link) {
          const linkEl = item.querySelector('link[href]')
          link = linkEl?.getAttribute('href') || ''
        }
        if (!description) {
          description = item.querySelector('summary')?.textContent?.trim() || null
        }
        if (!content) {
          content = item.querySelector('content')?.textContent?.trim() || null
        }
        if (!pubDate) {
          pubDate = item.querySelector('published')?.textContent?.trim() ||
                   item.querySelector('updated')?.textContent?.trim() || null
        }
        if (!guid) {
          guid = item.querySelector('id')?.textContent?.trim() || link
        }

        // Extract image from various sources
        let imageUrl: string | null = null

        // Check media:content or media:thumbnail
        const mediaContent = item.querySelector('media\\:content, media\\:thumbnail')
        if (mediaContent) {
          imageUrl = mediaContent.getAttribute('url')
        }

        // Check enclosure
        if (!imageUrl) {
          const enclosure = item.querySelector('enclosure[type^="image"]')
          if (enclosure) {
            imageUrl = enclosure.getAttribute('url')
          }
        }

        // Try to extract image from content/description HTML
        if (!imageUrl && (content || description)) {
          const htmlContent = content || description || ''
          const imgMatch = htmlContent.match(/<img[^>]+src=["']([^"']+)["']/)
          if (imgMatch) {
            imageUrl = imgMatch[1]
          }
        }

        // Parse and validate publish date
        let publishedAt: string | null = null
        if (pubDate) {
          try {
            const date = new Date(pubDate)
            if (!isNaN(date.getTime())) {
              publishedAt = date.toISOString()
            }
          } catch {
            // Invalid date, leave as null
          }
        }

        if (title && link) {
          articles.push({
            source_id: sourceId,
            external_id: guid || link,
            title: title.substring(0, 500), // Limit title length
            description: description?.substring(0, 2000) || null,
            content: content?.substring(0, 50000) || null,
            url: link,
            image_url: imageUrl,
            author: author?.substring(0, 200) || null,
            published_at: publishedAt,
          })
        }
      } catch (itemError) {
        console.error('Error parsing item:', itemError)
      }
    }
  } catch (parseError) {
    console.error('Error parsing RSS feed:', parseError)
  }

  return articles
}

// Fetch a single RSS source
async function fetchSource(source: NewsSource): Promise<{
  articles: ParsedArticle[]
  error: string | null
}> {
  try {
    console.log(`Fetching: ${source.name} (${source.url})`)

    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'MeJohnC-News-Aggregator/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
      },
    })

    if (!response.ok) {
      return {
        articles: [],
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }

    const xml = await response.text()
    const articles = parseRssFeed(xml, source.id)

    console.log(`Parsed ${articles.length} articles from ${source.name}`)
    return { articles, error: null }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Error fetching ${source.name}:`, errorMessage)
    return { articles: [], error: errorMessage }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    // Create admin client (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get active RSS sources
    const { data: sources, error: sourcesError } = await supabase
      .from('news_sources')
      .select('*')
      .eq('is_active', true)
      .eq('source_type', 'rss')

    if (sourcesError) {
      throw new Error(`Failed to fetch sources: ${sourcesError.message}`)
    }

    if (!sources || sources.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active RSS sources configured', fetched: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${sources.length} active RSS sources`)

    let totalArticles = 0
    const results: { source: string; articles: number; error: string | null }[] = []

    // Fetch each source
    for (const source of sources as NewsSource[]) {
      const { articles, error } = await fetchSource(source)

      // Update source fetch status
      await supabase
        .from('news_sources')
        .update({
          last_fetched_at: new Date().toISOString(),
          fetch_error: error,
        })
        .eq('id', source.id)

      if (articles.length > 0) {
        // Upsert articles (insert or ignore if external_id already exists)
        const { error: upsertError } = await supabase
          .from('news_articles')
          .upsert(
            articles.map(a => ({
              ...a,
              fetched_at: new Date().toISOString(),
            })),
            {
              onConflict: 'source_id,external_id',
              ignoreDuplicates: true
            }
          )

        if (upsertError) {
          console.error(`Error upserting articles for ${source.name}:`, upsertError)
          results.push({ source: source.name, articles: 0, error: upsertError.message })
        } else {
          totalArticles += articles.length
          results.push({ source: source.name, articles: articles.length, error: null })
        }
      } else {
        results.push({ source: source.name, articles: 0, error })
      }
    }

    return new Response(
      JSON.stringify({
        message: `Fetched ${totalArticles} articles from ${sources.length} sources`,
        fetched: totalArticles,
        sources: results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Edge function error:', errorMessage)

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
