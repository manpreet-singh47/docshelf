import React from 'react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {App} from './App';

let fixtureDoc={_id:'507f1f77bcf86cd799439011',name:'fixture.pdf',status:'ready',size:1024,createdAt:new Date().toISOString()};
let uploaded=false;
let uploadedFile='';
let chatRateLimited=false;
let studyPostMode:'success'|'deferred'='success';
let resolveStudyPost:((response:Response)=>void)|null=null;
let studyPosts=0;
let createdCollection:{_id:string;name:string;documents:string[]}|null=null;
beforeEach(()=>{
 uploaded=false;uploadedFile='';chatRateLimited=false;studyPostMode='success';resolveStudyPost=null;studyPosts=0;createdCollection=null;fixtureDoc={...fixtureDoc,name:'fixture.pdf',status:'ready'};
 const values=new Map<string,string>();
 Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>values.set(key,value),clear:()=>values.clear()}});
 vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input),method=init?.method||'GET';
  if(url.endsWith('/auth/refresh'))return Response.json({token:'test-token',user:{name:'Tester',email:'tester@example.test'}});
  if(url.endsWith('/documents')&&method==='POST'){
   uploadedFile=(init?.body as FormData).get('file') instanceof File?((init?.body as FormData).get('file') as File).name:'';
   uploaded=true;return Response.json({id:fixtureDoc._id},{status:201});
  }
  if(url.endsWith('/documents'))return Response.json(uploaded?[fixtureDoc]:[]);
  if(url.endsWith('/collections')&&method==='POST'){
   const body=JSON.parse(String(init?.body));createdCollection={_id:'collection-1',name:body.name,documents:[]};
   return Response.json(createdCollection,{status:201});
  }
  if(url.endsWith('/collections'))return Response.json(createdCollection?[createdCollection]:[]);
  if(url.endsWith('/study')&&method==='POST'){
   studyPosts++;
   if(studyPostMode==='deferred')return new Promise<Response>(resolve=>{resolveStudyPost=resolve});
   return Response.json({_id:'study-1',kind:'summary'},{status:201});
  }
  if(url.endsWith('/chat')&&method==='POST'){
   const body=JSON.parse(String(init?.body));
   if(body.question==='Tell me in points'){
    expect(body.previousQuestion).toBe('Who owns the release?');
    return new Response('{"type":"delta","text":"- Maya Patel owns the release [1]."}\n'+JSON.stringify({type:'done',citations:[{document:fixtureDoc._id,name:fixtureDoc.name,page:2,number:1,kind:'cited'}]})+'\n',{headers:{'content-type':'application/x-ndjson'}});
   }
   expect(body.question).toBe('Who owns the release?');
   if(chatRateLimited)return new Response('Too many requests, please try again later.',{status:429,headers:{'content-type':'text/plain'}});
   return new Response('{"type":"delta","text":"Maya Patel owns the release [1]."}\n'+JSON.stringify({type:'done',citations:[{document:fixtureDoc._id,name:fixtureDoc.name,page:2,number:1,kind:'cited'}]})+'\n',{headers:{'content-type':'application/x-ndjson'}});
  }
  if(url.endsWith(`/documents/${fixtureDoc._id}/file`))return new Response(new Blob(['%PDF-test'],{type:'application/pdf'}));
  if(url.endsWith('/usage'))return Response.json({documents:uploaded?1:0,ready:uploaded?1:0,storageBytes:1024,storageLimit:104857600,conversations:0,quizzes:0,materials:0});
  return Response.json([]);
 }));
 const NativeURL=URL;vi.stubGlobal('URL',class extends NativeURL{static createObjectURL=vi.fn(()=> 'blob:fixture');static revokeObjectURL=vi.fn()});
});

it('sends the earlier document question with a formatting follow-up',async()=>{
 const user=userEvent.setup();
 render(<MemoryRouter initialEntries={['/workspace']}><App/></MemoryRouter>);
 await screen.findByText("Tester's space");
 await user.click(screen.getAllByRole('button',{name:/AI workspace/i})[0]);
 const input=await screen.findByPlaceholderText('Ask anything about your documents...');
 await user.type(input,'Who owns the release?');
 await user.click(screen.getByRole('button',{name:'Send question'}));
 await screen.findByText(/Maya Patel owns the release/);
 await user.type(input,'Tell me in points');
 await user.click(screen.getByRole('button',{name:'Send question'}));
 expect(await screen.findByText(/- Maya Patel owns the release/)).toBeTruthy();
});

it('shows a useful message when the chat rate limit returns plain text',async()=>{
 chatRateLimited=true;
 const user=userEvent.setup();
 render(<MemoryRouter initialEntries={['/workspace']}><App/></MemoryRouter>);
 await screen.findByText("Tester's space");
 await user.click(screen.getAllByRole('button',{name:/AI workspace/i})[0]);
 await user.type(await screen.findByPlaceholderText('Ask anything about your documents...'),'Who owns the release?');
 await user.click(screen.getByRole('button',{name:'Send question'}));
 expect(await screen.findByText('Too many requests. Please wait a minute and try again.')).toBeTruthy();
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();window.localStorage.clear()});

it('uploads a PDF, asks a question, and opens the cited page',async()=>{
 const user=userEvent.setup();
 render(<MemoryRouter initialEntries={['/workspace']}><App/></MemoryRouter>);
 await screen.findByText("Tester's space");
 const input=document.querySelector('input[type="file"]') as HTMLInputElement;
 await user.upload(input,new File(['%PDF-test'],'fixture.pdf',{type:'application/pdf'}));
 await waitFor(()=>expect(uploadedFile).toBe('fixture.pdf'));
 await screen.findByText('fixture.pdf');
 await user.click(screen.getAllByRole('button',{name:/AI workspace/i})[0]);
 await user.type(await screen.findByPlaceholderText('Ask anything about your documents...'),'Who owns the release?');
 await user.click(screen.getByRole('button',{name:'Send question'}));
 await screen.findByText(/Maya Patel owns the release/);
 const citation=await screen.findByRole('button',{name:/\[1\] fixture\.pdf · p\. 2/});
 await user.click(citation);
 const preview=await screen.findByTitle('Preview of fixture.pdf');
 expect(preview.getAttribute('src')).toBe('blob:fixture#page=2');
});

it('shows queued uploads and allows the document list to be refreshed',async()=>{
 fixtureDoc={...fixtureDoc,status:'queued'};
 const user=userEvent.setup();
 render(<MemoryRouter initialEntries={['/workspace']}><App/></MemoryRouter>);
 await screen.findByText("Tester's space");
 await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement,new File(['%PDF-test'],'fixture.pdf',{type:'application/pdf'}));
 expect(await screen.findByText('queued')).toBeTruthy();
 fixtureDoc={...fixtureDoc,status:'ready'};
 await user.click(screen.getByRole('button',{name:'Refresh documents'}));
 expect(await screen.findByText('ready')).toBeTruthy();
});

it('keeps study progress specific to the requested action and offers retry',async()=>{
 studyPostMode='deferred';
 const user=userEvent.setup();
 render(<MemoryRouter initialEntries={['/workspace']}><App/></MemoryRouter>);
 await screen.findByText("Tester's space");
 await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement,new File(['%PDF-test'],'fixture.pdf',{type:'application/pdf'}));
 await user.click(screen.getAllByRole('button',{name:/Study/i})[0]);
 await user.selectOptions(await screen.findByRole('combobox',{name:'Select document'}),fixtureDoc._id);
 expect(screen.getByText(/Using fixture.pdf. Choose a quiz/)).toBeTruthy();
 await user.click(screen.getByRole('button',{name:'Generate summary'}));
 expect(screen.getByRole('button',{name:'Creating summary...'})).toBeTruthy();
 expect(screen.getByRole('button',{name:'Generate flashcards'}).hasAttribute('disabled')).toBe(true);
 expect(screen.queryByRole('button',{name:'Creating flashcards...'})).toBeNull();
 resolveStudyPost?.(Response.json({error:'The local model is unavailable. Try again.'},{status:503}));
 expect((await screen.findByRole('alert')).textContent).toContain('The local model is unavailable. Try again.');
 studyPostMode='success';
 await user.click(screen.getByRole('button',{name:'Retry summary'}));
 await waitFor(()=>expect(studyPosts).toBe(2));
 expect(await screen.findByText('Summary created')).toBeTruthy();
});

it('offers a Word document as a download and labels its source without a page claim',async()=>{
 fixtureDoc={...fixtureDoc,name:'word-brief.docx'};
 const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
 const user=userEvent.setup();
 render(<MemoryRouter initialEntries={['/workspace']}><App/></MemoryRouter>);
 await screen.findByText("Tester's space");
 await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement,new File(['DOCX'],'word-brief.docx',{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}));
 await waitFor(()=>expect(uploadedFile).toBe('word-brief.docx'));
 await screen.findByText('word-brief.docx');
 await user.click(screen.getAllByRole('button',{name:/AI workspace/i})[0]);
 await user.type(await screen.findByPlaceholderText('Ask anything about your documents...'),'Who owns the release?');
 await user.click(screen.getByRole('button',{name:'Send question'}));
 const citation=await screen.findByRole('button',{name:/word-brief\.docx · Word document/});
 await user.click(citation);
 expect(click).toHaveBeenCalled();
 expect(await screen.findByText(/downloaded\. Word files have document-level sources/)).toBeTruthy();
 expect(screen.queryByTitle('Preview of word-brief.docx')).toBeNull();
 click.mockRestore();
});

it('opens the account menu without signing out until Sign out is chosen',async()=>{
 const user=userEvent.setup();
 render(<MemoryRouter initialEntries={['/workspace']}><App/></MemoryRouter>);
 await screen.findByText("Tester's space");
 await user.click(screen.getByRole('button',{name:/Tester.*tester@example.test/}));
 expect(screen.getByRole('menu',{name:'Account menu'})).toBeTruthy();
 expect(screen.getAllByText('tester@example.test').length).toBeGreaterThan(0);
 expect(screen.getByText("Tester's space")).toBeTruthy();
 await user.click(screen.getByRole('menuitem',{name:'Sign out'}));
 await waitFor(()=>expect(screen.queryByText("Tester's space")).toBeNull());
});

it('creates and displays a collection immediately',async()=>{
 const user=userEvent.setup();
 render(<MemoryRouter initialEntries={['/workspace']}><App/></MemoryRouter>);
 await screen.findByText("Tester's space");
 await user.click(screen.getAllByRole('button',{name:/Collections/i})[0]);
 await screen.findByRole('heading',{name:/Collections/});
 await user.click(screen.getByRole('button',{name:'New collection'}));
 await user.type(screen.getByRole('textbox',{name:'Collection name'}),'Project notes');
 await user.click(screen.getByRole('button',{name:'Create collection'}));
 expect(await screen.findByText('Project notes')).toBeTruthy();
 expect(createdCollection?.name).toBe('Project notes');
});

it('explains when filename filtering finds no documents',async()=>{
 const user=userEvent.setup();
 render(<MemoryRouter initialEntries={['/workspace']}><App/></MemoryRouter>);
 await screen.findByText("Tester's space");
 await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement,new File(['%PDF-test'],'fixture.pdf',{type:'application/pdf'}));
 await screen.findByText('fixture.pdf');
 await user.type(screen.getByRole('textbox',{name:'Filter documents'}),'missing');
 expect(await screen.findByText('No matching documents')).toBeTruthy();
 await user.click(screen.getByRole('button',{name:'Clear filter'}));
 expect(await screen.findByText('fixture.pdf')).toBeTruthy();
});
