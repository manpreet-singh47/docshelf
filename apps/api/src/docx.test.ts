import {readFile} from 'node:fs/promises';
import {describe,expect,it} from 'vitest';
import {extractDocxText,inspectDocxArchive,InvalidDocxError} from './docx.js';
import {validFile} from './core.js';

const fixture=new URL('../test-fixtures/word-brief.docx',import.meta.url);
describe('Word document ingestion',()=>{
 it('accepts a real DOCX and extracts its paragraphs',async()=>{
  const data=await readFile(fixture);
  expect(validFile('brief.docx',data)).toBe(true);
  const text=await extractDocxText(data);
  expect(text).toContain('Priya Shah');
  expect(text).toContain('8 August 2027');
 });
 it('rejects a renamed non-DOCX and a damaged archive',async()=>{
  expect(validFile('fake.docx',Buffer.from('not a document'))).toBe(false);
  const data=await readFile(fixture);data[0]=0;
  await expect(inspectDocxArchive(data)).rejects.toBeInstanceOf(InvalidDocxError);
 });
 it('rejects archive size claims above the processing limit',async()=>{
  const data=await readFile(fixture);
  const marker=data.indexOf(Buffer.from('word/document.xml'),data.indexOf(Buffer.from([0x50,0x4b,0x01,0x02])));
  expect(marker).toBeGreaterThan(46);
  data.writeUInt32LE(21*1024*1024,marker-46+24);
  await expect(inspectDocxArchive(data)).rejects.toThrow('expands beyond the processing limit');
 });
});
