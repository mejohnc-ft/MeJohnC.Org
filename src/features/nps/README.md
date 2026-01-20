# NPS Feature Module

AI-powered Net Promoter Score (NPS) survey system with multi-channel delivery and advanced analytics.

**Issue**: [#111](https://github.com/mejohnc-ft/MeJohnC.Org/issues/111)
**Version**: 1.0.0
**Status**: Complete

---

## Overview

The NPS module provides a complete Net Promoter Score management system with:

- Survey creation and management
- Multi-channel delivery (email, SMS, in-app)
- Response collection and categorization
- AI-powered sentiment analysis
- Detractor prediction and alerting
- CRM integration for score syncing
- Trend analysis and reporting

---

## Features

### Core Functionality

- **Survey Management**: Create, edit, and manage NPS surveys with flexible scheduling
- **Response Collection**: Capture responses with scores (0-10), email, and optional feedback
- **Automatic Categorization**: Automatically categorize responses as promoters (9-10), passives (7-8), or detractors (0-6)
- **NPS Score Calculation**: Real-time calculation of NPS scores: (% Promoters - % Detractors)
- **Campaign Management**: Schedule and track multi-channel NPS campaigns

### AI-Powered Features

- **Sentiment Analysis**: Analyze verbatim feedback to identify themes and sentiment
- **Detractor Prediction**: Predict which contacts are at risk of becoming detractors
- **Follow-up Suggestions**: AI-generated suggestions for responding to feedback
- **Trend Detection**: Identify patterns and trends in NPS data over time

### Integrations

- **Email**: SendGrid/Resend integration for email surveys
- **SMS**: Twilio integration for SMS surveys
- **CRM Sync**: Push NPS scores to contact records (requires CRM module #108)

---

## Architecture

### Service Layer

```typescript
INpsService
├── Survey Operations
│   ├── getSurveys()
│   ├── getSurveyById()
│   ├── createSurvey()
│   ├── updateSurvey()
│   └── deleteSurvey()
├── Response Operations
│   ├── getResponses()
│   ├── getResponseById()
│   ├── createResponse()
│   └── getDetractors()
├── Campaign Operations
│   ├── getCampaigns()
│   ├── getCampaignById()
│   ├── createCampaign()
│   ├── updateCampaign()
│   └── deleteCampaign()
├── Analysis & AI
│   ├── getAnalysis()
│   ├── analyzeSentiment()
│   ├── predictDetractorRisk()
│   └── suggestFollowup()
└── Statistics
    ├── getStats()
    ├── getTrends()
    └── calculateScore()
```

### Adapters

**Email Adapter** (`INPSEmailAdapter`)
- Send surveys via email
- Batch sending support
- Detractor follow-up emails
- Supports SendGrid and Resend

**SMS Adapter** (`INPSSMSAdapter`)
- Send surveys via SMS
- Batch sending support
- Detractor follow-up SMS
- Supports Twilio

**CRM Sync Adapter** (`INPSCRMSyncAdapter`)
- Sync NPS scores to contact records
- Update contact NPS history
- Flag detractors for follow-up
- Get NPS history for contacts

---

## Database Schema

### Tables

**`app.nps_surveys`**
```sql
- id: UUID (PK)
- tenant_id: UUID (FK)
- name: TEXT
- question: TEXT
- status: ENUM (draft, active, paused, closed)
- target_segment: TEXT
- segment_rules: JSONB
- starts_at: TIMESTAMPTZ
- ends_at: TIMESTAMPTZ
- responses_count: INTEGER
- promoters_count: INTEGER
- passives_count: INTEGER
- detractors_count: INTEGER
- nps_score: NUMERIC
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- created_by: UUID
```

**`app.nps_responses`**
```sql
- id: UUID (PK)
- tenant_id: UUID (FK)
- survey_id: UUID (FK)
- score: INTEGER (0-10)
- category: ENUM (promoter, passive, detractor)
- email: TEXT
- contact_id: UUID
- feedback: TEXT
- metadata: JSONB
- responded_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
```

**`app.nps_campaigns`**
```sql
- id: UUID (PK)
- tenant_id: UUID (FK)
- name: TEXT
- description: TEXT
- survey_id: UUID (FK)
- channel: ENUM (email, sms, in_app, link)
- target_segment: TEXT
- status: ENUM (draft, scheduled, active, paused, completed)
- scheduled_for: TIMESTAMPTZ
- sent_count: INTEGER
- response_count: INTEGER
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

**`app.nps_analysis`**
```sql
- id: UUID (PK)
- tenant_id: UUID (FK)
- survey_id: UUID (FK)
- response_id: UUID (FK)
- analysis_type: ENUM (sentiment, theme, prediction, trend)
- result: JSONB
- confidence: NUMERIC
- created_at: TIMESTAMPTZ
```

---

## Usage Examples

### Creating a Survey

```typescript
import { NpsServiceSupabase } from '@/services/nps';

const service = new NpsServiceSupabase(supabase);

const survey = await service.createSurvey(
  { client: supabase },
  {
    name: 'Q1 2024 Customer Satisfaction',
    question: 'How likely are you to recommend us to a friend or colleague?',
    status: 'active',
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }
);
```

### Collecting Responses

```typescript
const response = await service.createResponse(
  { client: supabase },
  {
    survey_id: survey.id,
    score: 9,
    email: 'customer@example.com',
    feedback: 'Great service!',
    responded_at: new Date().toISOString(),
  }
);
```

### Getting Detractors

```typescript
const detractors = await service.getDetractors({ client: supabase }, survey.id);

// Alert team about new detractors
detractors.forEach(detractor => {
  console.log(`Detractor: ${detractor.email} (Score: ${detractor.score})`);
});
```

### Analyzing Trends

```typescript
const stats = await service.getStats({ client: supabase });
const trends = await service.getTrends({ client: supabase }, survey.id, 'week');

console.log(`Average NPS: ${stats.average_score}`);
console.log(`Total Responses: ${stats.total_responses}`);
```

### Sending Surveys via Email

```typescript
import { SendGridNPSAdapter } from '@/features/nps';

const emailAdapter = new SendGridNPSAdapter(process.env.SENDGRID_API_KEY);

await emailAdapter.sendSurvey(
  {
    email: 'customer@example.com',
    name: 'John Doe',
  },
  {
    subject: 'How are we doing?',
    html: '<html>...</html>',
    text: 'Please rate us...',
    surveyUrl: 'https://app.example.com/nps/survey/xyz',
  }
);
```

---

## Components

### `<NpsDashboard>`
Overview dashboard showing key metrics, average score, and recent surveys.

### `<SurveyBuilder>`
Form component for creating and editing NPS surveys.

### `<ResponseList>`
Filterable table of NPS responses with category badges.

### `<DetractorAlert>`
Alert component highlighting detractors requiring follow-up.

### `<TrendChart>`
Visual chart showing NPS score trends over time.

---

## Routes

| Path | Component | Permission | Description |
|------|-----------|------------|-------------|
| `/admin/nps` | AnalysisPage | `nps:read` | Overview and analysis dashboard |
| `/admin/nps/surveys` | SurveysPage | `nps:read` | List all surveys |
| `/admin/nps/surveys/new` | SurveysPage | `nps:write` | Create new survey |
| `/admin/nps/surveys/:id` | SurveysPage | `nps:read` | Survey details |
| `/admin/nps/responses` | ResponsesPage | `nps:read` | View all responses |
| `/admin/nps/analysis` | AnalysisPage | `nps:read` | AI-powered insights |

---

## AI Agent Tools

The module defines these tools for AI agent integration:

- `nps_get_score` - Get current NPS score
- `nps_list_detractors` - List recent detractors
- `nps_analyze_feedback` - AI sentiment analysis
- `nps_send_survey` - Send survey via email/SMS
- `nps_suggest_followup` - AI follow-up suggestions
- `nps_predict_detractor` - Predict detractor risk

---

## Events

The module emits these events for cross-module integration:

- `nps.response.received` - New response submitted
- `nps.score.changed` - Survey score recalculated
- `nps.detractor.flagged` - Detractor requires attention

---

## Future Enhancements

- [ ] AI sentiment analysis implementation
- [ ] Detractor prediction model
- [ ] Follow-up suggestion generation
- [ ] SendGrid/Resend email integration
- [ ] Twilio SMS integration
- [ ] CRM sync implementation (after CRM module #108)
- [ ] In-app survey widget
- [ ] Advanced segmentation rules
- [ ] A/B testing for survey questions
- [ ] Response rate optimization

---

## Migration from Legacy Code

This module extracts NPS functionality from:
- `src/lib/queries/marketing-queries.ts` (NPS functions)
- `src/pages/admin/MarketingNPS.tsx`
- `src/pages/admin/NPSSurveyDetail.tsx`

The legacy code can be deprecated once this module is fully integrated.

---

## Dependencies

- `@supabase/supabase-js` - Database access
- `zod` - Schema validation
- `react` - UI components
- `lucide-react` - Icons
- `framer-motion` - Animations

### Optional Dependencies
- `@sendgrid/mail` - Email delivery (SendGrid)
- `resend` - Email delivery (Resend)
- `twilio` - SMS delivery
- CRM module - Score syncing (future)

---

## Testing

```bash
# Run tests
npm test -- src/features/nps

# Run service tests
npm test -- src/services/nps
```

---

## License

Same as main project.

---

## Related Issues

- #108 - CRM module (for score syncing)
- #105 - Tasks module (reference implementation)
- Modular App Design Spec - Architecture documentation
