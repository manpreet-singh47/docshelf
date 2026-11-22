import {fromBuffer} from 'yauzl';
import mammoth from 'mammoth';
import {validateExtraction} from './core.js';

const MAX_ZIP_ENTRIES=1000;
const MAX_ENTRY_BYTES=20*1024*1024;
const MAX_UNCOMPRESSED_BYTES=40*1024*1024;
const required=new Set(['[Content_Types].xml','_rels/.rels','word/document.xml']);

export class InvalidDocxError extends Error {}

/** Inspect and stream each entry before the document parser sees the archive. */
export function inspectDocxArchive(data:Buffer):Promise<void>{
 return new Promise((resolve,reject)=>{
  fromBuffer(data,{lazyEntries:true,validateEntrySizes:true,strictFileNames:true},(openError,zip)=>{
   if(openError||!zip){reject(new InvalidDocxError('The Word file is not a valid DOCX archive.'));return}
   let settled=false,declaredTotal=0,actualTotal=0,entries=0;
   const seen=new Set<string>();
   const fail=(message:string)=>{if(settled)return;settled=true;zip.close();reject(new InvalidDocxError(message))};
   zip.on('error',()=>fail('The Word file contains a damaged archive entry.'));
   zip.on('end',()=>{
    if(settled)return;
    if([...required].some(name=>!seen.has(name))){fail('The Word file is missing required DOCX content.');return}
    settled=true;zip.close();resolve();
   });
   if(zip.entryCount>MAX_ZIP_ENTRIES){fail('The Word file has too many archive entries.');return}
   zip.on('entry',entry=>{
    if(settled)return;
    entries++;declaredTotal+=entry.uncompressedSize;
    if(entries>MAX_ZIP_ENTRIES||entry.uncompressedSize>MAX_ENTRY_BYTES||declaredTotal>MAX_UNCOMPRESSED_BYTES){fail('The Word file expands beyond the processing limit.');return}
    if(entry.isEncrypted()||![0,8].includes(entry.compressionMethod)){fail('Encrypted or unsupported Word archive entries are not supported.');return}
    if(seen.has(entry.fileName)){fail('The Word file has duplicate archive entries.');return}
    seen.add(entry.fileName);
    zip.openReadStream(entry,async(streamError,stream)=>{
     if(streamError||!stream){fail('The Word file contains a damaged archive entry.');return}
     let entryBytes=0;
     try{
      for await(const part of stream){
       entryBytes+=(part as Buffer).length;actualTotal+=(part as Buffer).length;
       if(entryBytes>MAX_ENTRY_BYTES||actualTotal>MAX_UNCOMPRESSED_BYTES){stream.destroy();fail('The Word file expands beyond the processing limit.');return}
      }
      if(!settled)zip.readEntry();
     }catch{fail('The Word file contains a damaged archive entry.')}
    });
   });
   zip.readEntry();
  });
 });
}

export async function extractDocxText(data:Buffer):Promise<string>{
 await inspectDocxArchive(data);
 let text:string;
 try{text=(await mammoth.extractRawText({buffer:data})).value}
 catch{throw new InvalidDocxError('Could not extract text from the Word file.')}
 validateExtraction(1,text.length);
 if(!text.trim())throw new InvalidDocxError('No extractable text was found in the Word file.');
 return text;
}
