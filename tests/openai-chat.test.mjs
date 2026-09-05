import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOpenAIChat, OPENAI_MODEL, GEMINI_MODEL } from '../supabase/functions/_shared/openai-chat.ts';
import { canSummarizeStudy, canSummarizeYear, canGenerateBirthdayAnnouncement } from '../supabase/functions/_shared/ai-auth-policy.ts';

const input = { messages: [{ role: 'user', content: 'Texto fictício para teste local.' }] };
const completion = { id: 'fake', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: 'Resumo fictício.' } }], usage: { total_tokens: 10 } };
const fakeEnv = name => name === 'OPENAI_API_KEY' ? 'FAKE-TEST-KEY-NOT-A-CREDENTIAL' : undefined;
const withResponse = (data, status = 200) => createOpenAIChat({ env: fakeEnv, fetch: async () => Response.json(data, { status }) });

test('text response preserves choices/content/usage and pins safe request controls', async () => {
  let request;
  const ai = createOpenAIChat({ env: fakeEnv, fetch: async (url, init) => { request = { url, init }; return Response.json(completion); } });
  const result = await ai({ ...input, model: 'untrusted-model', store: true, n: 100, stream: true });
  assert.deepEqual(await result.json(), completion);
  assert.equal(request.url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(request.init.redirect, 'error');
  const body = JSON.parse(request.init.body);
  assert.equal(body.model, OPENAI_MODEL);
  assert.equal(body.store, false); assert.equal(body.stream, false); assert.equal(body.n, 1);
  assert.equal(body.max_completion_tokens, 4096);
});

for (const name of ['extract_events', 'extract_tasks']) {
  test(`${name} preserves tool_calls including null message content`, async () => {
    const args = name === 'extract_events' ? '{"events":[]}' : '{"tasks":[]}';
    const response = { choices: [{ finish_reason: 'tool_calls', message: { content: null, tool_calls: [{ id: 'call_fake', type: 'function', function: { name, arguments: args } }] } }] };
    let sent;
    const ai = createOpenAIChat({ env: fakeEnv, fetch: async (_url, init) => { sent = JSON.parse(init.body); return Response.json(response); } });
    const body = { ...input, tools: [{ type: 'function', function: { name, parameters: { type: 'object', properties: {} } } }], tool_choice: { type: 'function', function: { name } } };
    assert.deepEqual(await (await ai(body)).json(), response);
    assert.deepEqual(sent.tools, body.tools); assert.deepEqual(sent.tool_choice, body.tool_choice);
    assert.equal(sent.parallel_tool_calls, false);
    const missing = await withResponse(completion)(body);
    assert.equal(missing.status, 502);
  });
}

test('JSON mode remains a content string, not a different output envelope', async () => {
  const json = { choices: [{ finish_reason: 'stop', message: { content: '{"geral":"Teste"}' } }] };
  const response = await withResponse(json)({ ...input, response_format: { type: 'json_object' } });
  assert.equal((await response.json()).choices[0].message.content, '{"geral":"Teste"}');
});

test('Gemini uses only its own endpoint, key, validated model and supported controls', async () => {
  let sent;
  const ai = createOpenAIChat({ provider: 'gemini',
    env: name => ({ 'Gemini API Key': 'FAKE-GOOGLE-KEY', OPENAI_API_KEY: 'FAKE-OTHER-KEY' })[name],
    fetch: async (url, init) => { sent={url,init}; return Response.json(completion); } });
  assert.equal((await ai(input)).status,200);
  assert.equal(sent.url,'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
  assert.equal(sent.init.headers.Authorization,'Bearer FAKE-GOOGLE-KEY');
  const body=JSON.parse(sent.init.body);
  assert.equal(body.model,GEMINI_MODEL);
  assert.equal(body.max_tokens,4096);
  assert.equal(body.reasoning_effort,'minimal');
  assert.equal(body.store,undefined);
  assert.equal(body.max_completion_tokens,undefined);
  const missing=createOpenAIChat({provider:'gemini',env:fakeEnv,fetch:async()=>{throw Error('must not fetch')}});
  assert.equal((await (await missing(input)).json()).code,'ai_not_configured');
});

test('quota, rate limits and key failures are distinct and sanitized', async () => {
  for (const [status, code, expected] of [[429, 'insufficient_quota', 402], [429, 'rate_limit_exceeded', 429], [401, 'invalid_api_key', 503], [500, 'server_error', 503]]) {
    const response = await withResponse({ error: { code, message: 'MUST-NOT-LEAK-SERVER-BODY' } }, status)(input);
    assert.equal(response.status, expected); assert.ok(!(await response.text()).includes('MUST-NOT-LEAK'));
  }
});

test('invalid success envelopes, truncation, and refusal never reach write paths as success', async () => {
  for (const [data, expected] of [[{}, 502], [{ choices: [{ finish_reason: 'length', message: { content: 'partial' } }] }, 502], [{ choices: [{ message: { refusal: 'private reason', content: null } }] }, 422]]) {
    assert.equal((await withResponse(data)(input)).status, expected);
  }
});

test('configuration/input limits fail without fetching', async () => {
  let calls = 0;
  const fetch = async () => { calls++; throw Error('Must never fetch'); };
  assert.equal((await createOpenAIChat({ env: () => undefined, fetch })(input)).status, 503);
  assert.equal((await createOpenAIChat({ env: fakeEnv, fetch, maxInputBytes: 5 })(input)).status, 413);
  assert.equal((await createOpenAIChat({ env: fakeEnv, fetch })({ ...input, max_completion_tokens: 99999 })).status, 400);
  assert.equal(calls, 0);
});

test('key whitespace is normalized and malformed secrets fail without disclosure', async () => {
  let authorization;
  const ai = createOpenAIChat({ env: name => name === 'OPENAI_API_KEY' ? '  FAKE-KEY\n' : undefined,
    fetch: async (_url, init) => { authorization = init.headers.Authorization; return Response.json(completion); } });
  assert.equal((await ai(input)).status, 200);
  assert.equal(authorization, 'Bearer FAKE-KEY');
  const invalid = createOpenAIChat({ env: () => 'FAKE INTERNAL SPACE', fetch: async () => { throw Error('must not fetch'); } });
  const response = await invalid(input);
  assert.equal((await response.json()).code, 'ai_key_format_invalid');
});

test('timeout covers upstream I/O and does not retry', async () => {
  let calls = 0;
  const ai = createOpenAIChat({ env: fakeEnv, timeoutMs: 5, fetch: async (_url, init) => {
    calls++;
    return await new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(Error('private transport message')), { once: true }));
  } });
  assert.equal((await ai(input)).status, 504); assert.equal(calls, 1);
});

test('pre-aborted caller does not fetch', async () => {
  let calls = 0;
  const controller = new AbortController(); controller.abort();
  const ai = createOpenAIChat({ env: fakeEnv, fetch: async () => { calls++; return Response.json(completion); } });
  assert.equal((await ai(input, controller.signal)).status, 408); assert.equal(calls, 0);
});

test('study authorization blocks foreign society, null society, pastor mutations and viewers', () => {
  const manager = { roles: ['diretoria'], societyId: 'society-a' };
  assert.equal(canSummarizeStudy(manager, 'society-a'), true);
  assert.equal(canSummarizeStudy(manager, 'society-b'), false);
  assert.equal(canSummarizeStudy({ roles: ['diretoria'], societyId: null }, null), false);
  assert.equal(canSummarizeStudy({ roles: ['pastor'], societyId: 'society-a' }, 'society-a'), false);
  assert.equal(canSummarizeStudy({ roles: ['visualizador'], societyId: 'society-a' }, 'society-a'), false);
  assert.equal(canSummarizeStudy({ roles: ['admin'], societyId: null }, 'society-b'), true);
  assert.equal(canSummarizeYear({ roles: ['pastor'], societyId: null }, 'society-b'), true);
  assert.equal(canSummarizeYear(manager, 'society-b'), false);
  assert.equal(canGenerateBirthdayAnnouncement({ roles: [], societyId: null }), false);
  assert.equal(canGenerateBirthdayAnnouncement({ roles: ['pastor'], societyId: null }), true);
});
