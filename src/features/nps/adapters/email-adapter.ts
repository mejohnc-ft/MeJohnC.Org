/**
 * NPS Email Adapter Interface
 *
 * Defines the contract for sending NPS surveys via email.
 * Implementations can use SendGrid, Resend, or other email providers.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/111
 */

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

/**
 * Email adapter for sending NPS surveys
 */
export interface INPSEmailAdapter {
  /**
   * Send NPS survey to a single recipient
   */
  sendSurvey(
    recipient: NPSEmailRecipient,
    template: NPSEmailTemplate,
    options?: NPSEmailOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;

  /**
   * Send NPS surveys to multiple recipients (batch)
   */
  sendSurveyBatch(
    recipients: NPSEmailRecipient[],
    template: NPSEmailTemplate,
    options?: NPSEmailOptions
  ): Promise<{ sent: number; failed: number; errors?: string[] }>;

  /**
   * Send follow-up email to a detractor
   */
  sendDetractorFollowup(
    recipient: NPSEmailRecipient,
    responseId: string,
    message: string,
    options?: NPSEmailOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;

  /**
   * Verify email configuration and credentials
   */
  verifyConfiguration(): Promise<{ valid: boolean; error?: string }>;
}

/**
 * Example implementation stub for SendGrid
 */
export class SendGridNPSAdapter implements INPSEmailAdapter {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendSurvey(
    recipient: NPSEmailRecipient,
    template: NPSEmailTemplate,
    options?: NPSEmailOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // TODO: Implement SendGrid API call
    throw new Error('SendGrid integration not yet implemented');
  }

  async sendSurveyBatch(
    recipients: NPSEmailRecipient[],
    template: NPSEmailTemplate,
    options?: NPSEmailOptions
  ): Promise<{ sent: number; failed: number; errors?: string[] }> {
    // TODO: Implement SendGrid batch API call
    throw new Error('SendGrid batch integration not yet implemented');
  }

  async sendDetractorFollowup(
    recipient: NPSEmailRecipient,
    responseId: string,
    message: string,
    options?: NPSEmailOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // TODO: Implement SendGrid API call for follow-up
    throw new Error('SendGrid follow-up integration not yet implemented');
  }

  async verifyConfiguration(): Promise<{ valid: boolean; error?: string }> {
    // TODO: Verify SendGrid API key
    return { valid: false, error: 'Not implemented' };
  }
}

/**
 * Example implementation stub for Resend
 */
export class ResendNPSAdapter implements INPSEmailAdapter {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendSurvey(
    recipient: NPSEmailRecipient,
    template: NPSEmailTemplate,
    options?: NPSEmailOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // TODO: Implement Resend API call
    throw new Error('Resend integration not yet implemented');
  }

  async sendSurveyBatch(
    recipients: NPSEmailRecipient[],
    template: NPSEmailTemplate,
    options?: NPSEmailOptions
  ): Promise<{ sent: number; failed: number; errors?: string[] }> {
    // TODO: Implement Resend batch API call
    throw new Error('Resend batch integration not yet implemented');
  }

  async sendDetractorFollowup(
    recipient: NPSEmailRecipient,
    responseId: string,
    message: string,
    options?: NPSEmailOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // TODO: Implement Resend API call for follow-up
    throw new Error('Resend follow-up integration not yet implemented');
  }

  async verifyConfiguration(): Promise<{ valid: boolean; error?: string }> {
    // TODO: Verify Resend API key
    return { valid: false, error: 'Not implemented' };
  }
}
