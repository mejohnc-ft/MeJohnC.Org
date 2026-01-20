/**
 * NPS Service
 *
 * Barrel export for NPS service interface and implementations.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/111
 */

export type {
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

export { NpsServiceSupabase } from './nps-service.supabase';
