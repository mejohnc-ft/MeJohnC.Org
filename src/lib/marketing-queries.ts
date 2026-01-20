import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, supabase } from './supabase';
import { handleQueryResult } from './errors';
import {
  EmailSubscriberSchema,
  EmailListSchema,
  EmailCampaignSchema,
  EmailTemplateSchema,
  EmailEventSchema,
  NPSSurveySchema,
  NPSResponseSchema,
  ContentSuggestionSchema,
  parseResponse,
  parseArrayResponse,
  type EmailSubscriber,
  type EmailList,
  type EmailCampaign,
  type EmailTemplate,
  type EmailEvent,
  type NPSSurvey,
  type NPSResponse,
  type ContentSuggestion,
  type MarketingStats,
} from './schemas';

// ============================================
// EMAIL SUBSCRIBERS
// ============================================

export interface SubscriberQueryOptions {
  status?: EmailSubscriber['status'];
  list?: string;
  tag?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function getEmailSubscribers(
  options: SubscriberQueryOptions = {},
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('email_subscribers')
    .select('*')
    .order('created_at', { ascending: false });

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.list) {
    query = query.contains('lists', [options.list]);
  }

  if (options.tag) {
    query = query.contains('tags', [options.tag]);
  }

  if (options.search) {
    query = query.or(`email.ilike.%${options.search}%,first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%`);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getEmailSubscribers',
    returnFallback: true,
    fallback: [] as EmailSubscriber[],
  });
}

export async function getEmailSubscriberById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('email_subscribers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return parseResponse(EmailSubscriberSchema, data, 'getEmailSubscriberById');
}

export async function getEmailSubscriberByEmail(email: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('email_subscribers')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ? parseResponse(EmailSubscriberSchema, data, 'getEmailSubscriberByEmail') : null;
}

export async function createEmailSubscriber(
  subscriber: Omit<EmailSubscriber, 'id' | 'created_at' | 'updated_at' | 'total_emails_sent' | 'total_emails_opened' | 'total_emails_clicked'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('email_subscribers')
    .insert(subscriber)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(EmailSubscriberSchema, data, 'createEmailSubscriber');
}

export async function updateEmailSubscriber(
  id: string,
  subscriber: Partial<EmailSubscriber>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('email_subscribers')
    .update({ ...subscriber, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(EmailSubscriberSchema, data, 'updateEmailSubscriber');
}

export async function deleteEmailSubscriber(id: string, client: SupabaseClient = supabase) {
  const { error } = await client
    .from('email_subscribers')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function unsubscribeEmail(email: string, client: SupabaseClient = supabase) {
  const { data, error } = await client
    .from('email_subscribers')
    .update({
      status: 'unsubscribed',
      unsubscribed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('email', email)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(EmailSubscriberSchema, data, 'unsubscribeEmail');
}

export async function bulkImportSubscribers(
  subscribers: Array<Omit<EmailSubscriber, 'id' | 'created_at' | 'updated_at' | 'total_emails_sent' | 'total_emails_opened' | 'total_emails_clicked'>>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('email_subscribers')
    .upsert(subscribers, { onConflict: 'email', ignoreDuplicates: true })
    .select();

  if (error) throw error;
  return parseArrayResponse(EmailSubscriberSchema, data, 'bulkImportSubscribers');
}

// ============================================
// EMAIL LISTS
// ============================================

export async function getEmailLists(client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('email_lists')
    .select('*')
    .order('name');

  return handleQueryResult(data, error, {
    operation: 'getEmailLists',
    returnFallback: true,
    fallback: [] as EmailList[],
  });
}

export async function getEmailListById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('email_lists')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return parseResponse(EmailListSchema, data, 'getEmailListById');
}

export async function createEmailList(
  list: Omit<EmailList, 'id' | 'created_at' | 'updated_at' | 'subscriber_count'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('email_lists')
    .insert({ ...list, subscriber_count: 0 })
    .select()
    .single();

  if (error) throw error;
  return parseResponse(EmailListSchema, data, 'createEmailList');
}

export async function updateEmailList(
  id: string,
  list: Partial<EmailList>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('email_lists')
    .update({ ...list, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(EmailListSchema, data, 'updateEmailList');
}

export async function deleteEmailList(id: string, client: SupabaseClient = supabase) {
  const { error } = await client
    .from('email_lists')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// EMAIL CAMPAIGNS
// ============================================

export async function getEmailCampaigns(
  status?: EmailCampaign['status'],
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('email_campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getEmailCampaigns',
    returnFallback: true,
    fallback: [] as EmailCampaign[],
  });
}

export async function getEmailCampaignById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('email_campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return parseResponse(EmailCampaignSchema, data, 'getEmailCampaignById');
}

export async function createEmailCampaign(
  campaign: Omit<EmailCampaign, 'id' | 'created_at' | 'updated_at' | 'sent_at' | 'recipients_count' | 'sent_count' | 'delivered_count' | 'opened_count' | 'clicked_count' | 'bounced_count' | 'complained_count' | 'unsubscribed_count'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('email_campaigns')
    .insert({
      ...campaign,
      recipients_count: 0,
      sent_count: 0,
      delivered_count: 0,
      opened_count: 0,
      clicked_count: 0,
      bounced_count: 0,
      complained_count: 0,
      unsubscribed_count: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return parseResponse(EmailCampaignSchema, data, 'createEmailCampaign');
}

export async function updateEmailCampaign(
  id: string,
  campaign: Partial<EmailCampaign>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('email_campaigns')
    .update({ ...campaign, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(EmailCampaignSchema, data, 'updateEmailCampaign');
}

export async function deleteEmailCampaign(id: string, client: SupabaseClient = supabase) {
  const { error } = await client
    .from('email_campaigns')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function scheduleCampaign(
  id: string,
  scheduledFor: string,
  client: SupabaseClient = supabase
) {
  return updateEmailCampaign(id, { status: 'scheduled', scheduled_for: scheduledFor }, client);
}

// ============================================
// EMAIL TEMPLATES
// ============================================

export async function getEmailTemplates(
  templateType?: EmailTemplate['template_type'],
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('email_templates')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (templateType) {
    query = query.eq('template_type', templateType);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getEmailTemplates',
    returnFallback: true,
    fallback: [] as EmailTemplate[],
  });
}

export async function getEmailTemplateById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('email_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return parseResponse(EmailTemplateSchema, data, 'getEmailTemplateById');
}

export async function getEmailTemplateBySlug(slug: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('email_templates')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return parseResponse(EmailTemplateSchema, data, 'getEmailTemplateBySlug');
}

export async function createEmailTemplate(
  template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count' | 'last_used_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('email_templates')
    .insert({ ...template, usage_count: 0 })
    .select()
    .single();

  if (error) throw error;
  return parseResponse(EmailTemplateSchema, data, 'createEmailTemplate');
}

export async function updateEmailTemplate(
  id: string,
  template: Partial<EmailTemplate>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('email_templates')
    .update({ ...template, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(EmailTemplateSchema, data, 'updateEmailTemplate');
}

export async function deleteEmailTemplate(id: string, client: SupabaseClient = supabase) {
  const { error } = await client
    .from('email_templates')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function incrementTemplateUsage(id: string, client: SupabaseClient = supabase) {
  const { error } = await client.rpc('increment', {
    table_name: 'email_templates',
    row_id: id,
    column_name: 'usage_count'
  });

  if (error) {
    // Fallback if RPC doesn't exist
    const template = await getEmailTemplateById(id, client);
    await updateEmailTemplate(id, {
      usage_count: template.usage_count + 1,
      last_used_at: new Date().toISOString(),
    }, client);
  }
}

// ============================================
// EMAIL EVENTS
// ============================================

export interface EmailEventQueryOptions {
  subscriberId?: string;
  campaignId?: string;
  eventType?: EmailEvent['event_type'];
  limit?: number;
  offset?: number;
}

export async function getEmailEvents(
  options: EmailEventQueryOptions = {},
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('email_events')
    .select('*')
    .order('occurred_at', { ascending: false });

  if (options.subscriberId) {
    query = query.eq('subscriber_id', options.subscriberId);
  }

  if (options.campaignId) {
    query = query.eq('campaign_id', options.campaignId);
  }

  if (options.eventType) {
    query = query.eq('event_type', options.eventType);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getEmailEvents',
    returnFallback: true,
    fallback: [] as EmailEvent[],
  });
}

export async function createEmailEvent(
  event: Omit<EmailEvent, 'id' | 'created_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('email_events')
    .insert(event)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(EmailEventSchema, data, 'createEmailEvent');
}

// ============================================
// NPS SURVEYS
// ============================================

export async function getNPSSurveys(
  status?: NPSSurvey['status'],
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('nps_surveys')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getNPSSurveys',
    returnFallback: true,
    fallback: [] as NPSSurvey[],
  });
}

export async function getNPSSurveyById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('nps_surveys')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return parseResponse(NPSSurveySchema, data, 'getNPSSurveyById');
}

export async function createNPSSurvey(
  survey: Omit<NPSSurvey, 'id' | 'created_at' | 'updated_at' | 'responses_count' | 'promoters_count' | 'passives_count' | 'detractors_count' | 'nps_score'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('nps_surveys')
    .insert({
      ...survey,
      responses_count: 0,
      promoters_count: 0,
      passives_count: 0,
      detractors_count: 0,
      nps_score: null,
    })
    .select()
    .single();

  if (error) throw error;
  return parseResponse(NPSSurveySchema, data, 'createNPSSurvey');
}

export async function updateNPSSurvey(
  id: string,
  survey: Partial<NPSSurvey>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('nps_surveys')
    .update({ ...survey, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(NPSSurveySchema, data, 'updateNPSSurvey');
}

export async function deleteNPSSurvey(id: string, client: SupabaseClient = supabase) {
  const { error } = await client
    .from('nps_surveys')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// NPS RESPONSES
// ============================================

export async function getNPSResponses(
  surveyId: string,
  category?: NPSResponse['category'],
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('nps_responses')
    .select('*')
    .eq('survey_id', surveyId)
    .order('responded_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getNPSResponses',
    returnFallback: true,
    fallback: [] as NPSResponse[],
  });
}

export async function createNPSResponse(
  response: Omit<NPSResponse, 'id' | 'created_at' | 'category'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('nps_responses')
    .insert(response)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(NPSResponseSchema, data, 'createNPSResponse');
}

// ============================================
// CONTENT SUGGESTIONS
// ============================================

export async function getContentSuggestions(
  contentType?: ContentSuggestion['content_type'],
  status?: ContentSuggestion['status'],
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('content_suggestions')
    .select('*')
    .order('created_at', { ascending: false });

  if (contentType) {
    query = query.eq('content_type', contentType);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getContentSuggestions',
    returnFallback: true,
    fallback: [] as ContentSuggestion[],
  });
}

export async function createContentSuggestion(
  suggestion: Omit<ContentSuggestion, 'id' | 'created_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('content_suggestions')
    .insert(suggestion)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(ContentSuggestionSchema, data, 'createContentSuggestion');
}

export async function updateContentSuggestion(
  id: string,
  suggestion: Partial<ContentSuggestion>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('content_suggestions')
    .update(suggestion)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(ContentSuggestionSchema, data, 'updateContentSuggestion');
}

// ============================================
// CAMPAIGN SENDING
// ============================================

export interface SendCampaignResult {
  success: boolean;
  sent_count: number;
  failed_count: number;
  errors: string[];
}

export async function sendCampaign(
  campaignId: string,
  client: SupabaseClient = supabase
): Promise<SendCampaignResult> {
  // Import email service dynamically to avoid circular deps
  const { emailService } = await import('./email-service');

  const result: SendCampaignResult = {
    success: false,
    sent_count: 0,
    failed_count: 0,
    errors: [],
  };

  try {
    // Get the campaign
    const campaign = await getEmailCampaignById(campaignId, client);

    if (!campaign) {
      result.errors.push('Campaign not found');
      return result;
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      result.errors.push(`Campaign cannot be sent - status is ${campaign.status}`);
      return result;
    }

    if (!campaign.html_content) {
      result.errors.push('Campaign has no HTML content');
      return result;
    }

    // Update campaign status to sending
    await updateEmailCampaign(campaignId, { status: 'sending' }, client);

    // Get subscribers from the target lists
    let subscribers: EmailSubscriber[] = [];

    if (campaign.list_ids && campaign.list_ids.length > 0) {
      // Get subscribers from specific lists
      for (const listId of campaign.list_ids) {
        const listSubscribers = await getEmailSubscribers({ list: listId, status: 'active' }, client);
        subscribers = [...subscribers, ...listSubscribers];
      }
      // Remove duplicates
      subscribers = subscribers.filter(
        (sub, index, self) => index === self.findIndex((s) => s.id === sub.id)
      );
    } else {
      // No lists specified - get all active subscribers
      subscribers = await getEmailSubscribers({ status: 'active' }, client);
    }

    // Filter out excluded tags if any
    if (campaign.exclude_tags && campaign.exclude_tags.length > 0) {
      subscribers = subscribers.filter(
        (sub) => !sub.tags.some((tag) => campaign.exclude_tags?.includes(tag))
      );
    }

    // Update recipients count
    await updateEmailCampaign(campaignId, { recipients_count: subscribers.length }, client);

    // Send to each subscriber
    for (const subscriber of subscribers) {
      try {
        // Replace template variables
        let html = campaign.html_content;
        let text = campaign.text_content || '';
        let subject = campaign.subject;

        const replacements: Record<string, string> = {
          '{{email}}': subscriber.email,
          '{{first_name}}': subscriber.first_name || '',
          '{{last_name}}': subscriber.last_name || '',
          '{{unsubscribe_url}}': `${import.meta.env.VITE_SITE_URL || ''}/unsubscribe?email=${encodeURIComponent(subscriber.email)}`,
        };

        for (const [key, value] of Object.entries(replacements)) {
          html = html.replace(new RegExp(key, 'g'), value);
          text = text.replace(new RegExp(key, 'g'), value);
          subject = subject.replace(new RegExp(key, 'g'), value);
        }

        const response = await emailService.send({
          to: subscriber.email,
          subject,
          html,
          text: text || undefined,
        });

        if (response.success) {
          result.sent_count++;
          // Log the send event
          await createEmailEvent(
            {
              event_type: 'sent',
              subscriber_id: subscriber.id,
              campaign_id: campaignId,
              occurred_at: new Date().toISOString(),
              provider_message_id: response.id,
              link_url: null,
              bounce_type: null,
              bounce_reason: null,
              ip_address: null,
              user_agent: null,
              provider_event_id: null,
              provider_metadata: null,
            },
            client
          );
        } else {
          result.failed_count++;
          result.errors.push(`Failed to send to ${subscriber.email}: ${response.error}`);
        }
      } catch (error) {
        result.failed_count++;
        result.errors.push(`Error sending to ${subscriber.email}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Update campaign status and stats
    await updateEmailCampaign(
      campaignId,
      {
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_count: result.sent_count,
      },
      client
    );

    result.success = result.sent_count > 0;
    return result;
  } catch (error) {
    result.errors.push(`Campaign send failed: ${error instanceof Error ? error.message : String(error)}`);

    // Revert status on error
    try {
      await updateEmailCampaign(campaignId, { status: 'draft' }, client);
    } catch {
      // Ignore revert errors
    }

    return result;
  }
}

// ============================================
// MARKETING STATS
// ============================================

export async function getMarketingStats(client: SupabaseClient = getSupabase()): Promise<MarketingStats> {
  const [
    totalSubsResult,
    activeSubsResult,
    totalCampaignsResult,
    sentCampaignsResult,
    recentNPSResult,
  ] = await Promise.all([
    client.from('email_subscribers').select('id', { count: 'exact', head: true }),
    client.from('email_subscribers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    client.from('email_campaigns').select('id', { count: 'exact', head: true }),
    client.from('email_campaigns').select('id', { count: 'exact', head: true }).eq('status', 'sent'),
    client.from('nps_responses').select('id', { count: 'exact', head: true }).gte('responded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  // Get average open and click rates from sent campaigns
  const { data: campaignStats } = await client
    .from('email_campaigns')
    .select('sent_count, opened_count, clicked_count')
    .eq('status', 'sent')
    .gt('sent_count', 0);

  let avgOpenRate = 0;
  let avgClickRate = 0;

  if (campaignStats && campaignStats.length > 0) {
    const totals = campaignStats.reduce(
      (acc, campaign) => ({
        sent: acc.sent + campaign.sent_count,
        opened: acc.opened + campaign.opened_count,
        clicked: acc.clicked + campaign.clicked_count,
      }),
      { sent: 0, opened: 0, clicked: 0 }
    );

    avgOpenRate = totals.sent > 0 ? (totals.opened / totals.sent) * 100 : 0;
    avgClickRate = totals.sent > 0 ? (totals.clicked / totals.sent) * 100 : 0;
  }

  // Get latest NPS score from active survey
  const { data: activeSurvey } = await client
    .from('nps_surveys')
    .select('nps_score')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return {
    total_subscribers: totalSubsResult.count ?? 0,
    active_subscribers: activeSubsResult.count ?? 0,
    total_campaigns: totalCampaignsResult.count ?? 0,
    sent_campaigns: sentCampaignsResult.count ?? 0,
    avg_open_rate: avgOpenRate,
    avg_click_rate: avgClickRate,
    nps_score: activeSurvey?.nps_score ?? null,
    recent_nps_responses: recentNPSResult.count ?? 0,
  };
}
