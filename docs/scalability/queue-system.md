# Queue System for Async Work

This document defines the queue system strategy for MeJohnC.Org, a serverless/JAMstack application deployed on Netlify with Supabase as the backend. Queue systems enable reliable asynchronous processing for operations that should not block user requests.

---

## Table of Contents

1. [Queue System Overview](#queue-system-overview)
2. [When to Use Async Processing](#when-to-use-async-processing)
3. [Queue Solution Options for Serverless](#queue-solution-options-for-serverless)
4. [Implementation Guide](#implementation-guide)
5. [Job Definition Patterns](#job-definition-patterns)
6. [Retry Strategies](#retry-strategies)
7. [Dead Letter Queues](#dead-letter-queues)
8. [Monitoring and Observability](#monitoring-and-observability)
9. [Error Handling](#error-handling)
10. [Job Prioritization](#job-prioritization)
11. [Rate Limiting](#rate-limiting)
12. [Cost Considerations](#cost-considerations)
13. [Migration Path from Sync to Async](#migration-path-from-sync-to-async)

---

## Queue System Overview

### What is a Queue System?

A queue system decouples work producers from work consumers, enabling:

- **Asynchronous processing**: Operations complete in the background without blocking user requests
- **Reliability**: Failed jobs can be retried automatically
- **Scalability**: Work can be distributed across multiple workers
- **Resilience**: System remains responsive even under heavy load

### Architecture Overview

```
User Request                    Queue System                    Background Worker
─────────────                   ────────────                    ─────────────────
    │                               │                                │
    │  POST /api/send-newsletter    │                                │
    │ ──────────────────────────►   │                                │
    │                               │                                │
    │  202 Accepted (job queued)    │                                │
    │ ◄──────────────────────────   │                                │
    │                               │                                │
    │                               │   Process job                  │
    │                               │ ──────────────────────────►    │
    │                               │                                │
    │                               │   [Send emails, retry on fail] │
    │                               │                                │
    │                               │   Job complete                 │
    │                               │ ◄──────────────────────────    │
```

### When Sync Processing is Appropriate

Not all operations need a queue. Use synchronous processing for:

| Operation Type | Example | Why Sync |
|----------------|---------|----------|
| Simple CRUD | Save blog post | Fast, immediate feedback needed |
| User auth | Sign in | Must complete before redirect |
| Small reads | Fetch profile | Sub-100ms response |
| Form validation | Check email format | Immediate user feedback |

### When Async Processing is Required

Use asynchronous/queue-based processing when:

| Trigger | Reason |
|---------|--------|
| Operation takes > 1 second | Avoid HTTP timeout |
| External API calls | Third-party latency is unpredictable |
| Bulk operations | Processing 100+ items |
| Non-critical operations | Can be processed later |
| Operations that can fail | Need retry logic |
| Rate-limited APIs | Need controlled execution rate |

---

## When to Use Async Processing

### Email Sending

**Use Case**: Newsletter campaigns, transactional emails, notification emails

**Why Async**:
- Email providers have rate limits
- Network latency is unpredictable
- Bulk sends can take minutes
- Failures need retry logic
- Users don't need to wait

```typescript
// SYNC: Bad - User waits for all emails
app.post('/api/newsletter', async (req, res) => {
  for (const subscriber of subscribers) {
    await sendEmail(subscriber.email, content); // 100ms+ each
  }
  res.json({ success: true }); // User waits 10+ seconds
});

// ASYNC: Good - User gets immediate response
app.post('/api/newsletter', async (req, res) => {
  await queue.enqueue('email.send-campaign', {
    campaignId: req.body.campaignId,
    subscriberIds: subscribers.map(s => s.id),
  });
  res.status(202).json({ message: 'Campaign queued' });
});
```

**Implementation Pattern**:

```typescript
// Job handler for email campaign
async function handleEmailCampaign(job: Job) {
  const { campaignId, subscriberIds } = job.data;

  const campaign = await getCampaign(campaignId);

  // Process in batches to respect rate limits
  for (const batch of chunk(subscriberIds, 100)) {
    await Promise.all(
      batch.map(id => sendEmail(id, campaign.content))
    );
    // Rate limiting: wait between batches
    await sleep(1000);
  }
}
```

### Report Generation

**Use Case**: Analytics reports, data exports, PDF generation

**Why Async**:
- Complex queries can take 10+ seconds
- PDF generation is CPU-intensive
- Large exports may timeout
- Users can be notified when ready

```typescript
// Report generation job
async function handleReportGeneration(job: Job) {
  const { reportType, dateRange, userId } = job.data;

  // Long-running aggregation query
  const data = await generateReportData(reportType, dateRange);

  // CPU-intensive PDF generation
  const pdfBuffer = await generatePDF(data);

  // Store result
  const fileUrl = await uploadToStorage(pdfBuffer, `reports/${job.id}.pdf`);

  // Notify user via email or in-app notification
  await notifyUser(userId, {
    type: 'report_ready',
    downloadUrl: fileUrl,
  });
}
```

**User Flow**:

```
1. User clicks "Generate Report"
2. API returns 202 with job ID
3. UI shows "Generating..." status
4. Background worker processes report
5. User notified when complete (email/push/in-app)
6. User downloads report
```

### Data Processing

**Use Case**: Image resizing, data imports, bulk updates, ETL operations

**Why Async**:
- Processing time varies widely
- Memory-intensive operations
- Can be parallelized
- Failures shouldn't affect user experience

```typescript
// Bulk data import job
async function handleDataImport(job: Job) {
  const { fileUrl, importType, userId } = job.data;

  // Download and parse file
  const records = await parseImportFile(fileUrl);

  let processed = 0;
  let errors = [];

  // Process in chunks
  for (const chunk of batch(records, 50)) {
    const results = await Promise.allSettled(
      chunk.map(record => processRecord(record, importType))
    );

    // Track progress
    processed += chunk.length;
    errors.push(...results.filter(r => r.status === 'rejected'));

    // Update job progress (for UI)
    await job.updateProgress(processed / records.length * 100);
  }

  // Store import summary
  await saveImportSummary(job.id, {
    total: records.length,
    successful: processed - errors.length,
    failed: errors.length,
    errors: errors.slice(0, 100), // Limit stored errors
  });
}
```

### Webhook Handling

**Use Case**: Payment webhooks, GitHub webhooks, third-party integrations

**Why Async**:
- Webhook providers expect fast responses (< 5 seconds)
- Processing may require multiple API calls
- Need reliable delivery even if processing fails
- Can handle webhook replay/retry

```typescript
// Webhook endpoint - respond fast, process later
app.post('/api/webhooks/stripe', async (req, res) => {
  // Verify webhook signature
  const event = verifyStripeSignature(req);

  // Queue for processing
  await queue.enqueue('webhook.stripe', {
    eventId: event.id,
    eventType: event.type,
    data: event.data,
    receivedAt: new Date().toISOString(),
  });

  // Respond immediately
  res.status(200).json({ received: true });
});

// Webhook processor
async function handleStripeWebhook(job: Job) {
  const { eventType, data } = job.data;

  switch (eventType) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(data);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(data);
      break;
    // ... other event types
  }
}
```

### Background Jobs

**Use Case**: Scheduled tasks, cleanup operations, maintenance, syncs

**Why Async**:
- No user waiting for result
- Can run during off-peak hours
- Long-running by nature
- Need scheduling and orchestration

```typescript
// Scheduled background jobs
const scheduledJobs = [
  {
    name: 'cleanup.expired-sessions',
    schedule: '0 3 * * *', // 3 AM daily
    handler: async () => {
      const deleted = await supabase
        .from('sessions')
        .delete()
        .lt('expires_at', new Date().toISOString());
      return { deletedCount: deleted.count };
    },
  },
  {
    name: 'sync.github-metrics',
    schedule: '*/15 * * * *', // Every 15 minutes
    handler: async () => {
      const metrics = await fetchGitHubMetrics();
      await updateMetricsTable(metrics);
    },
  },
  {
    name: 'generate.sitemap',
    schedule: '0 0 * * *', // Midnight daily
    handler: async () => {
      await generateAndUploadSitemap();
    },
  },
];
```

---

## Queue Solution Options for Serverless

### Comparison Matrix

| Feature | Inngest | QStash (Upstash) | AWS SQS + Lambda | Supabase pg_cron |
|---------|---------|------------------|------------------|------------------|
| Serverless-native | Yes | Yes | Yes | Partial |
| Netlify integration | Excellent | Good | Manual | N/A |
| Vercel integration | Excellent | Excellent | Manual | N/A |
| Pricing model | Usage-based | Usage-based | Usage-based | Included |
| Free tier | 25K steps/mo | 500 msgs/day | 1M requests/mo | Yes |
| Retry logic | Built-in | Built-in | Built-in | Manual |
| Scheduling | Built-in | Built-in | CloudWatch Events | Built-in |
| Observability | Dashboard | Dashboard | CloudWatch | Manual |
| Complexity | Low | Low | Medium | Low-Medium |
| Vendor lock-in | Low | Low | High | Medium |

### Inngest (Recommended for Netlify/Vercel)

**Best For**: Modern serverless applications on Netlify or Vercel

**Why Inngest**:
- Purpose-built for serverless
- Excellent developer experience
- Built-in retries, scheduling, and fan-out
- Works with existing API routes
- Great observability dashboard
- Local development support

**Pricing (as of 2025)**:

| Plan | Steps/month | Price |
|------|-------------|-------|
| Free | 25,000 | $0 |
| Pro | 100,000 | $25 |
| Team | 500,000 | $99 |
| Enterprise | Unlimited | Custom |

**Architecture with Inngest**:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Application                              │
│  ┌─────────────────┐     ┌─────────────────┐                   │
│  │   Netlify App   │     │  Inngest Client │                   │
│  │   (Next.js/     │────▶│   inngest.send()│                   │
│  │    Functions)   │     │                 │                   │
│  └─────────────────┘     └────────┬────────┘                   │
└────────────────────────────────────┼────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Inngest Platform                            │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│  │   Queue     │   │   Retry     │   │  Scheduling │           │
│  │   Engine    │   │   Engine    │   │   Engine    │           │
│  └─────────────┘   └─────────────┘   └─────────────┘           │
│                           │                                      │
│                           ▼                                      │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              Inngest Dashboard                          │     │
│  │   (Event history, metrics, debugging, logs)            │     │
│  └────────────────────────────────────────────────────────┘     │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               ▼ (HTTP callback)
┌─────────────────────────────────────────────────────────────────┐
│                      Your Serverless Function                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │   /api/inngest                                           │   │
│  │   (Inngest function handlers)                           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### QStash (Upstash)

**Best For**: Simple queue needs, existing Upstash users, cost-sensitive projects

**Why QStash**:
- HTTP-based messaging (no SDK required)
- Part of Upstash ecosystem (Redis, Kafka)
- Very competitive pricing
- Built-in scheduling and delays
- Automatic retries

**Pricing (as of 2025)**:

| Plan | Messages/day | Price |
|------|--------------|-------|
| Free | 500 | $0 |
| Pay as you go | Unlimited | $1 per 100K messages |
| Pro | 50,000/day | $10 |

**Basic Usage**:

```typescript
// Publishing a message
const response = await fetch('https://qstash.upstash.io/v2/publish/https://yoursite.com/api/process', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${QSTASH_TOKEN}`,
    'Content-Type': 'application/json',
    'Upstash-Delay': '60s', // Optional: delay execution
    'Upstash-Retries': '3', // Number of retries
  },
  body: JSON.stringify({ taskId: '123', type: 'email' }),
});
```

### AWS SQS + Lambda

**Best For**: AWS-centric architectures, high-volume needs, compliance requirements

**Why SQS + Lambda**:
- Battle-tested at massive scale
- FIFO queues for ordering
- Dead letter queue support
- Fine-grained IAM controls
- Part of broader AWS ecosystem

**Considerations**:
- More complex setup
- Requires AWS account and IAM configuration
- Higher operational overhead
- Better for teams with AWS expertise

**Basic Architecture**:

```
API Gateway → Lambda (Producer) → SQS → Lambda (Consumer)
                                    ↓
                               DLQ (Dead Letter Queue)
```

### Supabase Edge Functions with pg_cron

**Best For**: Simple scheduled tasks, database-centric operations, existing Supabase users

**Why Supabase pg_cron**:
- No additional services required
- Runs in your database
- Great for database maintenance
- No network latency for DB operations

**Limitations**:
- Not a true queue (scheduling only)
- Limited to cron-based triggers
- No retry logic built-in
- No job tracking/progress

**Example Setup**:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule a cleanup job
SELECT cron.schedule(
  'cleanup-expired-tokens',
  '0 3 * * *', -- 3 AM daily
  $$
    DELETE FROM auth_tokens
    WHERE expires_at < NOW() - INTERVAL '7 days';
  $$
);

-- Call an Edge Function on schedule
SELECT cron.schedule(
  'sync-external-data',
  '*/30 * * * *', -- Every 30 minutes
  $$
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT.supabase.co/functions/v1/sync-data',
      headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);
```

---

## Implementation Guide

### Inngest Setup with Netlify

#### Step 1: Install Dependencies

```bash
npm install inngest
```

#### Step 2: Create Inngest Client

```typescript
// src/lib/inngest/client.ts
import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'mejohnc-org',
  // Optional: Custom event schemas for type safety
  schemas: new EventSchemas().fromRecord<{
    'email/send.campaign': {
      data: {
        campaignId: string;
        subscriberIds: string[];
      };
    };
    'report/generate': {
      data: {
        reportType: 'analytics' | 'users' | 'content';
        dateRange: { start: string; end: string };
        userId: string;
      };
    };
  }>(),
});
```

#### Step 3: Define Functions

```typescript
// src/lib/inngest/functions/email.ts
import { inngest } from '../client';
import { sendEmail, getSubscriber, getCampaign } from '@/lib/email';

export const sendEmailCampaign = inngest.createFunction(
  {
    id: 'send-email-campaign',
    // Concurrency limits
    concurrency: {
      limit: 10, // Max 10 parallel executions
    },
    // Retry configuration
    retries: 5,
  },
  { event: 'email/send.campaign' },
  async ({ event, step }) => {
    const { campaignId, subscriberIds } = event.data;

    // Step 1: Fetch campaign data
    const campaign = await step.run('fetch-campaign', async () => {
      return await getCampaign(campaignId);
    });

    // Step 2: Send to each subscriber (with automatic batching)
    const results = await step.run('send-emails', async () => {
      const results = [];

      for (const subscriberId of subscriberIds) {
        try {
          const subscriber = await getSubscriber(subscriberId);
          await sendEmail({
            to: subscriber.email,
            subject: campaign.subject,
            html: campaign.content,
          });
          results.push({ subscriberId, status: 'sent' });
        } catch (error) {
          results.push({ subscriberId, status: 'failed', error: error.message });
        }
      }

      return results;
    });

    // Step 3: Update campaign status
    await step.run('update-campaign-status', async () => {
      const sent = results.filter(r => r.status === 'sent').length;
      const failed = results.filter(r => r.status === 'failed').length;

      await updateCampaignStatus(campaignId, {
        status: 'completed',
        sentCount: sent,
        failedCount: failed,
        completedAt: new Date().toISOString(),
      });
    });

    return { success: true, sent: results.length };
  }
);
```

#### Step 4: Create API Route Handler

```typescript
// netlify/functions/inngest.ts
import { serve } from 'inngest/netlify';
import { inngest } from '@/lib/inngest/client';
import { sendEmailCampaign } from '@/lib/inngest/functions/email';
import { generateReport } from '@/lib/inngest/functions/reports';
import { processWebhook } from '@/lib/inngest/functions/webhooks';

export const handler = serve({
  client: inngest,
  functions: [
    sendEmailCampaign,
    generateReport,
    processWebhook,
  ],
});
```

#### Step 5: Configure Netlify

```toml
# netlify.toml
[functions]
  directory = "netlify/functions"

[[redirects]]
  from = "/api/inngest"
  to = "/.netlify/functions/inngest"
  status = 200
```

#### Step 6: Set Environment Variables

```bash
# Netlify Dashboard > Site Settings > Environment Variables
INNGEST_SIGNING_KEY=your_signing_key
INNGEST_EVENT_KEY=your_event_key
```

#### Step 7: Trigger Jobs from Your Application

```typescript
// src/lib/api/marketing.ts
import { inngest } from '@/lib/inngest/client';

export async function sendNewsletter(campaignId: string) {
  // Get subscribers
  const { data: subscribers } = await supabase
    .from('email_subscribers')
    .select('id')
    .eq('list_id', campaignListId)
    .eq('status', 'active');

  // Queue the job
  await inngest.send({
    name: 'email/send.campaign',
    data: {
      campaignId,
      subscriberIds: subscribers.map(s => s.id),
    },
  });

  return { queued: true, subscriberCount: subscribers.length };
}
```

---

## Job Definition Patterns

### Event-Driven Jobs

Jobs triggered by application events:

```typescript
// Define event-driven function
export const onUserSignup = inngest.createFunction(
  { id: 'on-user-signup' },
  { event: 'user/signup' },
  async ({ event, step }) => {
    const { userId, email } = event.data;

    // Send welcome email
    await step.run('send-welcome-email', async () => {
      await sendEmail({
        to: email,
        template: 'welcome',
        data: { userId },
      });
    });

    // Create initial user data
    await step.run('initialize-user-data', async () => {
      await createUserDefaults(userId);
    });

    // Track analytics
    await step.run('track-signup', async () => {
      await analytics.track('user_signup', { userId, email });
    });
  }
);

// Trigger from your app
await inngest.send({
  name: 'user/signup',
  data: { userId: 'abc123', email: 'user@example.com' },
});
```

### Scheduled Jobs (Cron)

Jobs that run on a schedule:

```typescript
// Daily cleanup job
export const dailyCleanup = inngest.createFunction(
  { id: 'daily-cleanup' },
  { cron: '0 3 * * *' }, // 3 AM daily
  async ({ step }) => {
    // Clean expired sessions
    const sessionsDeleted = await step.run('clean-sessions', async () => {
      const result = await supabase
        .from('sessions')
        .delete()
        .lt('expires_at', new Date().toISOString());
      return result.count;
    });

    // Clean old audit logs
    const logsDeleted = await step.run('clean-audit-logs', async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90); // 90 days retention

      const result = await supabase
        .from('audit_logs')
        .delete()
        .lt('created_at', cutoff.toISOString());
      return result.count;
    });

    return { sessionsDeleted, logsDeleted };
  }
);

// Periodic sync job
export const syncMetrics = inngest.createFunction(
  { id: 'sync-github-metrics' },
  { cron: '*/15 * * * *' }, // Every 15 minutes
  async ({ step }) => {
    const metrics = await step.run('fetch-metrics', async () => {
      return await fetchGitHubMetrics();
    });

    await step.run('store-metrics', async () => {
      await supabase.from('github_metrics').upsert(metrics);
    });
  }
);
```

### Fan-Out Jobs

Process multiple items in parallel:

```typescript
export const processImport = inngest.createFunction(
  { id: 'process-import' },
  { event: 'import/start' },
  async ({ event, step }) => {
    const { importId, fileUrl } = event.data;

    // Parse the import file
    const records = await step.run('parse-file', async () => {
      return await parseImportFile(fileUrl);
    });

    // Fan out: create a job for each batch
    const batchSize = 100;
    const batches = chunk(records, batchSize);

    // Send batch events
    await step.sendEvent(
      'fan-out-batches',
      batches.map((batch, index) => ({
        name: 'import/process-batch',
        data: {
          importId,
          batchIndex: index,
          records: batch,
        },
      }))
    );

    return { totalRecords: records.length, batches: batches.length };
  }
);

// Batch processor
export const processBatch = inngest.createFunction(
  {
    id: 'process-import-batch',
    concurrency: { limit: 5 }, // Process 5 batches at a time
  },
  { event: 'import/process-batch' },
  async ({ event, step }) => {
    const { importId, batchIndex, records } = event.data;

    const results = await step.run('process-records', async () => {
      return await Promise.all(
        records.map(record => processRecord(record))
      );
    });

    // Update progress
    await step.run('update-progress', async () => {
      await updateImportProgress(importId, batchIndex, results);
    });

    return { processed: results.length };
  }
);
```

### Delayed Jobs

Jobs that execute after a delay:

```typescript
// Send reminder 24 hours after signup if user hasn't completed profile
export const sendProfileReminder = inngest.createFunction(
  { id: 'send-profile-reminder' },
  { event: 'user/signup' },
  async ({ event, step }) => {
    const { userId, email } = event.data;

    // Wait 24 hours
    await step.sleep('wait-24h', '24h');

    // Check if profile is complete
    const profile = await step.run('check-profile', async () => {
      return await getUserProfile(userId);
    });

    if (!profile.isComplete) {
      await step.run('send-reminder', async () => {
        await sendEmail({
          to: email,
          template: 'complete-profile-reminder',
        });
      });
    }

    return { reminded: !profile.isComplete };
  }
);
```

---

## Retry Strategies

### Exponential Backoff

Default retry strategy with increasing delays:

```typescript
export const resilientJob = inngest.createFunction(
  {
    id: 'resilient-job',
    retries: 5, // Number of retries
    // Inngest uses exponential backoff by default:
    // Retry 1: ~10s, Retry 2: ~20s, Retry 3: ~40s, etc.
  },
  { event: 'job/process' },
  async ({ event, step }) => {
    await step.run('api-call', async () => {
      const response = await fetch('https://api.example.com/data');
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return response.json();
    });
  }
);
```

### Custom Retry Logic

Implement custom retry behavior:

```typescript
export const customRetryJob = inngest.createFunction(
  {
    id: 'custom-retry-job',
    retries: 3,
  },
  { event: 'job/custom' },
  async ({ event, step, attempt }) => {
    // Access attempt number (0, 1, 2, 3)
    console.log(`Attempt ${attempt} of 4`);

    await step.run('process', async () => {
      try {
        return await riskyOperation();
      } catch (error) {
        // Custom logic based on error type
        if (error.code === 'RATE_LIMITED') {
          // Retry with longer delay
          throw new RetriableError('Rate limited, will retry', {
            retryAfter: '60s',
          });
        }
        if (error.code === 'INVALID_INPUT') {
          // Don't retry invalid input errors
          throw new NonRetriableError('Invalid input', error);
        }
        // Default: retry with backoff
        throw error;
      }
    });
  }
);
```

### Retry Configuration by Job Type

| Job Type | Retries | Strategy | Rationale |
|----------|---------|----------|-----------|
| Email sending | 5 | Exponential | Transient failures common |
| Payment processing | 3 | Fixed 30s | Need quick resolution |
| Report generation | 2 | None needed | Deterministic, won't fix itself |
| Webhook processing | 5 | Exponential | External service may be down |
| Data sync | 10 | Long exponential | Can wait for service recovery |
| Image processing | 2 | Fixed 10s | Memory/timeout issues |

### Idempotency

Ensure jobs can be safely retried:

```typescript
export const idempotentJob = inngest.createFunction(
  { id: 'idempotent-payment' },
  { event: 'payment/process' },
  async ({ event, step }) => {
    const { orderId, amount, idempotencyKey } = event.data;

    // Check if already processed
    const existing = await step.run('check-existing', async () => {
      return await getPaymentByIdempotencyKey(idempotencyKey);
    });

    if (existing) {
      return { status: 'already_processed', paymentId: existing.id };
    }

    // Process payment with idempotency key
    const payment = await step.run('process-payment', async () => {
      return await stripe.paymentIntents.create(
        {
          amount,
          currency: 'usd',
          metadata: { orderId },
        },
        { idempotencyKey }
      );
    });

    return { status: 'processed', paymentId: payment.id };
  }
);
```

---

## Dead Letter Queues

### What is a Dead Letter Queue?

A dead letter queue (DLQ) stores messages/jobs that have failed all retry attempts. This prevents:
- Message loss
- System overload from infinite retries
- Blocking the main queue

### Implementing DLQ with Inngest

```typescript
// Main job with DLQ handling
export const criticalJob = inngest.createFunction(
  {
    id: 'critical-job',
    retries: 5,
    onFailure: async ({ event, error, step }) => {
      // This runs after all retries are exhausted

      // Log to DLQ table
      await step.run('log-to-dlq', async () => {
        await supabase.from('dead_letter_queue').insert({
          event_name: event.name,
          event_data: event.data,
          error_message: error.message,
          error_stack: error.stack,
          failed_at: new Date().toISOString(),
          attempts: 6, // Initial + 5 retries
        });
      });

      // Send alert
      await step.run('alert', async () => {
        await sendSlackAlert({
          channel: '#alerts',
          text: `Job failed after all retries: ${event.name}`,
          details: { eventId: event.id, error: error.message },
        });
      });
    },
  },
  { event: 'critical/process' },
  async ({ event, step }) => {
    // Main job logic
  }
);
```

### DLQ Database Schema

```sql
-- Dead letter queue table
CREATE TABLE dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  event_data JSONB NOT NULL,
  error_message TEXT,
  error_stack TEXT,
  attempts INTEGER DEFAULT 1,
  failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reprocessed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'failed' CHECK (status IN ('failed', 'reprocessed', 'ignored')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dlq_status ON dead_letter_queue(status);
CREATE INDEX idx_dlq_event_name ON dead_letter_queue(event_name);
CREATE INDEX idx_dlq_failed_at ON dead_letter_queue(failed_at);
```

### DLQ Reprocessing

```typescript
// Admin endpoint to reprocess DLQ items
export async function reprocessDeadLetterItem(itemId: string) {
  const { data: item } = await supabase
    .from('dead_letter_queue')
    .select('*')
    .eq('id', itemId)
    .single();

  if (!item) {
    throw new Error('DLQ item not found');
  }

  // Re-send the event
  await inngest.send({
    name: item.event_name,
    data: {
      ...item.event_data,
      _dlqReprocessed: true,
      _dlqItemId: itemId,
    },
  });

  // Update DLQ status
  await supabase
    .from('dead_letter_queue')
    .update({
      status: 'reprocessed',
      reprocessed_at: new Date().toISOString(),
    })
    .eq('id', itemId);
}
```

---

## Monitoring and Observability

### Key Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Queue depth | Number of pending jobs | > 1000 |
| Processing time | Average job duration | > 30 seconds |
| Failure rate | % of failed jobs | > 5% |
| Retry rate | % of jobs requiring retry | > 20% |
| DLQ volume | Items in dead letter queue | > 10/hour |
| Throughput | Jobs processed per minute | < expected |

### Inngest Dashboard

Inngest provides built-in observability:

- **Event Timeline**: View all events and their processing status
- **Function Runs**: See individual function executions
- **Metrics**: Processing time, success rate, queue depth
- **Logs**: Detailed logs for each step
- **Replays**: Replay failed events for debugging

### Custom Metrics with Sentry

```typescript
import * as Sentry from '@sentry/node';

export const monitoredJob = inngest.createFunction(
  { id: 'monitored-job' },
  { event: 'job/monitored' },
  async ({ event, step }) => {
    const transaction = Sentry.startTransaction({
      name: 'job.monitored',
      op: 'queue.process',
    });

    try {
      const result = await step.run('process', async () => {
        const span = transaction.startChild({
          op: 'process.main',
          description: 'Main processing',
        });

        const result = await processJob(event.data);

        span.finish();
        return result;
      });

      transaction.setStatus('ok');
      return result;
    } catch (error) {
      transaction.setStatus('error');
      Sentry.captureException(error, {
        tags: {
          jobType: 'monitored-job',
          eventId: event.id,
        },
      });
      throw error;
    } finally {
      transaction.finish();
    }
  }
);
```

### Alerting Setup

```typescript
// src/lib/inngest/functions/alerting.ts

// Monitor DLQ growth
export const monitorDLQ = inngest.createFunction(
  { id: 'monitor-dlq' },
  { cron: '*/5 * * * *' }, // Every 5 minutes
  async ({ step }) => {
    const { count } = await step.run('count-dlq', async () => {
      const { count } = await supabase
        .from('dead_letter_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('failed_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      return { count };
    });

    if (count > 10) {
      await step.run('send-alert', async () => {
        await sendSlackAlert({
          channel: '#alerts',
          text: `:warning: High DLQ volume: ${count} failed jobs in the last hour`,
          severity: 'warning',
        });
      });
    }

    return { dlqCount: count, alerted: count > 10 };
  }
);
```

### Logging Best Practices

```typescript
import { logger } from '@/lib/logger';

export const loggingJob = inngest.createFunction(
  { id: 'logging-example' },
  { event: 'job/logged' },
  async ({ event, step }) => {
    // Log job start
    logger.info('Job started', {
      jobId: event.id,
      jobType: 'logging-example',
      data: event.data,
    });

    try {
      const result = await step.run('process', async () => {
        logger.debug('Processing step started');
        const result = await process(event.data);
        logger.debug('Processing step completed', { result });
        return result;
      });

      // Log job completion
      logger.info('Job completed', {
        jobId: event.id,
        jobType: 'logging-example',
        result,
      });

      return result;
    } catch (error) {
      // Log job failure
      logger.error('Job failed', {
        jobId: event.id,
        jobType: 'logging-example',
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
);
```

---

## Error Handling

### Error Categories

| Category | Example | Handling |
|----------|---------|----------|
| Transient | Network timeout | Retry with backoff |
| Rate Limit | API 429 | Retry with longer delay |
| Invalid Input | Missing required field | Don't retry, log error |
| Resource | Out of memory | Retry with smaller batch |
| Configuration | Missing API key | Don't retry, alert |
| Business Logic | Duplicate record | Don't retry, handle gracefully |

### Error Handling Patterns

```typescript
import { NonRetriableError } from 'inngest';

export const errorHandlingJob = inngest.createFunction(
  {
    id: 'error-handling-example',
    retries: 5,
  },
  { event: 'job/error-example' },
  async ({ event, step }) => {
    await step.run('validate-input', async () => {
      if (!event.data.email) {
        // Don't retry validation errors
        throw new NonRetriableError('Email is required');
      }
    });

    await step.run('call-api', async () => {
      try {
        return await callExternalAPI(event.data);
      } catch (error) {
        if (error.status === 429) {
          // Rate limited - retry with longer delay
          throw new Error('Rate limited, will retry');
        }
        if (error.status === 400) {
          // Bad request - don't retry
          throw new NonRetriableError(`Bad request: ${error.message}`);
        }
        if (error.status === 401 || error.status === 403) {
          // Auth error - don't retry, alert
          await sendAlert('API authentication failed');
          throw new NonRetriableError('Authentication failed');
        }
        // Other errors - retry with backoff
        throw error;
      }
    });
  }
);
```

### Graceful Degradation

```typescript
export const gracefulJob = inngest.createFunction(
  { id: 'graceful-example' },
  { event: 'job/graceful' },
  async ({ event, step }) => {
    // Primary method
    const primaryResult = await step.run('try-primary', async () => {
      try {
        return await primaryEmailProvider.send(event.data);
      } catch (error) {
        logger.warn('Primary provider failed, trying fallback', { error });
        return null;
      }
    });

    if (primaryResult) {
      return { provider: 'primary', result: primaryResult };
    }

    // Fallback method
    const fallbackResult = await step.run('try-fallback', async () => {
      return await fallbackEmailProvider.send(event.data);
    });

    return { provider: 'fallback', result: fallbackResult };
  }
);
```

### Error Reporting

```typescript
export const reportingJob = inngest.createFunction(
  {
    id: 'reporting-example',
    onFailure: async ({ event, error }) => {
      // Report to Sentry
      Sentry.captureException(error, {
        tags: {
          jobType: 'reporting-example',
          eventId: event.id,
        },
        extra: {
          eventData: event.data,
        },
      });

      // Store in error log
      await supabase.from('job_errors').insert({
        event_id: event.id,
        event_name: event.name,
        event_data: event.data,
        error_message: error.message,
        error_stack: error.stack,
      });
    },
  },
  { event: 'job/reported' },
  async ({ event, step }) => {
    // Job logic
  }
);
```

---

## Job Prioritization

### Priority Levels

| Priority | Use Case | Processing Target |
|----------|----------|-------------------|
| Critical (P1) | Payment processing, security alerts | Immediate |
| High (P2) | User-facing notifications | < 1 minute |
| Normal (P3) | Reports, bulk operations | < 5 minutes |
| Low (P4) | Analytics, cleanup | < 1 hour |
| Background (P5) | Maintenance, archival | Anytime |

### Implementing Priority Queues

```typescript
// Define priority constants
const PRIORITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low',
  BACKGROUND: 'background',
} as const;

// Priority-based concurrency
export const criticalJob = inngest.createFunction(
  {
    id: 'critical-job',
    concurrency: { limit: 50 }, // High concurrency for critical
  },
  { event: 'job/critical' },
  async ({ event, step }) => {
    // Critical job processing
  }
);

export const backgroundJob = inngest.createFunction(
  {
    id: 'background-job',
    concurrency: { limit: 2 }, // Low concurrency for background
  },
  { event: 'job/background' },
  async ({ event, step }) => {
    // Background job processing
  }
);

// Helper to send prioritized events
export async function queueJob(
  name: string,
  data: any,
  priority: keyof typeof PRIORITY = 'NORMAL'
) {
  const eventName = `job/${priority.toLowerCase()}`;

  await inngest.send({
    name: eventName,
    data: {
      ...data,
      _priority: priority,
      _originalJobType: name,
    },
  });
}
```

### Time-Sensitive Jobs

```typescript
export const timeSensitiveJob = inngest.createFunction(
  { id: 'time-sensitive' },
  { event: 'job/time-sensitive' },
  async ({ event, step }) => {
    const { deadline, data } = event.data;
    const deadlineDate = new Date(deadline);

    // Check if we still have time
    if (new Date() > deadlineDate) {
      logger.warn('Job deadline passed, skipping', { deadline });
      return { status: 'skipped', reason: 'deadline_passed' };
    }

    // Process with deadline awareness
    const result = await step.run('process-with-deadline', async () => {
      return await processWithTimeout(data, deadlineDate.getTime() - Date.now());
    });

    return result;
  }
);
```

---

## Rate Limiting

### API Rate Limiting

Respect external API limits:

```typescript
export const rateLimitedJob = inngest.createFunction(
  {
    id: 'rate-limited-api',
    concurrency: {
      limit: 10, // Match API rate limit
      key: 'event.data.apiProvider', // Separate limits per provider
    },
  },
  { event: 'api/call' },
  async ({ event, step }) => {
    // Call rate-limited API
    const result = await step.run('api-call', async () => {
      return await callAPI(event.data);
    });

    // Respect rate limit headers
    if (result.headers['x-ratelimit-remaining'] === '0') {
      const resetTime = parseInt(result.headers['x-ratelimit-reset']);
      const waitTime = resetTime * 1000 - Date.now();

      if (waitTime > 0) {
        await step.sleep('rate-limit-wait', `${Math.ceil(waitTime / 1000)}s`);
      }
    }

    return result;
  }
);
```

### Batch Processing with Rate Limits

```typescript
export const batchWithRateLimiting = inngest.createFunction(
  { id: 'batch-rate-limited' },
  { event: 'batch/process' },
  async ({ event, step }) => {
    const { items } = event.data;
    const BATCH_SIZE = 100;
    const DELAY_BETWEEN_BATCHES = 1000; // 1 second

    const batches = chunk(items, BATCH_SIZE);
    const results = [];

    for (let i = 0; i < batches.length; i++) {
      const batchResult = await step.run(`process-batch-${i}`, async () => {
        return await Promise.all(
          batches[i].map(item => processItem(item))
        );
      });

      results.push(...batchResult);

      // Rate limit: wait between batches (except after last)
      if (i < batches.length - 1) {
        await step.sleep(`batch-delay-${i}`, `${DELAY_BETWEEN_BATCHES}ms`);
      }
    }

    return { processed: results.length };
  }
);
```

### Token Bucket Pattern

```typescript
// Token bucket rate limiter for Supabase
const rateLimiter = {
  tokens: 100,
  refillRate: 10, // tokens per second
  lastRefill: Date.now(),

  async consume(count: number = 1): Promise<boolean> {
    this.refill();
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  },

  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(100, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  },
};

export const tokenBucketJob = inngest.createFunction(
  { id: 'token-bucket' },
  { event: 'job/rate-limited' },
  async ({ event, step }) => {
    await step.run('wait-for-token', async () => {
      while (!await rateLimiter.consume()) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    });

    return await step.run('process', async () => {
      return await processJob(event.data);
    });
  }
);
```

---

## Cost Considerations

### Inngest Pricing Model

| Factor | Impact on Cost |
|--------|----------------|
| Number of events | Direct: $0.001 per event (Pro) |
| Step runs | Each step counts as usage |
| Retries | Failed retries still count |
| Concurrency | No direct cost impact |
| Scheduling | No additional cost |

### Cost Optimization Strategies

#### 1. Batch Operations

```typescript
// EXPENSIVE: One event per item
for (const item of items) {
  await inngest.send({
    name: 'item/process',
    data: { item },
  });
}
// Cost: 1000 items = 1000 events

// OPTIMIZED: Batch into single event
await inngest.send({
  name: 'items/process-batch',
  data: { items },
});
// Cost: 1000 items = 1 event
```

#### 2. Combine Steps When Possible

```typescript
// EXPENSIVE: Many small steps
const processJob = inngest.createFunction(
  { id: 'expensive-job' },
  { event: 'job/process' },
  async ({ event, step }) => {
    const a = await step.run('step-a', async () => await getA());
    const b = await step.run('step-b', async () => await getB());
    const c = await step.run('step-c', async () => await getC());
    return { a, b, c };
  }
);
// Cost: 3 step runs

// OPTIMIZED: Combine related steps
const optimizedJob = inngest.createFunction(
  { id: 'optimized-job' },
  { event: 'job/process' },
  async ({ event, step }) => {
    const data = await step.run('fetch-all', async () => {
      const [a, b, c] = await Promise.all([getA(), getB(), getC()]);
      return { a, b, c };
    });
    return data;
  }
);
// Cost: 1 step run
```

#### 3. Avoid Unnecessary Retries

```typescript
// Use NonRetriableError for known failures
await step.run('validate', async () => {
  if (!isValid(data)) {
    throw new NonRetriableError('Invalid data');
  }
});
```

### Cost Estimation

| Workload | Events/Month | Steps/Event | Monthly Cost (Pro) |
|----------|--------------|-------------|-------------------|
| Light | 10,000 | 3 | ~$3 |
| Medium | 50,000 | 5 | ~$25 |
| Heavy | 200,000 | 5 | ~$100 |
| Enterprise | 1,000,000+ | 5 | Custom |

### Free Tier Optimization

To stay within the free tier (25,000 steps/month):

1. **Batch aggressively**: Process items in groups
2. **Use cron for periodic tasks**: Instead of individual triggers
3. **Minimize steps**: Combine operations where safe
4. **Filter events early**: Validate before sending to queue
5. **Use pg_cron for simple tasks**: Database-only operations

---

## Migration Path from Sync to Async

### Assessment Checklist

Before migrating an operation to async:

- [ ] Does it take > 1 second?
- [ ] Does it call external APIs?
- [ ] Can the user wait for immediate feedback?
- [ ] Is the operation idempotent or can it be made so?
- [ ] What happens if it fails?
- [ ] Does it need to be transactional?

### Migration Strategy

#### Phase 1: Identify Candidates

```typescript
// Operations to consider for async:
const asyncCandidates = [
  'email.sendNewsletter',        // Bulk email
  'report.generate',             // Long-running
  'import.processFile',          // Bulk data
  'webhook.processPayment',      // External
  'cleanup.expiredSessions',     // Background
];
```

#### Phase 2: Add Queue Infrastructure

1. Install queue client (Inngest)
2. Set up API route handler
3. Configure environment variables
4. Test with simple job

#### Phase 3: Parallel Implementation

Run sync and async side by side:

```typescript
// Feature flag controlled migration
export async function sendNewsletter(campaignId: string) {
  if (featureFlags.isEnabled('async_newsletter')) {
    // New async path
    await inngest.send({
      name: 'email/send.campaign',
      data: { campaignId },
    });
    return { status: 'queued' };
  } else {
    // Old sync path
    return await sendNewsletterSync(campaignId);
  }
}
```

#### Phase 4: Update UI for Async

```typescript
// Before: Sync UI
const handleSend = async () => {
  setLoading(true);
  const result = await sendNewsletter(campaignId);
  setLoading(false);
  toast.success('Newsletter sent!');
};

// After: Async UI
const handleSend = async () => {
  const result = await sendNewsletter(campaignId);

  if (result.status === 'queued') {
    toast.info('Newsletter queued for sending');
    // Optionally: Set up polling or WebSocket for status
    pollJobStatus(result.jobId);
  }
};

// Status polling
const pollJobStatus = async (jobId: string) => {
  const checkStatus = async () => {
    const status = await getJobStatus(jobId);

    if (status.state === 'completed') {
      toast.success('Newsletter sent successfully!');
      return;
    }
    if (status.state === 'failed') {
      toast.error('Newsletter failed to send');
      return;
    }

    // Still processing, check again
    setTimeout(checkStatus, 2000);
  };

  checkStatus();
};
```

#### Phase 5: Gradual Rollout

```typescript
// Percentage-based rollout
const ASYNC_ROLLOUT_PERCENTAGE = 10; // Start with 10%

export async function sendNewsletter(campaignId: string) {
  const useAsync = Math.random() * 100 < ASYNC_ROLLOUT_PERCENTAGE;

  if (useAsync) {
    return await sendNewsletterAsync(campaignId);
  } else {
    return await sendNewsletterSync(campaignId);
  }
}
```

#### Phase 6: Full Migration

After successful rollout:

1. Remove feature flags
2. Delete sync code
3. Update documentation
4. Monitor for issues

### Migration Example: Email Campaign

**Before (Sync)**:

```typescript
// pages/api/campaigns/[id]/send.ts
export async function handler(req, res) {
  const { id } = req.params;
  const campaign = await getCampaign(id);
  const subscribers = await getSubscribers(campaign.listId);

  for (const subscriber of subscribers) {
    try {
      await sendEmail(subscriber.email, campaign.content);
    } catch (error) {
      console.error('Failed to send to:', subscriber.email);
    }
  }

  await updateCampaignStatus(id, 'sent');

  res.json({ success: true, sent: subscribers.length });
}
```

**After (Async)**:

```typescript
// pages/api/campaigns/[id]/send.ts
export async function handler(req, res) {
  const { id } = req.params;

  // Validate campaign exists
  const campaign = await getCampaign(id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  // Queue for async processing
  const { ids: eventIds } = await inngest.send({
    name: 'email/send.campaign',
    data: { campaignId: id },
  });

  // Return immediately
  res.status(202).json({
    message: 'Campaign queued for sending',
    jobId: eventIds[0],
  });
}

// Inngest function handles the actual sending
// (see Implementation Guide section)
```

---

## Related Documentation

- [Horizontal Scaling Strategy](./horizontal-scaling.md)
- [Caching Strategy](./caching-strategy.md)
- [ADR-0005: Deployment Architecture](../adr/0005-deployment-architecture.md)
- [Disaster Recovery](../reliability/disaster-recovery.md)
- [SLOs and SLIs](../observability/slos-slis.md)

---

## Appendix: Quick Reference

### Queue Decision Matrix

```
Does it take > 1 second?
├── No → Keep synchronous
└── Yes → Consider async
    ├── Does user need immediate result?
    │   ├── Yes → Keep sync, optimize
    │   └── No → Use queue
    └── Can it fail?
        ├── Yes → Use queue with retries
        └── No → Optional queue
```

### Inngest Function Template

```typescript
import { inngest } from '@/lib/inngest/client';

export const myJob = inngest.createFunction(
  {
    id: 'my-job',
    retries: 5,
    concurrency: { limit: 10 },
    onFailure: async ({ event, error }) => {
      // Handle permanent failure
    },
  },
  { event: 'my/event' },
  async ({ event, step }) => {
    // Step 1: Validate
    await step.run('validate', async () => {
      // Validation logic
    });

    // Step 2: Process
    const result = await step.run('process', async () => {
      return await processData(event.data);
    });

    // Step 3: Notify
    await step.run('notify', async () => {
      await notifyComplete(result);
    });

    return { success: true, result };
  }
);
```

### Common Cron Schedules

| Schedule | Cron Expression | Use Case |
|----------|-----------------|----------|
| Every minute | `* * * * *` | Real-time monitoring |
| Every 5 minutes | `*/5 * * * *` | Frequent syncs |
| Every 15 minutes | `*/15 * * * *` | Metric collection |
| Hourly | `0 * * * *` | Regular processing |
| Daily (3 AM) | `0 3 * * *` | Overnight jobs |
| Weekly (Sunday) | `0 0 * * 0` | Weekly reports |
| Monthly (1st) | `0 0 1 * *` | Monthly tasks |

### Troubleshooting

| Issue | Possible Cause | Solution |
|-------|----------------|----------|
| Jobs not processing | API route not configured | Check netlify.toml redirects |
| Retries exhausted | Transient error not resolving | Check error logs, increase retries |
| High latency | Too many steps | Combine steps, batch operations |
| Missing events | Event not sent | Check inngest.send() is awaited |
| DLQ filling up | Unhandled error type | Add specific error handling |

---

## Version History

| Date | Change | Issue |
|------|--------|-------|
| 2026-01-20 | Initial document created | #84 |
