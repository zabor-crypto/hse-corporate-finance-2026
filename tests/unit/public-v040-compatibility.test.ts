import{it,expect}from'vitest';import{createHash}from'node:crypto';
import baseline from'../fixtures/public-v040-baseline-objects.json';
import{topics,lessons,formulas,problems}from'../../src/content';import{c3Blueprints}from'../../src/curriculum/blueprints';
const canonical=(v:unknown):string=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical((v as Record<string,unknown>)[k])).join(',')+'}':JSON.stringify(v);
it('preserves every original public v0.4.0 ID/version and complete content object',()=>{for(const[k,rows]of Object.entries({topics,lessons,formulas,problems,blueprints:c3Blueprints})){const expected=baseline[k as keyof typeof baseline] as Record<string,string>;expect(rows.map(r=>r.id).sort()).toEqual(Object.keys(expected).sort());for(const row of rows)expect(createHash('sha256').update(canonical(row)).digest('hex'),`${k}/${row.id}`).toBe(expected[row.id]);}});
