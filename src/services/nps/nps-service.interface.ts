/**
 * NPS Service Interface
 *
 * Defines the contract for NPS survey and response operations.
 * This abstraction allows for multiple implementations (Supabase, API, mock, etc.)
 * and enables the NPS feature to be extracted as a standalone product.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/111
 */

import type { ServiceContext, BaseService, ListResponse, PaginationOptions } from '../types';
import type {
  NPSSurvey,
  NPSResponse,
  NPSAnalysis,
  NPSCampaign,
  NPSStats,
  NPSTrend,
} from '@/features/nps/schemas';

/**
 * Input types for creating/updating NPS entities
 */
export interface CreateNPSSurveyInput {
  name: string;
  question: string;
  status: NPSSurvey['status'];
  target_segment?: string | null;
  segment_rules?: Record<string, unknown> | null;
  starts_at?: string | null;
  ends_at?: string | null;
  created_by?: string | null;
}

export interface UpdateNPSSurveyInput {
  name?: string;
  question?: string;
  status?: NPSSurvey['status'];
  target_segment?: string | null;
  segment_rules?: Record<string, unknown> | null;
  starts_at?: string | null;
  ends_at?: string | null;
}

export interface CreateNPSResponseInput {
  survey_id: string;
  score: number;
  email?: string | null;
  contact_id?: string | null;
  feedback?: string | null;
  metadata?: Record<string, unknown> | null;
  responded_at: string;
}

export interface CreateNPSCampaignInput {
  name: string;
  description?: string | null;
  survey_id: string;
  channel: NPSCampaign['channel'];
  target_segment?: string | null;
  status: NPSCampaign['status'];
  scheduled_for?: string | null;
}

export interface UpdateNPSCampaignInput {
  name?: string;
  description?: string | null;
  status?: NPSCampaign['status'];
  scheduled_for?: string | null;
}

/**
 * Filter options for querying NPS data
 */
export interface NPSSurveyFilters extends PaginationOptions {
  status?: NPSSurvey['status'];
  search?: string;
}

export interface NPSResponseFilters extends PaginationOptions {
  survey_id?: string;
  category?: NPSResponse['category'];
  email?: string;
  start_date?: string;
  end_date?: string;
}

export interface NPSAnalysisFilters extends PaginationOptions {
  survey_id?: string;
  response_id?: string;
  analysis_type?: NPSAnalysis['analysis_type'];
}

/**
 * NPS Service Interface
 *
 * Provides methods for managing NPS surveys, responses, campaigns, and AI-powered analysis.
 */
export interface INpsService extends BaseService {
  readonly serviceName: 'nps';

  // ============================================
  // Survey Operations
  // ============================================

  /**
   * Get all NPS surveys for the tenant
   */
  getSurveys(ctx: ServiceContext, filters?: NPSSurveyFilters): Promise<ListResponse<NPSSurvey>>;

  /**
   * Get a specific NPS survey by ID
   */
  getSurveyById(ctx: ServiceContext, id: string): Promise<NPSSurvey | null>;

  /**
   * Create a new NPS survey
   */
  createSurvey(ctx: ServiceContext, data: CreateNPSSurveyInput): Promise<NPSSurvey>;

  /**
   * Update an existing NPS survey
   */
  updateSurvey(ctx: ServiceContext, id: string, data: UpdateNPSSurveyInput): Promise<NPSSurvey>;

  /**
   * Delete an NPS survey (and all its responses)
   */
  deleteSurvey(ctx: ServiceContext, id: string): Promise<void>;

  // ============================================
  // Response Operations
  // ============================================

  /**
   * Get responses for a survey
   */
  getResponses(ctx: ServiceContext, filters?: NPSResponseFilters): Promise<ListResponse<NPSResponse>>;

  /**
   * Get a specific response by ID
   */
  getResponseById(ctx: ServiceContext, id: string): Promise<NPSResponse | null>;

  /**
   * Create a new NPS response
   */
  createResponse(ctx: ServiceContext, data: CreateNPSResponseInput): Promise<NPSResponse>;

  /**
   * Get detractors for follow-up
   */
  getDetractors(ctx: ServiceContext, surveyId?: string): Promise<NPSResponse[]>;

  // ============================================
  // Campaign Operations
  // ============================================

  /**
   * Get all NPS campaigns
   */
  getCampaigns(ctx: ServiceContext, filters?: PaginationOptions): Promise<ListResponse<NPSCampaign>>;

  /**
   * Get a specific campaign by ID
   */
  getCampaignById(ctx: ServiceContext, id: string): Promise<NPSCampaign | null>;

  /**
   * Create a new NPS campaign
   */
  createCampaign(ctx: ServiceContext, data: CreateNPSCampaignInput): Promise<NPSCampaign>;

  /**
   * Update a campaign
   */
  updateCampaign(ctx: ServiceContext, id: string, data: UpdateNPSCampaignInput): Promise<NPSCampaign>;

  /**
   * Delete a campaign
   */
  deleteCampaign(ctx: ServiceContext, id: string): Promise<void>;

  // ============================================
  // Analysis & AI Operations
  // ============================================

  /**
   * Get AI analysis for responses
   */
  getAnalysis(ctx: ServiceContext, filters?: NPSAnalysisFilters): Promise<ListResponse<NPSAnalysis>>;

  /**
   * Analyze sentiment of response feedback using AI
   */
  analyzeSentiment(ctx: ServiceContext, responseId: string): Promise<NPSAnalysis>;

  /**
   * Predict detractor risk for a contact
   */
  predictDetractorRisk(ctx: ServiceContext, contactId: string): Promise<number>;

  /**
   * Get AI-suggested follow-up actions for a response
   */
  suggestFollowup(ctx: ServiceContext, responseId: string): Promise<string[]>;

  // ============================================
  // Statistics & Trends
  // ============================================

  /**
   * Get overall NPS statistics
   */
  getStats(ctx: ServiceContext): Promise<NPSStats>;

  /**
   * Get NPS trend data over time
   */
  getTrends(ctx: ServiceContext, surveyId?: string, period?: 'day' | 'week' | 'month'): Promise<NPSTrend[]>;

  /**
   * Calculate NPS score for a survey
   */
  calculateScore(ctx: ServiceContext, surveyId: string): Promise<number>;
}
