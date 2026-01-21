/**
 * NPS SMS Adapter
 *
 * Implementation for sending NPS surveys via SMS.
 * Supports Twilio provider.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/111
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/117
 */

// ============================================
// Types
// ============================================

export interface NPSSMSRecipient {
  phone: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface NPSSMSMessage {
  body: string;
  surveyUrl: string;
}

export interface NPSSMSOptions {
  from?: string;
  messagingServiceSid?: string;
}

export interface SMSSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SMSBatchResult {
  sent: number;
  failed: number;
  errors?: string[];
}

/**
 * SMS adapter interface for sending NPS surveys
 */
export interface INPSSMSAdapter {
  sendSurvey(
    recipient: NPSSMSRecipient,
    message: NPSSMSMessage,
    options?: NPSSMSOptions
  ): Promise<SMSSendResult>;

  sendSurveyBatch(
    recipients: NPSSMSRecipient[],
    message: NPSSMSMessage,
    options?: NPSSMSOptions
  ): Promise<SMSBatchResult>;

  sendDetractorFollowup(
    recipient: NPSSMSRecipient,
    responseId: string,
    message: string,
    options?: NPSSMSOptions
  ): Promise<SMSSendResult>;

  verifyConfiguration(): Promise<{ valid: boolean; error?: string }>;
}

// ============================================
// Twilio Implementation
// ============================================

const TWILIO_API_URL = 'https://api.twilio.com/2010-04-01';

interface TwilioMessageResponse {
  sid: string;
  status: string;
  error_code?: number;
  error_message?: string;
}

interface TwilioAccountResponse {
  sid: string;
  friendly_name: string;
  status: string;
}

/**
 * Twilio SMS adapter for NPS surveys
 */
export class TwilioNPSAdapter implements INPSSMSAdapter {
  private accountSid: string;
  private authToken: string;
  private defaultFrom?: string;
  private messagingServiceSid?: string;

  constructor(
    accountSid: string,
    authToken: string,
    options?: { defaultFrom?: string; messagingServiceSid?: string }
  ) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.defaultFrom = options?.defaultFrom;
    this.messagingServiceSid = options?.messagingServiceSid;
  }

  private getAuthHeader(): string {
    const credentials = `${this.accountSid}:${this.authToken}`;
    return `Basic ${btoa(credentials)}`;
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters except leading +
    const cleaned = phone.replace(/[^\d+]/g, '');

    // If it doesn't start with +, assume US and add +1
    if (!cleaned.startsWith('+')) {
      return `+1${cleaned}`;
    }

    return cleaned;
  }

  async sendSurvey(
    recipient: NPSSMSRecipient,
    message: NPSSMSMessage,
    options?: NPSSMSOptions
  ): Promise<SMSSendResult> {
    const from = options?.from || this.defaultFrom;
    const messagingServiceSid = options?.messagingServiceSid || this.messagingServiceSid;

    if (!from && !messagingServiceSid) {
      return {
        success: false,
        error: 'Either "from" phone number or "messagingServiceSid" is required',
      };
    }

    const formattedPhone = this.formatPhoneNumber(recipient.phone);
    const fullMessage = message.surveyUrl
      ? `${message.body}\n\n${message.surveyUrl}`
      : message.body;

    // Build form data
    const formData = new URLSearchParams();
    formData.append('To', formattedPhone);
    formData.append('Body', fullMessage);

    if (messagingServiceSid) {
      formData.append('MessagingServiceSid', messagingServiceSid);
    } else if (from) {
      formData.append('From', this.formatPhoneNumber(from));
    }

    try {
      const response = await fetch(
        `${TWILIO_API_URL}/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        }
      );

      const data: TwilioMessageResponse = await response.json();

      if (response.ok && data.sid) {
        return { success: true, messageId: data.sid };
      }

      return {
        success: false,
        error: data.error_message || `Twilio error: ${response.status}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendSurveyBatch(
    recipients: NPSSMSRecipient[],
    message: NPSSMSMessage,
    options?: NPSSMSOptions
  ): Promise<SMSBatchResult> {
    const errors: string[] = [];
    let sent = 0;
    let failed = 0;

    // Twilio doesn't have a native batch API, so we send individually
    // Use Promise.allSettled for parallel execution with rate limiting
    const batchSize = 10; // Process 10 at a time to avoid rate limits
    const batches = [];

    for (let i = 0; i < recipients.length; i += batchSize) {
      batches.push(recipients.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const results = await Promise.allSettled(
        batch.map((recipient) => this.sendSurvey(recipient, message, options))
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            sent++;
          } else {
            failed++;
            if (result.value.error) {
              errors.push(result.value.error);
            }
          }
        } else {
          failed++;
          errors.push(result.reason?.message || 'Unknown error');
        }
      }

      // Small delay between batches to avoid rate limiting
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return { sent, failed, errors: errors.length > 0 ? errors : undefined };
  }

  async sendDetractorFollowup(
    recipient: NPSSMSRecipient,
    responseId: string,
    message: string,
    options?: NPSSMSOptions
  ): Promise<SMSSendResult> {
    const smsMessage: NPSSMSMessage = {
      body: `${message}\n\nRef: ${responseId.slice(0, 8)}`,
      surveyUrl: '',
    };

    return this.sendSurvey(recipient, smsMessage, options);
  }

  async verifyConfiguration(): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${TWILIO_API_URL}/Accounts/${this.accountSid}.json`,
        {
          method: 'GET',
          headers: {
            Authorization: this.getAuthHeader(),
          },
        }
      );

      if (response.ok) {
        const data: TwilioAccountResponse = await response.json();
        if (data.status === 'active') {
          return { valid: true };
        }
        return { valid: false, error: `Account status: ${data.status}` };
      }

      if (response.status === 401) {
        return { valid: false, error: 'Invalid Twilio credentials' };
      }

      return { valid: false, error: `Twilio API error: ${response.status}` };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to verify Twilio configuration',
      };
    }
  }
}

// ============================================
// Factory Function
// ============================================

export type SMSProvider = 'twilio';

export interface SMSAdapterConfig {
  provider: SMSProvider;
  accountSid: string;
  authToken: string;
  defaultFrom?: string;
  messagingServiceSid?: string;
}

/**
 * Create an SMS adapter instance based on provider
 */
export function createSMSAdapter(config: SMSAdapterConfig): INPSSMSAdapter {
  switch (config.provider) {
    case 'twilio':
      return new TwilioNPSAdapter(config.accountSid, config.authToken, {
        defaultFrom: config.defaultFrom,
        messagingServiceSid: config.messagingServiceSid,
      });
    default:
      throw new Error(`Unknown SMS provider: ${config.provider}`);
  }
}
