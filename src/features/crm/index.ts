/**
 * CRM Feature Module
 *
 * Public API for the CRM feature.
 * This module provides customer relationship management functionality including:
 * - Contact management
 * - Interaction tracking
 * - Follow-up management
 * - Deal pipeline management
 * - Contact segmentation
 *
 * @see docs/modular-app-design-spec.md
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/108
 */

// Module definition
export { crmModule } from './module';

// Components
export {
  ContactList,
  ContactCard,
  ContactDetail,
  ContactForm,
  InteractionLog,
  InteractionForm,
  FollowUpList,
  FollowUpForm,
  DealCard,
  DealPipeline,
  PipelineBoard,
} from './components';

// Pages (lazy-loaded, also available via module.frontendRoutes)
export {
  ContactsPage,
  ContactDetailPage,
  DealsPage,
  PipelinePage,
} from './pages';

// Schemas (re-exported for convenience)
export {
  // Contact types
  ContactSchema,
  ContactWithDetailsSchema,
  type Contact,
  type ContactWithDetails,
  type ContactType,
  type ContactStatus,

  // Interaction types
  InteractionSchema,
  type Interaction,
  type InteractionType,
  type Sentiment,

  // Follow-up types
  FollowUpSchema,
  type FollowUp,
  type FollowUpType,
  type FollowUpStatus,
  type FollowUpPriority,

  // Contact List types
  ContactListSchema,
  type ContactList,

  // Pipeline types
  PipelineSchema,
  PipelineStageSchema,
  PipelineWithStagesSchema,
  type Pipeline,
  type PipelineStage,
  type PipelineWithStages,

  // Deal types
  DealSchema,
  DealWithDetailsSchema,
  type Deal,
  type DealWithDetails,
  type DealStatus,

  // Stats
  CRMStatsSchema,
  type CRMStats,
} from './schemas';
