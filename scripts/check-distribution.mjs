// Lightweight local demonstration; not an AI throughput benchmark.
const base=process.env.BASE_URL||'http://localhost:8080';
const count=Number(process.env.REQUESTS||30);const instances=new Map();let failures=0;
for(let i=0;i<count;i++){
 try{const response=await fetch(`${base}/api/v1/health`,{signal:AbortSignal.timeout(5000)});if(!response.ok){failures++;continue}const id=response.headers.get('x-cortex-instance')||'missing-instance-header';instances.set(id,(instances.get(id)||0)+1)}catch{failures++}
}
console.log(JSON.stringify({requests:count,failures,instances:Object.fromEntries(instances)},null,2));
if(failures||instances.size<2||instances.has('missing-instance-header'))process.exitCode=1;
