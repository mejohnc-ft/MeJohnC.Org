# CRM Feature Module

Customer Relationship Management module for MeJohnC.Org. This module provides comprehensive contact management, interaction tracking, and deal pipeline functionality.

## Overview

The CRM module is built following the modular architecture pattern and can be:
- Run as part of the main MeJohnC.Org application
- Extracted as a standalone product
- Integrated into the CentrexAI platform

**Version:** 1.0.0
**Prefix:** `crm`
**Issue:** [#108](https://github.com/mejohnc-ft/MeJohnC.Org/issues/108)

## Features

### Contact Management
- Full CRUD operations for contacts
- Contact types: lead, prospect, client, partner, vendor, personal, other
- Contact status: active, inactive, archived
- Rich contact profiles with social links
- Contact tagging and categorization
- Lead scoring

### Interaction Tracking
- Log all customer interactions
- Interaction types: email, call, meeting, video call, message, LinkedIn
- Sentiment tracking (positive, neutral, negative)
- Duration tracking for calls and meetings
- Attachment support

### Follow-up Management
- Schedule and track follow-ups
- Follow-up types: reminder, call, email, meeting, task, review
- Priority levels: low, normal, high, urgent
- Recurring follow-ups
- Overdue tracking

### Deal Pipeline
- Multiple pipeline support
- Customizable pipeline stages
- Deal value tracking
- Win/loss probability
- Expected revenue calculation
- Visual pipeline board

### Contact Lists
- Static and smart lists
- Dynamic filtering
- Bulk operations

## Architecture

### Directory Structure

```
src/features/crm/
├── index.ts              # Public API exports
├── module.ts             # FeatureModule definition
├── schemas.ts            # Zod schemas and types
├── README.md             # This file
├── components/
│   ├── index.ts
│   ├── ContactList.tsx
│   ├── ContactCard.tsx
│   ├── ContactDetail.tsx
│   ├── ContactForm.tsx
│   ├── InteractionLog.tsx
│   ├── InteractionForm.tsx
│   ├── FollowUpList.tsx
│   ├── FollowUpForm.tsx
│   ├── DealCard.tsx
│   ├── DealPipeline.tsx
│   └── PipelineBoard.tsx
└── pages/
    ├── index.ts
    ├── ContactsPage.tsx
    ├── ContactDetailPage.tsx
    ├── DealsPage.tsx
    └── PipelinePage.tsx

src/services/crm/
├── index.ts
├── crm-service.interface.ts
└── crm-service.supabase.ts
```

### Service Layer

The CRM module uses the service layer abstraction for data access:

```typescript
import { ICrmService } from '@/services/crm';
import { ServiceContext } from '@/services/types';

// Service methods are organized by entity
interface ICrmService {
  // Contacts
  getContacts(ctx: ServiceContext, options?: ContactQueryOptions): Promise<ContactWithDetails[]>;
  getContactById(ctx: ServiceContext, id: string): Promise<ContactWithDetails>;
  createContact(ctx: ServiceContext, data: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Promise<Contact>;
  updateContact(ctx: ServiceContext, id: string, data: Partial<Contact>): Promise<Contact>;
  deleteContact(ctx: ServiceContext, id: string): Promise<void>;

  // Interactions
  getInteractions(ctx: ServiceContext, contactId: string): Promise<Interaction[]>;
  createInteraction(ctx: ServiceContext, data: Omit<Interaction, 'id' | 'created_at'>): Promise<Interaction>;
  // ... more methods

  // Follow-ups
  getFollowUps(ctx: ServiceContext, contactId: string): Promise<FollowUp[]>;
  getPendingFollowUps(ctx: ServiceContext): Promise<FollowUp[]>;
  completeFollowUp(ctx: ServiceContext, id: string): Promise<FollowUp>;
  // ... more methods

  // Pipelines & Deals
  getPipelines(ctx: ServiceContext): Promise<Pipeline[]>;
  getDeals(ctx: ServiceContext, pipelineId?: string, stageId?: string): Promise<DealWithDetails[]>;
  moveDealToStage(ctx: ServiceContext, id: string, stageId: string): Promise<Deal>;
  // ... more methods
}
```

## Database Schema

### Tables

All tables are prefixed with `crm_` (though current implementation uses unprefixed names for backward compatibility):

- `contacts` - Contact records
- `interactions` - Interaction logs
- `follow_ups` - Scheduled follow-ups
- `contact_lists` - Contact list definitions
- `contact_list_members` - Many-to-many join table
- `pipelines` - Pipeline definitions
- `pipeline_stages` - Pipeline stage configurations
- `deals` - Deal records

### Multi-tenancy

All tables include:
- `tenant_id UUID NOT NULL REFERENCES app.tenants(id)`
- Row-level security (RLS) policies for tenant isolation

### Timestamps

Standard timestamp columns:
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `deleted_at TIMESTAMPTZ` (soft delete, where applicable)

## Usage

### Importing the Module

```typescript
import { crmModule } from '@/features/crm';
import { featureRegistry } from '@/features/types';

// Register the module
featureRegistry.register(crmModule);
```

### Using Components

```typescript
import {
  ContactList,
  ContactCard,
  ContactDetail,
  ContactForm,
  InteractionLog,
  FollowUpList,
  DealPipeline,
} from '@/features/crm';

// Use in your React components
function MyComponent() {
  return (
    <div>
      <ContactList
        contacts={contacts}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
```

### Using the Service

```typescript
import { crmServiceSupabase } from '@/services/crm';
import { ServiceContext } from '@/services/types';
import { useAuthenticatedSupabase } from '@/lib/supabase';

function MyComponent() {
  const { supabase } = useAuthenticatedSupabase();

  const ctx: ServiceContext = {
    client: supabase,
    tenantId: 'your-tenant-id', // optional
  };

  // Fetch contacts
  const contacts = await crmServiceSupabase.getContacts(ctx, {
    status: 'active',
    contactType: 'lead',
    limit: 50,
  });

  // Create a contact
  const newContact = await crmServiceSupabase.createContact(ctx, {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    contact_type: 'lead',
    status: 'active',
    // ... other fields
  });
}
```

## Routes

The module defines the following routes (all require `crm:read` permission):

- `/admin/crm` - Main CRM dashboard (redirects to contacts)
- `/admin/crm/contacts` - Contact list view
- `/admin/crm/contacts/:id` - Contact detail view
- `/admin/crm/deals` - Deal list view
- `/admin/crm/pipeline` - Pipeline board view

## Permissions

Required permissions:
- `crm:read` - View contacts, interactions, deals
- `crm:write` - Create/update/delete contacts, interactions, deals

## Agent Tools

The module provides the following agent tools:

```typescript
{
  name: 'crm_search_contacts',
  permission: 'crm:read',
  description: 'Search and filter contacts'
}

{
  name: 'crm_get_contact',
  permission: 'crm:read',
  description: 'Get detailed information about a contact'
}

{
  name: 'crm_log_interaction',
  permission: 'crm:write',
  description: 'Log a new interaction with a contact'
}

{
  name: 'crm_update_deal',
  permission: 'crm:write',
  description: 'Update deal status or stage'
}
```

## Future Enhancements

- [ ] Email integration (Gmail, Outlook)
- [ ] Calendar sync
- [ ] Task automation
- [ ] Workflow automation
- [ ] Advanced reporting and analytics
- [ ] AI-powered insights
- [ ] Mobile app support
- [ ] API webhooks
- [ ] Custom fields
- [ ] Import/export functionality
- [ ] Bulk operations
- [ ] Email templates
- [ ] Document management

## Migration Notes

The CRM module was extracted from the monolithic contacts page (`src/pages/admin/contacts/index.tsx`). The original file remains for backward compatibility but should be considered deprecated in favor of this modular implementation.

### Key Changes

1. **Service Layer**: All data access now goes through `ICrmService`
2. **Components**: UI components extracted to `components/` directory
3. **Pages**: Route components moved to `pages/` directory
4. **Schemas**: Type definitions centralized in `schemas.ts`
5. **Module Definition**: All routes and metadata defined in `module.ts`

## Contributing

When adding features to this module:

1. Add types to `schemas.ts`
2. Add service methods to `crm-service.interface.ts`
3. Implement in `crm-service.supabase.ts`
4. Create reusable components in `components/`
5. Add pages to `pages/` if needed
6. Update routes in `module.ts`
7. Update this README

## Related Documentation

- [Modular App Design Spec](../../docs/modular-app-design-spec.md)
- [Service Layer Documentation](../../services/README.md)
- [Feature Module Pattern](../../features/README.md)

## License

MIT - Part of MeJohnC.Org
