// Supabase Edge Function to fetch RSS feeds and store articles
// Deploy with: supabase functions deploy fetch-news
// Invoke manually: supabase functions invoke fetch-news
// Set up cron: Use Supabase Dashboard > Database > Extensions > pg_cron

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

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
  source_url: string | null  // The article's own page URL (for link-blogs like Daring Fireball)
  image_url: string | null
  author: string | null
  published_at: string | null
}

// Helper to extract text between XML tags using regex
function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const match = xml.match(regex)
  return match ? match[1].trim() : null
}

// Helper to extract attribute from XML tag
function extractAttr(xml: string, tag: string, attr: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["']`, 'i')
  const match = xml.match(regex)
  return match ? match[1] : null
}

// Helper to extract href from link with specific rel attribute
function extractLinkByRel(xml: string, rel: string): string | null {
  // Match <link ... rel="related" ... href="url"> in any order
  const regex = new RegExp(`<link[^>]*rel=["']${rel}["'][^>]*href=["']([^"']+)["']|<link[^>]*href=["']([^"']+)["'][^>]*rel=["']${rel}["']`, 'i')
  const match = xml.match(regex)
  return match ? (match[1] || match[2]) : null
}

// Parse RSS feed using regex (more reliable for various feed formats)
function parseRssWithRegex(xml: string, sourceId: string): ParsedArticle[] {
  const articles: ParsedArticle[] = []

  // Match RSS 2.0 <item> elements
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    try {
      const itemXml = match[1]

      const title = extractTag(itemXml, 'title') || ''
      const link = extractTag(itemXml, 'link') || ''
      const description = extractTag(itemXml, 'description')
      const content = extractTag(itemXml, 'content:encoded')
      const pubDate = extractTag(itemXml, 'pubDate')
      const author = extractTag(itemXml, 'author') || extractTag(itemXml, 'dc:creator')
      const guid = extractTag(itemXml, 'guid') || link

      // Try to extract image
      const imageUrl = extractAttr(itemXml, 'media:content', 'url') ||
                     extractAttr(itemXml, 'media:thumbnail', 'url') ||
                     extractAttr(itemXml, 'enclosure', 'url')

      // Parse publish date
      let publishedAt: string | null = null
      if (pubDate) {
        try {
          const date = new Date(pubDate)
          if (!isNaN(date.getTime())) {
            publishedAt = date.toISOString()
          }
        } catch {
          // Invalid date
        }
      }

      if (title && link) {
        articles.push({
          source_id: sourceId,
          external_id: guid || link,
          title: title.substring(0, 500),
          description: description?.substring(0, 2000) || null,
          content: content?.substring(0, 50000) || null,
          url: link,
          source_url: null,  // RSS feeds don't typically have separate source URLs
          image_url: imageUrl,
          author: author?.substring(0, 200) || null,
          published_at: publishedAt,
        })
      }
    } catch (e) {
      console.error('Error parsing RSS item:', e)
    }
  }

  return articles
}

// Parse Atom feed using regex
function parseAtomWithRegex(xml: string, sourceId: string): ParsedArticle[] {
  const articles: ParsedArticle[] = []

  // Match Atom <entry> elements
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi
  let match

  while ((match = entryRegex.exec(xml)) !== null) {
    try {
      const entryXml = match[1]

      const title = extractTag(entryXml, 'title') || ''

      // For Atom feeds, get the alternate link (external) and related link (source page)
      // Daring Fireball uses: alternate = external link, related = DF article page
      const alternateLink = extractLinkByRel(entryXml, 'alternate') || extractAttr(entryXml, 'link', 'href') || ''
      const relatedLink = extractLinkByRel(entryXml, 'related')

      const summary = extractTag(entryXml, 'summary')
      const content = extractTag(entryXml, 'content')
      const published = extractTag(entryXml, 'published') || extractTag(entryXml, 'updated')
      const authorName = extractTag(entryXml, 'name') // Inside <author> tag
      const id = extractTag(entryXml, 'id') || alternateLink

      // Parse publish date
      let publishedAt: string | null = null
      if (published) {
        try {
          const date = new Date(published)
          if (!isNaN(date.getTime())) {
            publishedAt = date.toISOString()
          }
        } catch {
          // Invalid date
        }
      }

      if (title && alternateLink) {
        articles.push({
          source_id: sourceId,
          external_id: id || alternateLink,
          title: title.substring(0, 500),
          description: summary?.substring(0, 2000) || null,
          content: content?.substring(0, 50000) || null,
          url: alternateLink,  // External link (where headline points)
          source_url: relatedLink,  // The blog's own article page (for commentary)
          image_url: null,
          author: authorName?.substring(0, 200) || null,
          published_at: publishedAt,
        })
      }
    } catch (e) {
      console.error('Error parsing Atom entry:', e)
    }
  }

  return articles
}

// Parse RSS/Atom feed - try regex first (more reliable)
function parseRssFeed(xml: string, sourceId: string): ParsedArticle[] {
  // Detect feed type and parse with regex
  const isAtom = xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"')
  const isRss = xml.includes('<rss') || xml.includes('<item>')

  console.log(`Feed type detection - Atom: ${isAtom}, RSS: ${isRss}`)

  if (isRss) {
    const articles = parseRssWithRegex(xml, sourceId)
    console.log(`Regex parser found ${articles.length} RSS articles`)
    return articles
  }

  if (isAtom) {
    const articles = parseAtomWithRegex(xml, sourceId)
    console.log(`Regex parser found ${articles.length} Atom articles`)
    return articles
  }

  console.error('Unknown feed format')
  return []
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
