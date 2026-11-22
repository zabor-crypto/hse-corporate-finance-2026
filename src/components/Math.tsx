import { lazy, Suspense } from "react";
const Renderer = lazy(() => import("./MathRenderer"));
export function MathFormula({ latex }: { latex: string }) {
  return (
    <Suspense
      fallback={
        <div className="math-scroll" aria-busy="true">
          Загрузка формулы…
        </div>
      }
    >
      <Renderer latex={latex} />
    </Suspense>
  );
}
