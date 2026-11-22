import { createHash } from 'node:crypto';
export function chunks(pages: {page:number;text:string}[], size=1100, overlap=150) {
  if(!Number.isInteger(size)||!Number.isInteger(overlap)||size<=0||overlap<0||overlap>=size)throw new Error('Invalid chunk dimensions');
  return pages.flatMap(({page,text}) => { const clean=text.replace(/\s+/g,' ').trim(); const result:{page:number;text:string}[]=[]; for(let i=0;i<clean.length;i+=size-overlap) { const part=clean.slice(i,i+size); if(part) result.push({page,text:part}); } return result; });
}
export function cosine(a:number[],b:number[]) { if(a.length!==b.length || !a.length) return 0; let dot=0,aa=0,bb=0; for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]**2;bb+=b[i]**2;} return aa&&bb?dot/Math.sqrt(aa*bb):0; }
export const hash=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
export function validFile(name:string,data:Buffer) { const ext=name.toLowerCase().split('.').pop(); if(ext==='pdf') return data.subarray(0,5).toString()==='%PDF-'; if(ext==='docx')return data.length>=22&&data.subarray(0,4).equals(Buffer.from([0x50,0x4b,0x03,0x04]))&&data.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]))>=data.length-65557;if(ext==='txt'||ext==='md') return !data.includes(0) && !data.toString('utf8').includes('\ufffd'); return false; }
export async function embed(text:string):Promise<number[]> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    const configuredModel = process.env.GEMINI_EMBED_MODEL?.trim();
    const model = !configuredModel || configuredModel === 'text-embedding-004'
      ? 'gemini-embedding-2'
      : configuredModel;
    const outputDimensionality = Number(process.env.GEMINI_EMBED_DIMENSIONS || 768);
    if (!Number.isInteger(outputDimensionality) || outputDimensionality < 128 || outputDimensionality > 3072) {
      throw Error('GEMINI_EMBED_DIMENSIONS must be an integer from 128 to 3072');
    }
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text }] },
          output_dimensionality: outputDimensionality
        }),
        signal: AbortSignal.timeout(30000)
      }
    );
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error(`Gemini embedding failed (${response.status}):`, errText);
      throw Error(`Embedding service failed: ${response.status} ${errText.slice(0, 150)}`);
    }
    const data = await response.json() as { embedding?: { values?: number[] } };
    const vector = data?.embedding?.values;
    if (!Array.isArray(vector) || vector.length === 0 || vector.length > 4096 || !vector.every((v: unknown) => typeof v === 'number' && Number.isFinite(v))) {
      throw Error('Invalid embedding response');
    }
    return vector;
  }
  const response=await fetch(`${process.env.OLLAMA_URL||'http://127.0.0.1:11434'}/api/embed`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:process.env.OLLAMA_EMBED_MODEL||'all-minilm',input:text}),signal:AbortSignal.timeout(30000)}); if(!response.ok) throw Error('Embedding model unavailable'); const data=await response.json() as {embeddings?:unknown};const vector=Array.isArray(data.embeddings)?data.embeddings[0]:null;if(!Array.isArray(vector)||vector.length===0||vector.length>4096||!vector.every((v:unknown)=>typeof v==='number'&&Number.isFinite(v)))throw Error('Invalid embedding response');return vector as number[];
}

/** bcrypt only processes the first 72 UTF-8 bytes. */
export function validPasswordLength(password:string){return Buffer.byteLength(password,'utf8')<=72;}

export const MAX_EXTRACTED_CHARS=1_000_000;
export const MAX_DOCUMENT_PAGES=500;
export class ExtractionLimitError extends Error {}
export function validateExtraction(pageCount:number,charCount:number){if(pageCount>MAX_DOCUMENT_PAGES)throw new ExtractionLimitError('Document exceeds the 500-page processing limit.');if(charCount>MAX_EXTRACTED_CHARS)throw new ExtractionLimitError('Document exceeds the 1,000,000-character processing limit.');}
