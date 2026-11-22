import {afterEach,describe,expect,it,vi} from 'vitest';
import {OllamaProvider,GeminiProvider,getChatProvider} from './provider.js';
afterEach(()=>vi.unstubAllGlobals());
describe('Ollama streaming provider',()=>{
 it('reassembles events split across network chunks',async()=>{
  const chunks=['{"message":{"cont','ent":"Hello "}}\n{"message":','{"content":"world"}}\n'];
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(new ReadableStream({start(c){for(const chunk of chunks)c.enqueue(new TextEncoder().encode(chunk));c.close()}}),{status:200})));
  let result='';for await(const part of new OllamaProvider().stream('context','question',new AbortController().signal))result+=part;
  expect(result).toBe('Hello world');
 });
 it('handles the final event without a trailing newline',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('{\"message\":{\"content\":\"last\"}}',{status:200})));
  let result='';for await(const part of new OllamaProvider().stream('','',new AbortController().signal))result+=part;expect(result).toBe('last');
 });
 it('rejects an unavailable model',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('',{status:503})));
  const consume=async()=>{for await(const _ of new OllamaProvider().stream('','',new AbortController().signal)){} };
  await expect(consume()).rejects.toThrow('Model unavailable');
 });
});

describe('Gemini streaming provider',()=>{
 it('streams server-sent events correctly',async()=>{
  const sseData='data: {"candidates":[{"content":{"parts":[{"text":"Gemini "}]}}]}\n\ndata: {"candidates":[{"content":{"parts":[{"text":"streaming"}]}}]}\n\ndata: [DONE]\n\n';
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(sseData,{status:200})));
  const provider = new GeminiProvider('fake-key');
  let result='';
  for await(const part of provider.stream('context','question',new AbortController().signal)) {
   result+=part;
  }
  expect(result).toBe('Gemini streaming');
  const request=vi.mocked(fetch).mock.calls[0];
  expect(String(request[0])).toContain('/models/gemini-3.8-flash:streamGenerateContent');
 });

 it('falls back to OllamaProvider when no GEMINI_API_KEY is configured', ()=>{
  delete process.env.GEMINI_API_KEY;
  expect(getChatProvider()).toBeInstanceOf(OllamaProvider);
 });

 it('uses GeminiProvider when GEMINI_API_KEY is set', ()=>{
  process.env.GEMINI_API_KEY = 'test-key';
  try {
   expect(getChatProvider()).toBeInstanceOf(GeminiProvider);
  } finally {
   delete process.env.GEMINI_API_KEY;
  }
 });
});
