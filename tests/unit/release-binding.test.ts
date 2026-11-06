import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error Pure JavaScript release predicates are exercised directly.
import * as core from "../../scripts/audit-core.mjs";
const { artifactMatchesRelease, validateRelease } = core;
// @ts-expect-error Artifact inspection is a JavaScript CLI and module.
import { auditArtifact } from "../../scripts/audit-artifact.mjs";
const sha = "a".repeat(40);
const version = "0.3.0";
const files = [{ path: "build-info.json", bytes: 100, sha256: "b".repeat(64) }];
const report = () => ({
  status: "PASS",
  sourceCommit: sha,
  sourceDirty: false,
  sourceKind: "git",
  sourceVersion: version,
  files,
});
const good = () => ({ verified: report(), artifact: report(), sha, version });
describe("verified static artifact release binding", () => {
  it("accepts exactly matching clean Git artifacts for the checked-out package version", () => {
    expect(artifactMatchesRelease(good())).toBe(true);
  });
  for (const side of ["verified", "artifact"] as const) {
    it.each([
      { status: "UNKNOWN" },
      { status: "FAIL" },
      { sourceCommit: "c".repeat(40) },
      { sourceDirty: true },
      { sourceDirty: undefined },
      { sourceDirty: "false" },
      { sourceKind: "review-handoff" },
      { sourceKind: "unknown" },
      { sourceKind: undefined },
      { sourceVersion: "0.2.0" },
      { sourceVersion: undefined },
      { files: [] },
      { files: undefined },
    ])(`rejects ${side} provenance or absent manifest: %j`, (patch) => {
      const candidate = good();
      const changed = {
        ...candidate,
        [side]: { ...candidate[side], ...patch },
      };
      expect(artifactMatchesRelease(changed)).toBe(false);
    });
  }
  it.each([
    { path: "other.json", bytes: 100, sha256: "b".repeat(64) },
    { path: "build-info.json", bytes: 101, sha256: "b".repeat(64) },
    { path: "build-info.json", bytes: 100, sha256: "c".repeat(64) },
  ])("rejects changed artifact path, size or hash: %j", (file) => {
    expect(
      artifactMatchesRelease({
        ...good(),
        artifact: { ...report(), files: [file] },
      }),
    ).toBe(false);
  });
  it.each([
    { sha: "unknown" },
    { version: "" },
    { version: "0.3.1" },
    { verified: undefined },
    { artifact: undefined },
  ])("rejects incomplete or different release context: %j", (patch) => {
    expect(artifactMatchesRelease({ ...good(), ...patch })).toBe(false);
  });
  it("a failed binding cannot satisfy the existing publication approval predicate", () => {
    const binding = artifactMatchesRelease({
      ...good(),
      artifact: { ...report(), sourceKind: "review-handoff" },
    });
    const decision = validateRelease({
      ref: "refs/heads/main",
      sha,
      candidate: sha,
      actor: "owner",
      owner: "owner",
      approved: "true",
      enabled: "true",
      auditStatus: binding ? "PASS" : "FAIL",
      codeLicense: "MIT",
      contentLicense: "CC-BY-4.0",
      redistributionApproved: true,
      dirty: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toContain("PUBLIC_AUDIT_NOT_PASS");
  });
  it("extracts source kind and version from inspected build-info bytes", () => {
    const root = mkdtempSync(join(tmpdir(), "cflos-release-metadata-"));
    mkdirSync(join(root, "assets"));
    writeFileSync(
      join(root, "index.html"),
      '<script type="module" src="/hse-corporate-finance-2026/assets/main.js"></script>',
    );
    writeFileSync(join(root, "assets/main.js"), "export {};");
    writeFileSync(
      join(root, "build-info.json"),
      JSON.stringify({
        commit: sha,
        dirty: false,
        sourceKind: "git",
        version,
        base: "/hse-corporate-finance-2026/",
      }),
    );
    const actual = auditArtifact(root);
    expect(actual).toMatchObject({
      status: "PASS",
      sourceCommit: sha,
      sourceDirty: false,
      sourceKind: "git",
      sourceVersion: version,
    });
    expect(
      artifactMatchesRelease({
        verified: actual,
        artifact: actual,
        sha,
        version,
      }),
    ).toBe(true);
    writeFileSync(
      join(root, "build-info.json"),
      JSON.stringify({
        commit: sha,
        dirty: false,
        sourceKind: "review-handoff",
        version,
        base: "/hse-corporate-finance-2026/",
      }),
    );
    const handoff = auditArtifact(root);
    expect(handoff.status).toBe("PASS"); // Local artifact diagnostics are not release authorization.
    expect(
      artifactMatchesRelease({
        verified: handoff,
        artifact: handoff,
        sha,
        version,
      }),
    ).toBe(false);
  });
});
