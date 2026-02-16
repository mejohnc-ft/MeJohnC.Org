/**
 * Encryption Utility for Supabase Edge Functions
 *
 * Provides AES-256-GCM encryption/decryption for credential storage.
 * Uses Web Crypto API (available in Deno/edge functions).
 *
 * Key derivation: PBKDF2 from SUPABASE_SERVICE_ROLE_KEY + random salt.
 * Each encryption generates a unique key via PBKDF2 with a random salt,
 * ensuring different ciphertext even for identical plaintext.
 *
 * Usage:
 *   import { encrypt, decrypt } from '../_shared/encryption.ts'
 *
 *   const encrypted = await encrypt({ token: 'secret' }, 'key-v1')
 *   const decrypted = await decrypt(encrypted)
 */

export interface EncryptedPayload {
  /** Base64-encoded ciphertext */
  ciphertext: string
  /** Base64-encoded 12-byte IV */
  iv: string
  /** Key identifier for rotation support */
  key_id: string
  /** Base64-encoded PBKDF2 salt */
  salt: string
  /** Algorithm identifier */
  alg: 'AES-256-GCM'
}

const PBKDF2_ITERATIONS = 100000
const KEY_LENGTH = 256 // bits
const IV_LENGTH = 12 // bytes
const SALT_LENGTH = 16 // bytes

/**
 * Derive an AES-256 key from the service role key + salt using PBKDF2
 */
async function deriveKey(salt: Uint8Array): Promise<CryptoKey> {
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for encryption')
  }

  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(serviceRoleKey),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Convert Uint8Array to base64 string
 */
function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

/**
 * Convert base64 string to Uint8Array
 */
function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Encrypt a JSON object using AES-256-GCM
 *
 * @param data - The data to encrypt (will be JSON-serialized)
 * @param keyId - Key identifier for rotation tracking
 * @returns Encrypted payload with base64-encoded components
 */
export async function encrypt(
  data: Record<string, unknown>,
  keyId: string
): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await deriveKey(salt)

  const encoder = new TextEncoder()
  const plaintext = encoder.encode(JSON.stringify(data))

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  )

  return {
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    iv: toBase64(iv),
    key_id: keyId,
    salt: toBase64(salt),
    alg: 'AES-256-GCM',
  }
}

/**
 * Decrypt an encrypted payload back to the original JSON object
 *
 * @param payload - The encrypted payload from encrypt()
 * @returns The original JSON object
 */
export async function decrypt(
  payload: EncryptedPayload
): Promise<Record<string, unknown>> {
  const salt = fromBase64(payload.salt)
  const iv = fromBase64(payload.iv)
  const ciphertext = fromBase64(payload.ciphertext)
  const key = await deriveKey(salt)

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )

  const decoder = new TextDecoder()
  return JSON.parse(decoder.decode(plaintext))
}
