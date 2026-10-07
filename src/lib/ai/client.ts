// ============================================================
// AI CLIENT — server-side providers with bounded retries
// Keys stay server-side. Rate limits enforced per-user.
// ============================================================
import 'server-only';
import OpenAI from "openai";
import { reserveUsage } from "@/lib/payments/entitlements";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

let _client: OpenAI | null = null;

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!_client) {
    _client = new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
      defaultHeaders: {
        "HTTP-Referer": "https://opportunityos.local",
        "X-Title": "Elara",
      },
      timeout: 60_000,
      maxRetries: 0,
    });
  }
  return _client;
}

export function isAIConfigured(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
}

export function getModelName(): string {
  return process.env.ANTHROPIC_API_KEY
    ? process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001"
    : process.env.OPENAI_MODEL || "gpt-4o-mini";
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionOptions {
  userId: string;
  usageType?: "analysis" | "draft";
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: "json_object" };
  timeoutMs?: number;
}

export async function chatCompletion(options: ChatCompletionOptions): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const client = anthropicKey ? null : getClient();
  if (!isAIConfigured()) {
    throw new AIError("AI model is not configured on the server.", "not_configured");
  }

  await reserveUsage(options.userId, options.usageType || "analysis");
  const deadline = Date.now() + (options.timeoutMs ?? 20000);
  let useResponseFormat = options.responseFormat;
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (Date.now() >= deadline) break;
    try {
      let content: string | null | undefined;
      if (anthropicKey) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: getModelName(), max_tokens: options.maxTokens ?? 4096,
            system: options.messages.filter(m => m.role === 'system').map(m => m.content).join('\n'),
            messages: options.messages.filter(m => m.role !== 'system'),
          }),
          signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
          cache: 'no-store', redirect: 'error',
        });
        if (!response.ok) throw Object.assign(new Error('Anthropic request rejected'), { status: response.status });
        const data = await response.json();
        if (data.stop_reason === 'max_tokens') throw new AIError('Model output was incomplete.', 'incomplete_response');
        content = data.content?.filter((part: { type: string }) => part.type === 'text').map((part: { text: string }) => part.text).join('');
      } else {
      const response = await client!.chat.completions.create({
        model: getModelName(),
        messages: options.messages,
        temperature: options.temperature ?? 0.1,
        max_tokens: options.maxTokens ?? 4096,
        ...(useResponseFormat ? { response_format: useResponseFormat } : {}),
      }, { timeout: Math.max(1, deadline - Date.now()) });
      content = response.choices[0]?.message?.content;
      }
      if (!content) throw new AIError("Empty model response", "empty_response");

      // Strip markdown code fences or extract outermost JSON if JSON was requested
      if (options.responseFormat) {
        content = content.trim();
        if (content.startsWith("```json")) {
          content = content.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (content.startsWith("```")) {
          content = content.replace(/^```\s*/, "").replace(/\s*```$/, "");
        } else {
          // If the model enclosed JSON in narrative text, extract the outermost JSON structure
          const firstBrace = content.indexOf("{");
          const lastBrace = content.lastIndexOf("}");
          if (firstBrace !== -1 && lastBrace > firstBrace) {
            content = content.slice(firstBrace, lastBrace + 1);
          }
        }
      }

      return content;
    } catch (err) {
      if (err instanceof AIError) throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = (lastError.message || "").toLowerCase();
      const status = err instanceof OpenAI.APIError ? err.status : (err as { status?: number })?.status;

      if (err instanceof OpenAI.RateLimitError || status === 429) {
        throw new AIError("Rate limit exceeded. Please try again later.", "rate_limit");
      }
      if (status === 401 || status === 403) {
        throw new AIError("AI provider authentication failed. Check the server configuration.", "auth_error");
      }

      // If the provider doesn't support response_format / structured-outputs (e.g. OpenRouter free models returning 400 Provider returned error),
      // disable response_format and retry immediately on the next iteration without delay.
      if (
        !anthropicKey && useResponseFormat &&
        (status === 400 ||
          msg.includes("provider returned error") ||
          msg.includes("response_format") ||
          msg.includes("structured-outputs") ||
          msg.includes("json_object") ||
          msg.includes("unsupported") ||
          msg.includes("schema") ||
          msg.includes("bad request"))
      ) {
        useResponseFormat = undefined;
        continue;
      }

      // 4xx client errors (e.g. 400 Bad Request, 404 Model Not Found, 422) will not succeed on retry.
      // Throw immediately to allow deterministic fallbacks to respond instantly without waiting seconds.
      if (status && status >= 400 && status < 500) {
        throw new AIError(`Model request rejected (${status}).`, "client_error");
      }

      if (attempt < MAX_RETRIES - 1 && Date.now() + RETRY_DELAY_MS * (attempt + 1) < deadline) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }
  throw new AIError(
    `Model request failed after ${MAX_RETRIES} attempts.`,
    "provider_error"
  );
}

export class AIError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "AIError";
    this.code = code;
  }
}
