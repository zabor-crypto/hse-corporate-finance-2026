import { it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Feedback } from "../../src/components/Problem";
import {
  blankProgress,
  validProgress,
  type AnswerRecord,
} from "../../src/storage/progress";
import type { Problem } from "../../src/content/types";
const snapshot = {
  id: "old",
  version: "1",
  title: "Historical minimal snapshot",
  solution: ["Reference"],
  stages: [
    {
      id: "value",
      label: "Result",
      expected: 1,
      unit: "млн ₽",
      solution: "Reference",
    },
  ],
};
const record: AnswerRecord = {
  id: "old-a",
  problemId: "old",
  version: "1",
  mode: "exam",
  timestamp: "2026-11-06T10:00:00Z",
  stageResults: [{ id: "value", correct: false, score: 0, errorCode: "VALUE" }],
  userResponse: { values: { value: "0" }, selected: [] },
  score: 0,
  errorCodes: ["VALUE"],
  verificationStatus: "LEGACY",
  problemSnapshot: snapshot,
};
it("renders an accepted historical snapshot without optional diagnostic metadata", () => {
  const data = { ...blankProgress(), answers: [record] };
  expect(validProgress(data)).toBe(true);
  const html = renderToStaticMarkup(
    createElement(Feedback, {
      p: snapshot as unknown as Problem,
      result: record,
    }),
  );
  expect(html).toContain("Историческая запись");
  expect(html).toContain("0%");
});
it.each([{ commonErrors: "bad" }, { formulaIds: 42 }, { lessonId: 42 }])(
  "rejects malformed optional diagnostic metadata on import: %j",
  (extra) => {
    const data = {
      ...blankProgress(),
      answers: [{ ...record, problemSnapshot: { ...snapshot, ...extra } }],
    };
    expect(validProgress(data)).toBe(false);
  },
);
