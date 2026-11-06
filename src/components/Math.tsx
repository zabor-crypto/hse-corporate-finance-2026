import katex from "katex";
export function MathFormula({ latex }: { latex: string }) {
  return (
    <div
      className="math-scroll"
      tabIndex={0}
      role="group"
      aria-label="Формула. При необходимости прокрутите по горизонтали"
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(latex, {
          throwOnError: false,
          output: "htmlAndMathml",
          displayMode: true,
          strict: "ignore",
        }),
      }}
    />
  );
}
