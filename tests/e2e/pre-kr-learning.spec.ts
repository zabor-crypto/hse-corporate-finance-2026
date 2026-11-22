import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { content } from "../../src/runtime/t4-data";
import { baseline, clone, readProgress, seedLegacyProgressBeforeBoot } from "./helpers";
const go=async(page:import('@playwright/test').Page, route:string)=>{await page.goto(`./#/${route}`);await expect(page.locator('main h1').first()).toBeVisible();};

test("early lesson, incorrect selection, relevant new L2, exact help return and independent navigation",async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await go(page,'learn/T4-01');
  await expect(page.locator('a[href="#/practice/T4-L2-01"]')).toHaveCount(2);
  await page.locator('a[href="#/practice/T4-C01"]').first().click();
  const p=content.problems.find(p=>p.id==='T4-C01')!,wrong=p.options!.find(o=>!p.correctOptionIds!.includes(o.id))!;
  await page.getByLabel(wrong.label,{exact:true}).check();
  await page.getByRole('button',{name:'Проверить ответ',exact:false}).click();
  await expect(page.locator('.feedback')).toContainText('Выбранный вариант не соответствует условию');
  await expect(page.locator('.feedback')).toContainText('Первый шаг.');
  await page.locator('.feedback a[href*="learn/"]').click();
  await expect(page).toHaveURL(/#\/learn\/T4-01\/incremental-flow$/);
  await expect(page.getByRole('button',{name:/К заданию · продолжить/})).toBeVisible();
  await page.getByRole('button',{name:/К заданию · продолжить/}).click();
  await expect(page.getByLabel(wrong.label,{exact:true})).toBeChecked();
  await go(page,'progress');
  const entry=page.locator('[data-problem-id="T4-C01"][data-stage-id="selection"]').first();
  await expect(entry.locator('a[href="#/practice/T4-L2-01"]')).toBeVisible();
  await expect(entry).not.toContainText('CONCEPT');
  await entry.locator('a[href="#/practice/T4-L2-01"]').click();
  await page.locator('[id="T4-L2-01-cf0"]').fill('−168');
  await page.getByLabel(/^Единица ответа:/).first().selectOption('million-rub');
  await page.reload();await expect(page.locator('[id="T4-L2-01-cf0"]')).toHaveValue('−168');
  await page.locator('[id="T4-L2-01-cf1"]').fill('45');await page.locator('[id="T4-L2-01-cf2"]').fill('93');
  for(const unit of await page.getByLabel(/^Единица ответа:/).all())await unit.selectOption('million-rub');
  await page.getByRole('button',{name:'Проверить ответ',exact:false}).click();await expect(page.locator('.feedback')).toContainText('100%');
  // A separate explanation visit cannot revive the prior task's return context.
  await go(page,'home/T4');await go(page,'learn/T4-01');await expect(page.getByRole('button',{name:/К заданию · продолжить/})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  if(page.viewportSize()!.width===360)await page.screenshot({path:info.outputPath('early-route-360.png'),fullPage:false});
  expect(errors).toEqual([]);
});

test("specific A03 NPV error falls back to the relevant explanation when its skill bank is exhausted",async({page})=>{
  const data=clone(baseline),originalAnswers=JSON.stringify(data.answers);data.exam=null;
  data.exposures=Object.fromEntries(content.problems.map(p=>[`${p.id}@${p.version}`,{firstSeenAt:'2026-11-01T00:00:00Z',assistanceUsed:false,modes:['practice' as const]}]));
  await page.goto('./build-info.json');await seedLegacyProgressBeforeBoot(page,data);await go(page,'practice/T4-A03');
  await page.locator('[id="T4-A03-npv"]').fill('0');
  await page.getByLabel('Единица ответа: NPV проекта до финансирования',{exact:true}).selectOption('million-rub');
  await page.getByRole('button',{name:'Проверить ответ',exact:false}).click();
  await page.locator('.feedback a[href*="learn/"]').click();
  await expect(page).toHaveURL(/#\/learn\/T4-02\/T4-F-NPV$/);
  await expect(page.locator('[id="T4-F-NPV"]')).toBeInViewport();
  expect(await page.locator('[id="T4-F-NPV"]').evaluate(el=>el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(80);
  await page.getByRole('button',{name:/К заданию · продолжить/}).click();await expect(page.locator('[id="T4-A03-npv"]')).toHaveValue('0');
  await go(page,'progress');const entry=page.locator('[data-problem-id="T4-A03"][data-stage-id="npv"]').first();
  await expect(entry).toContainText('Подходящего нового задания на этот шаг сейчас нет');
  await expect(entry.locator('a[href="#/learn/T4-02/T4-F-NPV"]')).toBeVisible();
  await expect(entry.locator('a[href="#/practice/T4-A03"]')).toBeVisible();
  await expect.poll(async()=>JSON.stringify((await readProgress(page))!.answers.slice(0,data.answers.length))).toBe(originalAnswers);
});

test("two early NPV/PI calculations and MPI explanation remain self-contained without premature IRR",async({page})=>{
  await go(page,'learn/T4-02');await page.locator('a[href="#/practice/T4-L2-02"]').first().click();
  await expect(page.locator('.answer-stage')).toHaveCount(4);
  await expect(page.getByLabel(/IRR/)).toHaveCount(0);
  await page.locator('[id="T4-L2-02-pv-investments"]').fill('150');await page.locator('[id="T4-L2-02-pv-inflows"]').fill('180');
  for(const field of (await page.getByLabel(/^Единица ответа:/).all()).slice(0,3))await field.selectOption('million-rub');
  await page.locator('[id="T4-L2-02-npv"]').fill('30');await page.locator('[id="T4-L2-02-pi"]').fill('1,2');
  await page.getByLabel('Единица ответа: NPV проекта',{exact:true}).selectOption('million-rub');
  await page.getByLabel(/Единица ответа:.*PI/).selectOption('multiple');
  await page.getByRole('button',{name:'Проверить ответ',exact:false}).click();await expect(page.locator('.feedback')).toContainText('100%');
  await go(page,'learn/T4-04/repeat-eaa');
  const example=page.locator('.worked-example').filter({has:page.getByRole('heading',{name:'Те же станки: годовая сумма и индекс MPI',exact:true})});
  await example.getByRole('button',{name:'Показать пошаговый разбор',exact:false}).click();
  await example.getByRole('button',{name:'Далее',exact:false}).click();
  await expect(example).toContainText('1,05942366');await expect(example).toContainText('5,94236579%');
  await example.getByRole('button',{name:'Далее',exact:false}).click();await expect(example).toContainText('4,38948269%');
  await expect(page.locator('main')).toContainText('16,60022516');await expect(page.locator('main')).toContainText('тыс. ₽');
});


test("late route focus preserves a newly focused answer and immediate reload",async({page})=>{
  await go(page,'home/T4');
  // Hold only the next navigation focus frame. Native frames resume immediately.
  await page.evaluate(()=>{
    const native=window.requestAnimationFrame;
    window.requestAnimationFrame=callback=>{
      window.requestAnimationFrame=native;
      (window as any).__releaseNavigationFocus=()=>callback(performance.now());
      return 0;
    };
    location.hash='#/practice/T4-L2-01';
  });
  const field=page.locator('[id="T4-L2-01-cf0"]');await field.waitFor();await field.focus();
  await page.evaluate(()=>{if(typeof (window as any).__releaseNavigationFocus!=='function')throw Error('Navigation frame was not captured');(window as any).__releaseNavigationFocus();});
  await expect(field).toBeFocused();
  await page.keyboard.insertText('−168');
  await page.getByLabel(/^Единица ответа:/).first().selectOption('million-rub');
  await page.reload();await expect(field).toHaveValue('−168');
});
