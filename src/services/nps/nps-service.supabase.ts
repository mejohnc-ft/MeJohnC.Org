/**
 * NPS Service - Supabase Implementation
 *
 * Implements the INpsService interface using Supabase as the backend.
 * Migrates functionality from marketing-queries.ts to the service layer.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/111
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ServiceContext, ListResponse } from '../types';
import type {
  INpsService,
  CreateNPSSurveyInput,
  UpdateNPSSurveyInput,
  CreateNPSResponseInput,
  CreateNPSCampaignInput,
  UpdateNPSCampaignInput,
  NPSSurveyFilters,
  NPSResponseFilters,
  NPSAnalysisFilters,
} from './nps-service.interface';
import type {
  NPSSurvey,
  NPSResponse,
  NPSAnalysis,
  NPSCampaign,
  NPSStats,
  NPSTrend,
} from '@/features/nps/schemas';
import { getTenantId } from '../types';
import { NPSSurveySchema, NPSResponseSchema } from '@/features/nps/schemas';

/**
 * Parse and validate response data using Zod schema
 */
function parseResponse<T>(schema: { parse: (data: unknown) => T }, data: unknown, operation: string): T {
  try {
    return schema.parse(data);
  } catch (error) {
    console.error(`[NpsService] Schema validation failed for ${operation}:`, error);
    throw new Error(`Invalid data format for ${operation}`);
  }
}

/**
 * NPS Service implementation using Supabase
 */
export class NpsServiceSupabase implements INpsService {
  readonly serviceName = 'nps' as const;
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  // ============================================
  // Survey Operations
  // ============================================

  async getSurveys(ctx: ServiceContext, filters?: NPSSurveyFilters): Promise<ListResponse<NPSSurvey>> {
    const tenantId = getTenantId(ctx);
    let query = this.client
      .from('nps_surveys')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: (data || []).map((item) => parseResponse(NPSSurveySchema, item, 'getSurveys')),
      total: count || 0,
      hasMore: count ? (filters?.offset || 0) + (data?.length || 0) < count : false,
    };
  }

  async getSurveyById(ctx: ServiceContext, id: string): Promise<NPSSurvey | null> {
    const tenantId = getTenantId(ctx);
    const { data, error } = await this.client
      .from('nps_surveys')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return parseResponse(NPSSurveySchema, data, 'getSurveyById');
  }

  async createSurvey(ctx: ServiceContext, data: CreateNPSSurveyInput): Promise<NPSSurvey> {
    const tenantId = getTenantId(ctx);
    const { data: survey, error } = await this.client
      .from('nps_surveys')
      .insert({
        tenant_id: tenantId,
        ...data,
        responses_count: 0,
        promoters_count: 0,
        passives_count: 0,
        detractors_count: 0,
        nps_score: null,
      })
      .select()
      .single();

    if (error) throw error;
    return parseResponse(NPSSurveySchema, survey, 'createSurvey');
  }

  async updateSurvey(ctx: ServiceContext, id: string, data: UpdateNPSSurveyInput): Promise<NPSSurvey> {
    const tenantId = getTenantId(ctx);
    const { data: survey, error } = await this.client
      .from('nps_surveys')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;
    return parseResponse(NPSSurveySchema, survey, 'updateSurvey');
  }

  async deleteSurvey(ctx: ServiceContext, id: string): Promise<void> {
    const tenantId = getTenantId(ctx);
    const { error } = await this.client
      .from('nps_surveys')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  }

  // ============================================
  // Response Operations
  // ============================================

  async getResponses(ctx: ServiceContext, filters?: NPSResponseFilters): Promise<ListResponse<NPSResponse>> {
    const tenantId = getTenantId(ctx);
    let query = this.client
      .from('nps_responses')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('responded_at', { ascending: false });

    if (filters?.survey_id) {
      query = query.eq('survey_id', filters.survey_id);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.email) {
      query = query.eq('email', filters.email);
    }

    if (filters?.start_date) {
      query = query.gte('responded_at', filters.start_date);
    }

    if (filters?.end_date) {
      query = query.lte('responded_at', filters.end_date);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: (data || []).map((item) => parseResponse(NPSResponseSchema, item, 'getResponses')),
      total: count || 0,
      hasMore: count ? (filters?.offset || 0) + (data?.length || 0) < count : false,
    };
  }

  async getResponseById(ctx: ServiceContext, id: string): Promise<NPSResponse | null> {
    const tenantId = getTenantId(ctx);
    const { data, error } = await this.client
      .from('nps_responses')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return parseResponse(NPSResponseSchema, data, 'getResponseById');
  }

  async createResponse(ctx: ServiceContext, data: CreateNPSResponseInput): Promise<NPSResponse> {
    const tenantId = getTenantId(ctx);
    const { data: response, error } = await this.client
      .from('nps_responses')
      .insert({
        tenant_id: tenantId,
        ...data,
      })
      .select()
      .single();

    if (error) throw error;
    return parseResponse(NPSResponseSchema, response, 'createResponse');
  }

  async getDetractors(ctx: ServiceContext, surveyId?: string): Promise<NPSResponse[]> {
    const tenantId = getTenantId(ctx);
    let query = this.client
      .from('nps_responses')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('category', 'detractor')
      .order('responded_at', { ascending: false });

    if (surveyId) {
      query = query.eq('survey_id', surveyId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map((item) => parseResponse(NPSResponseSchema, item, 'getDetractors'));
  }

  // ============================================
  // Campaign Operations
  // ============================================

  async getCampaigns(ctx: ServiceContext, filters?: { limit?: number; offset?: number }): Promise<ListResponse<NPSCampaign>> {
    const tenantId = getTenantId(ctx);
    let query = this.client
      .from('nps_campaigns')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      hasMore: count ? (filters?.offset || 0) + (data?.length || 0) < count : false,
    };
  }

  async getCampaignById(ctx: ServiceContext, id: string): Promise<NPSCampaign | null> {
    const tenantId = getTenantId(ctx);
    const { data, error } = await this.client
      .from('nps_campaigns')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  }

  async createCampaign(ctx: ServiceContext, data: CreateNPSCampaignInput): Promise<NPSCampaign> {
    const tenantId = getTenantId(ctx);
    const { data: campaign, error } = await this.client
      .from('nps_campaigns')
      .insert({
        tenant_id: tenantId,
        ...data,
        sent_count: 0,
        response_count: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return campaign;
  }

  async updateCampaign(ctx: ServiceContext, id: string, data: UpdateNPSCampaignInput): Promise<NPSCampaign> {
    const tenantId = getTenantId(ctx);
    const { data: campaign, error } = await this.client
      .from('nps_campaigns')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;
    return campaign;
  }

  async deleteCampaign(ctx: ServiceContext, id: string): Promise<void> {
    const tenantId = getTenantId(ctx);
    const { error } = await this.client
      .from('nps_campaigns')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  }

  // ============================================
  // Analysis & AI Operations
  // ============================================

  async getAnalysis(ctx: ServiceContext, filters?: NPSAnalysisFilters): Promise<ListResponse<NPSAnalysis>> {
    const tenantId = getTenantId(ctx);
    let query = this.client
      .from('nps_analysis')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filters?.survey_id) {
      query = query.eq('survey_id', filters.survey_id);
    }

    if (filters?.response_id) {
      query = query.eq('response_id', filters.response_id);
    }

    if (filters?.analysis_type) {
      query = query.eq('analysis_type', filters.analysis_type);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      hasMore: count ? (filters?.offset || 0) + (data?.length || 0) < count : false,
    };
  }

  async analyzeSentiment(ctx: ServiceContext, responseId: string): Promise<NPSAnalysis> {
    // TODO: Implement AI sentiment analysis
    // This will integrate with an AI service (OpenAI, Anthropic, etc.)
    // For now, return a placeholder
    throw new Error('AI sentiment analysis not yet implemented');
  }

  async predictDetractorRisk(ctx: ServiceContext, contactId: string): Promise<number> {
    // TODO: Implement AI detractor prediction
    // This will analyze contact history and predict likelihood of becoming a detractor
    throw new Error('AI detractor prediction not yet implemented');
  }

  async suggestFollowup(ctx: ServiceContext, responseId: string): Promise<string[]> {
    // TODO: Implement AI follow-up suggestions
    // This will analyze response and suggest appropriate actions
    throw new Error('AI follow-up suggestions not yet implemented');
  }

  // ============================================
  // Statistics & Trends
  // ============================================

  async getStats(ctx: ServiceContext): Promise<NPSStats> {
    const tenantId = getTenantId(ctx);

    // Get survey counts
    const { count: totalSurveys } = await this.client
      .from('nps_surveys')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const { count: activeSurveys } = await this.client
      .from('nps_surveys')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active');

    const { count: totalResponses } = await this.client
      .from('nps_responses')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    // Calculate average score
    const { data: surveys } = await this.client
      .from('nps_surveys')
      .select('nps_score')
      .eq('tenant_id', tenantId)
      .not('nps_score', 'is', null);

    const validScores = (surveys || []).map((s) => s.nps_score).filter((score): score is number => score !== null);
    const averageScore = validScores.length > 0
      ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
      : null;

    return {
      total_surveys: totalSurveys || 0,
      active_surveys: activeSurveys || 0,
      total_responses: totalResponses || 0,
      average_score: averageScore,
      trend: [], // TODO: Implement trend calculation
    };
  }

  async getTrends(ctx: ServiceContext, surveyId?: string, period: 'day' | 'week' | 'month' = 'week'): Promise<NPSTrend[]> {
    // TODO: Implement trend calculation
    // This will aggregate responses by time period and calculate scores
    return [];
  }

  async calculateScore(ctx: ServiceContext, surveyId: string): Promise<number> {
    const tenantId = getTenantId(ctx);

    const { data: responses, error } = await this.client
      .from('nps_responses')
      .select('category')
      .eq('survey_id', surveyId)
      .eq('tenant_id', tenantId);

    if (error) throw error;
    if (!responses || responses.length === 0) return 0;

    const promoters = responses.filter((r) => r.category === 'promoter').length;
    const detractors = responses.filter((r) => r.category === 'detractor').length;
    const total = responses.length;

    const score = ((promoters - detractors) / total) * 100;
    return Math.round(score);
  }
}
