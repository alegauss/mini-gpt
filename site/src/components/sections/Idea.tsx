import { idea } from "../../lib/site-content";
import { Blocks } from "../ui/Blocks";
import { Rich } from "../ui/Rich";

// A seção que precisa funcionar sozinha: se o leitor sair da página logo depois dela,
// ainda terá levado a ideia inteira. As duas fórmulas aqui são as únicas de que o site
// precisa para justificar tudo o que vem em seguida.
export function Idea() {
  return (
    <section id="ideia">
      <div className="wrap narrow">
        <div className="sec-head">
          <div className="eyebrow">{idea.eyebrow}</div>
          <h2>{idea.title}</h2>
          <p>
            <Rich runs={idea.lead} />
          </p>
        </div>
        <div className="reveal">
          <Blocks blocks={idea.blocks} />
        </div>
      </div>
    </section>
  );
}
