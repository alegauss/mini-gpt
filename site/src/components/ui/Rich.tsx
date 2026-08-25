import type { ReactNode } from "react";
import type { Rich as RichRuns, Run } from "../../lib/content-types";

// Renderiza a lista de trechos etiquetados do módulo de conteúdo — texto puro, `code`,
// `b`, `i` e links — sem nenhuma análise de marcação, para que o texto continue sendo
// dado e nenhuma seção precise de `dangerouslySetInnerHTML`.
function RunNode({ run }: { run: Run }): ReactNode {
  if (typeof run === "string") return run;
  if ("code" in run) return <code>{run.code}</code>;
  if ("b" in run) return <b>{run.b}</b>;
  if ("i" in run) return <i>{run.i}</i>;
  return (
    <a href={run.a.href} target="_blank" rel="noopener noreferrer">
      {run.a.label}
    </a>
  );
}

export function Rich({ runs }: { runs: RichRuns }) {
  return (
    <>
      {runs.map((run, i) => (
        <RunNode key={i} run={run} />
      ))}
    </>
  );
}
