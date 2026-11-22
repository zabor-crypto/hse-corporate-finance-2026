import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  encodeProgress,
  decodeProgress,
} from "../../src/storage/progressCodec";
import {
  mergeProgress,
  blankProgress,
  type Progress,
} from "../../src/storage/progress";
import { validJournal } from "../../src/storage/draftJournal";
const old = JSON.parse(
  readFileSync(
    new URL("../fixtures/baseline-v1-progress.json", import.meta.url),
    "utf8",
  ),
) as Progress;
describe("durable schema1 reconstruction", () => {
  it("reconstructs full old payload including original key order and duplicate snapshot records", () => {
    const data = {
      ...old,
      answers: Array.from({ length: 1000 }, (_, i) => ({
        ...old.answers[i % old.answers.length],
        id: `codec-${i}`,
      })),
    };
    const encoded = encodeProgress(data);
    expect(encoded.snapshots.length).toBeLessThanOrEqual(old.answers.length);
    expect(JSON.stringify(decodeProgress(encoded))).toBe(JSON.stringify(data));
    expect(decodeProgress(encoded).answers).toHaveLength(1000);
  });
  it("rejects a broken internal snapshot reference instead of fabricating a problem", () => {
    const encoded = encodeProgress(old);
    encoded.answers[0].snapshotIndex = 9999;
    expect(() => decodeProgress(encoded)).toThrow(/снимок/);
  });
  it("keeps distinct audit events, omits only byte-identical incoming archives", () => {
    const current = {
      ...blankProgress(),
      archives: [{ kind: "import", at: "A", raw: "same" }],
    };
    const incoming = {
      ...blankProgress(),
      archives: [
        { kind: "import", at: "A", raw: "same" },
        { kind: "import", at: "B", raw: "same" },
      ],
    };
    const merged = mergeProgress(current, incoming);
    expect(merged.archives).toHaveLength(3);
    expect(merged.archives[0]).toEqual(current.archives[0]);
    expect(merged.archives[1]).toEqual(incoming.archives[1]);
    expect((merged.archives[2] as any).snapshot.archives).toEqual([]);
  });
  it("validates raw draft journal without evaluating explanation text", () => {
    expect(
      validJournal({
        schema: 1,
        writer: "synthetic",
        baseRevision: 1,
        entries: [
          {
            id: "1",
            key: "practice:P@1",
            draft: {
              values: { v: "−1,", reasoning: "ungraded" },
              selected: [],
            },
          },
        ],
      }),
    ).toBe(true);
    expect(
      validJournal({
        schema: 1,
        writer: "synthetic",
        baseRevision: -1,
        entries: [],
      }),
    ).toBe(false);
    expect(
      validJournal({
        schema: 1,
        writer: "synthetic",
        baseRevision: 1,
        entries: [
          { id: "1", key: "P", draft: { values: { v: 12 }, selected: [] } },
        ],
      }),
    ).toBe(false);
  });
});

import { rebaseProgress } from "../../src/storage/rebaseProgress";
it("rebases concurrent grade and raw draft edits without reverting untouched recovered drafts", () => {
  const base = blankProgress();
  base.drafts.affected = { values: { v: "canonical" }, selected: [] };
  const committed = {
    ...base,
    drafts: { affected: { values: { v: "recovered" }, selected: [] } },
    archives: [{ kind: "draft-journal-recovery", previousDrafts: base.drafts }],
  };
  const current = {
    ...base,
    answers: [old.answers[0]],
    drafts: { ...base.drafts, new: { values: { v: "latest" }, selected: [] } },
  };
  const result = rebaseProgress(base, current, committed);
  expect(result.answers).toEqual(current.answers);
  expect(result.drafts.affected.values.v).toBe("recovered");
  expect(result.drafts.new.values.v).toBe("latest");
  expect(result.archives).toEqual(committed.archives);
});
