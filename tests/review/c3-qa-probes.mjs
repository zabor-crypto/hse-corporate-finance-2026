import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { build } from "esbuild";
import ts from "typescript";

// Independent, synthetic, non-canonical experiments. Never promotes actual metadata.
const root = process.cwd();
const out =
  process.env.CFLOS_QA_EVIDENCE ??
  fs.mkdtempSync(path.join(os.tmpdir(), "cflos-c3-qa-"));
fs.mkdirSync(out, { recursive: true });
const require = createRequire(path.join(root, "package.json"));
async function compile(entry, name, plugins = []) {
  const result = await build({
    entryPoints: [path.join(root, entry)],
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
    external: ["react", "react-dom/server", "katex", "lucide-react"],
    plugins,
  });
  const code = result.outputFiles[0].text;
  fs.writeFileSync(path.join(out, name + ".cjs"), code);
  const moduleObject = { exports: {} };
  new Function("require", "module", "exports", code)(
    require,
    moduleObject,
    moduleObject.exports,
  );
  return moduleObject.exports;
}
const reg = await compile("src/curriculum/index.ts", "registry");
const content = await compile("src/content/index.ts", "content");
const storage = await compile("src/storage/progress.ts", "storage");
const errors = await compile("src/curriculum/errors.ts", "errors");
const blueprintModule = await compile(
  "src/curriculum/blueprints.ts",
  "blueprints",
);
const checks = [];
function check(name, fn) {
  try {
    const detail = fn();
    checks.push({ name, status: "PASS", detail });
  } catch (e) {
    checks.push({ name, status: "FAIL", error: e.stack });
  }
}
async function asyncCheck(name, fn) {
  try {
    const detail = await fn();
    checks.push({ name, status: "PASS", detail });
  } catch (e) {
    checks.push({ name, status: "FAIL", error: e.stack });
  }
}
check("exact version review ledger excludes99 successors", () => {
  const cloned = structuredClone({
    topics: content.topics,
    lessons: content.lessons,
    formulas: content.formulas,
    problems: content.problems,
  });
  for (const key of ["lessons", "formulas", "problems"])
    cloned[key][0].version = "99.0.0";
  const r = reg.createCurriculumRegistry(cloned);
  for (const key of ["lessons", "formulas", "problems"])
    assert.equal(
      r[key].find((n) => n.id === cloned[key][0].id).availability,
      "unavailable",
    );
  return { lessons: true, formulas: true, problems: true };
});
const fixtures = [];
check(
  "published blueprints: actual pools, exact composition, determinism, reviewed eligibility",
  () => {
    const details = [];
    for (const original of blueprintModule.c3Blueprints) {
      assert.equal(original.reviewStatus, "PUBLISHED");
      assert.throws(
        () =>
          reg.assemblePaper(
            reg.curriculumRegistry,
            { ...original, reviewStatus: "PEDAGOGICAL_REVIEW" },
            0,
            { seenKeys: [] },
            "2026-11-07T00:00:00Z",
          ),
        /reviewed/,
      );
      const blueprint = { ...original, reviewStatus: "PUBLISHED" };
      for (const seed of [0, 1, 7, 17, 123, 20261107, 4294967295]) {
        const paper = reg.assemblePaper(
          reg.curriculumRegistry,
          blueprint,
          seed,
          { seenKeys: [] },
          "2026-11-07T00:00:00Z",
        );
        const bank = paper.problemIds.map((id) =>
          reg.curriculumRegistry.problems.find((p) => p.id === id),
        );
        assert.equal(new Set(paper.familyIds).size, bank.length);
        bank.forEach((p, i) => {
          const slot = blueprint.slots[i];
          assert.equal(p.availability, "available");
          assert.equal(p.reviewStatus, "PUBLISHED");
          assert(slot.competencyIds.some((id) => p.competencyIds.includes(id)));
          assert(slot.difficulties.includes(p.difficulty));
          assert(!slot.kinds || slot.kinds.includes(p.kind));
          assert(!slot.problemIds || slot.problemIds.includes(p.id));
        });
        assert.deepEqual(
          reg.assemblePaper(
            reg.curriculumRegistry,
            blueprint,
            seed,
            { seenKeys: [] },
            paper.assembledAt,
          ),
          paper,
        );
        if (original.id.startsWith("C3-SHORT")) {
          assert.equal(bank.length, 6);
          assert(bank.some((p) => p.kind === "single"));
          assert(bank.some((p) => p.kind === "multi"));
          assert(
            bank.filter((p) => ["steps", "numeric"].includes(p.kind)).length >=
              2,
          );
        }
        if (original.id.startsWith("C3-INTEGRATED")) {
          assert.equal(bank.length, 3);
          assert(
            bank.every(
              (p) => p.kind === "steps" && ["L3", "L4"].includes(p.difficulty),
            ),
          );
        }
        if (original.id === "C3-THEORY-40") {
          assert.equal(bank.length, 40);
          assert.deepEqual(
            paper.problemIds,
            Array.from(
              { length: 40 },
              (_, i) => "C3-T" + String(i + 1).padStart(2, "0"),
            ),
          );
        }
        if (seed === 17) fixtures.push(paper);
      }
      details.push({ id: original.id, seeds: 7, slots: original.slots.length });
    }
    assert.equal(details.length, 6);
    return details;
  },
);
check(
  "changed constrained solver agrees with independent exhaustive matching on64 small graphs",
  () => {
    const poolIds = [
      "T3-V-NWC-0",
      "T3-V-NWC-1",
      "T3-V-RET-0",
      "T3-V-RET-1",
      "T3-V-LIQ-0",
      "T3-V-LIQ-1",
      "T3-V-DDM-0",
      "T3-V-DDM-1",
      "T3-Q05",
      "T3-Q06",
      "T3-Q27",
      "C3-C01",
    ];
    const pool = poolIds.map((id) =>
      reg.curriculumRegistry.problems.find((p) => p.id === id),
    );
    assert(pool.every(Boolean));
    let state = 918273;
    const random = () =>
      (state = (Math.imul(state, 1103515245) + 12345) >>> 0) / 4294967296;
    let satisfiable = 0,
      unsatisfiable = 0;
    for (let n = 0; n < 64; n++) {
      const slots = Array.from({ length: 2 + (n % 4) }, (_, i) => {
        const ids = poolIds.filter(() => random() < 0.3);
        return {
          id: "s" + i,
          competencyIds: reg.curriculumRegistry.competencies.map((c) => c.id),
          difficulties: ["L1", "L2", "L3", "L4"],
          problemIds: ids.length ? ids : [poolIds[n % poolIds.length]],
        };
      });
      const seen = n % 3 === 0 ? [poolIds[n % poolIds.length] + "@1.0.0"] : [];
      const choices = slots.map((s) =>
        pool.filter(
          (p) =>
            s.problemIds.includes(p.id) &&
            !seen.includes(p.id + "@" + p.version),
        ),
      );
      function exists(i, used) {
        if (i === choices.length) return true;
        return choices[i].some(
          (p) =>
            !used.has(p.familyId) &&
            exists(i + 1, new Set([...used, p.familyId])),
        );
      }
      const expected = exists(0, new Set());
      const b = {
        id: "QA-GRAPH-" + n,
        version: "1.0.0",
        title: "Synthetic graph only",
        moduleIds: ["T3"],
        minutes: 1,
        unseenPolicy: "require",
        reviewStatus: "PUBLISHED",
        competencyWeights: {},
        difficultyWeights: {},
        sourceWeights: {},
        eligiblePool: pool.map((p) => ({
          problemId: p.id,
          version: p.version,
        })),
        slots,
      };
      let actual;
      try {
        const paper = reg.assemblePaper(
          reg.curriculumRegistry,
          b,
          n,
          { seenKeys: seen },
          "2026-11-07T00:00:00Z",
        );
        actual = true;
        assert.equal(paper.problemIds.length, slots.length);
      } catch (e) {
        if (!String(e).includes("Insufficient")) throw e;
        actual = false;
      }
      assert.equal(actual, expected, "fixture graph " + n);
      expected ? satisfiable++ : unsatisfiable++;
    }
    assert(satisfiable && unsatisfiable);
    return { satisfiable, unsatisfiable };
  },
);
const attemptModule = await compile("src/engine/grading/attempt.ts", "attempt");
check(
  "modern import binds evaluated IDs and snapshot identity while preserving legacy",
  () => {
    const p = content.problems.find((p) => p.id === "T3-Q23");
    const record = attemptModule.gradeAttempt(
      p,
      {
        values: Object.fromEntries(
          p.stages.map((s) => [s.id, String(s.expected)]),
        ),
        units: Object.fromEntries(p.stages.map((s) => [s.id, "million-rub"])),
        selected: [],
      },
      "practice",
    );
    const data = storage.blankProgress();
    data.answers = [record];
    assert(storage.validProgress(data));
    const results = {};
    const mutations = {
      assessedStageIds: (a) => (a.assessedStageIds = ["NONEXISTENT"]),
      stageResults: (a) => (a.stageResults[0].id = "NONEXISTENT"),
      snapshotId: (a) => (a.problemSnapshot.id = "OTHER"),
      snapshotVersion: (a) => (a.problemSnapshot.version = "99.0.0"),
    };
    for (const [name, mutate] of Object.entries(mutations)) {
      const changed = structuredClone(data);
      mutate(changed.answers[0]);
      results[name] = storage.validProgress(changed);
      assert.equal(results[name], false);
    }
    const legacy = JSON.parse(
      fs.readFileSync(
        path.join(root, "tests/fixtures/baseline-v1-progress.json"),
        "utf8",
      ),
    );
    assert(storage.validProgress(legacy));
    return {
      generatedRecordValid: true,
      rejected: results,
      legacyNinePreserved: true,
    };
  },
);
check(
  "prefer seeks a wholly unseen feasible paper before mixed fallback",
  () => {
    const r = structuredClone(reg.curriculumRegistry);
    r.blueprints = [];
    const proto = r.problems.find((p) => p.id === "T3-Q23");
    r.problems = [
      ["A", "F1"],
      ["B", "F2"],
      ["C", "F1"],
      ["D", "F3"],
    ].map(([id, familyId]) => ({
      ...proto,
      id,
      familyId,
      competencyIds: ["T3-03:core"],
      sourceVersionIds: ["original-cflos-v1"],
    }));
    r.families = ["F1", "F2", "F3"].map((id) => ({
      id,
      version: "1.0.0",
      competencyIds: ["T3-03:core"],
      sourceVersionIds: ["original-cflos-v1"],
      problemIds: r.problems.filter((p) => p.familyId === id).map((p) => p.id),
    }));
    const b = {
      id: "QA-PREFER",
      version: "1.0.0",
      title: "Noncanonical freshness graph",
      moduleIds: ["T3"],
      minutes: 1,
      unseenPolicy: "prefer",
      reviewStatus: "PUBLISHED",
      competencyWeights: {},
      difficultyWeights: {},
      sourceWeights: {},
      slots: [
        {
          id: "one",
          competencyIds: ["T3-03:core"],
          difficulties: [proto.difficulty],
          problemIds: ["A", "B"],
        },
        {
          id: "two",
          competencyIds: ["T3-03:core"],
          difficulties: [proto.difficulty],
          problemIds: ["C", "D"],
        },
      ],
    };
    for (let seed = 0; seed < 32; seed++) {
      const paper = reg.assemblePaper(
        r,
        b,
        seed,
        { seenKeys: ["D@" + proto.version] },
        "2026-11-07T00:00:00Z",
      );
      assert.deepEqual(paper.problemIds, ["B", "C"]);
      assert.equal(paper.blueprint.unseenPolicy, "prefer");
    }
    return { seeds: 32, allUnseenAssignment: ["B", "C"] };
  },
);
const examSource = fs.readFileSync(
  path.join(root, "src/views/Exam.tsx"),
  "utf8",
);
const startBlock = examSource.slice(
  examSource.indexOf("  const start = ("),
  examSource.indexOf("  const startBlueprint ="),
);
function evaluateExpression(expression, bindings) {
  const code = ts.transpileModule("const handler=" + expression, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  return new Function(...Object.keys(bindings), code + ";return handler;")(
    ...Object.values(bindings),
  );
}
function sourceButton(label) {
  const file = ts.createSourceFile(
    "Exam.tsx",
    examSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let expression;
  function walk(node) {
    if (
      ts.isJsxElement(node) &&
      node.openingElement.tagName.getText(file) === "button" &&
      node.children.some((c) => c.getText(file).includes(label))
    ) {
      const attr = node.openingElement.attributes.properties.find(
        (p) => p.name?.getText(file) === "onClick",
      );
      expression = attr.initializer.expression.getText(file);
    }
    ts.forEachChild(node, walk);
  }
  walk(file);
  assert(expression, "button " + label);
  return expression;
}
const eligible = content.problems.filter((p) =>
  reg.curriculumRegistry.problems.some(
    (n) =>
      n.id === p.id &&
      n.version === p.version &&
      n.availability === "available",
  ),
);
function startFor(data) {
  let current = structuredClone(data);
  const code = ts.transpileModule(startBlock, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  const start = new Function(
    "session",
    "setIndex",
    "setError",
    "update",
    "problems",
    "crypto",
    "sampleExamIds",
    "unseenHistory",
    code + ";return start;",
  )(
    data.exam,
    () => {},
    () => {},
    (fn) => (current = fn(current)),
    eligible,
    crypto,
    content.sampleExamIds,
    errors.unseenHistory,
  );
  return { start, read: () => current };
}
const React = require("react"),
  { renderToStaticMarkup } = require("react-dom/server");
await asyncCheck(
  "completed timed paper offers chooser and archives exact paper instead of untimed retry",
  async () => {
    const { Exam } = await compile("src/views/Exam.tsx", "exam");
    const paper = fixtures[0];
    assert(paper);
    const data = storage.blankProgress();
    data.exam = {
      id: "QA-ONLY-COMPLETED",
      problemIds: paper.problemIds,
      versions: paper.versions,
      paper,
      startedAt: paper.assembledAt,
      finishedAt: "2026-11-07T00:35:00Z",
    };
    const html = renderToStaticMarkup(
      React.createElement(Exam, { data, update: () => {} }),
    );
    assert(!html.includes("Новая попытка"));
    assert(html.includes("Выбрать новый вариант"));
    let current = structuredClone(data);
    evaluateExpression(sourceButton("Выбрать новый вариант"), {
      update: (fn) => (current = fn(current)),
      session: data.exam,
    })();
    assert.equal(current.exam, null);
    assert.deepEqual(current.archives.at(-1).session.paper, paper);
    assert(storage.validProgress(current));
    return { paperArchived: true, shortcutAbsent: true };
  },
);
check(
  "removed-ID recovery actual button selects current defaults and archives original",
  () => {
    const data = storage.blankProgress();
    data.exam = {
      id: "QA-REMOVED",
      problemIds: ["QA-WITHDRAWN"],
      versions: { "QA-WITHDRAWN": "1.0.0" },
      startedAt: "2026-11-07T00:00:00Z",
    };
    assert(storage.validProgress(data));
    const flow = startFor(data);
    evaluateExpression(sourceButton("Начать новую версию"), {
      start: flow.start,
      sampleExamIds: content.sampleExamIds,
    })();
    const next = flow.read();
    assert(storage.validProgress(next));
    assert.deepEqual(next.exam.problemIds, content.sampleExamIds);
    assert.deepEqual(next.archives.at(-1).session, data.exam);
    return { validAfter: true, archived: true };
  },
);
await asyncCheck(
  "test-only future topic with two published lessons renders two distinct titled URLs in actual Curriculum",
  async () => {
    const refs = [
      {
        kind: "original",
        label: "Noncanonical fixture",
        sourceVersionId: "QA-SOURCE",
      },
    ];
    const topic = {
      ...content.topics[0],
      id: "QA-TOPIC",
      title: "Fixture topic only",
      prerequisites: [],
      lessonIds: ["QA-L-A", "QA-L-B"],
      questionIds: [],
      sourceRefs: refs,
    };
    const extra = topic.lessonIds.map((id, i) => ({
      ...content.lessons[0],
      id,
      title: "Fixture lesson " + (i ? "B" : "A"),
      practiceIds: [],
      sections: [],
      sourceRefs: refs,
    }));
    const fixtureContent = {
      ...content,
      topics: [...content.topics, topic],
      lessons: [...content.lessons, ...extra],
    };
    const fixtureRegistry = reg.createCurriculumRegistry(fixtureContent, {
      modules: [
        {
          id: "T3",
          title: "Actual topic",
          lessonIds: content.topics.flatMap((t) =>
            t.lessonIds.length ? t.lessonIds : [t.id],
          ),
        },
        {
          id: "QA-MODULE",
          title: "Fixture module only",
          lessonIds: topic.lessonIds,
        },
      ],
      reviewedLessonVersions: Object.fromEntries(
        fixtureContent.lessons.map((l) => [l.id, l.version]),
      ),
      sourceVersions: [
        {
          id: "QA-SOURCE",
          version: "1.0.0",
          label: "Fixture only",
          visibility: "private",
          sha256: "0".repeat(64),
        },
      ],
    });
    assert.deepEqual(reg.registryFindings(fixtureRegistry), []);
    globalThis.__c3QaFixture = {
      content: fixtureContent,
      registry: fixtureRegistry,
    };
    const plugin = {
      name: "isolated-fixture-bindings",
      setup(b) {
        b.onLoad({ filter: /src\/content\/index\.ts$/ }, () => ({
          loader: "js",
          contents: ["topics", "lessons", "formulas", "problems", "seminarMap"]
            .map(
              (k) =>
                "export const " +
                k +
                "=globalThis.__c3QaFixture.content." +
                k +
                ";",
            )
            .join("\n"),
        }));
        b.onLoad({ filter: /src\/curriculum\/index\.ts$/ }, () => ({
          loader: "js",
          contents:
            'export const curriculumRegistry=globalThis.__c3QaFixture.registry; export const availableLessons=(id)=>curriculumRegistry.lessons.filter(l=>l.availability==="available"&&(!id||l.moduleId===id)); export const publishedModules=()=>curriculumRegistry.modules.filter(m=>m.availability==="available");',
        }));
      },
    };
    try {
      const { Curriculum } = await compile(
        "src/views/Curriculum.tsx",
        "future-curriculum",
        [plugin],
      );
      const html = renderToStaticMarkup(React.createElement(Curriculum));
      fs.writeFileSync(path.join(out, "future-fixture.html"), html);
      for (const l of extra) {
        assert(html.includes('href="#/learn/' + l.id + '"'));
        assert(html.includes("Изучить: " + l.title));
      }
      return { lessonIds: topic.lessonIds, sourceVersionLinked: true };
    } finally {
      delete globalThis.__c3QaFixture;
    }
  },
);
fs.writeFileSync(
  path.join(out, "papers.json"),
  JSON.stringify(fixtures, null, 2),
);
const hashes = {};
for (const dir of ["src"])
  for (const file of fs.readdirSync(path.join(root, dir), {
    recursive: true,
  })) {
    const p = path.join(root, dir, file);
    if (fs.statSync(p).isFile())
      hashes[path.relative(root, p)] = crypto
        .createHash("sha256")
        .update(fs.readFileSync(p))
        .digest("hex");
  }
fs.writeFileSync(
  path.join(out, "source-hashes.json"),
  JSON.stringify(hashes, null, 2),
);
const report = {
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim(),
  scope:
    "Independent architecture QA; actual published metadata independently reviewed; downgrade-to-pending negative probes remain isolated experiments",
  checks,
  counts: {
    passed: checks.filter((c) => c.status === "PASS").length,
    failed: checks.filter((c) => c.status === "FAIL").length,
  },
};
fs.writeFileSync(
  path.join(out, "probes.json"),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
if (report.counts.failed) process.exitCode = 1;
