import { it, expect } from "vitest";
import {
  courseTargetExists,
  assertCourseTarget,
  coursePacks,
} from "../e2e/course-targets";
import type { Page } from "@playwright/test";
it("route evidence rejects unknown IDs before consulting any browser DOM", async () => {
  for (const page of [
    "curriculum",
    "ratios",
    "progress",
    "catalog",
    "formulas",
    "learn",
    "practice",
    "home",
    "exam",
  ])
    expect(courseTargetExists(`#/${page}/NOT_A_PUBLISHED_ID`), page).toBe(
      false,
    );
  for (const pack of coursePacks) {
    expect(courseTargetExists(`#/curriculum/${pack.id}`)).toBe(true);
    expect(courseTargetExists(`#/learn/${pack.content.lessons[0].id}`)).toBe(
      true,
    );
  }
  await expect(
    assertCourseTarget({} as Page, "progress/NOT_A_PUBLISHED_ID"),
  ).rejects.toThrow("Unknown course target");
});
