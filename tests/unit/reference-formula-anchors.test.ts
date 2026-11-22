import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { lessons } from "../../src/content";
import { LessonSections } from "../../src/components/LessonSections";

it.each(lessons)("$id retains repeated reference cards with one stable anchor per formula", (lesson) => {
  const html = renderToStaticMarkup(createElement(LessonSections, { sections: lesson.sections }));
  const formulaIds = lesson.sections.flatMap(section => section.formulaIds ?? []);
  const articleTags = [...html.matchAll(/<article\b[^>]*class="formula-card"[^>]*>/g)].map(match => match[0]);
  expect(articleTags).toHaveLength(formulaIds.length);
  const anchors = articleTags.flatMap(tag => [...tag.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  expect(anchors).toEqual([...new Set(formulaIds)]);
  for (const section of lesson.sections) expect(html).toContain(`id="${section.id}"`);
});
