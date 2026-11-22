import type { Lesson, LessonExample } from "../content/types";
import type { TeachingExampleRef, TeachingPath, TeachingPaths, TeachingUnit } from "./types";

/** Explicit banks keep the generic reader independent of a particular module bundle. */
export function getTeachingPath(
  lessonId: string,
  paths: Readonly<TeachingPaths>,
): TeachingPath | undefined {
  const path = paths[lessonId];
  return path?.lessonId === lessonId ? path : undefined;
}

export function getTeachingUnit(
  unitId: string,
  paths: Readonly<TeachingPaths>,
): TeachingUnit | undefined {
  for (const path of Object.values(paths)) {
    const unit = path.units.find((candidate) => candidate.id === unitId);
    if (unit) return unit;
  }
  return undefined;
}

/** Resolve the exact authored example; a missing target must never select a different case. */
export function resolveTeachingExample(
  ref: TeachingExampleRef | undefined,
  bank: readonly Lesson[],
): LessonExample | undefined {
  if (!ref) return undefined;
  const section = bank
    .find((lesson) => lesson.id === ref.lessonId)
    ?.sections.find((candidate) => candidate.id === ref.sectionId);
  if (!section) return undefined;
  if (ref.index === undefined) return section.example;
  if (!Number.isInteger(ref.index) || ref.index < 0) return undefined;
  return section.examples?.[ref.index];
}
