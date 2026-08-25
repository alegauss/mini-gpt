import { lineage } from "../../lib/site-content";
import { Blocks } from "../ui/Blocks";
import { Rich } from "../ui/Rich";

// A moldura do projeto. Vem depois do roteiro de leitura e antes das restrições, porque
// só faz sentido explicar por que o projeto se proíbe de usar bibliotecas depois de o
// leitor saber para que serve um sistema pequeno o bastante para ser lido inteiro.
export function Lineage() {
  return (
    <section id="origem">
      <div className="wrap narrow">
        <div className="sec-head">
          <div className="eyebrow">{lineage.eyebrow}</div>
          <h2>{lineage.title}</h2>
          <p>
            <Rich runs={lineage.lead} />
          </p>
        </div>
        <div className="reveal">
          <Blocks blocks={lineage.blocks} />
        </div>
      </div>
    </section>
  );
}
