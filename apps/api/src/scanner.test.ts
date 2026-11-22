import {describe,it,expect} from 'vitest';
import {scanFile} from './scanner.js';
describe('malware scan hook',()=>{
 it('allows processing if no scanner is configured',async()=>{await expect(scanFile('/tmp/example','')).resolves.toBeUndefined()});
 it('fails closed if the configured scanner cannot run',async()=>{await expect(scanFile('/tmp/example','/not-a-real-scanner')).rejects.toThrow('security scan')});
});
