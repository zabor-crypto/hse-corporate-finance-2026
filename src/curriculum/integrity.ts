import type { CurriculumRegistry } from "./types";
import { validExamBlueprint } from "./types";

/** Fail closed during validation/build; drafts remain in the graph, never in eligible exams. */
export function registryFindings(r: CurriculumRegistry): string[] {
  const errors: string[] = [];
  const semver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
  const lists = {
    modules: r.modules,
    lessons: r.lessons,
    sections: r.sections,
    competencies: r.competencies,
    sourceVersions: r.sourceVersions,
    formulas: r.formulas,
    workedExamples: r.workedExamples,
    problems: r.problems,
    families: r.families,
    blueprints: r.blueprints,
    errorPatterns: r.errorPatterns,
  };
  for (const [kind, nodes] of Object.entries(lists)) {
    const ids = new Set<string>();
    for (const n of nodes) {
      if (!n.id || ids.has(n.id))
        errors.push(`${kind}: duplicate/empty ID ${n.id}`);
      ids.add(n.id);
      if ("version" in n && !semver.test(n.version))
        errors.push(`${kind}: invalid version ${n.id}`);
      if (
        "availability" in n &&
        n.availability === "available" &&
        n.reviewStatus !== "PUBLISHED"
      )
        errors.push(`${kind}: unreviewed availability ${n.id}`);
    }
  }
  const ids = <T extends { id: string }>(nodes: T[]) =>
    new Set(nodes.map((n) => n.id));
  const check = (owner: string, refs: string[], known: Set<string>) => {
    for (const id of refs)
      if (!known.has(id)) errors.push(`${owner}: missing reference ${id}`);
  };
  const modules = ids(r.modules),
    lessons = ids(r.lessons),
    sections = ids(r.sections),
    competencies = ids(r.competencies),
    sources = ids(r.sourceVersions),
    formulas = ids(r.formulas),
    examples = ids(r.workedExamples),
    problems = ids(r.problems),
    families = ids(r.families);
  check(r.course.id, r.course.moduleIds, modules);
  for (const m of r.modules) {
    if (m.courseId !== r.course.id) errors.push(`${m.id}: missing course`);
    check(m.id, m.lessonIds, lessons);
  }
  for (const l of r.lessons) {
    check(l.id, [l.moduleId], modules);
    check(l.id, l.sectionIds, sections);
    check(l.id, l.competencyIds, competencies);
    const parent = r.modules.find((m) => m.id === l.moduleId);
    if (!parent?.lessonIds.includes(l.id))
      errors.push(`${l.id}: inconsistent module parent`);
    if (l.availability === "available" && parent?.availability !== "available")
      errors.push(`${l.id}: unavailable module ancestor`);
    for (const id of l.sectionIds)
      if (r.sections.find((s) => s.id === id)?.lessonId !== l.id)
        errors.push(`${l.id}: inconsistent section parent ${id}`);
  }
  for (const s of r.sections) {
    check(s.id, [s.lessonId], lessons);
    check(s.id, s.formulaIds, formulas);
    check(s.id, s.workedExampleIds, examples);
    const parent = r.lessons.find((l) => l.id === s.lessonId);
    if (!parent?.sectionIds.includes(s.id))
      errors.push(`${s.id}: inconsistent lesson parent`);
    if (s.availability === "available" && parent?.availability !== "available")
      errors.push(`${s.id}: unavailable lesson ancestor`);
    for (const id of s.workedExampleIds)
      if (r.workedExamples.find((e) => e.id === id)?.sectionId !== s.id)
        errors.push(`${s.id}: inconsistent example parent ${id}`);
  }
  for (const e of r.workedExamples) {
    check(e.id, [e.lessonId], lessons);
    check(e.id, [e.sectionId], sections);
    if (r.sections.find((s) => s.id === e.sectionId)?.lessonId !== e.lessonId)
      errors.push(`${e.id}: inconsistent example lesson`);
  }
  for (const f of r.formulas) {
    check(f.id, [f.lessonId], lessons);
    check(f.id, f.competencyIds, competencies);
  }
  for (const p of r.problems) {
    check(p.id, [p.lessonId], lessons);
    check(p.id, [p.familyId], families);
    if (!r.families.find((f) => f.id === p.familyId)?.problemIds.includes(p.id))
      errors.push(`${p.id}: inconsistent family parent`);
    check(p.id, p.competencyIds, competencies);
    check(p.id, p.formulaIds, formulas);
    if (p.sectionId) check(p.id, [p.sectionId], sections);
    if (new Set(p.stageIds).size !== p.stageIds.length)
      errors.push(`${p.id}: duplicate evaluated stage IDs`);
    if (
      p.availability === "available" &&
      p.formulaIds.some(
        (id) =>
          r.formulas.find((f) => f.id === id)?.availability !== "available",
      )
    )
      errors.push(`${p.id}: unpublished formula dependency`);
    if (
      p.availability === "available" &&
      r.lessons.find((l) => l.id === p.lessonId)?.availability !== "available"
    )
      errors.push(`${p.id}: unavailable lesson ancestor`);
  }
  for (const f of r.families) {
    check(f.id, f.problemIds, problems);
    check(f.id, f.competencyIds, competencies);
    if (!Array.isArray(f.sourceVersionIds))
      errors.push(`${f.id}: missing family source versions`);
    for (const id of f.problemIds)
      if (r.problems.find((p) => p.id === id)?.familyId !== f.id)
        errors.push(`${f.id}: inconsistent family member ${id}`);
  }
  for (const e of r.errorPatterns) {
    if (!e.version || !semver.test(e.version))
      errors.push(`${e.id}: missing error-pattern version`);
    if (!Array.isArray(e.competencyIds) || !Array.isArray(e.sourceVersionIds))
      errors.push(`${e.id}: missing error-pattern linkage`);
    else check(e.id, e.competencyIds, competencies);
  }
  for (const c of r.competencies) {
    check(c.id, [c.moduleId], modules);
    check(c.id, c.prerequisiteIds, competencies);
  }
  for (const list of Object.values(lists))
    for (const n of list)
      if ("sourceVersionIds" in n) check(n.id, n.sourceVersionIds, sources);
  // Private bibliographic references deliberately have no public href. Public assets must be supplied explicitly.
  for (const s of r.sourceVersions)
    if (s.visibility === "public" && !s.asset)
      errors.push(`${s.id}: missing public asset`);
  for (const b of r.blueprints) {
    if (!validExamBlueprint(b)) {
      errors.push("Invalid blueprint structure");
      continue;
    }
    check(b.id, b.moduleIds, modules);
    check(b.id, Object.keys(b.sourceWeights), sources);
    if (b.eligiblePool)
      for (const e of b.eligiblePool) {
        check(b.id, [e.problemId], problems);
        if (r.problems.find((p) => p.id === e.problemId)?.version !== e.version)
          errors.push(
            `${b.id}: pool version unavailable ${e.problemId}@${e.version}`,
          );
      }
    if (!Number.isFinite(b.minutes) || b.minutes <= 0 || !b.slots.length)
      errors.push(`${b.id}: invalid assessment limits`);
    if (new Set(b.slots.map((s) => s.id)).size !== b.slots.length)
      errors.push(`${b.id}: duplicate slot`);
    for (const s of b.slots) {
      check(b.id, s.competencyIds, competencies);
      check(b.id, s.sourceVersionIds ?? [], sources);
      check(b.id, s.problemIds ?? [], problems);
      if (!s.difficulties.length) errors.push(`${b.id}: empty difficulty`);
    }
    for (const [id, w] of Object.entries(b.competencyWeights)) {
      check(b.id, [id], competencies);
      if (!Number.isFinite(w) || w <= 0)
        errors.push(`${b.id}: invalid competency weight`);
    }
    for (const w of [
      ...Object.values(b.difficultyWeights),
      ...Object.values(b.sourceWeights),
    ])
      if (w === undefined || !Number.isFinite(w) || w <= 0)
        errors.push(`${b.id}: invalid weight`);
  }
  const active = new Set<string>(),
    done = new Set<string>();
  const visit = (id: string) => {
    if (active.has(id)) {
      errors.push(`competency cycle: ${id}`);
      return;
    }
    if (done.has(id)) return;
    active.add(id);
    for (const p of r.competencies.find((c) => c.id === id)?.prerequisiteIds ??
      [])
      visit(p);
    active.delete(id);
    done.add(id);
  };
  for (const c of r.competencies) visit(c.id);
  return errors;
}
export function assertRegistryIntegrity(r: CurriculumRegistry) {
  const findings = registryFindings(r);
  if (findings.length) throw new Error(findings.join("\n"));
  return r;
}
