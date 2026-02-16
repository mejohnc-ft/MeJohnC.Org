/**
 * Encryption Utility for Supabase Edge Functions
 *
 * Provides AES-256-GCM encryption/decryption for credential storage.
 * Uses Web Crypto API (available in Deno/edge functions).
 *
 * Key rotation support (Issue #182):
 * - key-v1: Derives from SUPABASE_SERVICE_ROLE_KEY (legacy, read-only)
 * - key-v2: Derives from ENCRYPTION_MASTER_KEY (current, used for new encryptions)
 * - decrypt() reads key_id from payload to select the correct key source
 * - reEncrypt() migrates data from any old key to the current key
 *
 * Usage:
 *   import { encrypt, decrypt, reEncrypt, CURRENT_KEY_ID } from '../_shared/encryption.ts'
 *
 *   const encrypted = await encrypt({ token: 'secret' })
 *   const decrypted = await decrypt(encrypted)
 *   const migrated = await reEncrypt(oldPayload) // re-encrypts with current key
 */

/** Current encryption key version used for new encryptions */
export const CURRENT_KEY_ID = 'key-v2'

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
 * Get the master secret for a given key ID.
 * key-v1: Uses SUPABASE_SERVICE_ROLE_KEY (legacy)
 * key-v2+: Uses ENCRYPTION_MASTER_KEY (dedicated encryption secret)
 */
function getMasterSecret(keyId: string): string {
  if (keyId === 'key-v1') {
    const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!secret) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for key-v1 decryption')
    }
    return secret
  }

  // key-v2 and all future versions use the dedicated master key
  const secret = Deno.env.get('ENCRYPTION_MASTER_KEY')
  if (!secret) {
    throw new Error('ENCRYPTION_MASTER_KEY env var is required for encryption. Generate with: openssl rand -base64 32')
  }
  return secret
}

/**
 * Derive an AES-256 key from a master secret + salt using PBKDF2
 */
async function deriveKey(salt: Uint8Array, keyId: string = CURRENT_KEY_ID): Promise<CryptoKey> {
  const secret = getMasterSecret(keyId)

  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
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
 * @param keyId - Key identifier for rotation tracking (defaults to CURRENT_KEY_ID)
 * @returns Encrypted payload with base64-encoded components
 */
export async function encrypt(
  data: Record<string, unknown>,
  keyId: string = CURRENT_KEY_ID
): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await deriveKey(salt, keyId)

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
 * Decrypt an encrypted payload back to the original JSON object.
 * Reads key_id from the payload to select the correct decryption key.
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
  const key = await deriveKey(salt, payload.key_id)

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )

  const decoder = new TextDecoder()
  return JSON.parse(decoder.decode(plaintext))
}

/**
 * Re-encrypt a payload with the current key version.
 * Use this to migrate credentials from old key versions to the current one.
 *
 * @param payload - The old encrypted payload
 * @returns New encrypted payload using CURRENT_KEY_ID
 */
export async function reEncrypt(
  payload: EncryptedPayload
): Promise<EncryptedPayload> {
  if (payload.key_id === CURRENT_KEY_ID) {
    return payload // Already using current key
  }

  const decrypted = await decrypt(payload)
  return encrypt(decrypted, CURRENT_KEY_ID)
}
