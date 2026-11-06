import {describe,it,expect} from 'vitest';
// @ts-expect-error Scripts are pure JS contracts exercised directly by Vitest.
import {inspectBytes,validateRelease,summarize} from '../../scripts/audit-core.mjs';
describe('read-only publication audit and release predicates',()=>{
 const good={ref:'refs/heads/main',sha:'a'.repeat(40),candidate:'a'.repeat(40),actor:'owner',owner:'owner',approved:'true',enabled:'true',auditStatus:'PASS',codeLicense:'MIT',contentLicense:'CC-BY-4.0',redistributionApproved:true,dirty:false};
 it('allows only a fully specified approval predicate; never performs a deployment',()=>expect(validateRelease(good).allowed).toBe(true));
 it.each([{ref:'refs/heads/topic'},{candidate:'b'.repeat(40)},{actor:'collaborator'},{approved:'false'},{enabled:undefined},{auditStatus:'UNKNOWN'},{codeLicense:'UNDECIDED'},{contentLicense:'UNDECIDED'},{redistributionApproved:false},{redistributionApproved:'false'},{codeLicense:null},{contentLicense:undefined},{codeLicense:'UNKNOWN'},{contentLicense:' '},{dirty:true}])('rejects missing release preconditions%j',patch=>expect(validateRelease({...good,...patch}).allowed).toBe(false));
 it('detects synthetic credentials, PDF bytes and personal paths without printing values',()=>{const samples=[['ghp_'+'A'.repeat(40),'token.txt','github-token'],['sk-'+'A'.repeat(40),'key.txt','openai-key'],['%PDF-1.7','material.pdf','private-pdf'],['/Users/'+'private-owner'+'/Downloads','receipt.txt','personal-workstation-path']];for(const [value,p,category] of samples){const f=inspectBytes(Buffer.from(value),p);expect(f.some((x:{category:string})=>x.category===category)).toBe(true);expect(JSON.stringify(f)).not.toContain(value);}});
 it('does not conflate UNKNOWN with PASS',()=>{expect(summarize([{status:'UNKNOWN'}])).toBe('UNKNOWN');expect(summarize([{status:'PASS'},{status:'FAIL'}])).toBe('FAIL');expect(summarize([])).toBe('PASS');});
});
