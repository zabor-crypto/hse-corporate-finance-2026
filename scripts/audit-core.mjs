import crypto from 'node:crypto';
export const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export function inspectBytes(bytes,path){
 const text=Buffer.isBuffer(bytes)?bytes.toString('utf8'):String(bytes);const findings=[];
 const rules=[['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],['github-token',/\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b/],['openai-key',/\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/],['aws-access-key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],['personal-workstation-path',/(?:\/Users\/|\/home\/)[^/\s"'\\]+\//],['private-pdf',/^%PDF-/]];
 for(const [category,rx] of rules)if(rx.test(text))findings.push({category,path,sha256:hash(bytes),status:'FAIL'});
 if(/\.(?:pdf|pfx|p12|pem|key|env)$/i.test(path)||/(?:^|\/)\.env(?:\.|$)/.test(path))findings.push({category:'prohibited-file-type',path,sha256:hash(bytes),status:'FAIL'});
 return findings;
}
export function summarize(findings){return findings.some(f=>f.status==='FAIL')?'FAIL':findings.some(f=>f.status==='UNKNOWN')?'UNKNOWN':'PASS';}
export function validLicenseChoice(value,kind){const choices=kind==='code'?['MIT','Apache-2.0','GPL-3.0-only','GPL-3.0-or-later','BSD-3-Clause']:['CC-BY-4.0','CC-BY-SA-4.0','CC0-1.0'];return typeof value==='string'&&choices.includes(value);}
// Pure comparison only: publication/approval predicates remain separate in validateRelease.
export function artifactMatchesRelease({verified,artifact,sha,version}){
 return /^[0-9a-f]{40}$/.test(sha??'')&&typeof version==='string'&&version.length>0&&
  [verified,artifact].every(report=>report?.status==='PASS'&&report.sourceCommit===sha&&report.sourceDirty===false&&report.sourceKind==='git'&&report.sourceVersion===version&&Array.isArray(report.files)&&report.files.length>0)&&
  JSON.stringify(verified.files)===JSON.stringify(artifact.files);
}
export function validateRelease({ref,sha,candidate,actor,owner,approved,enabled,auditStatus,codeLicense,contentLicense,redistributionApproved,dirty}){
 const reasons=[];
 if(ref!=='refs/heads/main')reasons.push('MAIN_ONLY');
 if(!/^[0-9a-f]{40}$/.test(sha??'')||candidate!==sha)reasons.push('EXACT_CANDIDATE_REQUIRED');
 if(!actor||actor!==owner)reasons.push('OWNER_ACTOR_REQUIRED');
 if(approved!=='true'||enabled!=='true')reasons.push('OWNER_APPROVAL_REQUIRED');
 if(auditStatus!=='PASS')reasons.push('PUBLIC_AUDIT_NOT_PASS');
 if(!validLicenseChoice(codeLicense,'code')||!validLicenseChoice(contentLicense,'content')||redistributionApproved!==true)reasons.push('LICENSE_OR_RIGHTS_UNRESOLVED');
 if(dirty)reasons.push('DIRTY_SOURCE');
 return {allowed:reasons.length===0,reasons};
}
