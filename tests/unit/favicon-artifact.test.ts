import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach,beforeEach,describe,expect,it} from 'vitest';
// @ts-expect-error Pure JS artifact contract is exercised directly.
import {auditArtifact} from '../../scripts/audit-artifact.mjs';

const base='/hse-corporate-finance-2026/';
const icon='assets/favicon-TEST1234.svg';
let root:string;
const html=(icon:string)=>`<link rel="icon" href="${icon}"><script type="module" src="${base}assets/app.js"></script>`;
beforeEach(()=>{
 root=fs.mkdtempSync(path.join(os.tmpdir(),'cflos-favicon-artifact-'));
 fs.mkdirSync(path.join(root,'assets'));
 fs.writeFileSync(path.join(root,'assets/app.js'),'export {};');
 fs.writeFileSync(path.join(root,icon),'<svg xmlns="http://www.w3.org/2000/svg"/>');
 fs.writeFileSync(path.join(root,'index.html'),html(`${base}${icon}`));
 fs.writeFileSync(path.join(root,'build-info.json'),JSON.stringify({commit:'a'.repeat(40),dirty:false,sourceKind:'git',version:'0.3.0',base}));
});
afterEach(()=>fs.rmSync(root,{recursive:true,force:true}));
describe('project favicon artifact boundary',()=>{
 it('includes the local favicon in the audited manifest',()=>{
  const result=auditArtifact(root);
  expect(result.status).toBe('PASS');
  expect(result.files.some((file:{path:string})=>file.path===icon)).toBe(true);
  expect(result.htmlAssetPaths).toContain(`${base}${icon}`);
 });
 it('keeps unrelated SVG files outside the static allowlist',()=>{
  fs.writeFileSync(path.join(root,'assets/other.svg'),'<svg/>');
  const result=auditArtifact(root);
  expect(result.status).toBe('FAIL');
  expect(result.findings).toContainEqual({category:'unexpected-build-file',path:'assets/other.svg',status:'FAIL'});
 });
 it('rejects a linked but missing favicon',()=>{
  fs.unlinkSync(path.join(root,icon));
  expect(auditArtifact(root).findings).toContainEqual({category:'missing-asset',path:`${base}${icon}`,status:'FAIL'});
 });
 it('rejects a favicon reference outside the project base',()=>{
  fs.writeFileSync(path.join(root,'index.html'),html('/favicon.svg'));
  expect(auditArtifact(root).findings).toContainEqual({category:'wrong-pages-base',path:'/favicon.svg',status:'FAIL'});
 });
});
