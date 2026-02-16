/**
 * HMAC Command Signing Utility for Supabase Edge Functions
 *
 * Provides HMAC-SHA256 signature generation and verification for agent commands.
 * Uses Web Crypto API (available in Deno/edge functions).
 *
 * Signature format: "t=<unix_timestamp>,v1=<hex_hmac>"
 * Verification includes a 5-minute replay window check.
 *
 * Usage:
 *   import { verifySignature, computeSignature } from '../_shared/command-signing.ts'
 *
 *   // Verify an incoming signed request
 *   const result = await verifySignature(signatureHeader, body, encryptedSecret)
 *   if (!result.valid) return errorResponse(result.error)
 *
 *   // Compute a signature for outgoing requests
 *   const sig = await computeSignature(body, secret, timestamp)
 */

import { decrypt, EncryptedPayload } from './encryption.ts'

const REPLAY_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

export interface ParsedSignature {
  timestamp: number
  signatures: string[]
}

export interface VerificationResult {
  valid: boolean
  error?: string
}

/**
 * Parse a signature header in the format "t=<timestamp>,v1=<hex>"
 * Supports multiple v1 signatures (for key rotation)
 */
export function parseSignatureHeader(header: string): ParsedSignature | null {
  if (!header || typeof header !== 'string') return null

  const parts = header.split(',')
  let timestamp = 0
  const signatures: string[] = []

  for (const part of parts) {
    const [key, value] = part.split('=', 2)
    if (!key || !value) continue

    const trimmedKey = key.trim()
    const trimmedValue = value.trim()

    if (trimmedKey === 't') {
      timestamp = parseInt(trimmedValue, 10)
      if (isNaN(timestamp)) return null
    } else if (trimmedKey === 'v1') {
      signatures.push(trimmedValue)
    }
  }

  if (timestamp === 0 || signatures.length === 0) return null

  return { timestamp, signatures }
}

/**
 * Compute HMAC-SHA256 signature using Web Crypto API
 *
 * The signed payload is: "<timestamp>.<body>"
 * This binds the timestamp to the body to prevent replay with different payloads.
 */
export async function computeSignature(
  body: string,
  secret: string,
  timestamp: number
): Promise<string> {
  const encoder = new TextEncoder()
  const signedPayload = `${timestamp}.${body}`

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  )

  // Convert to hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Constant-time comparison to prevent timing attacks.
 * Compares two hex strings character by character.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/**
 * Full signature verification pipeline:
 * 1. Parse the signature header
 * 2. Check the replay window (5 minutes)
 * 3. Decrypt the stored signing secret
 * 4. Compute expected HMAC
 * 5. Constant-time compare against provided signature(s)
 */
export async function verifySignature(
  signatureHeader: string,
  body: string,
  encryptedSecret: EncryptedPayload
): Promise<VerificationResult> {
  // 1. Parse header
  const parsed = parseSignatureHeader(signatureHeader)
  if (!parsed) {
    return { valid: false, error: 'Invalid signature header format' }
  }

  // 2. Check replay window
  const now = Math.floor(Date.now() / 1000)
  const age = Math.abs(now - parsed.timestamp)
  if (age > REPLAY_WINDOW_MS / 1000) {
    return { valid: false, error: 'Signature timestamp outside replay window' }
  }

  // 3. Decrypt the stored secret
  let secret: string
  try {
    const decrypted = await decrypt(encryptedSecret)
    secret = decrypted.secret as string
    if (!secret) {
      return { valid: false, error: 'Decrypted secret is empty' }
    }
  } catch {
    return { valid: false, error: 'Failed to decrypt signing secret' }
  }

  // 4. Compute expected signature
  const expected = await computeSignature(body, secret, parsed.timestamp)

  // 5. Compare against all provided v1 signatures
  for (const sig of parsed.signatures) {
    if (timingSafeEqual(expected, sig)) {
      return { valid: true }
    }
  }

  return { valid: false, error: 'Signature mismatch' }
}
