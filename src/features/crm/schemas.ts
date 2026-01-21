/**
 * CRM Feature - Schemas
 *
 * Re-exports CRM-related Zod schemas from the main schemas file.
 * Also defines extended types for relations.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/108
 */

import { z } from 'zod';

// Re-export CRM schemas from central schemas.ts
export {
  // Contact Schemas
  ContactTypeSchema,
  ContactStatusSchema,
  ContactSchema,
  type Contact,
  type ContactType,
  type ContactStatus,

  // Interaction Schemas
  InteractionTypeSchema,
  SentimentSchema,
  InteractionSchema,
  type Interaction,
  type InteractionType,
  type Sentiment,

  // Follow-up Schemas
  FollowUpTypeSchema,
  FollowUpStatusSchema,
  FollowUpPrioritySchema,
  FollowUpSchema,
  type FollowUp,
  type FollowUpType,
  type FollowUpStatus,
  type FollowUpPriority,

  // Contact List Schemas
  ContactListSchema,
  type ContactList,

  // Pipeline Schemas
  PipelineSchema,
  PipelineStageSchema,
  type Pipeline,
  type PipelineStage,

  // Deal Schemas
  DealStatusSchema,
  DealSchema,
  type Deal,
  type DealStatus,

  // Stats
  CRMStatsSchema,
  type CRMStats,
} from '@/lib/schemas';

import {
  ContactSchema,
  InteractionSchema,
  FollowUpSchema,
  DealSchema,
  PipelineSchema,
  PipelineStageSchema,
} from '@/lib/schemas';

// Extended types with relations

/**
 * Contact with related data
 */
export const ContactWithDetailsSchema = ContactSchema.extend({
  interaction_count: z.number().optional(),
  last_interaction: InteractionSchema.nullable().optional(),
  upcoming_follow_ups: z.array(FollowUpSchema).optional(),
  deals: z.array(DealSchema).optional(),
});
export type ContactWithDetails = z.infer<typeof ContactWithDetailsSchema>;

/**
 * Deal with related data
 */
export const DealWithDetailsSchema = DealSchema.extend({
  contact: ContactSchema.nullable().optional(),
  pipeline: PipelineSchema.optional(),
  stage: PipelineStageSchema.optional(),
});
export type DealWithDetails = z.infer<typeof DealWithDetailsSchema>;

/**
 * Pipeline with stages
 */
export const PipelineWithStagesSchema = PipelineSchema.extend({
  stages: z.array(PipelineStageSchema),
});
export type PipelineWithStages = z.infer<typeof PipelineWithStagesSchema>;
