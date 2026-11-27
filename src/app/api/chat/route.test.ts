// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const { create, search } = vi.hoisted(() => ({ create: vi.fn(), search: vi.fn() }));
vi.mock('@google/genai', () => ({
  GoogleGenAI: class { interactions = { create }; },
}));
vi.mock('@/lib/firebase-admin', () => ({ guard: async () => ({}) }));
vi.mock('@/lib/semanticSearch', () => ({ performSemanticSearch: search, hitToSlug: vi.fn() }));

const models = ['gemini-4-hydrogen', 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];
const longInput = 'Explain how a local semantic search index can retrieve passages that are useful for answering a question.';

function post(input = longInput, model?: string) {
  return POST(new Request('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify({ input, model }),
  }));
}

describe('chat model routing', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'unit-test-placeholder');
    create.mockReset();
    search.mockReset().mockResolvedValue([]);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it.each([0, 1, 2, 3])('stops at the first available answer model after %i failures', async failures => {
    for (const status of [429, 503, 502].slice(0, failures)) create.mockRejectedValueOnce({ status });
    create.mockResolvedValueOnce({ output_text: 'Answer' });
    const response = await post();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ text: 'Answer', model: models[failures] });
    expect(create.mock.calls.map(([params]) => params.model)).toEqual(models.slice(0, failures + 1));
    expect(search).toHaveBeenCalledTimes(1);
    for (const [params, options] of create.mock.calls) {
      expect(params).toEqual({ ...create.mock.calls[0][0], model: params.model });
      expect(params).toMatchObject({ input: longInput, store: false, generation_config: { max_output_tokens: 4096 } });
      expect(options.maxRetries).toBe(0);
    }
  });

  it.each([429, 503])('returns a temporary error after all models return %i', async status => {
    create.mockRejectedValue({ status });
    expect((await post()).status).toBe(status);
    expect(create.mock.calls.map(([params]) => params.model)).toEqual(models);
  });

  it('moves to the next model when an attempt reaches its deadline', async () => {
    vi.spyOn(AbortSignal, 'timeout').mockReturnValueOnce(AbortSignal.abort(new DOMException('Timed out', 'TimeoutError')));
    create.mockRejectedValueOnce(new Error('SDK aborted')).mockResolvedValueOnce({ output_text: 'Answer' });
    expect(await (await post()).json()).toEqual({ text: 'Answer', model: models[1] });
    expect(create.mock.calls[0][1].fetchOptions.signal.aborted).toBe(true);
  });

  it.each([400, 401, 403])('stops on permanent error %i', async status => {
    create.mockRejectedValue({ status });
    expect((await post()).status).toBe(500);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('does not treat a blocked or empty answer as a successful reply or try another model', async () => {
    create.mockResolvedValue({ output_text: null });
    expect((await post()).status).toBe(500);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('keeps short-query expansion separate from the answer chain', async () => {
    create.mockResolvedValueOnce({ output_text: 'search terms' }).mockResolvedValueOnce({ output_text: 'Answer' });
    expect((await post('short query')).status).toBe(200);
    expect(search).toHaveBeenCalledWith('search terms', 3);
    expect(create.mock.calls.map(([params]) => params.model)).toEqual([models[3], models[0]]);
    expect(create.mock.calls[0][0].generation_config.max_output_tokens).toBe(64);
  });

  it('uses the original query when expansion fails and respects the requested starting model', async () => {
    create.mockRejectedValueOnce({ status: 429 }).mockRejectedValueOnce({ status: 503 })
      .mockResolvedValueOnce({ output_text: 'Answer' });
    expect((await post('short query', models[2])).status).toBe(200);
    expect(search).toHaveBeenCalledWith('short query', 3);
    expect(create.mock.calls.map(([params]) => params.model)).toEqual([models[3], models[2], models[3]]);
  });
});
