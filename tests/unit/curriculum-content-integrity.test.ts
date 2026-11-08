import { it, expect } from "vitest";
import * as content from "../../src/content";
import { curriculumRegistry } from "../../src/curriculum";
import { contentLinkFindings } from "../../src/curriculum/content-integrity";
it("checks actual compiled section, formula, problem, version and evaluated-stage links", () =>
  expect(contentLinkFindings(content, curriculumRegistry)).toEqual([]));
it("detects missing targeted reference and nonfinite key before build", () => {
  const problem = structuredClone(content.problems[0]);
  problem.theorySectionId = "NOT_A_SECTION";
  problem.stages = [
    {
      id: "bad",
      expected: NaN,
      label: "bad",
      unit: "НЕ_ЕДИНИЦА",
      tolerance: -1,
      weight: 1,
      hint: "",
      solution: "",
      errorCode: "BAD",
    },
  ];
  const errors = contentLinkFindings(
    { ...content, problems: [problem] },
    curriculumRegistry,
  ).join(" ");
  expect(errors).toContain("missing targeted section");
  expect(errors).toContain("invalid numeric contract");
  expect(errors).toContain("unsupported reference unit");
});
