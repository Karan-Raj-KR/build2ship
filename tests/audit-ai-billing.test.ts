import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ sql: vi.fn(), provider: vi.fn() }));
vi.mock('@/config/app', () => ({ IS_DEMO_MODE: false, APP_NAME: 'Elara' }));
vi.mock('@/lib/db/service', () => ({ createSql: () => mocks.sql }));
vi.mock('@/lib/api-auth', () => ({ requireAuth: async () => ({ userId: 'account-a' }) }));
vi.mock('@/lib/admin/store', () => ({ getSystemSettings: async () => ({ feature_flags: { enable_payments: false } }) }));
vi.mock('openai', () => ({ default: class {
  static APIError = class extends Error { status = 429; };
  static RateLimitError = class extends Error {};
  chat = { completions: { create: mocks.provider } };
} }));
import { chatCompletion } from '@/lib/ai/client';
import { UsageLimitError } from '@/lib/payments/entitlements';
import { GET } from '@/app/api/payments/entitlement/route';
import OpenAI from 'openai';

beforeEach(() => { vi.resetAllMocks(); vi.stubEnv('ANTHROPIC_API_KEY', ''); vi.stubEnv('OPENAI_API_KEY', 'test-only'); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const options = { userId: 'account-a', messages: [{ role: 'user' as const, content: 'Help' }] };
it('extracts fenced JSON with surrounding prose and rejects incomplete JSON', async () => {
  vi.stubEnv('ANTHROPIC_API_KEY', 'test-only-anthropic');
  mocks.sql.mockResolvedValue([{ id: 'reservation' }]);
  const provider = vi.fn()
    .mockResolvedValueOnce(Response.json({ content: [{ type: 'text', text: 'Here is your plan:\n```json\n{"why":"Source grounded"}\n```\nReview it before acting.' }], stop_reason: 'end_turn' }))
    .mockResolvedValueOnce(Response.json({ content: [{ type: 'text', text: '```json\n{"why":\n```' }], stop_reason: 'end_turn' }));
  vi.stubGlobal('fetch', provider);
  await expect(chatCompletion({ ...options, responseFormat: { type: 'json_object' } })).resolves.toBe('{"why":"Source grounded"}');
  await expect(chatCompletion({ ...options, responseFormat: { type: 'json_object' } })).rejects.toMatchObject({ code: 'invalid_response' });
  expect(provider).toHaveBeenCalledTimes(2);
});
it('uses Anthropic server-side after quota reservation and sanitizes provider errors', async () => {
  vi.stubEnv('ANTHROPIC_API_KEY', 'test-only-anthropic');
  const provider = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ content: [{ type: 'text', text: '```json\n{"why":"Live guidance"}\n```' }], stop_reason: 'end_turn' })))
    .mockResolvedValueOnce(new Response('secret provider details', { status: 429 }))
    .mockResolvedValueOnce(new Response('secret provider details', { status: 401 }));
  vi.stubGlobal('fetch', provider);
  mocks.sql.mockResolvedValue([{ id: 'reservation' }]);
  await expect(chatCompletion({ ...options, responseFormat: { type: 'json_object' } })).resolves.toBe('{"why":"Live guidance"}');
  expect(mocks.sql.mock.invocationCallOrder[0]).toBeLessThan(provider.mock.invocationCallOrder[0]);
  const [url, request] = provider.mock.calls[0];
  expect(url).toBe('https://api.anthropic.com/v1/messages');
  expect(request.headers['x-api-key']).toBe('test-only-anthropic');
  expect(JSON.parse(request.body).messages).toEqual(options.messages);
  await expect(chatCompletion(options)).rejects.toMatchObject({ code: 'rate_limit' });
  await expect(chatCompletion(options)).rejects.toMatchObject({ code: 'auth_error' });
  expect(provider).toHaveBeenCalledTimes(3);
  expect(mocks.provider).not.toHaveBeenCalled();
  mocks.sql.mockResolvedValueOnce([{ id: null }]);
  await expect(chatCompletion(options)).rejects.toBeInstanceOf(UsageLimitError);
  expect(provider).toHaveBeenCalledTimes(3);
});
it('does not retry a provider rate limit as an unsupported JSON format', async () => {
  mocks.sql.mockResolvedValueOnce([{ id: 'reservation' }]);
  const error = Object.assign(new Error('Provider returned error'), { status: 429 });
  Object.setPrototypeOf(error, OpenAI.APIError.prototype);
  mocks.provider.mockRejectedValue(error);
  await expect(chatCompletion({ ...options, responseFormat: { type: 'json_object' } })).rejects.toMatchObject({ code: 'rate_limit' });
  expect(mocks.provider).toHaveBeenCalledTimes(1);
});
it('blocks the actual provider when quota is exhausted or billing cannot be checked', async () => {
  mocks.sql.mockResolvedValueOnce([{ id: null }]);
  await expect(chatCompletion(options)).rejects.toBeInstanceOf(UsageLimitError);
  mocks.sql.mockRejectedValueOnce(new Error('Database offline'));
  await expect(chatCompletion(options)).rejects.toThrow('Database offline');
  expect(mocks.provider).not.toHaveBeenCalled();
});
it('reserves an authenticated allowance before the actual provider call', async () => {
  mocks.sql.mockResolvedValueOnce([{ id: 'reservation' }]);
  mocks.provider.mockResolvedValueOnce({ choices: [{ message: { content: 'Saved profile guidance' } }] });
  await expect(chatCompletion(options)).resolves.toBe('Saved profile guidance');
  expect(mocks.sql.mock.calls[0].slice(1)).toEqual(['account-a', 'analysis', 5, 50]);
  expect(mocks.sql.mock.invocationCallOrder[0]).toBeLessThan(mocks.provider.mock.invocationCallOrder[0]);
});
it('rejects missing identity before spending provider credit', async () => {
  await expect(chatCompletion({ ...options, userId: '' })).rejects.toThrow('Authenticated');
  expect(mocks.provider).not.toHaveBeenCalled();
  expect(mocks.sql).not.toHaveBeenCalled();
});
it('reports billing unavailability rather than a fabricated free account', async () => {
  mocks.sql.mockRejectedValueOnce(new Error('Database offline'));
  const response = await GET(new NextRequest('http://localhost/api/payments/entitlement'));
  expect(response.status).toBe(503);
  const data = await response.json();
  expect(data.error).toContain('unavailable');
  expect(data).not.toHaveProperty('tier');
});
