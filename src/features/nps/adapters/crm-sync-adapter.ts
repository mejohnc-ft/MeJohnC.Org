/**
 * NPS CRM Sync Adapter Interface
 *
 * Defines the contract for syncing NPS scores to CRM contact records.
 * This enables bi-directional integration with the CRM module.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/111
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/108 (CRM module)
 */

import type { NPSResponse } from '../schemas';

export interface CRMContactUpdate {
  contactId: string;
  npsScore: number;
  category: 'promoter' | 'passive' | 'detractor';
  lastSurveyDate: string;
  feedback?: string;
}

export interface CRMSyncResult {
  success: boolean;
  contactId: string;
  error?: string;
}

/**
 * CRM Sync adapter for pushing NPS data to contact records
 *
 * Note: This will integrate with the CRM module (issue #108) once it's complete.
 * For now, this is an interface definition only.
 */
export interface INPSCRMSyncAdapter {
  /**
   * Sync a single NPS response to a CRM contact
   */
  syncResponseToContact(response: NPSResponse): Promise<CRMSyncResult>;

  /**
   * Sync multiple NPS responses to CRM contacts (batch)
   */
  syncResponsesBatch(responses: NPSResponse[]): Promise<CRMSyncResult[]>;

  /**
   * Update contact's NPS history
   */
  updateContactNPSHistory(
    contactId: string,
    score: number,
    category: 'promoter' | 'passive' | 'detractor',
    surveyDate: string
  ): Promise<CRMSyncResult>;

  /**
   * Flag a contact as a detractor for follow-up
   */
  flagDetractor(contactId: string, responseId: string, feedback?: string): Promise<CRMSyncResult>;

  /**
   * Get NPS history for a contact
   */
  getContactNPSHistory(contactId: string): Promise<{
    currentScore: number | null;
    category: 'promoter' | 'passive' | 'detractor' | null;
    history: Array<{ score: number; date: string }>;
  }>;

  /**
   * Verify CRM integration is configured
   */
  verifyConfiguration(): Promise<{ valid: boolean; error?: string }>;
}

/**
 * Implementation stub for CRM sync
 *
 * This will be implemented once the CRM module (issue #108) is complete.
 * It will use the CRM service to update contact records.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/108
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/117
 */
export class CRMNPSSyncAdapter implements INPSCRMSyncAdapter {
  private static readonly CRM_MODULE_ERROR =
    'CRM sync requires the CRM module which is not yet available. See issue #108 for progress.';

  async syncResponseToContact(response: NPSResponse): Promise<CRMSyncResult> {
    console.warn('[CRMNPSSyncAdapter] syncResponseToContact called but CRM module not available', {
      responseId: response.id,
      score: response.score,
    });
    return {
      success: false,
      contactId: response.subscriber_id || '',
      error: CRMNPSSyncAdapter.CRM_MODULE_ERROR,
    };
  }

  async syncResponsesBatch(responses: NPSResponse[]): Promise<CRMSyncResult[]> {
    console.warn('[CRMNPSSyncAdapter] syncResponsesBatch called but CRM module not available', {
      count: responses.length,
    });
    return responses.map((response) => ({
      success: false,
      contactId: response.subscriber_id || '',
      error: CRMNPSSyncAdapter.CRM_MODULE_ERROR,
    }));
  }

  async updateContactNPSHistory(
    contactId: string,
    score: number,
    category: 'promoter' | 'passive' | 'detractor',
    surveyDate: string
  ): Promise<CRMSyncResult> {
    console.warn('[CRMNPSSyncAdapter] updateContactNPSHistory called but CRM module not available', {
      contactId,
      score,
      category,
      surveyDate,
    });
    return {
      success: false,
      contactId,
      error: CRMNPSSyncAdapter.CRM_MODULE_ERROR,
    };
  }

  async flagDetractor(
    contactId: string,
    responseId: string,
    feedback?: string
  ): Promise<CRMSyncResult> {
    console.warn('[CRMNPSSyncAdapter] flagDetractor called but CRM module not available', {
      contactId,
      responseId,
      hasFeedback: !!feedback,
    });
    return {
      success: false,
      contactId,
      error: CRMNPSSyncAdapter.CRM_MODULE_ERROR,
    };
  }

  async getContactNPSHistory(contactId: string): Promise<{
    currentScore: number | null;
    category: 'promoter' | 'passive' | 'detractor' | null;
    history: Array<{ score: number; date: string }>;
  }> {
    console.warn('[CRMNPSSyncAdapter] getContactNPSHistory called but CRM module not available', {
      contactId,
    });
    // Return empty history instead of throwing
    return {
      currentScore: null,
      category: null,
      history: [],
    };
  }

  async verifyConfiguration(): Promise<{ valid: boolean; error?: string }> {
    return {
      valid: false,
      error: 'CRM module not yet available. See issue #108 for implementation progress.',
    };
  }
}
