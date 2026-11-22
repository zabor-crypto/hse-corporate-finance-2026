import {t4AdvancedProblems,t4TransferProblems} from "../../src/content/t4";
import {unitPolicy} from "../../src/engine/grading/units";
import {test,expect} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {readFileSync} from "node:fs";
import {readProgress,exportProgress,importProgress} from "./helpers";
const advancedKeys=JSON.parse(readFileSync(new URL("../fixtures/t4-advanced-independent.json",import.meta.url),"utf8")) as {values:{problemId:string;stageId:string;expected:string}[]};

const go=async(page:import('@playwright/test').Page,route:string)=>{await page.goto(`./#/${route}`);await expect(page.locator('main h1').first()).toBeVisible();};
test("lesson → wrong decision → targeted help → new task → author mock → portable result",async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await go(page,'home');await expect(page.locator('.hero-card')).toContainText('Инвестиционная оценка');
 await go(page,'learn/T4-02');await expect(page.locator('h1')).toContainText('Что проект стоит сегодня');
 await page.locator('a[href="#/practice/T4-A04"]').first().click();
 await page.locator('[id="T4-A04-npv"]').fill('0');await page.getByLabel(/^Единица ответа:/).first().selectOption('million-rub');
 await page.getByRole('button',{name:'Проверить ответ',exact:false}).click();await expect(page.locator('.feedback')).toContainText('0%');
 await page.locator('.feedback a[href*="learn/"]').first().click();await expect(page.locator('main h1')).toContainText('Что проект стоит сегодня');
 await page.getByRole('button',{name:/К заданию/}).click();await expect(page.locator('[id="T4-A04-npv"]')).toHaveValue('0');
 await go(page,'practice/T4-A06');await expect(page.locator('[id="T4-A06-annual-fcf"]')).toBeVisible();
 await page.locator('[id="T4-A06-annual-fcf"]').fill('12,2');await page.locator('[id="T4-A06-npv"]').fill('1,055662029');
 for(const select of await page.getByLabel(/^Единица ответа:/).all())await select.selectOption('million-rub');
 await page.getByRole('button',{name:'Проверить ответ',exact:false}).click();await expect(page.locator('.feedback')).toContainText('100%');
 await go(page,'exam/T4');await page.getByRole('button',{name:'Собрать T4-MOCK-CORE'}).click();await expect(page.getByLabel('Паспорт контрольной')).toContainText('T4-MOCK-CORE');
 await expect(page.locator('.feedback')).toHaveCount(0);await expect(page.locator('.hint')).toHaveCount(0);
 await page.getByRole('button',{name:'Завершить и проверить'}).click();await expect(page.locator('main h1')).toContainText('Числа и выбор вариантов');
 await page.screenshot({path:info.outputPath('t4-mock-result.png'),fullPage:true});
 const exported=await exportProgress(page);expect(exported.answers.some(a=>a.problemId==='T4-A06'&&a.score===1)).toBe(true);expect(exported.exam?.paper?.blueprint.id).toBe('T4-MOCK-CORE');
 await importProgress(page,exported);await expect.poll(async()=>{const p=await readProgress(page);return p?.answers.length;}).toBe(exported.answers.length);
 const restored=await readProgress(page);expect(restored?.answers).toEqual(exported.answers);await page.reload();await expect(page.getByRole('heading',{name:'Каждая ошибка — следующий шаг.',exact:true})).toBeVisible();
 expect(errors).toEqual([]);
});

test("raw decimal prefixes survive synchronous lifecycle flush and reload",async({page})=>{
 await go(page,'practice/T4-A04');const input=page.locator('[id="T4-A04-npv"]');
 for(const raw of ['1.','1,','−']){await input.fill(raw);await expect(input).toHaveValue(raw);await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await page.reload();await expect(input).toHaveValue(raw);}
 await go(page,'ratios');const sales=page.getByLabel('Выручка, млн ₽',{exact:true});for(const raw of ['1.','1,','−','1,25']){await sales.fill(raw);await expect(sales).toHaveValue(raw);}
});

test("module isolation, legacy anchor and narrow keyboard accessibility",async({page},info)=>{
 const requests:string[]=[];page.on('request',r=>requests.push(r.url()));
 await go(page,'learn/T3-03');
 // Use an actual retained old anchor selected from the baseline fixture, rather than inventing one.
 const baseline=JSON.parse(readFileSync(new URL('../fixtures/public-v040-baseline-objects.json',import.meta.url),'utf8'));expect(baseline.lessons['T3-03']).toBeTruthy();
 await expect(page.locator('.lesson-reference summary')).toHaveCount(1);
 const mobileToc=page.locator('details.mobile-toc');const desktop=await page.locator('aside.toc').isVisible();
 if(!desktop)await mobileToc.locator('summary').click();
 const primaryLinks=(desktop?page.locator('aside.toc'):mobileToc).locator('a[href*="/path-"]');const primaryHref=await primaryLinks.first().getAttribute('href');
 await primaryLinks.first().click();await expect(page.locator(`[id="${primaryHref!.split('/').at(-1)}"]`)).toBeInViewport();
 await page.getByRole('button',{name:'Открыть полный справочник',exact:true}).click();
 await expect(page.locator('.lesson-reference[open]>summary')).toBeInViewport();await expect(page.locator('.lesson-reference>summary')).toBeFocused();
 const nextPrimary=primaryLinks.last();const nextHref=await nextPrimary.getAttribute('href');await nextPrimary.click();await expect(page.locator(`[id="${nextHref!.split('/').at(-1)}"]`)).toBeInViewport();
 const firstAnchor=await page.locator('.lesson-reference .lesson-section').first().getAttribute('id');expect(firstAnchor).toBeTruthy();
 await go(page,`learn/T3-03/${firstAnchor}`);await expect(page.locator('.lesson-reference[open]')).toBeVisible();await expect(page.locator(`[id="${firstAnchor}"]`)).toBeVisible();
 expect(requests.some(u=>/t4-pack[^/]*\.js/.test(u))).toBe(false);
 await page.keyboard.press('Tab');await page.getByRole('link',{name:'К содержанию',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.locator('main')).toBeFocused();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 await page.screenshot({path:info.outputPath('t3-primary-and-reference.png'),fullPage:true});
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(axe.violations).toEqual([]);
});

test("expanded decision mock accepts independently frozen final answers and preserves its passport",async({page},info)=>{
 await go(page,'exam/T4');await page.getByRole('button',{name:'Собрать T4-MOCK-DECISIONS'}).click();
 await expect.poll(async()=> (await readProgress(page))?.exam?.paper?.blueprint.id).toBe('T4-MOCK-DECISIONS');
 const session=(await readProgress(page))!.exam!;const bank=[...t4AdvancedProblems,...t4TransferProblems];
 for(let i=0;i<session.problemIds.length;i++){
  await page.getByRole('button',{name:`Вопрос ${i+1}`,exact:true}).click();
  const p=bank.find(p=>p.id===session.problemIds[i])!;
  for(const id of p.independent?.stageIds??[]){const row=advancedKeys.values.find(r=>r.problemId===p.id&&r.stageId===id)!;expect(row).toBeTruthy();const stage=p.stages.find(s=>s.id===id)!;await page.locator(`[id="${p.id}-${id}"]`).fill(row.expected);await page.getByLabel(`Единица ответа: ${stage.label}`,{exact:true}).selectOption(unitPolicy(stage.unit).referenceUnit);}
 }
 await page.getByRole('button',{name:'Завершить и проверить'}).click();await expect(page.locator('main h1')).toHaveText('Числа и выбор вариантов: 100%');
 const exported=await exportProgress(page);expect(exported.exam?.paper?.blueprint.id).toBe('T4-MOCK-DECISIONS');expect(exported.exam?.paper?.problemIds).toEqual(session.paper?.problemIds);expect(exported.answers.filter(a=>a.mode==='exam').every(a=>a.objectiveScore===1)).toBe(true);
 await page.screenshot({path:info.outputPath('t4-expanded-result-history.png'),fullPage:true});
});
