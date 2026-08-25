import { demos } from "../../lib/site-content";
import { BigramDemo } from "../demos/BigramDemo";
import { MaskDemo } from "../demos/MaskDemo";
import { SamplingDemo } from "../demos/SamplingDemo";
import { TokenizerDemo } from "../demos/TokenizerDemo";
import { Rich } from "../ui/Rich";

// As quatro demonstrações. Todas renderizam no servidor com um estado inicial fixo e
// determinístico, então a página prerenderizada já mostra algo de verdade — e a hidratação
// não troca nada de lugar. Quem chega sem JavaScript lê um exemplo estático correto em vez
// de uma caixa vazia.
export function Demos() {
  return (
    <section id="demos">
      <div className="wrap">
        <div className="sec-head">
          <div className="eyebrow">{demos.eyebrow}</div>
          <h2>{demos.title}</h2>
          <p>
            <Rich runs={demos.lead} />
          </p>
        </div>

        <div className="demo-stack">
          <TokenizerDemo />
          <BigramDemo />
          <SamplingDemo />
          <MaskDemo />
        </div>
      </div>
    </section>
  );
}
