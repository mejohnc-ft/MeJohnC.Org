/**
 * NPS Feature Module
 *
 * Public API for the NPS (Net Promoter Score) feature.
 * This module provides AI-powered NPS survey management including:
 * - Survey creation and management
 * - Multi-channel delivery (email, SMS)
 * - Response collection and analysis
 * - Sentiment analysis and detractor prediction
 * - CRM integration for score syncing
 * - Trend analysis and reporting
 *
 * @see docs/modular-app-design-spec.md
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/111
 */

// Module definition
export { npsModule, npsAgentTools, npsEvents } from './module';

// Components
export {
  NpsDashboard,
  SurveyBuilder,
  ResponseList,
  DetractorAlert,
  TrendChart,
} from './components';

export type { SurveyFormData } from './components';

// Pages (lazy-loaded, so also available via module.frontendRoutes)
export { SurveysPage, ResponsesPage, AnalysisPage } from './pages';

// Schemas (re-exported from central schemas for convenience)
export {
  NPSSurveyStatusSchema,
  NPSSurveySchema,
  NPSCategorySchema,
  NPSResponseSchema,
  NPSSentimentSchema,
  NPSAnalysisSchema,
  NPSCampaignSchema,
  NPSTrendSchema,
  NPSStatsSchema,
  type NPSSurvey,
  type NPSResponse,
  type NPSSentiment,
  type NPSAnalysis,
  type NPSCampaign,
  type NPSTrend,
  type NPSStats,
} from './schemas';

// Adapters
export type {
  INPSEmailAdapter,
  NPSEmailRecipient,
  NPSEmailTemplate,
  NPSEmailOptions,
  INPSSMSAdapter,
  NPSSMSRecipient,
  NPSSMSMessage,
  NPSSMSOptions,
  INPSCRMSyncAdapter,
  CRMContactUpdate,
  CRMSyncResult,
} from './adapters';

export {
  SendGridNPSAdapter,
  ResendNPSAdapter,
  TwilioNPSAdapter,
  CRMNPSSyncAdapter,
} from './adapters';
