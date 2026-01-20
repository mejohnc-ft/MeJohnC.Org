/**
 * CRM Service - Supabase Implementation
 *
 * Implements ICrmService using direct Supabase client access.
 */

import { ICrmService } from './crm-service.interface';
import { ServiceContext } from '../types';
import { getSupabase } from '@/lib/supabase';
import * as crmQueries from '@/lib/crm-queries';
import {
  type Contact,
  type ContactWithDetails,
  type Interaction,
  type FollowUp,
  type ContactList,
  type Pipeline,
  type PipelineStage,
  type Deal,
  type DealWithDetails,
} from '@/lib/schemas';
import { type ContactQueryOptions } from '@/lib/crm-queries';

function getClient(ctx: ServiceContext) {
  return ctx.client ?? getSupabase();
}

export class CrmServiceSupabase implements ICrmService {
  readonly serviceName = 'CrmService';

  // ============================================
  // CONTACTS
  // ============================================

  async getContacts(ctx: ServiceContext, options?: ContactQueryOptions): Promise<ContactWithDetails[]> {
    return crmQueries.getContacts(options, getClient(ctx));
  }

  async getContactById(ctx: ServiceContext, id: string): Promise<ContactWithDetails> {
    return crmQueries.getContactById(id, getClient(ctx));
  }

  async createContact(
    ctx: ServiceContext,
    data: Omit<Contact, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Contact> {
    return crmQueries.createContact(data, getClient(ctx));
  }

  async updateContact(ctx: ServiceContext, id: string, data: Partial<Contact>): Promise<Contact> {
    return crmQueries.updateContact(id, data, getClient(ctx));
  }

  async deleteContact(ctx: ServiceContext, id: string): Promise<void> {
    return crmQueries.deleteContact(id, getClient(ctx));
  }

  // ============================================
  // INTERACTIONS
  // ============================================

  async getInteractions(ctx: ServiceContext, contactId: string): Promise<Interaction[]> {
    return crmQueries.getInteractions(contactId, getClient(ctx));
  }

  async createInteraction(
    ctx: ServiceContext,
    data: Omit<Interaction, 'id' | 'created_at'>
  ): Promise<Interaction> {
    return crmQueries.createInteraction(data, getClient(ctx));
  }

  async updateInteraction(ctx: ServiceContext, id: string, data: Partial<Interaction>): Promise<Interaction> {
    return crmQueries.updateInteraction(id, data, getClient(ctx));
  }

  async deleteInteraction(ctx: ServiceContext, id: string): Promise<void> {
    return crmQueries.deleteInteraction(id, getClient(ctx));
  }

  // ============================================
  // FOLLOW-UPS
  // ============================================

  async getFollowUps(ctx: ServiceContext, contactId: string): Promise<FollowUp[]> {
    return crmQueries.getFollowUps(contactId, getClient(ctx));
  }

  async getPendingFollowUps(ctx: ServiceContext): Promise<FollowUp[]> {
    return crmQueries.getPendingFollowUps(getClient(ctx));
  }

  async createFollowUp(
    ctx: ServiceContext,
    data: Omit<FollowUp, 'id' | 'created_at' | 'updated_at' | 'completed_at'>
  ): Promise<FollowUp> {
    return crmQueries.createFollowUp(data, getClient(ctx));
  }

  async updateFollowUp(ctx: ServiceContext, id: string, data: Partial<FollowUp>): Promise<FollowUp> {
    return crmQueries.updateFollowUp(id, data, getClient(ctx));
  }

  async completeFollowUp(ctx: ServiceContext, id: string): Promise<FollowUp> {
    return crmQueries.completeFollowUp(id, getClient(ctx));
  }

  async deleteFollowUp(ctx: ServiceContext, id: string): Promise<void> {
    return crmQueries.deleteFollowUp(id, getClient(ctx));
  }

  // ============================================
  // CONTACT LISTS
  // ============================================

  async getContactLists(ctx: ServiceContext): Promise<ContactList[]> {
    return crmQueries.getContactLists(getClient(ctx));
  }

  async createContactList(
    ctx: ServiceContext,
    data: Omit<ContactList, 'id' | 'created_at' | 'updated_at' | 'member_count'>
  ): Promise<ContactList> {
    return crmQueries.createContactList(data, getClient(ctx));
  }

  async updateContactList(ctx: ServiceContext, id: string, data: Partial<ContactList>): Promise<ContactList> {
    return crmQueries.updateContactList(id, data, getClient(ctx));
  }

  async deleteContactList(ctx: ServiceContext, id: string): Promise<void> {
    return crmQueries.deleteContactList(id, getClient(ctx));
  }

  async addContactsToList(ctx: ServiceContext, listId: string, contactIds: string[]): Promise<void> {
    return crmQueries.addContactsToList(listId, contactIds, getClient(ctx));
  }

  async removeContactsFromList(ctx: ServiceContext, listId: string, contactIds: string[]): Promise<void> {
    return crmQueries.removeContactsFromList(listId, contactIds, getClient(ctx));
  }

  // ============================================
  // PIPELINES
  // ============================================

  async getPipelines(ctx: ServiceContext): Promise<Pipeline[]> {
    return crmQueries.getPipelines(getClient(ctx));
  }

  async getPipelineById(ctx: ServiceContext, id: string): Promise<Pipeline & { stages: PipelineStage[] }> {
    return crmQueries.getPipelineById(id, getClient(ctx));
  }

  async createPipeline(
    ctx: ServiceContext,
    data: Omit<Pipeline, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Pipeline> {
    return crmQueries.createPipeline(data, getClient(ctx));
  }

  async updatePipeline(ctx: ServiceContext, id: string, data: Partial<Pipeline>): Promise<Pipeline> {
    return crmQueries.updatePipeline(id, data, getClient(ctx));
  }

  async deletePipeline(ctx: ServiceContext, id: string): Promise<void> {
    return crmQueries.deletePipeline(id, getClient(ctx));
  }

  // ============================================
  // DEALS
  // ============================================

  async getDeals(ctx: ServiceContext, pipelineId?: string, stageId?: string): Promise<DealWithDetails[]> {
    return crmQueries.getDeals(pipelineId, stageId, getClient(ctx));
  }

  async getDealById(ctx: ServiceContext, id: string): Promise<DealWithDetails> {
    return crmQueries.getDealById(id, getClient(ctx));
  }

  async createDeal(
    ctx: ServiceContext,
    data: Omit<Deal, 'id' | 'created_at' | 'updated_at' | 'closed_at'>
  ): Promise<Deal> {
    return crmQueries.createDeal(data, getClient(ctx));
  }

  async updateDeal(ctx: ServiceContext, id: string, data: Partial<Deal>): Promise<Deal> {
    return crmQueries.updateDeal(id, data, getClient(ctx));
  }

  async moveDealToStage(ctx: ServiceContext, id: string, stageId: string): Promise<Deal> {
    return crmQueries.moveDealToStage(id, stageId, getClient(ctx));
  }

  async deleteDeal(ctx: ServiceContext, id: string): Promise<void> {
    return crmQueries.deleteDeal(id, getClient(ctx));
  }
}

export const crmServiceSupabase = new CrmServiceSupabase();
