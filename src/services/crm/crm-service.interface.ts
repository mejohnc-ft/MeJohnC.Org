/**
 * CRM Service Interface
 *
 * Defines the contract for CRM operations (contacts, deals, pipelines).
 */

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
import { BaseService, ServiceContext } from '../types';

export interface ICrmService extends BaseService {
  // ============================================
  // CONTACTS
  // ============================================

  /** Get contacts with optional filtering */
  getContacts(ctx: ServiceContext, options?: ContactQueryOptions): Promise<ContactWithDetails[]>;

  /** Get a single contact by ID */
  getContactById(ctx: ServiceContext, id: string): Promise<ContactWithDetails>;

  /** Create a new contact */
  createContact(
    ctx: ServiceContext,
    data: Omit<Contact, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Contact>;

  /** Update a contact */
  updateContact(
    ctx: ServiceContext,
    id: string,
    data: Partial<Contact>
  ): Promise<Contact>;

  /** Delete a contact */
  deleteContact(ctx: ServiceContext, id: string): Promise<void>;

  // ============================================
  // INTERACTIONS
  // ============================================

  /** Get interactions for a contact */
  getInteractions(ctx: ServiceContext, contactId: string): Promise<Interaction[]>;

  /** Create an interaction */
  createInteraction(
    ctx: ServiceContext,
    data: Omit<Interaction, 'id' | 'created_at'>
  ): Promise<Interaction>;

  /** Update an interaction */
  updateInteraction(
    ctx: ServiceContext,
    id: string,
    data: Partial<Interaction>
  ): Promise<Interaction>;

  /** Delete an interaction */
  deleteInteraction(ctx: ServiceContext, id: string): Promise<void>;

  // ============================================
  // FOLLOW-UPS
  // ============================================

  /** Get follow-ups for a contact */
  getFollowUps(ctx: ServiceContext, contactId: string): Promise<FollowUp[]>;

  /** Get pending follow-ups */
  getPendingFollowUps(ctx: ServiceContext): Promise<FollowUp[]>;

  /** Create a follow-up */
  createFollowUp(
    ctx: ServiceContext,
    data: Omit<FollowUp, 'id' | 'created_at' | 'updated_at' | 'completed_at'>
  ): Promise<FollowUp>;

  /** Update a follow-up */
  updateFollowUp(
    ctx: ServiceContext,
    id: string,
    data: Partial<FollowUp>
  ): Promise<FollowUp>;

  /** Complete a follow-up */
  completeFollowUp(ctx: ServiceContext, id: string): Promise<FollowUp>;

  /** Delete a follow-up */
  deleteFollowUp(ctx: ServiceContext, id: string): Promise<void>;

  // ============================================
  // CONTACT LISTS
  // ============================================

  /** Get all contact lists */
  getContactLists(ctx: ServiceContext): Promise<ContactList[]>;

  /** Create a contact list */
  createContactList(
    ctx: ServiceContext,
    data: Omit<ContactList, 'id' | 'created_at' | 'updated_at' | 'member_count'>
  ): Promise<ContactList>;

  /** Update a contact list */
  updateContactList(
    ctx: ServiceContext,
    id: string,
    data: Partial<ContactList>
  ): Promise<ContactList>;

  /** Delete a contact list */
  deleteContactList(ctx: ServiceContext, id: string): Promise<void>;

  /** Add contacts to a list */
  addContactsToList(ctx: ServiceContext, listId: string, contactIds: string[]): Promise<void>;

  /** Remove contacts from a list */
  removeContactsFromList(ctx: ServiceContext, listId: string, contactIds: string[]): Promise<void>;

  // ============================================
  // PIPELINES
  // ============================================

  /** Get all pipelines */
  getPipelines(ctx: ServiceContext): Promise<Pipeline[]>;

  /** Get pipeline by ID with stages */
  getPipelineById(ctx: ServiceContext, id: string): Promise<Pipeline & { stages: PipelineStage[] }>;

  /** Create a pipeline */
  createPipeline(
    ctx: ServiceContext,
    data: Omit<Pipeline, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Pipeline>;

  /** Update a pipeline */
  updatePipeline(
    ctx: ServiceContext,
    id: string,
    data: Partial<Pipeline>
  ): Promise<Pipeline>;

  /** Delete a pipeline */
  deletePipeline(ctx: ServiceContext, id: string): Promise<void>;

  // ============================================
  // DEALS
  // ============================================

  /** Get deals with optional filtering */
  getDeals(ctx: ServiceContext, pipelineId?: string, stageId?: string): Promise<DealWithDetails[]>;

  /** Get deal by ID */
  getDealById(ctx: ServiceContext, id: string): Promise<DealWithDetails>;

  /** Create a deal */
  createDeal(
    ctx: ServiceContext,
    data: Omit<Deal, 'id' | 'created_at' | 'updated_at' | 'closed_at'>
  ): Promise<Deal>;

  /** Update a deal */
  updateDeal(
    ctx: ServiceContext,
    id: string,
    data: Partial<Deal>
  ): Promise<Deal>;

  /** Move deal to a different stage */
  moveDealToStage(ctx: ServiceContext, id: string, stageId: string): Promise<Deal>;

  /** Delete a deal */
  deleteDeal(ctx: ServiceContext, id: string): Promise<void>;
}
