import {randomUUID} from 'node:crypto';
import type {Redis} from 'ioredis';
import {embed} from './core.js';
// Redis time makes lease expiration consistent across machines. Expired leases recover after crashes.
const ACQUIRE=`local clock=redis.call('TIME'); local now=clock[1]*1000+math.floor(clock[2]/1000); redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',now); if redis.call('ZCARD',KEYS[1])>=tonumber(ARGV[2]) then return 0 end; redis.call('ZADD',KEYS[1],now+tonumber(ARGV[3]),ARGV[1]); redis.call('PEXPIRE',KEYS[1],tonumber(ARGV[3])); return 1`;
async function acquire(redis:Redis,key:string,limit:number,leaseMs:number):Promise<(()=>Promise<void>)|null>{
 const token=randomUUID();const acquired=await redis.eval(ACQUIRE,1,key,token,limit,leaseMs);if(acquired!==1)return null;return async()=>{await redis.zrem(key,token)};
}
export function acquireInference(redis:Redis,limit:number,leaseMs=150_000){return acquire(redis,'cortex:inference:leases',limit,leaseMs)}
/** Embeddings share a separate pool across APIs and workers. Waiting is bounded. */
export async function admittedEmbed(redis:Redis,text:string):Promise<number[]>{
 const configured=Number(process.env.EMBEDDING_CONCURRENCY||(process.env.GEMINI_API_KEY?5:1));const limit=Number.isInteger(configured)&&configured>0?configured:1;const deadline=Date.now()+30_000;
 while(Date.now()<deadline){const release=await acquire(redis,'cortex:embedding:leases',limit,45_000);if(release){try{return await embed(text)}finally{await release()}}await new Promise(resolve=>setTimeout(resolve,200));}
 throw new Error('Embedding service is busy');
}
