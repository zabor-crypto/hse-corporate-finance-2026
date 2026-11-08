import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  sourceLabel,
  Sources,
  readingProgress,
  objectiveProgress,
  publishedLessonContent,
  publishedProblemContent,
  publishedFormulaContent,
} from "../../src/components/Common";
import { Home } from "../../src/views/Home";
import { curriculumRegistry, availableLessons } from "../../src/curriculum";
import { LessonView } from "../../src/views/LessonView";
import { Curriculum } from "../../src/views/Curriculum";
import { lessons, problems, seminarMap } from "../../src/content";
import { blankProgress, type AnswerRecord } from "../../src/storage/progress";

describe("student-facing curriculum and progress semantics", () => {
  it("renders explicit public external references once and keeps lecture PDFs private", () => {
    const external = {
      kind: "external" as const,
      label: "IFRS Foundation · обзор",
      url: "https://www.ifrs.org/issued-standards/",
      sourceVersionId: "test-external",
    };
    const html = renderToStaticMarkup(
      createElement(Sources, {
        refs: [
          external,
          external,
          { kind: "lecture", label: "Лекции 1–4", pages: [71] },
        ],
      }),
    );
    expect(
      html.match(/href="https:\/\/www.ifrs.org\/issued-standards\/"/g),
    ).toHaveLength(1);
    expect(html).toContain("Материалы преподавателя — частные PDF");
    expect(html).not.toContain('href="Лекции');
  });
  it("shows private references once without making inaccessible PDF links", () => {
    const ref = {
      kind: "lecture" as const,
      label: "Лекции 1–4 · слайды 78, 79",
      pages: [78, 79],
    };
    expect(sourceLabel(ref)).toBe("Лекции 1–4 · слайды 78, 79");
    const html = renderToStaticMarkup(
      createElement(Sources, { refs: [ref, ref] }),
    );
    expect(html.match(/слайды 78, 79/g)).toHaveLength(1);
    expect(html).toContain("частные PDF");
    expect(html).not.toContain("href=");
    expect(
      sourceLabel({
        kind: "seminar",
        label: "Семинар 3 · задача 3.1",
        seminar: "3.1",
      }),
    ).toBe("Семинар 3 · задача 3.1");
  });
  it("counts only current lesson versions and latest current practice answers, including selections", () => {
    const data = blankProgress();
    const l = lessons[0],
      p = problems.find((p) => p.type === "single")!;
    data.lessons[`${l.id}@old`] = "2026-01-01T00:00:00Z";
    data.lessons["UNKNOWN@1"] = "2026-01-01T00:00:00Z";
    expect(readingProgress(data)).toBe(0);
    data.lessons[`${l.id}@${l.version}`] = "2026-01-02T00:00:00Z";
    expect(readingProgress(data)).toBe(1);
    expect(readingProgress(data, "T3")).toBe(1);
    expect(readingProgress(data, "TEST-UNKNOWN-MODULE")).toBe(0);
    const answer = (
      id: string,
      score: number,
      timestamp: string,
      overrides: Partial<AnswerRecord> = {},
    ) =>
      ({
        id,
        score,
        timestamp,
        mode: "practice",
        problemId: p.id,
        version: p.version,
        ...overrides,
      }) as AnswerRecord;
    data.answers = [
      answer("a", 1, "2026-01-01T00:00:00Z"),
      answer("b", 0, "2026-01-02T00:00:00Z"),
      answer("c", 1, "2026-01-03T00:00:00Z", { mode: "study" }),
      answer("d", 1, "2026-01-04T00:00:00Z", { version: "old" }),
    ];
    expect(objectiveProgress(data)).toBe(0);
    data.answers.push(answer("e", 1, "2026-01-02T00:00:00Z"));
    expect(objectiveProgress(data)).toBe(1);
  });
  it("resolves publication decisions before counting or rendering compiled content", () => {
    const published = publishedLessonContent();
    expect(published.map((l) => l.id)).toEqual(
      availableLessons().map((l) => l.id),
    );
    const extra = {
      ...lessons[0],
      id: "TEST-ONLY-DRAFT",
      title: "Unreviewed fixture",
    };
    const historical = { ...lessons[0], version: "0.0.0" };
    expect(publishedLessonContent([...lessons, extra, historical])).toEqual(
      published,
    );
    const pending = { ...problems[0], id: "TEST-ONLY-PROBLEM" };
    expect(publishedProblemContent([...problems, pending])).toEqual(problems);
    expect(
      publishedFormulaContent().every((f) =>
        published.some((l) => l.id === f.lessonId),
      ),
    ).toBe(true);
    const unavailable = curriculumRegistry.lessons[0];
    const before = {
      reviewStatus: unavailable.reviewStatus,
      availability: unavailable.availability,
    };
    unavailable.reviewStatus = "DRAFT";
    unavailable.availability = "unavailable";
    try {
      const html = renderToStaticMarkup(
        createElement(LessonView, {
          id: unavailable.id,
          data: blankProgress(),
          update: () => {},
        }),
      );
      expect(html).toContain("Этот раздел пока недоступен");
      expect(html).not.toContain("lesson-body");
    } finally {
      Object.assign(unavailable, before);
    }
  });
  it("renders available counts and human seminar competency cards instead of serialized schema", () => {
    const html = renderToStaticMarkup(createElement(Curriculum));
    expect(html).toContain(`Доступно ${lessons.length} учебных разделов`);
    expect(html.match(/competency-card/g)).toHaveLength(seminarMap.length);
    expect(html).toContain("Что требуется");
    expect(html).toContain("Перед расчётом");
    expect(html).not.toMatch(
      /Полная трёхлетняя модель пока не реализована|ПолныйT3-09 не выпущен/,
    );
    expect(html).toContain("C3-M01");
    expect(html).toContain("C3-Q08");
    expect(html).toContain("не являются единственным решением");
    expect(seminarMap.find((s) => s.id === "3.7")?.status).toBe(
      "needs-assumptions",
    );
    expect(seminarMap.find((s) => s.id === "3.8")?.status).toBe("implemented");
    expect(html).not.toMatch(/Два подраздела|MVP|topicIds|needs-assumptions/);
    const home = renderToStaticMarkup(
      createElement(Home, { data: blankProgress(), doneLessons: 0 }),
    );
    expect(home).toContain("последний ответ верен");
    expect(home).not.toContain("верным числовым ответом");
    expect(home).toContain("не считаются разными компетенциями");
  });
});
