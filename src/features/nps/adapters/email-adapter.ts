/**
 * NPS Email Adapter
 *
 * Implementations for sending NPS surveys via email.
 * Supports SendGrid and Resend providers.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/111
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/117
 */

// ============================================
// Types
// ============================================

export interface NPSEmailRecipient {
  email: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface NPSEmailTemplate {
  subject: string;
  html: string;
  text: string;
  surveyUrl: string;
}

export interface NPSEmailOptions {
  from?: {
    email: string;
    name?: string;
  };
  replyTo?: string;
  tags?: string[];
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailBatchResult {
  sent: number;
  failed: number;
  errors?: string[];
}

/**
 * Email adapter interface for sending NPS surveys
 */
export interface INPSEmailAdapter {
  sendSurvey(
    recipient: NPSEmailRecipient,
    template: NPSEmailTemplate,
    options?: NPSEmailOptions
  ): Promise<EmailSendResult>;

  sendSurveyBatch(
    recipients: NPSEmailRecipient[],
    template: NPSEmailTemplate,
    options?: NPSEmailOptions
  ): Promise<EmailBatchResult>;

  sendDetractorFollowup(
    recipient: NPSEmailRecipient,
    responseId: string,
    message: string,
    options?: NPSEmailOptions
  ): Promise<EmailSendResult>;

  verifyConfiguration(): Promise<{ valid: boolean; error?: string }>;
}

// ============================================
// SendGrid Implementation
// ============================================

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3';

interface SendGridPersonalization {
  to: Array<{ email: string; name?: string }>;
  substitutions?: Record<string, string>;
}

interface SendGridMailPayload {
  personalizations: SendGridPersonalization[];
  from: { email: string; name?: string };
  reply_to?: { email: string };
  subject: string;
  content: Array<{ type: string; value: string }>;
  categories?: string[];
}

/**
 * SendGrid email adapter for NPS surveys
 */
export class SendGridNPSAdapter implements INPSEmailAdapter {
  private apiKey: string;
  private defaultFrom: { email: string; name?: string };

  constructor(apiKey: string, defaultFrom?: { email: string; name?: string }) {
    this.apiKey = apiKey;
    this.defaultFrom = defaultFrom || { email: 'noreply@example.com', name: 'NPS Survey' };
  }

  async sendSurvey(
    recipient: NPSEmailRecipient,
    template: NPSEmailTemplate,
    options?: NPSEmailOptions
  ): Promise<EmailSendResult> {
    const from = options?.from || this.defaultFrom;

    const payload: SendGridMailPayload = {
      personalizations: [
        {
          to: [{ email: recipient.email, name: recipient.name }],
        },
      ],
      from,
      subject: template.subject,
      content: [
        { type: 'text/plain', value: template.text },
        { type: 'text/html', value: template.html },
      ],
    };

    if (options?.replyTo) {
      payload.reply_to = { email: options.replyTo };
    }

    if (options?.tags && options.tags.length > 0) {
      payload.categories = options.tags;
    }

    try {
      const response = await fetch(`${SENDGRID_API_URL}/mail/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok || response.status === 202) {
        // SendGrid returns message ID in header
        const messageId = response.headers.get('x-message-id') || undefined;
        return { success: true, messageId };
      }

      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.errors?.[0]?.message || `SendGrid error: ${response.status}`;
      return { success: false, error: errorMessage };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendSurveyBatch(
    recipients: NPSEmailRecipient[],
    template: NPSEmailTemplate,
    options?: NPSEmailOptions
  ): Promise<EmailBatchResult> {
    const from = options?.from || this.defaultFrom;
    const errors: string[] = [];
    let sent = 0;
    let failed = 0;

    // SendGrid supports up to 1000 personalizations per request
    const batchSize = 1000;
    const batches = [];

    for (let i = 0; i < recipients.length; i += batchSize) {
      batches.push(recipients.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const payload: SendGridMailPayload = {
        personalizations: batch.map((recipient) => ({
          to: [{ email: recipient.email, name: recipient.name }],
        })),
        from,
        subject: template.subject,
        content: [
          { type: 'text/plain', value: template.text },
          { type: 'text/html', value: template.html },
        ],
      };

      if (options?.replyTo) {
        payload.reply_to = { email: options.replyTo };
      }

      if (options?.tags && options.tags.length > 0) {
        payload.categories = options.tags;
      }

      try {
        const response = await fetch(`${SENDGRID_API_URL}/mail/send`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok || response.status === 202) {
          sent += batch.length;
        } else {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage =
            errorData.errors?.[0]?.message || `SendGrid error: ${response.status}`;
          errors.push(errorMessage);
          failed += batch.length;
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Unknown error');
        failed += batch.length;
      }
    }

    return { sent, failed, errors: errors.length > 0 ? errors : undefined };
  }

  async sendDetractorFollowup(
    recipient: NPSEmailRecipient,
    responseId: string,
    message: string,
    options?: NPSEmailOptions
  ): Promise<EmailSendResult> {
    const template: NPSEmailTemplate = {
      subject: 'Thank you for your feedback',
      html: `<p>${message}</p><p style="color: #666; font-size: 12px;">Reference: ${responseId}</p>`,
      text: `${message}\n\nReference: ${responseId}`,
      surveyUrl: '',
    };

    return this.sendSurvey(recipient, template, options);
  }

  async verifyConfiguration(): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch(`${SENDGRID_API_URL}/user/profile`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return { valid: true };
      }

      if (response.status === 401) {
        return { valid: false, error: 'Invalid SendGrid API key' };
      }

      return { valid: false, error: `SendGrid API error: ${response.status}` };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to verify SendGrid configuration',
      };
    }
  }
}

// ============================================
// Resend Implementation
// ============================================

const RESEND_API_URL = 'https://api.resend.com';

interface ResendEmailPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
  reply_to?: string;
  tags?: Array<{ name: string; value: string }>;
}

interface ResendBatchPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
  reply_to?: string;
}

/**
 * Resend email adapter for NPS surveys
 */
export class ResendNPSAdapter implements INPSEmailAdapter {
  private apiKey: string;
  private defaultFrom: string;

  constructor(apiKey: string, defaultFrom?: string) {
    this.apiKey = apiKey;
    this.defaultFrom = defaultFrom || 'NPS Survey <noreply@example.com>';
  }

  private formatFrom(options?: NPSEmailOptions): string {
    if (options?.from) {
      return options.from.name
        ? `${options.from.name} <${options.from.email}>`
        : options.from.email;
    }
    return this.defaultFrom;
  }

  async sendSurvey(
    recipient: NPSEmailRecipient,
    template: NPSEmailTemplate,
    options?: NPSEmailOptions
  ): Promise<EmailSendResult> {
    const payload: ResendEmailPayload = {
      from: this.formatFrom(options),
      to: [recipient.email],
      subject: template.subject,
      html: template.html,
      text: template.text,
    };

    if (options?.replyTo) {
      payload.reply_to = options.replyTo;
    }

    if (options?.tags && options.tags.length > 0) {
      payload.tags = options.tags.map((tag) => ({ name: tag, value: 'true' }));
    }

    try {
      const response = await fetch(`${RESEND_API_URL}/emails`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, messageId: data.id };
      }

      return { success: false, error: data.message || `Resend error: ${response.status}` };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendSurveyBatch(
    recipients: NPSEmailRecipient[],
    template: NPSEmailTemplate,
    options?: NPSEmailOptions
  ): Promise<EmailBatchResult> {
    const from = this.formatFrom(options);
    const errors: string[] = [];
    let sent = 0;
    let failed = 0;

    // Resend batch API supports up to 100 emails per request
    const batchSize = 100;
    const batches = [];

    for (let i = 0; i < recipients.length; i += batchSize) {
      batches.push(recipients.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const emails: ResendBatchPayload[] = batch.map((recipient) => ({
        from,
        to: [recipient.email],
        subject: template.subject,
        html: template.html,
        text: template.text,
        reply_to: options?.replyTo,
      }));

      try {
        const response = await fetch(`${RESEND_API_URL}/emails/batch`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emails),
        });

        const data = await response.json();

        if (response.ok) {
          // Resend returns array of results
          const results = Array.isArray(data.data) ? data.data : [data];
          sent += results.filter((r: { id?: string }) => r.id).length;
          failed += results.filter((r: { id?: string }) => !r.id).length;
        } else {
          errors.push(data.message || `Resend error: ${response.status}`);
          failed += batch.length;
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Unknown error');
        failed += batch.length;
      }
    }

    return { sent, failed, errors: errors.length > 0 ? errors : undefined };
  }

  async sendDetractorFollowup(
    recipient: NPSEmailRecipient,
    responseId: string,
    message: string,
    options?: NPSEmailOptions
  ): Promise<EmailSendResult> {
    const template: NPSEmailTemplate = {
      subject: 'Thank you for your feedback',
      html: `<p>${message}</p><p style="color: #666; font-size: 12px;">Reference: ${responseId}</p>`,
      text: `${message}\n\nReference: ${responseId}`,
      surveyUrl: '',
    };

    return this.sendSurvey(recipient, template, options);
  }

  async verifyConfiguration(): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch(`${RESEND_API_URL}/api-keys`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return { valid: true };
      }

      if (response.status === 401) {
        return { valid: false, error: 'Invalid Resend API key' };
      }

      return { valid: false, error: `Resend API error: ${response.status}` };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to verify Resend configuration',
      };
    }
  }
}

// ============================================
// Factory Function
// ============================================

export type EmailProvider = 'sendgrid' | 'resend';

export interface EmailAdapterConfig {
  provider: EmailProvider;
  apiKey: string;
  defaultFrom?: string | { email: string; name?: string };
}

/**
 * Create an email adapter instance based on provider
 */
export function createEmailAdapter(config: EmailAdapterConfig): INPSEmailAdapter {
  switch (config.provider) {
    case 'sendgrid': {
      const from =
        typeof config.defaultFrom === 'string'
          ? { email: config.defaultFrom }
          : config.defaultFrom;
      return new SendGridNPSAdapter(config.apiKey, from);
    }
    case 'resend': {
      const from =
        typeof config.defaultFrom === 'object'
          ? config.defaultFrom.name
            ? `${config.defaultFrom.name} <${config.defaultFrom.email}>`
            : config.defaultFrom.email
          : config.defaultFrom;
      return new ResendNPSAdapter(config.apiKey, from);
    }
    default:
      throw new Error(`Unknown email provider: ${config.provider}`);
  }
}
