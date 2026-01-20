/**
 * NPS Adapters
 *
 * Barrel export for NPS adapter interfaces and implementations.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/111
 */

export type {
  INPSEmailAdapter,
  NPSEmailRecipient,
  NPSEmailTemplate,
  NPSEmailOptions,
} from './email-adapter';

export { SendGridNPSAdapter, ResendNPSAdapter } from './email-adapter';

export type {
  INPSSMSAdapter,
  NPSSMSRecipient,
  NPSSMSMessage,
  NPSSMSOptions,
} from './sms-adapter';

export { TwilioNPSAdapter } from './sms-adapter';

export type {
  INPSCRMSyncAdapter,
  CRMContactUpdate,
  CRMSyncResult,
} from './crm-sync-adapter';

export { CRMNPSSyncAdapter } from './crm-sync-adapter';
