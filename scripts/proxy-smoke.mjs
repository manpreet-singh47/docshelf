// Local proxy smoke test against disposable MongoDB and Redis; not a load benchmark.
import {spawn} from 'node:child_process';
import {createServer,request} from 'node:http';
import {mkdtemp,writeFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {strict as assert} from 'node:assert';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mongo=process.env.TEST_MONGODB_URI,redis=process.env.TEST_REDIS_URL,nginx=process.env.NGINX_BIN;
if(!mongo||!redis||(!nginx&&process.env.TEST_PROXY!=='node'))throw Error('Set TEST_MONGODB_URI and TEST_REDIS_URL plus NGINX_BIN or TEST_PROXY=node');
const temp=await mkdtemp(path.join(tmpdir(),'cortex-proxy-'));const port=Number(process.env.TEST_PROXY_PORT||8088);const apiPorts=[4407,4408];
const config=`worker_processes 1; error_log stderr warn; pid ${temp}/nginx.pid; events { worker_connections 256; } http { upstream cortex { server 127.0.0.1:${apiPorts[0]} max_fails=1 fail_timeout=10s; server 127.0.0.1:${apiPorts[1]} max_fails=1 fail_timeout=10s; } server { listen 127.0.0.1:${port}; location / { proxy_connect_timeout 1s; proxy_next_upstream error timeout http_502 http_503 http_504; proxy_pass http://cortex; } } }`;
await mkdir(path.join(temp,'logs'));await writeFile(path.join(temp,'nginx.conf'),config);
const env={...process.env,MONGODB_URI:mongo,REDIS_URL:redis,JWT_SECRET:'proxy-test-secret-at-least-32-characters',EXPOSE_INSTANCE_ID:'true',API_RATE_LIMIT:'500'};
const children=[];let errors='';const launch=(binary,args,options={})=>{const child=spawn(binary,args,{...options,stdio:['ignore','ignore','pipe']});child.stderr.on('data',data=>errors+=data.toString());children.push(child);return child};
const servers=apiPorts.map(p=>launch(process.execPath,['dist/server.js'],{cwd:path.join(root,'apps/api'),env:{...env,PORT:String(p)}}));
let proxy,localProxy;const sleep=ms=>new Promise(r=>setTimeout(r,ms));async function ready(url){for(let i=0;i<100;i++){try{const r=await fetch(url);if(r.ok)return}catch{}await sleep(100)}throw Error(`Not ready: ${url}`)}
try{
 await Promise.all(apiPorts.map(p=>ready(`http://127.0.0.1:${p}/api/v1/ready`)));
 if(process.env.TEST_PROXY==='node'){let next=0;localProxy=createServer((req,res)=>{const first=next++%2;function forward(index,attempt){const upstream=request({hostname:'127.0.0.1',port:apiPorts[index],path:req.url,method:req.method},up=>{res.writeHead(up.statusCode||502,up.headers);up.pipe(res)});upstream.on('error',()=>{if(attempt===0)forward(1-index,1);else{res.writeHead(502);res.end()}});req.pipe(upstream)}forward(first,0)});await new Promise((resolve,reject)=>{localProxy.once('error',reject);localProxy.listen(port,'127.0.0.1',resolve)})}else proxy=launch(nginx,['-p',temp+'/', '-c',path.join(temp,'nginx.conf'),'-g','daemon off;']);await ready(`http://127.0.0.1:${port}/api/v1/health`);
 const counts={};for(let i=0;i<20;i++){const r=await fetch(`http://127.0.0.1:${port}/api/v1/health`,{headers:{connection:'close'}});assert.equal(r.status,200);const id=r.headers.get('x-cortex-instance');assert.ok(id);counts[id]=(counts[id]||0)+1}assert.equal(Object.keys(counts).length,2,'requests should reach both API instances');
 const stopped=servers[0];const exit=new Promise(resolve=>stopped.once('exit',resolve));stopped.kill('SIGTERM');await exit;
 for(let i=0;i<10;i++){const r=await fetch(`http://127.0.0.1:${port}/api/v1/health`,{headers:{connection:'close'}});assert.equal(r.status,200,'remaining replica should handle requests after one stops')}
 console.log(JSON.stringify({result:'PASS',proxy:process.env.TEST_PROXY==='node'?'node demonstration proxy':'nginx',distribution:Object.values(counts),requestsAfterStoppingReplica:10}));
}catch(e){console.error(errors);throw e}finally{if(localProxy)await new Promise(resolve=>localProxy.close(resolve));for(const child of children)if(child.exitCode===null)child.kill('SIGTERM');await sleep(300);await rm(temp,{recursive:true,force:true})}
