import { it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { build } from "vite";
it("the actual Vite artifact retains dependency licenses and the complete font notice", async () => {
  const result = await build({ logLevel: "silent", build: { write: false } });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap(
    (bundle) => {
      if (!("output" in bundle))
        throw new Error("Expected a completed static build");
      return bundle.output;
    },
  );
  expect(
    outputs.some((asset) => /KaTeX_.*\.woff2?$/.test(asset.fileName)),
  ).toBe(true);
  const notice = outputs.find(
    (asset) =>
      asset.type === "asset" && asset.fileName === "THIRD_PARTY_NOTICES.txt",
  );
  if (!notice || notice.type !== "asset")
    throw new Error("Missing built third-party notices");
  const text =
    typeof notice.source === "string"
      ? notice.source
      : new TextDecoder().decode(notice.source);
  for (const dependency of ["react", "react-dom", "lucide-react", "katex"]) {
    expect(text).toContain(
      readFileSync(`node_modules/${dependency}/LICENSE`, "utf8"),
    );
  }
  expect(text).toContain(readFileSync("THIRD_PARTY_NOTICES.md", "utf8"));
  for (const original of ["LICENSE-CODE", "LICENSE-CONTENT"]) {
    if (existsSync(original))
      expect(text).toContain(readFileSync(original, "utf8"));
  }
  expect(text).toContain("https://creativecommons.org/licenses/by/4.0/");
  expect(text).toContain(
    "https://github.com/zabor-crypto/hse-corporate-finance-2026",
  );
  for (const name of [
    "AMS",
    "Caligraphic",
    "Fraktur",
    "Main",
    "Math",
    "SansSerif",
    "Script",
    "Size1",
    "Size2",
    "Size3",
    "Size4",
    "Typewriter",
  ]) {
    expect(text).toContain(`with Reserved Font Name KaTeX_${name}.`);
  }
  expect(text).toContain(
    "SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007",
  );
  expect(text).toContain("PERMISSION & CONDITIONS");
  expect(text).toContain("OTHER DEALINGS IN THE FONT SOFTWARE.");
}, 30_000);
