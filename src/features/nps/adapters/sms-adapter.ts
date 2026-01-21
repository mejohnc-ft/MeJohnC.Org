/**
 * NPS SMS Adapter Interface
 *
 * Defines the contract for sending NPS surveys via SMS.
 * Implementations can use Twilio or other SMS providers.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/111
 */

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

/**
 * SMS adapter for sending NPS surveys
 */
export interface INPSSMSAdapter {
  /**
   * Send NPS survey to a single recipient via SMS
   */
  sendSurvey(
    recipient: NPSSMSRecipient,
    message: NPSSMSMessage,
    options?: NPSSMSOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;

  /**
   * Send NPS surveys to multiple recipients (batch)
   */
  sendSurveyBatch(
    recipients: NPSSMSRecipient[],
    message: NPSSMSMessage,
    options?: NPSSMSOptions
  ): Promise<{ sent: number; failed: number; errors?: string[] }>;

  /**
   * Send follow-up SMS to a detractor
   */
  sendDetractorFollowup(
    recipient: NPSSMSRecipient,
    responseId: string,
    message: string,
    options?: NPSSMSOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;

  /**
   * Verify SMS configuration and credentials
   */
  verifyConfiguration(): Promise<{ valid: boolean; error?: string }>;
}

/**
 * Example implementation stub for Twilio
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
export class TwilioNPSAdapter implements INPSSMSAdapter {
  private accountSid: string;
  private authToken: string;

  constructor(accountSid: string, authToken: string) {
    this.accountSid = accountSid;
    this.authToken = authToken;
  }

  async sendSurvey(
    recipient: NPSSMSRecipient,
    message: NPSSMSMessage,
    options?: NPSSMSOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // TODO: Implement Twilio API call
    // Will send SMS with survey link
    throw new Error('Twilio integration not yet implemented');
  }

  async sendSurveyBatch(
    recipients: NPSSMSRecipient[],
    message: NPSSMSMessage,
    options?: NPSSMSOptions
  ): Promise<{ sent: number; failed: number; errors?: string[] }> {
    // TODO: Implement Twilio batch API call
    throw new Error('Twilio batch integration not yet implemented');
  }

  async sendDetractorFollowup(
    recipient: NPSSMSRecipient,
    responseId: string,
    message: string,
    options?: NPSSMSOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // TODO: Implement Twilio API call for follow-up
    throw new Error('Twilio follow-up integration not yet implemented');
  }

  async verifyConfiguration(): Promise<{ valid: boolean; error?: string }> {
    // TODO: Verify Twilio credentials
    return { valid: false, error: 'Not implemented' };
  }
}
/* eslint-enable @typescript-eslint/no-unused-vars */
