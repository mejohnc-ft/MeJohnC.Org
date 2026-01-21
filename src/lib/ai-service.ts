/**
 * Shared AI Service
 *
 * Centralized service for AI integrations using Anthropic Claude API.
 * Provides methods for content generation, sentiment analysis, and predictions.
 */

import { captureException } from '@/lib/sentry';

// ============================================
// TYPES
// ============================================

export interface AIRequestOptions {
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse<T = string> {
  success: boolean;
  data?: T;
  error?: string;
  tokensUsed?: number;
  durationMs?: number;
}

export interface ContentSuggestion {
  content: string;
  tone: string;
}

export interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  score: number; // -1 to 1
  confidence: number; // 0 to 1
  themes: string[];
  summary: string;
}

export interface DetractorPrediction {
  riskScore: number; // 0 to 100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  recommendation: string;
}

export interface FollowUpSuggestion {
  action: string;
  priority: 'low' | 'medium' | 'high';
  template?: string;
}

// ============================================
// CONFIGURATION
// ============================================

const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';
const DEFAULT_MAX_TOKENS = 1024;

function getApiKey(): string | null {
  return import.meta.env.VITE_ANTHROPIC_API_KEY || null;
}

// ============================================
// CORE API FUNCTION
// ============================================

/**
 * Make a request to the Anthropic Claude API
 */
async function callClaudeAPI(
  userMessage: string,
  options: AIRequestOptions = {}
): Promise<AIResponse<string>> {
  const startTime = Date.now();
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      success: false,
      error: 'Anthropic API key not configured. Set VITE_ANTHROPIC_API_KEY.',
      durationMs: Date.now() - startTime,
    };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: options.maxTokens || DEFAULT_MAX_TOKENS,
        temperature: options.temperature ?? 0.7,
        system: options.systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.content[0]?.text || '';

    return {
      success: true,
      data: content,
      tokensUsed: data.usage?.output_tokens || 0,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    captureException(error instanceof Error ? error : new Error(String(error)), {
      context: 'aiService.callClaudeAPI',
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Parse JSON from AI response, handling markdown code blocks
 */
function parseJSONResponse<T>(text: string): T | null {
  try {
    // Try to extract JSON from markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    // Try parsing the whole text as JSON
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ============================================
// CONTENT GENERATION
// ============================================

const CONTENT_SYSTEM_PROMPT = `You are a marketing content assistant. Generate professional, engaging content based on the user's request.

For each request, provide 4 different variations with different tones:
1. Professional - Formal and business-appropriate
2. Engaging - Conversational and friendly
3. Creative - Unique and memorable
4. Direct - Clear and to-the-point

Return your response as a JSON array with objects containing "content" and "tone" fields.
Example: [{"content": "...", "tone": "Professional"}, ...]

Only output valid JSON, no additional text.`;

/**
 * Generate marketing content suggestions
 */
export async function generateContentSuggestions(
  prompt: string,
  contentType: string,
  context?: Record<string, unknown>
): Promise<AIResponse<ContentSuggestion[]>> {
  const contextInfo = context ? `\nContext: ${JSON.stringify(context)}` : '';

  const result = await callClaudeAPI(
    `Generate ${contentType} content for: ${prompt}${contextInfo}`,
    { systemPrompt: CONTENT_SYSTEM_PROMPT }
  );

  if (!result.success || !result.data) {
    // Return mock suggestions as fallback
    return {
      success: true,
      data: [
        { content: `${prompt} - Professional Version`, tone: 'Professional' },
        { content: `${prompt} - Engaging Version`, tone: 'Engaging' },
        { content: `${prompt} - Creative Version`, tone: 'Creative' },
        { content: `${prompt} - Direct Version`, tone: 'Direct' },
      ],
      error: result.error,
      durationMs: result.durationMs,
    };
  }

  const suggestions = parseJSONResponse<ContentSuggestion[]>(result.data);

  if (!suggestions) {
    return {
      success: true,
      data: [
        { content: `${prompt} - Professional Version`, tone: 'Professional' },
        { content: `${prompt} - Engaging Version`, tone: 'Engaging' },
        { content: `${prompt} - Creative Version`, tone: 'Creative' },
        { content: `${prompt} - Direct Version`, tone: 'Direct' },
      ],
      error: 'Failed to parse AI response',
      durationMs: result.durationMs,
    };
  }

  return {
    success: true,
    data: suggestions,
    tokensUsed: result.tokensUsed,
    durationMs: result.durationMs,
  };
}

// ============================================
// SENTIMENT ANALYSIS
// ============================================

const SENTIMENT_SYSTEM_PROMPT = `You are a sentiment analysis expert. Analyze the provided customer feedback and return a detailed sentiment analysis.

Return your response as JSON with these fields:
- sentiment: "positive" | "negative" | "neutral" | "mixed"
- score: number from -1 (very negative) to 1 (very positive)
- confidence: number from 0 to 1 indicating analysis confidence
- themes: array of 1-5 key themes mentioned in the feedback
- summary: brief 1-2 sentence summary of the feedback

Only output valid JSON, no additional text.`;

/**
 * Analyze sentiment of customer feedback
 */
export async function analyzeSentiment(
  feedback: string
): Promise<AIResponse<SentimentAnalysis>> {
  const result = await callClaudeAPI(
    `Analyze the sentiment of this customer feedback:\n\n"${feedback}"`,
    { systemPrompt: SENTIMENT_SYSTEM_PROMPT, temperature: 0.3 }
  );

  if (!result.success || !result.data) {
    // Return neutral fallback
    return {
      success: false,
      data: {
        sentiment: 'neutral',
        score: 0,
        confidence: 0,
        themes: [],
        summary: 'Unable to analyze sentiment',
      },
      error: result.error,
      durationMs: result.durationMs,
    };
  }

  const analysis = parseJSONResponse<SentimentAnalysis>(result.data);

  if (!analysis) {
    return {
      success: false,
      data: {
        sentiment: 'neutral',
        score: 0,
        confidence: 0,
        themes: [],
        summary: 'Failed to parse sentiment analysis',
      },
      error: 'Failed to parse AI response',
      durationMs: result.durationMs,
    };
  }

  return {
    success: true,
    data: analysis,
    tokensUsed: result.tokensUsed,
    durationMs: result.durationMs,
  };
}

// ============================================
// DETRACTOR PREDICTION
// ============================================

const DETRACTOR_SYSTEM_PROMPT = `You are a customer success analyst. Analyze customer data to predict the likelihood of becoming a detractor (unhappy customer).

Consider factors like:
- Recent scores and score trends
- Feedback sentiment and themes
- Engagement patterns
- Response history

Return your response as JSON with these fields:
- riskScore: number from 0-100 (100 = highest risk)
- riskLevel: "low" | "medium" | "high" | "critical"
- factors: array of 1-5 risk factors identified
- recommendation: brief action recommendation

Only output valid JSON, no additional text.`;

/**
 * Predict detractor risk for a customer
 */
export async function predictDetractorRisk(
  customerData: {
    recentScores?: number[];
    averageScore?: number;
    feedback?: string[];
    engagementLevel?: string;
  }
): Promise<AIResponse<DetractorPrediction>> {
  const result = await callClaudeAPI(
    `Analyze this customer data to predict detractor risk:\n\n${JSON.stringify(customerData, null, 2)}`,
    { systemPrompt: DETRACTOR_SYSTEM_PROMPT, temperature: 0.3 }
  );

  if (!result.success || !result.data) {
    // Return default low risk
    return {
      success: false,
      data: {
        riskScore: 25,
        riskLevel: 'low',
        factors: ['Insufficient data for analysis'],
        recommendation: 'Continue monitoring customer engagement',
      },
      error: result.error,
      durationMs: result.durationMs,
    };
  }

  const prediction = parseJSONResponse<DetractorPrediction>(result.data);

  if (!prediction) {
    return {
      success: false,
      data: {
        riskScore: 25,
        riskLevel: 'low',
        factors: ['Analysis parsing failed'],
        recommendation: 'Manually review customer history',
      },
      error: 'Failed to parse AI response',
      durationMs: result.durationMs,
    };
  }

  return {
    success: true,
    data: prediction,
    tokensUsed: result.tokensUsed,
    durationMs: result.durationMs,
  };
}

// ============================================
// FOLLOW-UP SUGGESTIONS
// ============================================

const FOLLOWUP_SYSTEM_PROMPT = `You are a customer success strategist. Based on NPS response data, suggest appropriate follow-up actions.

Consider the score category (promoter: 9-10, passive: 7-8, detractor: 0-6) and feedback content to generate relevant suggestions.

Return your response as a JSON array with 2-4 suggestions, each containing:
- action: brief description of the follow-up action
- priority: "low" | "medium" | "high"
- template: optional email/message template text

Only output valid JSON, no additional text.`;

/**
 * Generate follow-up action suggestions for an NPS response
 */
export async function generateFollowUpSuggestions(
  responseData: {
    score: number;
    category: 'promoter' | 'passive' | 'detractor';
    feedback?: string;
    customerName?: string;
  }
): Promise<AIResponse<FollowUpSuggestion[]>> {
  const result = await callClaudeAPI(
    `Generate follow-up suggestions for this NPS response:\n\n${JSON.stringify(responseData, null, 2)}`,
    { systemPrompt: FOLLOWUP_SYSTEM_PROMPT }
  );

  if (!result.success || !result.data) {
    // Return default suggestions based on category
    const defaultSuggestions: FollowUpSuggestion[] = responseData.category === 'detractor'
      ? [
          { action: 'Schedule a call to discuss concerns', priority: 'high' },
          { action: 'Send personalized apology email', priority: 'high' },
          { action: 'Create support ticket for follow-up', priority: 'medium' },
        ]
      : responseData.category === 'passive'
      ? [
          { action: 'Send improvement feedback request', priority: 'medium' },
          { action: 'Offer product demo or training', priority: 'medium' },
        ]
      : [
          { action: 'Request testimonial or review', priority: 'low' },
          { action: 'Invite to referral program', priority: 'low' },
        ];

    return {
      success: true,
      data: defaultSuggestions,
      error: result.error,
      durationMs: result.durationMs,
    };
  }

  const suggestions = parseJSONResponse<FollowUpSuggestion[]>(result.data);

  if (!suggestions) {
    return {
      success: false,
      error: 'Failed to parse AI response',
      durationMs: result.durationMs,
    };
  }

  return {
    success: true,
    data: suggestions,
    tokensUsed: result.tokensUsed,
    durationMs: result.durationMs,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if AI service is configured
 */
export function isAIConfigured(): boolean {
  return !!getApiKey();
}

/**
 * Export service object for convenience
 */
export const aiService = {
  isConfigured: isAIConfigured,
  generateContentSuggestions,
  analyzeSentiment,
  predictDetractorRisk,
  generateFollowUpSuggestions,
};

export default aiService;
