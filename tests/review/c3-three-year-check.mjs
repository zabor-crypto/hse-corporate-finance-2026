import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const [engineRoot,fixturePath,outputDirectory]=process.argv.slice(2);
if(!engineRoot||!fixturePath||!outputDirectory) throw Error('Usage: node checker.mjs ENGINE_ROOT FIXTURE_PATH PRIVATE_OUTPUT_DIR');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const sourcePath=path.join(engineRoot,'src/engine/finance/three-year.ts');
const bytes=fs.readFileSync(sourcePath);
const {build}=createRequire(path.join(engineRoot,'package.json'))('esbuild');
const bundled=await build({entryPoints:[sourcePath],write:false,bundle:true,format:'esm',platform:'node'});
const actual=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const fixture=JSON.parse(fs.readFileSync(fixturePath,'utf8'));
const mismatches=[];const results=[];let comparisons=0;
for(const [name,test]of Object.entries(fixture.scenarios)){
 const rows=actual.buildThreeYearModel(test.opening,test.policy);
 if(rows.length!==3) throw Error('Expected three modeled years');
 for(let index=0;index<3;index++){
  for(const [field,expected]of Object.entries(test.years[index].values)){
   const observed=rows[index][field];comparisons++;
   const ok=typeof expected==='number'?typeof observed==='number'&&Number.isFinite(observed)&&Math.abs(observed-expected)<=1e-9+1e-12*Math.abs(expected):observed===expected;
   if(!ok)mismatches.push({scenario:name,year:index+1,field,expected,observed});
  }
 }
 results.push({scenario:name,actualRows:rows,independentYears:test.years.map(x=>({exact:x.exact,directCashProof:x.directCashProof}))});
}
const base=fixture.scenarios.base;
const malformedOpening=structuredClone(base.opening);delete malformedOpening.equity;
let malformedOpeningResult;
try{const rows=actual.buildThreeYearModel(malformedOpening,base.policy);malformedOpeningResult={throws:false,nonfiniteRows:rows.filter(r=>Object.values(r).some(v=>typeof v==='number'&&!Number.isFinite(v))).length};}catch(error){malformedOpeningResult={throws:true,error:String(error.message)}}
const domainCases=[['unbalanced-opening',{...base.opening,cash:26},base.policy],['negative-interest-rate',base.opening,{...base.policy,debtRate:-.1}],['tax100',base.opening,{...base.policy,taxRate:1}],['negative-capex',base.opening,{...base.policy,capex:[-1,0,0]}],['zero-sales',base.opening,{...base.policy,sales:[0,250,230]}]];
const domainResults=domainCases.map(([id,opening,policy])=>{try{actual.buildThreeYearModel(opening,policy);return{id,rejected:false}}catch(error){return{id,rejected:true,error:String(error.message)}}});
if(hash(fs.readFileSync(sourcePath))!==hash(bytes))throw Error('Engine bytes changed during independent execution');
fs.mkdirSync(outputDirectory,{recursive:true});
fs.writeFileSync(path.join(outputDirectory,'three-year-reviewed.ts'),bytes);
const record={role:'Independent Finance Reviewer; no author-engine used to generate expected values',engineSHA256:hash(bytes),fixtureSHA256:hash(fs.readFileSync(fixturePath)),comparisons,mismatches,domainResults,malformedOpeningResult,results,status:mismatches.length===0&&domainResults.every(x=>x.rejected)?(malformedOpeningResult.throws?'INDEPENDENT_VALID_SCENARIOS_AND_REQUIRED_OPENING_GUARD_PASS':'INDEPENDENT_VALID_SCENARIOS_PASS_WITH_RECORDED_RUNTIME_SHAPE_FINDING'):'FAIL'};
fs.writeFileSync(path.join(outputDirectory,'three-year-independent-review.json'),JSON.stringify(record,null,2)+'\n');
process.stdout.write(JSON.stringify({status:record.status,comparisons,mismatches:mismatches.length,domainResults,malformedOpeningResult,engineSHA256:record.engineSHA256})+'\n');
if(mismatches.length||domainResults.some(x=>!x.rejected))process.exitCode=1;
