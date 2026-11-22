import {describe,expect,it} from 'vitest';import {CitationFilter} from './citations.js';
describe('streaming citations',()=>{
 it('removes nonexistent citation numbers across chunk boundaries',()=>{const f=new CitationFilter(2);const output=['Fact [','1] and [','3] and [2','].'].map(x=>f.push(x)).join('')+f.finish();expect(output).toBe('Fact [1] and  and [2].')});
 it('preserves ordinary brackets and unfinished non-citations',()=>{const f=new CitationFilter(1);expect(f.push('Value [note] and [unfinished')+f.finish()).toBe('Value [note] and [unfinished')});
 it('removes zero and out-of-range citations',()=>{const f=new CitationFilter(1);expect(f.push('[0] [1] [15]')+f.finish()).toBe(' [1] ')});
});
