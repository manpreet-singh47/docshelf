import {readFile} from 'node:fs/promises';
import SwaggerParser from '@apidevtools/swagger-parser';
const spec=await SwaggerParser.validate(new URL('../docs/openapi.json',import.meta.url).pathname);
const source=await readFile(new URL('../apps/api/src/server.ts',import.meta.url),'utf8');
const routes=Array.from(source.matchAll(/app\.(get|post|delete)\('\/api\/v1([^']+)'/g),m=>({method:m[1],path:m[2].replace(/:id/g,'{id}')}));
const missing=routes.filter(({method,path})=>path!=='/auth/:action'&&!spec.paths[path]?.[method]);
for(const action of ['signin','signup'])if(!spec.paths[`/auth/${action}`]?.post)missing.push({method:'post',path:`/auth/${action}`});
if(missing.length){console.error('Undocumented API routes:',missing);process.exitCode=1}else console.log(`OpenAPI valid; ${routes.length+1} controller routes documented`);
