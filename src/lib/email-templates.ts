/**
 * Email Template System for White-Label Support
 * Issue: #317
 *
 * Provides tenant-aware email templates with customizable branding.
 *
 * @example Basic usage with default branding
 * ```ts
 * import { sendWelcomeEmail } from './email-service';
 * await sendWelcomeEmail('user@example.com', 'John');
 * ```
 *
 * @example With tenant branding
 * ```ts
 * import { sendWelcomeEmail, getTenantBranding } from './email-service';
 * import { useTenantSettings } from '@/hooks/useTenantSettings';
 *
 * const { settings } = useTenantSettings();
 * const branding = getTenantBranding(settings);
 * await sendWelcomeEmail('user@example.com', 'John', branding);
 * ```
 *
 * @example Using template system directly
 * ```ts
 * import { emailService } from './email-service';
 * await emailService.sendFromTemplate(
 *   'welcome',
 *   'user@example.com',
 *   { name: 'John' },
 *   branding
 * );
 * ```
 */

import type { TenantSettings } from "./tenant-settings";

export interface EmailBranding {
  brandName: string;
  logoUrl?: string;
  primaryColor: string;
  accentColor?: string;
  footerText?: string;
  fromEmail?: string;
  fromName?: string;
}

const DEFAULT_BRANDING: EmailBranding = {
  brandName: "Business OS",
  primaryColor: "#6366f1",
  footerText: "Powered by Business OS",
};

/**
 * Convert tenant settings to email branding configuration
 */
export function getTenantBranding(
  tenantSettings?: TenantSettings | null,
): EmailBranding {
  if (!tenantSettings) return DEFAULT_BRANDING;

  return {
    brandName: tenantSettings.branding.name || DEFAULT_BRANDING.brandName,
    logoUrl: tenantSettings.branding.logo_url || undefined,
    primaryColor:
      tenantSettings.branding.primary_color || DEFAULT_BRANDING.primaryColor,
    accentColor: tenantSettings.branding.accent_color || undefined,
    footerText: DEFAULT_BRANDING.footerText,
    fromEmail: tenantSettings.email.from_address || undefined,
    fromName: tenantSettings.email.from_name || undefined,
  };
}

/**
 * Base email layout with tenant branding
 * Responsive HTML email template with modern styling
 */
export function renderEmailLayout(
  branding: EmailBranding,
  body: string,
): string {
  const logo = branding.logoUrl
    ? `<img src="${branding.logoUrl}" alt="${branding.brandName}" style="max-height:40px;margin-bottom:16px;" />`
    : `<h2 style="color:${branding.primaryColor};margin:0 0 16px;">${branding.brandName}</h2>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="padding:32px 32px 0;">
          ${logo}
        </td></tr>
        <tr><td style="padding:16px 32px 32px;color:#18181b;font-size:15px;line-height:1.6;">
          ${body}
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #e4e4e7;color:#71717a;font-size:12px;text-align:center;">
          ${branding.footerText || ""}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Welcome email template
 * Sent when a user first signs up or subscribes
 */
export function renderWelcomeEmail(
  branding: EmailBranding,
  name?: string,
): { subject: string; html: string; text: string } {
  const displayName = name || "there";
  return {
    subject: `Welcome to ${branding.brandName}!`,
    html: renderEmailLayout(
      branding,
      `
      <h1 style="margin:0 0 8px;font-size:22px;color:#18181b;">Welcome, ${displayName}!</h1>
      <p>Thanks for joining <strong>${branding.brandName}</strong>.</p>
      <p>You're all set to get started. If you have any questions, just reply to this email.</p>
      <p style="margin-top:24px;">Best regards,<br><strong>${branding.fromName || branding.brandName} Team</strong></p>
    `,
    ),
    text: `Welcome, ${displayName}!\n\nThanks for joining ${branding.brandName}.\nYou're all set to get started.\n\nBest regards,\n${branding.fromName || branding.brandName} Team`,
  };
}

/**
 * Generic notification email template
 * Used for various transactional notifications
 */
export function renderNotificationEmail(
  branding: EmailBranding,
  title: string,
  message: string,
  actionUrl?: string,
  actionLabel?: string,
): { subject: string; html: string; text: string } {
  const button = actionUrl
    ? `<p style="margin-top:24px;"><a href="${actionUrl}" style="display:inline-block;padding:10px 24px;background:${branding.primaryColor};color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${actionLabel || "View Details"}</a></p>`
    : "";
  return {
    subject: `${branding.brandName}: ${title}`,
    html: renderEmailLayout(
      branding,
      `
      <h1 style="margin:0 0 8px;font-size:20px;color:#18181b;">${title}</h1>
      <p>${message}</p>
      ${button}
    `,
    ),
    text: `${title}\n\n${message}${actionUrl ? `\n\n${actionLabel || "View Details"}: ${actionUrl}` : ""}`,
  };
}

/**
 * Unsubscribe confirmation email template
 * Sent when a user unsubscribes from communications
 */
export function renderUnsubscribeEmail(
  branding: EmailBranding,
  resubscribeUrl?: string,
): { subject: string; html: string; text: string } {
  return {
    subject: "Unsubscribe Confirmation",
    html: renderEmailLayout(
      branding,
      `
      <h1 style="margin:0 0 8px;font-size:20px;color:#18181b;">You've been unsubscribed</h1>
      <p>We're sorry to see you go. You've been removed from the mailing list.</p>
      ${resubscribeUrl ? `<p>If this was a mistake, <a href="${resubscribeUrl}" style="color:${branding.primaryColor};">re-subscribe here</a>.</p>` : ""}
    `,
    ),
    text: `You've been unsubscribed\n\nWe're sorry to see you go.${resubscribeUrl ? `\n\nRe-subscribe: ${resubscribeUrl}` : ""}`,
  };
}

/**
 * Test email template
 * Used to verify email configuration
 */
export function renderTestEmail(
  branding: EmailBranding,
  provider: string,
): { subject: string; html: string; text: string } {
  return {
    subject: `Test Email from ${branding.brandName}`,
    html: renderEmailLayout(
      branding,
      `
      <h1 style="margin:0 0 8px;font-size:20px;color:#18181b;">Test Email</h1>
      <p>This is a test email from the marketing system.</p>
      <p>If you received this, your email configuration is working correctly!</p>
      <p style="margin-top:16px;padding:12px;background:#f4f4f5;border-radius:8px;font-family:monospace;font-size:13px;">
        <strong>Provider:</strong> ${provider}
      </p>
    `,
    ),
    text: `Test Email\n\nThis is a test email from the marketing system.\nIf you received this, your email configuration is working correctly!\n\nProvider: ${provider}`,
  };
}
