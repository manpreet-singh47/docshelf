import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const execute=promisify(execFile);
/** Optional executable receives the private file path as its only argument.
 * Exit 0 means clean. Any other result, including timeout, rejects processing. */
export async function scanFile(filePath:string,scanner=process.env.CORTEX_SCANNER):Promise<void>{
 if(!scanner)return;
 try {await execute(scanner,[filePath],{timeout:30_000,maxBuffer:64*1024,windowsHide:true});}
 catch {throw new Error('Document did not pass the configured security scan');}
}
