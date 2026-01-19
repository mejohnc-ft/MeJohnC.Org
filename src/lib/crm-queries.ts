/**
 * CRM Query Functions
 * Database operations for contacts, interactions, follow-ups, and deals
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import {
  ContactSchema,
  InteractionSchema,
  FollowUpSchema,
  ContactListSchema,
  PipelineSchema,
  PipelineStageSchema,
  DealSchema,
  CRMStatsSchema,
  parseResponse,
  parseArrayResponse,
  type Contact,
  type Interaction,
  type FollowUp,
  type ContactList,
  type Pipeline,
  type PipelineStage,
  type Deal,
  type CRMStats,
} from './schemas';

// Re-export types
export type {
  Contact,
  Interaction,
  FollowUp,
  ContactList,
  Pipeline,
  PipelineStage,
  Deal,
  CRMStats,
};

// Supabase instance
const supabase = getSupabase();

// Helper for handling query results
function handleQueryResult<T>(
  data: T | null,
  error: { message: string } | null,
  options: { operation: string; returnFallback?: boolean; fallback?: T }
): T {
  if (error) {
    console.error(`[${options.operation}] Error:`, error.message);
    if (options.returnFallback && options.fallback !== undefined) {
      return options.fallback;
    }
    throw error;
  }
  return data as T;
}

// ============================================
// CONTACTS
// ============================================

export interface ContactQueryOptions {
  search?: string;
  contactType?: Contact['contact_type'];
  status?: Contact['status'];
  tags?: string[];
  hasFollowUp?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'last_contacted_at' | 'next_follow_up_at' | 'company';
  orderDirection?: 'asc' | 'desc';
}

export async function getContacts(
  options: ContactQueryOptions = {},
  client: SupabaseClient = supabase
): Promise<Contact[]> {
  const {
    search,
    contactType,
    status = 'active',
    tags,
    hasFollowUp,
    limit = 50,
    offset = 0,
    orderBy = 'created_at',
    orderDirection = 'desc',
  } = options;

  let query = client
    .from('contacts')
    .select('*')
    .order(orderBy, { ascending: orderDirection === 'asc' })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  if (contactType) {
    query = query.eq('contact_type', contactType);
  }

  if (tags && tags.length > 0) {
    query = query.overlaps('tags', tags);
  }

  if (hasFollowUp !== undefined) {
    if (hasFollowUp) {
      query = query.not('next_follow_up_at', 'is', null);
    } else {
      query = query.is('next_follow_up_at', null);
    }
  }

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getContacts',
    returnFallback: true,
    fallback: [] as Contact[],
  });
}

export async function getContactById(
  id: string,
  client: SupabaseClient = supabase
): Promise<Contact> {
  const { data, error } = await client
    .from('contacts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return parseResponse(ContactSchema, data, 'getContactById');
}

export async function createContact(
  contact: Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'last_contacted_at'>,
  client: SupabaseClient = supabase
): Promise<Contact> {
  const { data, error } = await client
    .from('contacts')
    .insert(contact)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(ContactSchema, data, 'createContact');
}

export async function updateContact(
  id: string,
  updates: Partial<Contact>,
  client: SupabaseClient = supabase
): Promise<Contact> {
  const { data, error } = await client
    .from('contacts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(ContactSchema, data, 'updateContact');
}

export async function deleteContact(
  id: string,
  client: SupabaseClient = supabase
): Promise<void> {
  const { error } = await client.from('contacts').delete().eq('id', id);
  if (error) throw error;
}

export async function archiveContact(
  id: string,
  client: SupabaseClient = supabase
): Promise<Contact> {
  return updateContact(id, { status: 'archived' }, client);
}

// ============================================
// INTERACTIONS
// ============================================

export async function getInteractions(
  contactId: string,
  limit = 50,
  client: SupabaseClient = supabase
): Promise<Interaction[]> {
  const { data, error } = await client
    .from('interactions')
    .select('*')
    .eq('contact_id', contactId)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  return handleQueryResult(data, error, {
    operation: 'getInteractions',
    returnFallback: true,
    fallback: [] as Interaction[],
  });
}

export async function createInteraction(
  interaction: Omit<Interaction, 'id' | 'created_at'>,
  client: SupabaseClient = supabase
): Promise<Interaction> {
  const { data, error } = await client
    .from('interactions')
    .insert(interaction)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(InteractionSchema, data, 'createInteraction');
}

export async function deleteInteraction(
  id: string,
  client: SupabaseClient = supabase
): Promise<void> {
  const { error } = await client.from('interactions').delete().eq('id', id);
  if (error) throw error;
}

// ============================================
// FOLLOW-UPS
// ============================================

export async function getFollowUps(
  options: {
    contactId?: string;
    status?: FollowUp['status'];
    upcoming?: boolean;
    overdue?: boolean;
    limit?: number;
  } = {},
  client: SupabaseClient = supabase
): Promise<FollowUp[]> {
  const { contactId, status, upcoming, overdue, limit = 50 } = options;

  let query = client
    .from('follow_ups')
    .select('*')
    .order('due_at', { ascending: true })
    .limit(limit);

  if (contactId) {
    query = query.eq('contact_id', contactId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (overdue) {
    query = query.eq('status', 'pending').lt('due_at', new Date().toISOString());
  } else if (upcoming) {
    query = query
      .eq('status', 'pending')
      .gte('due_at', new Date().toISOString());
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getFollowUps',
    returnFallback: true,
    fallback: [] as FollowUp[],
  });
}

export async function getOverdueFollowUps(
  client: SupabaseClient = supabase
): Promise<FollowUp[]> {
  return getFollowUps({ overdue: true }, client);
}

export async function getUpcomingFollowUps(
  days = 7,
  client: SupabaseClient = supabase
): Promise<FollowUp[]> {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  const { data, error } = await client
    .from('follow_ups')
    .select('*')
    .eq('status', 'pending')
    .gte('due_at', new Date().toISOString())
    .lte('due_at', endDate.toISOString())
    .order('due_at', { ascending: true });

  return handleQueryResult(data, error, {
    operation: 'getUpcomingFollowUps',
    returnFallback: true,
    fallback: [] as FollowUp[],
  });
}

export async function createFollowUp(
  followUp: Omit<FollowUp, 'id' | 'created_at' | 'completed_at' | 'completed_by' | 'completion_notes'>,
  client: SupabaseClient = supabase
): Promise<FollowUp> {
  const { data, error } = await client
    .from('follow_ups')
    .insert(followUp)
    .select()
    .single();

  if (error) throw error;

  // Update contact's next_follow_up_at
  if (followUp.status === 'pending') {
    await updateContactNextFollowUp(followUp.contact_id, client);
  }

  return parseResponse(FollowUpSchema, data, 'createFollowUp');
}

export async function completeFollowUp(
  id: string,
  notes?: string,
  completedBy?: string,
  client: SupabaseClient = supabase
): Promise<FollowUp> {
  const { data, error } = await client
    .from('follow_ups')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by: completedBy,
      completion_notes: notes,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  const followUp = parseResponse(FollowUpSchema, data, 'completeFollowUp');

  // Update contact's next_follow_up_at
  await updateContactNextFollowUp(followUp.contact_id, client);

  return followUp;
}

export async function snoozeFollowUp(
  id: string,
  newDueAt: string,
  client: SupabaseClient = supabase
): Promise<FollowUp> {
  const { data, error } = await client
    .from('follow_ups')
    .update({ due_at: newDueAt, status: 'pending' })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(FollowUpSchema, data, 'snoozeFollowUp');
}

export async function deleteFollowUp(
  id: string,
  client: SupabaseClient = supabase
): Promise<void> {
  // Get contact_id before deleting
  const { data: followUp } = await client
    .from('follow_ups')
    .select('contact_id')
    .eq('id', id)
    .single();

  const { error } = await client.from('follow_ups').delete().eq('id', id);
  if (error) throw error;

  // Update contact's next_follow_up_at
  if (followUp?.contact_id) {
    await updateContactNextFollowUp(followUp.contact_id, client);
  }
}

// Helper to update contact's next_follow_up_at
async function updateContactNextFollowUp(
  contactId: string,
  client: SupabaseClient = supabase
): Promise<void> {
  const { data: nextFollowUp } = await client
    .from('follow_ups')
    .select('due_at')
    .eq('contact_id', contactId)
    .eq('status', 'pending')
    .order('due_at', { ascending: true })
    .limit(1)
    .single();

  await client
    .from('contacts')
    .update({
      next_follow_up_at: nextFollowUp?.due_at || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contactId);
}

// ============================================
// CONTACT LISTS
// ============================================

export async function getContactLists(
  client: SupabaseClient = supabase
): Promise<ContactList[]> {
  const { data, error } = await client
    .from('contact_lists')
    .select('*')
    .order('name', { ascending: true });

  return handleQueryResult(data, error, {
    operation: 'getContactLists',
    returnFallback: true,
    fallback: [] as ContactList[],
  });
}

export async function getContactListMembers(
  listId: string,
  client: SupabaseClient = supabase
): Promise<Contact[]> {
  const { data, error } = await client
    .from('contact_list_members')
    .select('contacts(*)')
    .eq('list_id', listId);

  if (error) throw error;
  return (data || []).map((item: { contacts: Contact }) => item.contacts);
}

export async function addContactToList(
  contactId: string,
  listId: string,
  addedBy?: string,
  client: SupabaseClient = supabase
): Promise<void> {
  const { error } = await client.from('contact_list_members').insert({
    contact_id: contactId,
    list_id: listId,
    added_by: addedBy,
  });
  if (error && !error.message.includes('duplicate')) throw error;
}

export async function removeContactFromList(
  contactId: string,
  listId: string,
  client: SupabaseClient = supabase
): Promise<void> {
  const { error } = await client
    .from('contact_list_members')
    .delete()
    .eq('contact_id', contactId)
    .eq('list_id', listId);
  if (error) throw error;
}

// ============================================
// PIPELINES & DEALS
// ============================================

export async function getPipelines(
  client: SupabaseClient = supabase
): Promise<Pipeline[]> {
  const { data, error } = await client
    .from('pipelines')
    .select('*')
    .order('is_default', { ascending: false });

  return handleQueryResult(data, error, {
    operation: 'getPipelines',
    returnFallback: true,
    fallback: [] as Pipeline[],
  });
}

export async function getPipelineStages(
  pipelineId: string,
  client: SupabaseClient = supabase
): Promise<PipelineStage[]> {
  const { data, error } = await client
    .from('pipeline_stages')
    .select('*')
    .eq('pipeline_id', pipelineId)
    .order('sort_order', { ascending: true });

  return handleQueryResult(data, error, {
    operation: 'getPipelineStages',
    returnFallback: true,
    fallback: [] as PipelineStage[],
  });
}

export async function getDeals(
  options: {
    pipelineId?: string;
    stageId?: string;
    contactId?: string;
    status?: Deal['status'];
    limit?: number;
  } = {},
  client: SupabaseClient = supabase
): Promise<Deal[]> {
  const { pipelineId, stageId, contactId, status, limit = 50 } = options;

  let query = client
    .from('deals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (pipelineId) query = query.eq('pipeline_id', pipelineId);
  if (stageId) query = query.eq('stage_id', stageId);
  if (contactId) query = query.eq('contact_id', contactId);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getDeals',
    returnFallback: true,
    fallback: [] as Deal[],
  });
}

export async function createDeal(
  deal: Omit<Deal, 'id' | 'created_at' | 'updated_at' | 'closed_at' | 'expected_revenue'>,
  client: SupabaseClient = supabase
): Promise<Deal> {
  const { data, error } = await client
    .from('deals')
    .insert(deal)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(DealSchema, data, 'createDeal');
}

export async function updateDeal(
  id: string,
  updates: Partial<Deal>,
  client: SupabaseClient = supabase
): Promise<Deal> {
  const updateData: Partial<Deal> & { updated_at: string } = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  // Set closed_at if status changed to won/lost
  if (updates.status && (updates.status === 'won' || updates.status === 'lost')) {
    updateData.closed_at = new Date().toISOString();
  }

  const { data, error } = await client
    .from('deals')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(DealSchema, data, 'updateDeal');
}

export async function moveDealToStage(
  dealId: string,
  stageId: string,
  client: SupabaseClient = supabase
): Promise<Deal> {
  // Check if stage is won/lost
  const { data: stage } = await client
    .from('pipeline_stages')
    .select('is_won, is_lost')
    .eq('id', stageId)
    .single();

  const updates: Partial<Deal> = { stage_id: stageId };
  if (stage?.is_won) updates.status = 'won';
  if (stage?.is_lost) updates.status = 'lost';

  return updateDeal(dealId, updates, client);
}

// ============================================
// STATS
// ============================================

export async function getCRMStats(
  client: SupabaseClient = supabase
): Promise<CRMStats> {
  const [
    contactsResult,
    dealsResult,
    followUpsResult,
  ] = await Promise.all([
    client.from('contacts').select('contact_type, status', { count: 'exact' }),
    client.from('deals').select('status, value', { count: 'exact' }),
    client.from('follow_ups').select('status, due_at', { count: 'exact' }).eq('status', 'pending'),
  ]);

  const contacts = contactsResult.data || [];
  const deals = dealsResult.data || [];
  const followUps = followUpsResult.data || [];

  const now = new Date().toISOString();

  return {
    total_contacts: contacts.length,
    active_contacts: contacts.filter(c => c.status === 'active').length,
    leads: contacts.filter(c => c.contact_type === 'lead').length,
    clients: contacts.filter(c => c.contact_type === 'client').length,
    open_deals: deals.filter(d => d.status === 'open').length,
    total_deal_value: deals
      .filter(d => d.status === 'open')
      .reduce((sum, d) => sum + (d.value || 0), 0),
    pending_follow_ups: followUps.length,
    overdue_follow_ups: followUps.filter(f => f.due_at < now).length,
  };
}
