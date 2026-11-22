/** Filters numbered citations that do not map to a retrieved excerpt.
 * Holds incomplete bracketed references across streaming chunks. */
export class CitationFilter {
 private pending='';
 constructor(private readonly sourceCount:number){}
 push(chunk:string,final=false):string{
  this.pending+=chunk;let result='';
  while(this.pending){const start=this.pending.indexOf('[');if(start<0){result+=this.pending;this.pending='';break}result+=this.pending.slice(0,start);this.pending=this.pending.slice(start);const end=this.pending.indexOf(']');if(end<0){if(!final&&this.pending.length<=16)break;result+='[';this.pending=this.pending.slice(1);continue}const marker=this.pending.slice(0,end+1);this.pending=this.pending.slice(end+1);const match=/^\[(\d+)\]$/.exec(marker);if(!match||(Number(match[1])>=1&&Number(match[1])<=this.sourceCount))result+=marker;}
  return result;
 }
 finish(){return this.push('',true)}
}
