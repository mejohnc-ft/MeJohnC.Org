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
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
export class CRMNPSSyncAdapter implements INPSCRMSyncAdapter {
  async syncResponseToContact(response: NPSResponse): Promise<CRMSyncResult> {
    // TODO: Implement after CRM module is available
    // Will call CRM service to update contact with NPS data
    throw new Error('CRM sync not yet implemented - waiting for CRM module (#108)');
  }

  async syncResponsesBatch(responses: NPSResponse[]): Promise<CRMSyncResult[]> {
    // TODO: Implement batch sync after CRM module is available
    throw new Error('CRM batch sync not yet implemented - waiting for CRM module (#108)');
  }

  async updateContactNPSHistory(
    contactId: string,
    score: number,
    category: 'promoter' | 'passive' | 'detractor',
    surveyDate: string
  ): Promise<CRMSyncResult> {
    // TODO: Implement after CRM module is available
    throw new Error('CRM history update not yet implemented - waiting for CRM module (#108)');
  }

  async flagDetractor(contactId: string, responseId: string, feedback?: string): Promise<CRMSyncResult> {
    // TODO: Implement after CRM module is available
    // Will create a task or flag in CRM for follow-up
    throw new Error('CRM detractor flagging not yet implemented - waiting for CRM module (#108)');
  }

  async getContactNPSHistory(contactId: string): Promise<{
    currentScore: number | null;
    category: 'promoter' | 'passive' | 'detractor' | null;
    history: Array<{ score: number; date: string }>;
  }> {
    // TODO: Implement after CRM module is available
    throw new Error('CRM history retrieval not yet implemented - waiting for CRM module (#108)');
  }
/* eslint-enable @typescript-eslint/no-unused-vars */

  async verifyConfiguration(): Promise<{ valid: boolean; error?: string }> {
    return { valid: false, error: 'CRM module not yet available' };
  }
}
