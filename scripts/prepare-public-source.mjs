// Creates a separate local snapshot; never edits private Git history or contacts a remote.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { hash, inspectBytes } from "./audit-core.mjs";
const outArg = process.argv.indexOf("--out"),
  out = outArg < 0 ? null : process.argv[outArg + 1];
if (!out || !path.isAbsolute(out) || fs.existsSync(out))
  throw Error(
    "Use --out with a new absolute destination. Existing destinations are preserved.",
  );
const root = fs.realpathSync(process.cwd());
function resolvedDestination(p) {
  let base = path.resolve(p);
  const suffix = [];
  while (!fs.existsSync(base)) {
    suffix.unshift(path.basename(base));
    base = path.dirname(base);
  }
  return path.join(fs.realpathSync(base), ...suffix);
}
function inside(p, base) {
  const rel = path.relative(base, p);
  return (
    rel === "" ||
    (!rel.startsWith(".." + path.sep) && rel !== ".." && !path.isAbsolute(rel))
  );
}
const git = (args, cwd = root) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
if (git(["status", "--porcelain"]).length)
  throw Error(
    "Commit the verified private source checkpoint before preparing the public-source snapshot.",
  );
const destination = resolvedDestination(out);
const commonDir = fs.realpathSync(
  path.resolve(root, git(["rev-parse", "--git-common-dir"])),
);
if (inside(destination, root) || inside(destination, commonDir))
  throw Error(
    "Destination must be outside the private checkout and Git common directory.",
  );
const sourceCommit = git(["rev-parse", "HEAD"]);
const tree = git(["ls-tree", "-r", "-z", "--full-tree", sourceCommit])
  .split("\0")
  .filter(Boolean)
  .map((entry) => {
    const tab = entry.indexOf("\t");
    const [mode, type, oid] = entry.slice(0, tab).split(" ");
    return { path: entry.slice(tab + 1), mode, type, oid };
  });
const paths = tree.map((x) => x.path);
const included = [],
  excluded = [],
  redacted = [];
const rootFiles = new Set([
  "package.json",
  "package-lock.json",
  "index.html",
  "vite.config.ts",
  "vitest.config.ts",
  "playwright.config.ts",
  "tsconfig.json",
  ".gitignore",
  ".nvmrc",
  "publication-policy.json",
  "README.md",
  "THIRD_PARTY_NOTICES.md",
  "LICENSE-CODE",
  "LICENSE-CONTENT",
]);
const publicDocs = new Set([
  "TRANCHE03_SCOPE_MATRIX.md",
  "SEM3_COVERAGE_MATRIX.md",
  "ASSESSMENT_CALIBRATION.md",
  "CONTENT_QUALITY_AUTHOR_NOTES.md",
  "OWNER_RELEASE_DECISIONS.md",
  "ARCHITECTURE.md",
  "ASSUMPTIONS_REGISTER.md",
  "SOURCE_MAP.md",
]);
for (const p of paths) {
  const allow =
    rootFiles.has(p) ||
    p.startsWith("src/") ||
    p.startsWith("public/") ||
    p.startsWith("scripts/") ||
    p.startsWith("tests/") ||
    p.startsWith(".github/") ||
    (p.startsWith("docs/") && publicDocs.has(path.basename(p)));
  if (
    !allow ||
    p === "scripts/verify-style-structure.mjs" ||
    /\.(png|jpe?g|pdf|zip|bundle)$/i.test(p) ||
    p.startsWith("evidence/")
  ) {
    excluded.push({
      path: p,
      reason: "private evidence/history or outside public source allowlist",
    });
    continue;
  }
  const entry = tree.find((x) => x.path === p);
  if (entry.mode === "120000" || entry.type !== "blob")
    throw Error("Only ordinary immutable Git blobs are allowed");
  const original = execFileSync("git", ["cat-file", "blob", entry.oid], {
    cwd: root,
    maxBuffer: 64 * 1024 * 1024,
  });
  let bytes = original;
  try {
    const content = new TextDecoder("utf-8", { fatal: true }).decode(original);
    bytes = Buffer.from(
      content.replace(/(?:\/Users\/|\/home\/)[^/\s"'\\]+\//g, "<local-user>/"),
    );
  } catch {
    /* Non-UTF8 binary assets retain exact bytes; bounded audit still scans them below. */
  }
  if (inspectBytes(bytes, p).length)
    throw Error(`Sensitive or prohibited bytes in ${p}`);
  const exact = bytes.equals(original);
  if (!exact) redacted.push(p);
  const dest = path.join(out, p);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, bytes);
  if (entry.mode === "100755") fs.chmodSync(dest, 0o755);
  included.push({
    path: p,
    sourceGitBlob: entry.oid,
    sourceGitMode: entry.mode,
    verifiedSourceSha256: hash(original),
    snapshotSha256: hash(bytes),
    exactSourceBytes: exact,
  });
}
const manifest = {
  schemaVersion: 1,
  sourceCommit,
  sourceKind: "sanitized-local-public-source-candidate",
  included,
  excluded,
  redacted,
  historyStrategy:
    "Separate initial commit; private repository history is preserved unchanged.",
  publicRelease: "BLOCKED",
  licensing: "UNKNOWN",
  publicationApproval: false,
};
fs.writeFileSync(
  path.join(out, "PUBLIC_SOURCE_MANIFEST.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
git(["init", "--initial-branch=public-source-candidate", "--template="], out);
git(["add", "."], out);
git(
  [
    "-c",
    "user.name=Codex",
    "-c",
    "user.email=codex@local",
    "-c",
    "core.hooksPath=/dev/null",
    "-c",
    "commit.gpgSign=false",
    "commit",
    "-m",
    "Prepare sanitized local source candidate; publication blocked",
  ],
  out,
);
console.log(
  JSON.stringify({
    sourceCommit,
    snapshotCommit: git(["rev-parse", "HEAD"], out),
    included: included.length,
    excluded: excluded.length,
    redacted: redacted.length,
    remotes: git(["remote"], out).split("\n").filter(Boolean),
    publicRelease: "BLOCKED",
    destination: out,
  }),
);
