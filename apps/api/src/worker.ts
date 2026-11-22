import dotenv from 'dotenv'; dotenv.config({path:'../../.env'});
import mongoose from 'mongoose';
import {Worker,UnrecoverableError} from 'bullmq';
import {Redis as IORedis} from 'ioredis';
import {readFile} from 'node:fs/promises';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {Document,Chunk} from './models.js';
import {chunks,validateExtraction,ExtractionLimitError} from './core.js';
import {scanFile} from './scanner.js';
import {admittedEmbed} from './admission.js';
import {extractDocxText,InvalidDocxError} from './docx.js';
await mongoose.connect(process.env.MONGODB_URI||'mongodb://127.0.0.1:27017/cortex');
const redisUrl=process.env.REDIS_URL||'redis://127.0.0.1:6379';
const connection=new IORedis(redisUrl,{maxRetriesPerRequest:null,tls:redisUrl.startsWith('rediss://')?{rejectUnauthorized:false}:undefined});
const worker=new Worker('documents',async job=>{const doc=await Document.findById(job.data.id); if(!doc)return; try {doc.status='processing';await doc.save(); await scanFile(doc.path!); const data=await readFile(doc.path!); let pages:{page:number;text:string}[]=[]; if(doc.name!.toLowerCase().endsWith('.pdf')) {const task=getDocument({data:new Uint8Array(data),useSystemFonts:true});const pdf=await task.promise;try{validateExtraction(pdf.numPages,0);let charCount=0;for(let page=1;page<=pdf.numPages;page++){const content=await (await pdf.getPage(page)).getTextContent();const text=content.items.map(item=>'str' in item?item.str:'').join(' ');charCount+=text.length;validateExtraction(pdf.numPages,charCount);pages.push({page,text})}}finally{await task.destroy()}} else if(doc.name!.toLowerCase().endsWith('.docx')) {const text=await extractDocxText(data);pages=[{page:1,text}]} else {const text=data.toString('utf8');validateExtraction(1,text.length);pages=[{page:1,text}]}; const parts=chunks(pages); if(!parts.length)throw Error('No extractable text found'); const records=[]; for(const part of parts) records.push({...part,owner:doc.owner,document:doc._id,embedding:await admittedEmbed(connection,part.text)}); await Chunk.deleteMany({document:doc._id}); await Chunk.insertMany(records); const updated=await Document.updateOne({_id:doc._id,status:'processing'},{$set:{status:'ready'},$unset:{error:1}});if(!updated.matchedCount)await Chunk.deleteMany({document:doc._id}); } catch(e){console.error('Document processing failed:',e instanceof Error?e.message:'unknown error');const attempts=job.opts.attempts||1;const limitError=e instanceof ExtractionLimitError||e instanceof InvalidDocxError;const willRetry=!limitError&&job.attemptsMade+1<attempts;const message=limitError?e.message:willRetry?'Processing will retry automatically.':'Processing failed. Check the worker and retry.';await Document.updateOne({_id:doc._id,status:'processing'},{$set:{status:willRetry?'queued':'failed',error:message}});if(limitError)throw new UnrecoverableError(message);throw e;}},{connection:connection as any,concurrency:1});
worker.on('error',error=>console.error('Worker connection error:',error.message));
let shuttingDown=false;async function shutdown(){if(shuttingDown)return;shuttingDown=true;try{await worker.close();await connection.quit();await mongoose.disconnect();process.exit(0)}catch{process.exit(1)}}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
console.log('Document worker ready');
