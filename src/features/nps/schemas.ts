/**
 * NPS Feature - Schemas
 *
 * Re-exports NPS-related Zod schemas from the main schemas file.
 * In the future, these will be moved here directly.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/111
 */

// Re-export NPS schemas from central schemas.ts
// These will eventually be moved here as the primary location
export {
  // Schemas
  NPSSurveyStatusSchema,
  NPSSurveySchema,
  NPSCategorySchema,
  NPSResponseSchema,
  // Types
  type NPSSurvey,
  type NPSResponse,
} from '@/lib/schemas';

/**
 * NPS Analysis Types
 * Used for AI-powered sentiment analysis and trend detection
 */
import { z } from 'zod';

export const NPSSentimentSchema = z.enum(['positive', 'neutral', 'negative']);
export type NPSSentiment = z.infer<typeof NPSSentimentSchema>;

export const NPSAnalysisSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  survey_id: z.string().uuid(),
  response_id: z.string().uuid().nullable(),
  analysis_type: z.enum(['sentiment', 'theme', 'prediction', 'trend']),
  result: z.record(z.unknown()),
  confidence: z.number().min(0).max(1),
  created_at: z.string(),
});
export type NPSAnalysis = z.infer<typeof NPSAnalysisSchema>;

export const NPSCampaignSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  survey_id: z.string().uuid(),
  channel: z.enum(['email', 'sms', 'in_app', 'link']),
  target_segment: z.string().nullable(),
  status: z.enum(['draft', 'scheduled', 'active', 'paused', 'completed']),
  scheduled_for: z.string().nullable(),
  sent_count: z.number().default(0),
  response_count: z.number().default(0),
  created_at: z.string(),
  updated_at: z.string(),
});
export type NPSCampaign = z.infer<typeof NPSCampaignSchema>;

export const NPSTrendSchema = z.object({
  period: z.string(),
  score: z.number(),
  responses: z.number(),
  promoters: z.number(),
  passives: z.number(),
  detractors: z.number(),
});
export type NPSTrend = z.infer<typeof NPSTrendSchema>;

export const NPSStatsSchema = z.object({
  total_surveys: z.number(),
  active_surveys: z.number(),
  total_responses: z.number(),
  average_score: z.number().nullable(),
  trend: z.array(NPSTrendSchema),
});
export type NPSStats = z.infer<typeof NPSStatsSchema>;
