/**
 * Input Validation and Size Limits for Supabase Edge Functions
 *
 * Provides protection against:
 * - Oversized payloads (DoS prevention)
 * - Deeply nested objects
 * - Excessive array lengths
 * - Invalid content types
 */

// Configuration
export interface ValidationConfig {
  /** Maximum request body size in bytes (default: 1MB) */
  maxBodySize?: number;
  /** Maximum JSON depth (default: 10) */
  maxDepth?: number;
  /** Maximum array length (default: 1000) */
  maxArrayLength?: number;
  /** Maximum string length (default: 100KB) */
  maxStringLength?: number;
  /** Maximum number of keys in an object (default: 100) */
  maxObjectKeys?: number;
  /** Allowed content types (default: application/json) */
  allowedContentTypes?: string[];
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  data?: unknown;
}

const DEFAULT_CONFIG: Required<ValidationConfig> = {
  maxBodySize: 1024 * 1024, // 1MB
  maxDepth: 10,
  maxArrayLength: 1000,
  maxStringLength: 100 * 1024, // 100KB
  maxObjectKeys: 100,
  allowedContentTypes: ['application/json'],
};

/**
 * Check object depth recursively
 */
function checkDepth(obj: unknown, currentDepth: number, maxDepth: number): boolean {
  if (currentDepth > maxDepth) return false;

  if (Array.isArray(obj)) {
    return obj.every((item) => checkDepth(item, currentDepth + 1, maxDepth));
  }

  if (obj !== null && typeof obj === 'object') {
    return Object.values(obj).every((value) => checkDepth(value, currentDepth + 1, maxDepth));
  }

  return true;
}

/**
 * Validate object structure recursively
 */
function validateStructure(
  obj: unknown,
  config: Required<ValidationConfig>,
  path: string = ''
): string | null {
  // Check arrays
  if (Array.isArray(obj)) {
    if (obj.length > config.maxArrayLength) {
      return `Array at '${path || 'root'}' exceeds maximum length of ${config.maxArrayLength}`;
    }
    for (let i = 0; i < obj.length; i++) {
      const error = validateStructure(obj[i], config, `${path}[${i}]`);
      if (error) return error;
    }
    return null;
  }

  // Check objects
  if (obj !== null && typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length > config.maxObjectKeys) {
      return `Object at '${path || 'root'}' exceeds maximum of ${config.maxObjectKeys} keys`;
    }
    for (const key of keys) {
      const error = validateStructure(
        (obj as Record<string, unknown>)[key],
        config,
        path ? `${path}.${key}` : key
      );
      if (error) return error;
    }
    return null;
  }

  // Check strings
  if (typeof obj === 'string') {
    if (obj.length > config.maxStringLength) {
      return `String at '${path || 'root'}' exceeds maximum length of ${config.maxStringLength}`;
    }
  }

  return null;
}

/**
 * Validate request input
 */
export async function validateInput(
  req: Request,
  customConfig?: ValidationConfig
): Promise<ValidationResult> {
  const config = { ...DEFAULT_CONFIG, ...customConfig };

  // Check content type
  const contentType = req.headers.get('content-type')?.split(';')[0].trim();

  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    if (!contentType || !config.allowedContentTypes.includes(contentType)) {
      return {
        valid: false,
        error: `Invalid content type. Allowed: ${config.allowedContentTypes.join(', ')}`,
      };
    }
  }

  // Check content length header if present
  const contentLength = req.headers.get('content-length');
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (size > config.maxBodySize) {
      return {
        valid: false,
        error: `Request body too large. Maximum: ${config.maxBodySize} bytes`,
      };
    }
  }

  // For GET/HEAD/OPTIONS, no body validation needed
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return { valid: true };
  }

  // Read and validate body
  try {
    const text = await req.text();

    // Check actual body size
    if (text.length > config.maxBodySize) {
      return {
        valid: false,
        error: `Request body too large. Maximum: ${config.maxBodySize} bytes`,
      };
    }

    // Parse JSON
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        valid: false,
        error: 'Invalid JSON in request body',
      };
    }

    // Check depth
    if (!checkDepth(data, 0, config.maxDepth)) {
      return {
        valid: false,
        error: `JSON exceeds maximum depth of ${config.maxDepth}`,
      };
    }

    // Validate structure
    const structureError = validateStructure(data, config);
    if (structureError) {
      return {
        valid: false,
        error: structureError,
      };
    }

    return {
      valid: true,
      data,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to read request body: ${(error as Error).message}`,
    };
  }
}

/**
 * Middleware wrapper with input validation
 */
export function withInputValidation(
  handler: (req: Request, data: unknown) => Promise<Response>,
  config?: ValidationConfig
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const result = await validateInput(req, config);

    if (!result.valid) {
      return new Response(
        JSON.stringify({
          error: 'Validation Error',
          message: result.error,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return handler(req, result.data);
  };
}

/**
 * Validate specific fields with custom rules
 */
export interface FieldRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: unknown[];
  custom?: (value: unknown) => string | null;
}

export function validateFields(
  data: Record<string, unknown>,
  rules: Record<string, FieldRule>
): string | null {
  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];

    // Check required
    if (rule.required && (value === undefined || value === null || value === '')) {
      return `Field '${field}' is required`;
    }

    // Skip further validation if value is not present and not required
    if (value === undefined || value === null) continue;

    // Check type
    if (rule.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rule.type) {
        return `Field '${field}' must be of type ${rule.type}`;
      }
    }

    // String validations
    if (typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        return `Field '${field}' must be at least ${rule.minLength} characters`;
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        return `Field '${field}' must be at most ${rule.maxLength} characters`;
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        return `Field '${field}' has invalid format`;
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        return `Field '${field}' must be at least ${rule.min}`;
      }
      if (rule.max !== undefined && value > rule.max) {
        return `Field '${field}' must be at most ${rule.max}`;
      }
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      return `Field '${field}' must be one of: ${rule.enum.join(', ')}`;
    }

    // Custom validation
    if (rule.custom) {
      const error = rule.custom(value);
      if (error) return error;
    }
  }

  return null;
}
