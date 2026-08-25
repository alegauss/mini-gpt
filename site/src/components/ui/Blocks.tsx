import { Fragment } from "react";
import type { Block } from "../../lib/content-types";
import { Figure } from "../figures/Figures";
import { Rich } from "./Rich";

// O renderizador único dos blocos de conteúdo. As páginas de nível, o glossário de
// matemática e o guia de execução passam todos por aqui — então a aparência de uma
// fórmula, de um aviso ou de um bloco de código é decidida uma vez, e não uma vez por
// página.
//
// O `switch` é exaustivo sobre a união `Block`: acrescentar um tipo de bloco sem tratá-lo
// aqui é um erro de compilação, não uma seção que some silenciosamente da página.

function One({ block }: { block: Block }) {
  switch (block.kind) {
    case "h":
      return <h3>{block.text}</h3>;

    case "p":
      return (
        <p>
          <Rich runs={block.runs} />
        </p>
      );

    case "formula":
      return (
        <div className="formula">
          {/* As linhas viram um <pre> só, e não um <span> por linha: várias delas são
              alinhadas por espaços (o "=" de uma embaixo do "=" da outra), e o HTML
              colapsa espaços repetidos. O bloco inteiro é centralizado como uma unidade,
              com o texto alinhado à esquerda dentro dele — centralizar cada linha
              separadamente destruiria justamente a coluna que o alinhamento constrói. */}
          <div className="formula-eqs">
            <pre className="formula-eq">{block.eq.join("\n")}</pre>
          </div>
          {/* dt e dd entram direto na grade do dl: um Fragment não cria caixa, e um div
              aqui quebraria as duas colunas. */}
          {block.terms && block.terms.length > 0 && (
            <dl className="formula-terms">
              {block.terms.map((t) => (
                <Fragment key={t.sym}>
                  <dt>{t.sym}</dt>
                  <dd>
                    <Rich runs={t.def} />
                  </dd>
                </Fragment>
              ))}
            </dl>
          )}
          {block.note && (
            <p className="formula-note">
              <Rich runs={block.note} />
            </p>
          )}
        </div>
      );

    case "code":
      return (
        <figure>
          <pre className="codeblock">
            {block.lines.map((line, i) => (
              <div key={i}>{line === "" ? " " : line}</div>
            ))}
          </pre>
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );

    case "note":
      return (
        <div className={`note note--${block.tone}`}>
          <strong className="note-title">{block.title}</strong>
          <Rich runs={block.runs} />
        </div>
      );

    case "list":
      return (
        <ul className="feat-list">
          {block.items.map((item, i) => (
            <li key={i}>
              <span className="chk" aria-hidden="true">
                ✓
              </span>
              <span>
                <Rich runs={item} />
              </span>
            </li>
          ))}
        </ul>
      );

    case "figure":
      return (
        <figure className="block-figure">
          <div className="figure-frame">
            <Figure name={block.name} />
          </div>
          {block.caption && (
            <figcaption>
              <Rich runs={block.caption} />
            </figcaption>
          )}
        </figure>
      );
  }
}

export function Blocks({ blocks }: { blocks: readonly Block[] }) {
  return (
    <div className="blocks prose">
      {blocks.map((block, i) => (
        <One key={i} block={block} />
      ))}
    </div>
  );
}
