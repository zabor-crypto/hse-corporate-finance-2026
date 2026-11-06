import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {calcRatioRelationships,type RatioRelationshipsInput} from '../../src/engine/finance/ratios';
const fixtures=JSON.parse(readFileSync(new URL('../fixtures/ratios-independent-oracles.json',import.meta.url),'utf8')) as {scenarios:{name:string;input:RatioRelationshipsInput;expected:Record<string,number|null>}[]};
describe('independently computed financial scenarios',()=>{
 for(const item of fixtures.scenarios)it(item.name,()=>{const result=calcRatioRelationships(item.input) as unknown as Record<string,unknown>;for(const [key,expected] of Object.entries(item.expected)){if(expected===null)expect(result[key]).toBeNull();else expect(result[key],key).toBeCloseTo(expected,10);}});
});
import {problems} from '../../src/content';
const questions=JSON.parse(readFileSync(new URL('../fixtures/ratios-question-oracles.json',import.meta.url),'utf8')) as {problems:{id:string;version:string;stages?:{id:string;expected:number;unit:string;tolerance:number}[];correctOptionIds?:string[]}[]};
describe('independently reviewed question keys',()=>{for(const oracle of questions.problems)it(oracle.id,()=>{const p=problems.find(p=>p.id===oracle.id)!;expect(p).toBeDefined();expect(p.version).toBe(oracle.version);for(const s of oracle.stages??[]){const actual=p.stages.find(x=>x.id===s.id)!;expect(actual.expected).toBeCloseTo(s.expected,10);expect(actual.unit).toBe(s.unit);expect(actual.tolerance).toBe(s.tolerance);}if(oracle.correctOptionIds)expect([...p.correctOptionIds!].sort()).toEqual([...oracle.correctOptionIds].sort());});});
