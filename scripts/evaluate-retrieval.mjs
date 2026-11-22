// A small, synthetic, local retrieval smoke evaluation; not a general accuracy benchmark.
import {readFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
const data=JSON.parse(await readFile(new URL('../tests/evaluation/retrieval-fixtures.json',import.meta.url),'utf8'));
const url=process.env.OLLAMA_URL||'http://127.0.0.1:11434';const model=process.env.OLLAMA_EMBED_MODEL||'all-minilm';
async function embed(input){const response=await fetch(`${url}/api/embed`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,input}),signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error(`Embedding service returned ${response.status}`);const result=await response.json();if(!Array.isArray(result.embeddings)||result.embeddings.length!==input.length||result.embeddings.some(v=>!Array.isArray(v)||!v.length||v.some(n=>!Number.isFinite(n))))throw Error('Invalid embedding response');return result.embeddings}
function cosine(a,b){if(a.length!==b.length)throw Error('Embedding dimensions differ');const dot=a.reduce((n,x,i)=>n+x*b[i],0);return dot/Math.sqrt(a.reduce((n,x)=>n+x*x,0)*b.reduce((n,x)=>n+x*x,0))}
const started=performance.now();const vectors=await embed([...data.documents.map(x=>x.text),...data.questions.map(x=>x.question)]);const docVectors=vectors.slice(0,data.documents.length);const results=data.questions.map((q,i)=>{const scores=docVectors.map((v,j)=>({id:data.documents[j].id,score:cosine(v,vectors[data.documents.length+i])})).sort((a,b)=>b.score-a.score);return {question:q.question,expected:q.expected,top:scores[0].id,rank:scores.findIndex(x=>x.id===q.expected)+1}});
console.log(JSON.stringify({model,fixture:'synthetic retrieval smoke test',questions:results.length,hitAt1:results.filter(x=>x.rank===1).length,meanReciprocalRank:results.reduce((n,x)=>n+1/x.rank,0)/results.length,elapsedMs:Math.round(performance.now()-started),results},null,2));
if(results.some(x=>x.rank!==1))process.exitCode=1;
