import { unitPolicy } from "../engine/grading/units";
import type { RegistryContent, CurriculumRegistry } from "./types";
export function contentLinkFindings(
  c: RegistryContent,
  r: CurriculumRegistry,
): string[] {
  const errors: string[] = [];
  const semver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
  for (const [name, items] of Object.entries({
    topics: c.topics,
    lessons: c.lessons,
    formulas: c.formulas,
    problems: c.problems,
  })) {
    if (new Set(items.map((i) => i.id)).size !== items.length)
      errors.push(`${name}: duplicate ID`);
    for (const item of items) {
      if (
        "version" in item &&
        item.version !== undefined &&
        !semver.test(item.version)
      )
        errors.push(`${item.id}: invalid version`);
      for (const s of item.sourceRefs) {
        if (
          s.kind === "external" &&
          (!s.sourceVersionId || !s.url || !/^https:\/\//.test(s.url))
        )
          errors.push(
            `${item.id}: external reference requires version and HTTPS URL`,
          );
        if (s.pages?.some((p) => !Number.isInteger(p) || p < 1))
          errors.push(`${item.id}: invalid physical page`);
        if (
          s.sourceVersionId &&
          !r.sourceVersions.some((v) => v.id === s.sourceVersionId)
        )
          errors.push(`${item.id}: missing source version`);
      }
    }
  }
  for (const l of c.lessons) {
    if (new Set(l.sections.map((s) => s.id)).size !== l.sections.length)
      errors.push(`${l.id}: duplicate section ID`);
    for (const id of l.practiceIds ?? [])
      if (!c.problems.some((p) => p.id === id))
        errors.push(`${l.id}: missing practice ${id}`);
    for (const s of l.sections)
      for (const id of s.formulaIds ?? [])
        if (!c.formulas.some((f) => f.id === id))
          errors.push(`${l.id}/${s.id}: missing formula ${id}`);
  }
  for (const p of c.problems) {
    const l = c.lessons.find((l) => l.id === p.lessonId);
    if (!l) errors.push(`${p.id}: missing lesson`);
    if (
      p.theorySectionId &&
      !l?.sections.some((s) => s.id === p.theorySectionId)
    )
      errors.push(`${p.id}: missing targeted section`);
    if (new Set(p.stages.map((s) => s.id)).size !== p.stages.length)
      errors.push(`${p.id}: duplicate stage`);
    if (
      p.independent?.stageIds.some((id) => !p.stages.some((s) => s.id === id))
    )
      errors.push(`${p.id}: missing evaluated stage`);
    for (const id of p.formulaIds)
      if (!c.formulas.some((f) => f.id === id))
        errors.push(`${p.id}: missing formula ${id}`);
    for (const s of p.stages) {
      try {
        unitPolicy(s.unit);
      } catch {
        errors.push(`${p.id}/${s.id}: unsupported reference unit`);
      }
      if (
        !Number.isFinite(s.expected) ||
        !Number.isFinite(s.tolerance) ||
        s.tolerance < 0 ||
        !Number.isFinite(s.weight) ||
        s.weight <= 0
      )
        errors.push(`${p.id}/${s.id}: invalid numeric contract`);
    }
    if (
      p.options &&
      (new Set(p.options.map((o) => o.id)).size !== p.options.length ||
        !p.correctOptionIds?.length ||
        p.correctOptionIds.some((id) => !p.options!.some((o) => o.id === id)))
    )
      errors.push(`${p.id}: invalid selection contract`);
  }
  return errors;
}
