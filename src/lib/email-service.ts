/**
 * Email Service Integration
 *
 * Integrates with Resend or SendGrid for transactional emails
 * Configure via environment variables:
 * - EMAIL_PROVIDER=resend|sendgrid
 * - RESEND_API_KEY or SENDGRID_API_KEY
 */

import { captureException } from './sentry';

export type EmailProvider = 'resend' | 'sendgrid' | 'console';

export interface EmailOptions {
  to: string | string[];
  from?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    content: string;
    filename: string;
    type?: string;
    disposition?: string;
  }>;
  headers?: Record<string, string>;
  tags?: Record<string, string>;
}

export interface EmailResponse {
  id: string;
  provider: EmailProvider;
  success: boolean;
  error?: string;
}

class EmailService {
  private provider: EmailProvider;
  private apiKey: string | null;
  private fromEmail: string;

  constructor() {
    this.provider = this.getProvider();
    this.apiKey = this.getApiKey();
    this.fromEmail = import.meta.env.VITE_EMAIL_FROM || 'noreply@mejohnc.org';
  }

  private getProvider(): EmailProvider {
    const provider = import.meta.env.VITE_EMAIL_PROVIDER?.toLowerCase() || 'console';
    if (provider === 'resend' || provider === 'sendgrid') {
      return provider;
    }
    return 'console';
  }

  private getApiKey(): string | null {
    if (this.provider === 'resend') {
      return import.meta.env.VITE_RESEND_API_KEY || null;
    }
    if (this.provider === 'sendgrid') {
      return import.meta.env.VITE_SENDGRID_API_KEY || null;
    }
    return null;
  }

  /**
   * Send an email via configured provider
   */
  async send(options: EmailOptions): Promise<EmailResponse> {
    const from = options.from || this.fromEmail;

    try {
      switch (this.provider) {
        case 'resend':
          return await this.sendViaResend({ ...options, from });
        case 'sendgrid':
          return await this.sendViaSendGrid({ ...options, from });
        case 'console':
        default:
          return this.sendToConsole({ ...options, from });
      }
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'EmailService.send',
        provider: this.provider,
      });
      return {
        id: '',
        provider: this.provider,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Send via Resend
   * https://resend.com/docs/api-reference/emails/send-email
   */
  private async sendViaResend(options: EmailOptions & { from: string }): Promise<EmailResponse> {
    if (!this.apiKey) {
      throw new Error('Resend API key not configured');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: options.from,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
        headers: options.headers,
        tags: options.tags,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send email via Resend');
    }

    return {
      id: data.id,
      provider: 'resend',
      success: true,
    };
  }

  /**
   * Send via SendGrid
   * https://docs.sendgrid.com/api-reference/mail-send/mail-send
   */
  private async sendViaSendGrid(options: EmailOptions & { from: string }): Promise<EmailResponse> {
    if (!this.apiKey) {
      throw new Error('SendGrid API key not configured');
    }

    const toArray = Array.isArray(options.to) ? options.to : [options.to];

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: toArray.map(email => ({ email })),
            cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]).map(email => ({ email })) : undefined,
            bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]).map(email => ({ email })) : undefined,
          },
        ],
        from: { email: options.from },
        reply_to: options.replyTo ? { email: options.replyTo } : undefined,
        subject: options.subject,
        content: [
          { type: 'text/html', value: options.html },
          ...(options.text ? [{ type: 'text/plain', value: options.text }] : []),
        ],
        attachments: options.attachments,
        headers: options.headers,
        custom_args: options.tags,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.errors?.[0]?.message || 'Failed to send email via SendGrid');
    }

    // SendGrid returns 202 with X-Message-Id header
    const messageId = response.headers.get('X-Message-Id') || '';

    return {
      id: messageId,
      provider: 'sendgrid',
      success: true,
    };
  }

  /**
   * Log email to console (development mode)
   */
  private sendToConsole(options: EmailOptions & { from: string }): EmailResponse {
    console.log('=== Email (Console Mode) ===');
    console.log('From:', options.from);
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('--- HTML Content ---');
    console.log(options.html);
    if (options.text) {
      console.log('--- Text Content ---');
      console.log(options.text);
    }
    console.log('===========================');

    return {
      id: `console-${Date.now()}`,
      provider: 'console',
      success: true,
    };
  }

  /**
   * Send a transactional email from a template
   */
  async sendFromTemplate(
    templateId: string,
    to: string | string[],
    variables: Record<string, string>,
    options?: Partial<EmailOptions>
  ): Promise<EmailResponse> {
    // This would fetch the template from the database and render it
    // For now, this is a placeholder
    throw new Error('Template rendering not implemented yet');
  }

  /**
   * Verify email provider configuration
   */
  async verify(): Promise<boolean> {
    if (this.provider === 'console') {
      return true;
    }

    if (!this.apiKey) {
      console.warn(`${this.provider} API key not configured`);
      return false;
    }

    try {
      // Simple verification - try to send to a test endpoint or verify API key
      if (this.provider === 'resend') {
        // Resend has an API keys endpoint for verification
        const response = await fetch('https://api.resend.com/api-keys', {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        });
        return response.ok;
      }

      if (this.provider === 'sendgrid') {
        // SendGrid has a scopes endpoint for verification
        const response = await fetch('https://api.sendgrid.com/v3/scopes', {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        });
        return response.ok;
      }

      return false;
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'EmailService.verify',
      });
      return false;
    }
  }

  /**
   * Get current provider info
   */
  getProviderInfo() {
    return {
      provider: this.provider,
      configured: this.provider === 'console' || !!this.apiKey,
      fromEmail: this.fromEmail,
    };
  }
}

// Singleton instance
export const emailService = new EmailService();

// Helper functions for common email types
export async function sendWelcomeEmail(to: string, firstName?: string): Promise<EmailResponse> {
  const name = firstName || 'there';
  return emailService.send({
    to,
    subject: 'Welcome to MeJohnC.Org!',
    html: `
      <h1>Welcome ${name}!</h1>
      <p>Thanks for subscribing to our newsletter.</p>
      <p>You'll receive updates about new content, projects, and insights.</p>
      <p>Best regards,<br>John</p>
    `,
    text: `Welcome ${name}!\n\nThanks for subscribing to our newsletter.\nYou'll receive updates about new content, projects, and insights.\n\nBest regards,\nJohn`,
  });
}

export async function sendUnsubscribeConfirmation(to: string): Promise<EmailResponse> {
  return emailService.send({
    to,
    subject: 'Unsubscribe Confirmation',
    html: `
      <h1>You've been unsubscribed</h1>
      <p>We're sorry to see you go. You've been removed from our mailing list.</p>
      <p>If this was a mistake, you can <a href="${import.meta.env.VITE_SITE_URL}/subscribe">re-subscribe here</a>.</p>
    `,
    text: `You've been unsubscribed\n\nWe're sorry to see you go. You've been removed from our mailing list.\n\nIf this was a mistake, you can re-subscribe at ${import.meta.env.VITE_SITE_URL}/subscribe`,
  });
}

export async function sendTestEmail(to: string): Promise<EmailResponse> {
  return emailService.send({
    to,
    subject: 'Test Email from MeJohnC.Org',
    html: `
      <h1>Test Email</h1>
      <p>This is a test email from the marketing system.</p>
      <p>If you received this, your email configuration is working correctly!</p>
      <p>Provider: <strong>${emailService.getProviderInfo().provider}</strong></p>
    `,
    text: `Test Email\n\nThis is a test email from the marketing system.\nIf you received this, your email configuration is working correctly!\n\nProvider: ${emailService.getProviderInfo().provider}`,
  });
}
