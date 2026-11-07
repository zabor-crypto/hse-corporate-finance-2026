import fs from 'node:fs';import crypto from 'node:crypto';import {createRequire} from 'node:module';
const root=process.argv[2]||process.cwd();const {build}=createRequire(root+'/package.json')('esbuild');const path=root+'/src/engine/grading/units.ts';const source=fs.readFileSync(path);const b=await build({entryPoints:[path],bundle:true,write:false,format:'esm',platform:'node'});const f=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));const cases=[];
// Independent finite decimal conversions: monetary canonical RUB; rates fractions; rate differences percentage points.
function test(name,input,expected){const actual=f.gradeWithUnits(input);let pass=actual.correct===expected.correct&&actual.errorCode===(expected.code??null);for(const key of ['canonicalResponse','canonicalExpected','canonicalTolerance'])if(Object.hasOwn(expected,key))pass=pass&&(expected[key]===null?actual[key]===null:Math.abs(actual[key]-expected[key])<=1e-9*Math.max(1,Math.abs(expected[key])));if(expected.unitStatus)pass=pass&&actual.unitStatus===expected.unitStatus;cases.push({name,input,expected,actual,pass});}
const money={expected:.5,referenceUnit:'млн ₽',tolerance:.01};
for(const [v,u] of [['0,5','million-rub'],['500','thousand-rub'],['500000','rub']])test('Same500000RUB '+u,{...money,response:v,responseUnit:u},{correct:true,canonicalResponse:500000,canonicalExpected:500000,canonicalTolerance:10000});
test('Negative NWC cash effect thousands',{response:'−3000',responseUnit:'thousand-rub',expected:-3,referenceUnit:'млн ₽',tolerance:.01},{correct:true,canonicalResponse:-3000000,canonicalExpected:-3000000,canonicalTolerance:10000});
test('Opposite sign',{response:'3000',responseUnit:'thousand-rub',expected:-3,referenceUnit:'млн ₽',tolerance:.01},{correct:false,code:'SIGN'});
test('Thousandmillion scale .001',{...money,response:'.5',responseUnit:'thousand-rub'},{correct:false,code:'SCALE',canonicalResponse:500});
test('Millionthousand scale1000',{...money,response:'500',responseUnit:'million-rub'},{correct:false,code:'SCALE',canonicalResponse:500000000});
for(const [v,correct] of [['510000',true],['510001',false],['490000',true],['489999',false]])test('Absolute tolerance canonicalRUB '+v,{...money,response:v,responseUnit:'rub'},{correct,code:correct?null:'VALUE'});
const rate={expected:20,referenceUnit:'%',tolerance:.01};
for(const [v,u]of[['20','percent'],['0,20','fraction']])test('20percent is0.20 '+u,{...rate,response:v,responseUnit:u},{correct:true,canonicalResponse:.2,canonicalExpected:.2,canonicalTolerance:.0001});
test('20asfraction not20percent',{...rate,response:'20',responseUnit:'fraction'},{correct:false,code:'SCALE'});
test('.20aspercent not20percent',{...rate,response:'.20',responseUnit:'percent'},{correct:false,code:'SCALE'});
test('Fraction reference acceptspercent',{response:'20',responseUnit:'percent',expected:.2,referenceUnit:'fraction',tolerance:.0001},{correct:true,canonicalResponse:.2,canonicalExpected:.2,canonicalTolerance:.0001});
const pp={expected:5,referenceUnit:'п.п.',tolerance:.01};
for(const [v,u]of[['5','percentage-point'],['.05','fraction-point']])test('5pp means0.05 absolute ratechange '+u,{...pp,response:v,responseUnit:u},{correct:true,canonicalResponse:5,canonicalExpected:5,canonicalTolerance:.01});
test('Relative5percent not5percentagepoints',{...pp,response:'5',responseUnit:'percent'},{correct:false,code:'UNIT_DIMENSION',unitStatus:'INCOMPATIBLE'});
test('Rate fraction notrate-difference',{...pp,response:'.05',responseUnit:'fraction'},{correct:false,code:'UNIT_DIMENSION'});
test('Rate difference notratelevel',{...rate,response:'20',responseUnit:'percentage-point'},{correct:false,code:'UNIT_DIMENSION'});
for(const u of ['multiple','ratio-fraction'])test('2.4dimensionless ratio '+u,{response:'2.4',responseUnit:u,expected:2.4,referenceUnit:'раз',tolerance:.01},{correct:true,canonicalResponse:2.4});
test('Ratepercent notautomaticallyratio',{response:'240',responseUnit:'percent',expected:2.4,referenceUnit:'раз',tolerance:.01},{correct:false,code:'UNIT_DIMENSION'});
test('Days numeric',{response:'45',responseUnit:'day',expected:45,referenceUnit:'дни',tolerance:.1},{correct:true,canonicalResponse:45});
test('Dimensionmoneyvsdays',{response:'45',responseUnit:'rub',expected:45,referenceUnit:'дни',tolerance:.1},{correct:false,code:'UNIT_DIMENSION'});
for(const u of [undefined,''])test('Unitmissing '+String(u),{...money,response:'0.5',responseUnit:u},{correct:false,code:'UNIT_REQUIRED',unitStatus:'MISSING'});
for(const u of ['hours','constructor','__proto__'])test('Unitunknown '+u,{...money,response:'0.5',responseUnit:u},{correct:false,code:'UNIT_UNKNOWN',unitStatus:'INVALID'});
for(const v of ['500 тыс. ₽','Infinity','NaN','1 2','1e309'])test('Reject malformed number '+v,{...money,response:v,responseUnit:'million-rub'},{correct:false,code:'INVALID_NUMBER'});
test('Blankvalue',{...money,response:' ',responseUnit:'million-rub'},{correct:false,code:'EMPTY_RESPONSE'});
test('Russian thousands valid',{response:'1 000,5',responseUnit:'thousand-rub',expected:1.0005,referenceUnit:'млн ₽',tolerance:.00001},{correct:true,canonicalResponse:1000500});
test('Scientificnotation conversion',{response:'2e-1',responseUnit:'fraction',expected:20,referenceUnit:'%',tolerance:.001},{correct:true,canonicalResponse:.2});
const inverse={expected:18.4411764705882,referenceUnit:'%',tolerance:.001};
test('InverseROCfraction',{...inverse,response:'.184411764705882',responseUnit:'fraction'},{correct:true});test('InverseROCrounded18.441',{...inverse,response:'18.441',responseUnit:'percent'},{correct:true});test('InverseROCoverrounded18.44',{...inverse,response:'18.44',responseUnit:'percent'},{correct:false,code:'VALUE'});

test('Coverage20ratiopercent equals0.2multiple',{response:'20',responseUnit:'ratio-percent',expected:.2,referenceUnit:'раз',tolerance:.001},{correct:true,canonicalResponse:.2});
test('Ratiopercentnotratepercent',{response:'20',responseUnit:'ratio-percent',expected:20,referenceUnit:'%',tolerance:.01},{correct:false,code:'UNIT_DIMENSION'});
test('Ratiopercentboundary',{response:'20.1',responseUnit:'ratio-percent',expected:.2,referenceUnit:'раз',tolerance:.001},{correct:true});
test('Ratiopercentoutsideboundary',{response:'20.1001',responseUnit:'ratio-percent',expected:.2,referenceUnit:'раз',tolerance:.001},{correct:false,code:'VALUE'});
for(const patch of [{tolerance:-1},{tolerance:Infinity},{expected:Infinity},{referenceUnit:'kWh'}]){try{f.gradeWithUnits({...money,response:'.5',responseUnit:'million-rub',...patch});cases.push({name:'Rejectinvalidgradingpolicy',patch,pass:false});}catch(e){cases.push({name:'Rejectinvalidgradingpolicy',patch,actual:e.message,pass:true});}}
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');const result={role:'Independent Financial Reviewer',scope:'Explicit unit conversions and dimensions; independent numeric fixtures not author grader as oracle',file:{path,sha256:sha(source)},sourceSnapshot:source.toString(),counts:{assertions:cases.length,passed:cases.filter(c=>c.pass).length,failed:cases.filter(c=>!c.pass).length},cases,openFindings:cases.filter(c=>!c.pass),semantics:['Money converts by1000/1000000 toRUB','20percent equals0.20 ratefraction','5percentagepoints equals0.05 fraction-point but not relative5percent','ratio-fraction andmultiple share scale; ratesnotimplicitlyconvertedtoratios','Missingunits cannot be established by copying expectedunit']};const out=process.argv[3];if(!out)throw Error('Private output directory required');fs.mkdirSync(out,{recursive:true});if(sha(fs.readFileSync(path))!==sha(source))throw Error('Source changed during review');fs.writeFileSync(out+'/units-current-independent-review.json',JSON.stringify(result,null,2));fs.writeFileSync(out+'/units-reviewed.ts',source);console.log(JSON.stringify(result.counts));console.log(JSON.stringify(result.openFindings));if(result.counts.failed)process.exitCode=1;
