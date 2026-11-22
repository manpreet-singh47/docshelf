import {describe,it,expect,vi,afterEach} from 'vitest'; import {chunks,cosine,validFile,validPasswordLength,validateExtraction,embed} from './core.js';
describe('document processing',()=>{it('retains page references',()=>expect(chunks([{page:3,text:'hello world'}])[0].page).toBe(3));it('checks file signatures',()=>{expect(validFile('fake.pdf',Buffer.from('hello'))).toBe(false);expect(validFile('real.pdf',Buffer.from('%PDF-1.7'))).toBe(true)});it('ranks matching vectors',()=>{expect(cosine([1,0],[1,0])).toBe(1);expect(cosine([1,0],[0,1])).toBe(0)});});

it('enforces bcrypt’s 72-byte boundary for Unicode passwords',()=>{expect(validPasswordLength('a'.repeat(72))).toBe(true);expect(validPasswordLength('🔒'.repeat(19))).toBe(false)});

it('rejects documents that exceed extraction resource limits',()=>{expect(()=>validateExtraction(500,1000000)).not.toThrow();expect(()=>validateExtraction(501,1)).toThrow();expect(()=>validateExtraction(1,1000001)).toThrow()});

it('rejects invalid chunk dimensions rather than looping forever',()=>{expect(()=>chunks([{page:1,text:'x'}],10,10)).toThrow()});
it('rejects malformed embedding responses',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({embeddings:[[]]}),{status:200})));await expect(embed('hello')).rejects.toThrow('Invalid embedding response');vi.unstubAllGlobals()});
it('supports Gemini embeddings when GEMINI_API_KEY is provided',async()=>{
 process.env.GEMINI_API_KEY='test-key';
 try {
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({embedding:{values:[0.1,0.2,0.3]}}),{status:200})));
  const vector = await embed('hello gemini');
  expect(vector).toEqual([0.1,0.2,0.3]);
 } finally {
  delete process.env.GEMINI_API_KEY;
  vi.unstubAllGlobals();
 }
});
