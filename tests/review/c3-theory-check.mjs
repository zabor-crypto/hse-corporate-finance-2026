import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import{createRequire}from'node:module';
const[root,fixtureFile,out]=process.argv.slice(2);if(!root||!fixtureFile||!out)throw Error('ENGINE_ROOT FIXTURE_FILE PRIVATE_OUTPUT_DIR required');
const source=path.join(root,'src/content/c3-theory.ts'),before=fs.readFileSync(source),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const{build}=createRequire(path.join(root,'package.json'))('esbuild');const b=await build({entryPoints:[source],write:false,bundle:true,format:'esm',platform:'node'});const actual=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const fb=await build({entryPoints:[path.join(root,'src/content/index.ts')],write:false,bundle:true,format:'esm',platform:'node'});const foundation=await import('data:text/javascript;base64,'+Buffer.from(fb.outputFiles[0].text).toString('base64'));const formulaIds=new Set(foundation.formulas.map(f=>f.id));
const expected=JSON.parse(fs.readFileSync(fixtureFile));const failures=[];const rows=[];const assert=(v,why)=>{if(!v)failures.push(why)};
assert(actual.c3TheoryProblems.length===40,'Exactly40theoryproblems');assert(actual.c3TheorySpecs.length===40,'Exactly40specs');
for(const item of expected.items){const p=actual.c3TheoryProblems.find(p=>p.id===item.id);assert(!!p,item.id+' exists');if(!p)continue;const index=Number(item.id.slice(-2))-1,s=actual.c3TheorySpecs[index];
 assert(JSON.stringify([...p.correctOptionIds].sort())===JSON.stringify([...item.correctOptionIds].sort()),item.id+' independently derived key');
 assert(p.options.length===4&&new Set(p.options.map(o=>o.id)).size===4,item.id+' four unique choices');
 assert(p.type===(item.correctOptionIds.length===1?'single':'multi'),item.id+' type matches independent key');
 assert(p.prompt===p.independent.prompt,item.id+' context is same in both modes');assert(p.prompt.includes('денежные суммы — в млн ₽; потоки — за один год'),item.id+' monetary and period context');
 assert(s.pages.every(n=>Number.isInteger(n)&&n>=62&&n<=96),item.id+' actual reviewed source range');
 assert(p.formulaIds.every(id=>formulaIds.has(id)),item.id+' linked formula IDs exist');
 rows.push({formulaIds:p.formulaIds,id:p.id,expectedKey:item.correctOptionIds,actualKey:p.correctOptionIds,optionReasoning:item.optionReasoning,numericDerivations:expected.numericDerivations[item.id]??null,sourcePages:s.pages,sourceRefs:p.sourceRefs,version:p.version});
}
const specs=actual.c3TheorySpecs;
assert(specs[3].explanation.includes('пропускает начальный запас'),'T04 omission diagnosis fixed');
assert(specs[11].options[3]==='98'&&specs[11].explanation.includes('80+8+15−5'),'T12 exact incorrect-route98 fixed');
assert(specs[23].pages.includes(83)&&specs[23].explanation.includes('ошибочно оставляет запасы'),'T24 source and false quick-assets route fixed');
assert(specs[21].pages.includes(81),'T22 direct value creation source81');
assert(specs[33].question.includes('10 млн обычных акций')&&specs[33].question.includes('NI за прошедший год'),'T34 share scale and time');
assert(specs[30].question.includes('10 ₽ на акцию'),'T31 per-share dividend units');
if(hash(fs.readFileSync(source))!==hash(before))throw Error('Source changed during review');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'c3-theory-reviewed.ts'),before);
fs.writeFileSync(path.join(out,'c3-theory-reviewed-corpus.json'),JSON.stringify({specs:actual.c3TheorySpecs,problems:actual.c3TheoryProblems},null,2)+'\n');
const report={role:'IndependentFinanceReviewer',sourceSHA256:hash(before),fixtureSHA256:hash(fs.readFileSync(fixtureFile)),status:failures.length?'FAIL':'ALL40_KEYS_160_OPTIONS_AND_NUMERIC_DERIVATIONS_REVIEWED',counts:{items:rows.length,optionDecisions:rows.length*4,numericDerivationItems:Object.keys(expected.numericDerivations).length},failures,rows,limits:['Conceptual judgments were made by independent reviewer; this script verifies deterministic linkage, not semantic learning or teacher approval.','Question-targeting completeness remains a separate integration gate: T04/05 current generic income support, T34 ROE-only support and T35–37 empty formulaIds need new chapter references where appropriate.',
'Root-created draft status remains pending until integration chooses the documented finance review transition.','Initial pre-fix theory file was read but not independently snapshotted before correction; historical issues retained without a fabricated preimage hash.']};
fs.writeFileSync(path.join(out,'c3-theory-independent-review.json'),JSON.stringify(report,null,2)+'\n');process.stdout.write(JSON.stringify({status:report.status,counts:report.counts,failures,sourceSHA256:report.sourceSHA256})+'\n');if(failures.length)process.exitCode=1;
