/** Bound local requests and retry only safe reads after transient failures. */
export async function fetchWithTimeout(input:string,init:RequestInit={},timeoutMs=20_000):Promise<Response>{
 const reads=(init.method||'GET').toUpperCase()==='GET';
 const attempts=reads?2:1;
 for(let attempt=0;attempt<attempts;attempt++){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetch(input,{...init,signal:controller.signal});
   if(reads&&attempt===0&&[502,503,504].includes(response.status)){
    await new Promise(resolve=>setTimeout(resolve,250));
    continue;
   }
   return response;
  }catch(error){
   if(attempt===attempts-1){
    if(controller.signal.aborted)throw Error('The request timed out. Please try again.');
    if(error instanceof TypeError)throw Error('Could not reach DocShelf. Check that the local app is running, then try again.');
    throw error;
   }
   await new Promise(resolve=>setTimeout(resolve,250));
  }finally{clearTimeout(timer)}
 }
 throw Error('The request failed. Please try again.');
}
