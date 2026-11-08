import { it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Curriculum } from "../../src/views/Curriculum";
import {
  curriculumRegistry,
  createCurriculumRegistry,
} from "../../src/curriculum";
import { topics, lessons } from "../../src/content";

it("renders two distinct future fixture lessons without changing UI code or public curriculum", () => {
  const saved = structuredClone(curriculumRegistry),
    topicCount = topics.length,
    lessonCount = lessons.length;
  const future = {
    ...topics[0],
    id: "TEST-T4-TOPIC",
    title: "TEST ONLY — неизвестная будущая тема",
    summary: "Непубликуемый синтетический fixture.",
    prerequisites: [],
    lessonIds: ["TEST-L-A", "TEST-L-B"],
    questionIds: [],
    seminarIds: [],
    sourceRefs: [],
  };
  const children = future.lessonIds.map((id, i) => ({
    ...lessons[0],
    id,
    version: "1.0.0",
    title: `TEST ONLY — урок ${i + 1}`,
    sections: [],
    sourceRefs: [],
    practiceIds: [],
  }));
  try {
    topics.push(future);
    lessons.push(...children);
    Object.assign(
      curriculumRegistry,
      createCurriculumRegistry(
        { topics: [future], lessons: children, formulas: [], problems: [] },
        {
          modules: [
            { id: "TEST-T4", title: future.title, lessonIds: future.lessonIds },
          ],
          reviewedLessonVersions: Object.fromEntries(
            children.map((l) => [l.id, l.version]),
          ),
        },
      ),
    );
    const html = renderToStaticMarkup(createElement(Curriculum));
    expect(html).toContain("TEST ONLY — неизвестная будущая тема");
    for (const l of children) {
      expect(html).toContain(`href="#/learn/${l.id}"`);
      expect(html).toContain(`Изучить: ${l.title}`);
    }
  } finally {
    topics.splice(topicCount);
    lessons.splice(lessonCount);
    Object.assign(curriculumRegistry, saved);
  }
  expect(curriculumRegistry.modules.map((m) => m.id)).toEqual(["T3"]);
  expect(topics.some((t) => t.id === future.id)).toBe(false);
});
