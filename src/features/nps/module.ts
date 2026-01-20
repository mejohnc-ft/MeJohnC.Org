/**
 * NPS Feature Module
 *
 * Defines the feature module for the NPS (Net Promoter Score) system.
 * This module can be:
 * - Run as part of the main app
 * - Extracted as a standalone product
 * - Integrated into the CentrexAI platform
 *
 * @see docs/modular-app-design-spec.md
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/111
 */

import type { FeatureModule } from '@/features/types';

/**
 * NPS feature module definition
 *
 * Provides AI-powered Net Promoter Score surveys with:
 * - Survey creation and management
 * - Response collection and analysis
 * - Sentiment analysis and detractor prediction
 * - Multi-channel delivery (email, SMS)
 * - CRM integration for score syncing
 */
export const npsModule: FeatureModule = {
  name: 'nps',
  version: '1.0.0',
  prefix: 'nps',

  frontendRoutes: [
    {
      path: '/admin/nps',
      component: () => import('./pages/AnalysisPage'),
      title: 'NPS Overview',
      icon: 'trending-up',
      showInNav: true,
      permissions: ['nps:read'],
    },
    {
      path: '/admin/nps/surveys',
      component: () => import('./pages/SurveysPage'),
      title: 'Surveys',
      icon: 'list',
      showInNav: true,
      permissions: ['nps:read'],
    },
    {
      path: '/admin/nps/surveys/new',
      component: () => import('./pages/SurveysPage'),
      title: 'New Survey',
      permissions: ['nps:write'],
    },
    {
      path: '/admin/nps/surveys/:id',
      component: () => import('./pages/SurveysPage'),
      title: 'Survey Details',
      permissions: ['nps:read'],
    },
    {
      path: '/admin/nps/responses',
      component: () => import('./pages/ResponsesPage'),
      title: 'Responses',
      icon: 'message-square',
      showInNav: true,
      permissions: ['nps:read'],
    },
    {
      path: '/admin/nps/analysis',
      component: () => import('./pages/AnalysisPage'),
      title: 'Analysis',
      icon: 'bar-chart',
      showInNav: true,
      permissions: ['nps:read'],
    },
  ],

  migrations: {
    prefix: 'nps',
    tables: ['nps_surveys', 'nps_responses', 'nps_campaigns', 'nps_analysis'],
    directory: './migrations',
  },

  services: {
    // Will be populated when service is instantiated
  },

  async initialize() {
    console.log('[NpsModule] Initializing NPS feature');
    console.log('[NpsModule] AI tools: sentiment analysis, detractor prediction, follow-up suggestions');
    console.log('[NpsModule] Adapters: email (SendGrid/Resend), SMS (Twilio), CRM sync');
  },

  async shutdown() {
    console.log('[NpsModule] Shutting down NPS feature');
  },
};

/**
 * Agent Tools for AI Integration
 *
 * These tools can be registered with an AI agent to enable:
 * - Natural language queries about NPS scores
 * - Automated detractor follow-up
 * - Sentiment analysis of feedback
 * - Predictive analytics
 */
export const npsAgentTools = [
  {
    name: 'nps_get_score',
    description: 'Get the current NPS score for a survey or overall',
    permission: 'nps:read',
  },
  {
    name: 'nps_list_detractors',
    description: 'List recent detractors who need follow-up',
    permission: 'nps:read',
  },
  {
    name: 'nps_analyze_feedback',
    description: 'Analyze sentiment and themes in NPS feedback using AI',
    permission: 'nps:read',
  },
  {
    name: 'nps_send_survey',
    description: 'Send an NPS survey to contacts via email or SMS',
    permission: 'nps:write',
  },
  {
    name: 'nps_suggest_followup',
    description: 'Get AI-generated follow-up suggestions for a response',
    permission: 'nps:read',
  },
  {
    name: 'nps_predict_detractor',
    description: 'Predict likelihood of a contact becoming a detractor',
    permission: 'nps:read',
  },
];

/**
 * Events emitted by the NPS module
 *
 * Other modules can subscribe to these events for integration:
 * - CRM can create follow-up tasks when detractors are flagged
 * - Metrics can track NPS trends
 * - Notifications can alert team members
 */
export const npsEvents = [
  {
    name: 'nps.response.received',
    description: 'Fired when a new NPS response is submitted',
    payload: {
      surveyId: 'string',
      responseId: 'string',
      score: 'number',
      category: 'promoter | passive | detractor',
    },
  },
  {
    name: 'nps.score.changed',
    description: 'Fired when a survey\'s NPS score is recalculated',
    payload: {
      surveyId: 'string',
      oldScore: 'number | null',
      newScore: 'number',
    },
  },
  {
    name: 'nps.detractor.flagged',
    description: 'Fired when a detractor response requires attention',
    payload: {
      responseId: 'string',
      contactId: 'string | null',
      score: 'number',
      feedback: 'string | null',
    },
  },
];
