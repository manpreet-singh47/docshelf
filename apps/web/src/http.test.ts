import {expect,it,vi,afterEach} from 'vitest';
import {fetchWithTimeout} from './http';

afterEach(()=>vi.unstubAllGlobals());

it('retries a transient GET response once',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(new Response('Unavailable',{status:503})).mockResolvedValueOnce(Response.json({ok:true}));
 vi.stubGlobal('fetch',fetch);
 expect((await fetchWithTimeout('/api/v1/documents')).status).toBe(200);
 expect(fetch).toHaveBeenCalledTimes(2);
});

it('never repeats a generation POST',async()=>{
 const fetch=vi.fn().mockResolvedValue(new Response('Unavailable',{status:503}));
 vi.stubGlobal('fetch',fetch);
 expect((await fetchWithTimeout('/api/v1/study',{method:'POST'})).status).toBe(503);
 expect(fetch).toHaveBeenCalledTimes(1);
});

it('stops a stalled request with a readable timeout',async()=>{
 vi.useFakeTimers();
 vi.stubGlobal('fetch',vi.fn((_url,_init)=>new Promise((_resolve,reject)=>_init.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))))));
 const pending=fetchWithTimeout('/api/v1/study',{method:'POST'},100);
 const assertion=expect(pending).rejects.toThrow('The request timed out. Please try again.');
 await vi.advanceTimersByTimeAsync(100);
 await assertion;
 vi.useRealTimers();
});
