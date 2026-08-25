import { useMemo, useState } from "react";
import {
  Bigram,
  DEMO_CORPUS,
  applyTemperature,
  applyTopK,
  buildVocab,
  displayChar,
  encode,
} from "../../lib/minigpt";
import { demos } from "../../lib/site-content";
import { Rich } from "../ui/Rich";

// Demonstração 3 — temperatura e top-k.
//
// A distribuição mostrada é real: são as contagens do corpus desta página, suavizadas com
// α = 1, para um caractere de contexto escolhido nos botões. Os dois controles não tocam
// no modelo — eles reescrevem apenas a distribuição da qual se sorteia, que é exatamente
// o papel de `Sampler.applyTemperature` e `Sampler.applyTopK`.

const CONTEXTOS = ["a", "o", "e", " ", "m", "q", "r"];
const MOSTRAR = 12;

export function SamplingDemo() {
  const { vocab, model } = useMemo(() => {
    const v = buildVocab(DEMO_CORPUS);
    const m = new Bigram(v.itos.length);
    m.fit(encode(v, DEMO_CORPUS));
    return { vocab: v, model: m };
  }, []);

  const [ctx, setCtx] = useState("a");
  const [temp, setTemp] = useState(1);
  const [topK, setTopK] = useState(0);

  const linhas = useMemo(() => {
    const id = vocab.stoi.get(ctx);
    if (id === undefined) return [];
    const base = model.row(id, 1);
    const comTemp = applyTemperature(base, temp);
    const final = topK > 0 ? applyTopK(comTemp, topK) : comTemp;

    // Ordenadas pela probabilidade ORIGINAL, para que as barras não pulem de lugar
    // quando os controles mudam — o que se quer ver é a altura mudando, não a ordem.
    return base
      .map((p, i) => ({ i, base: p, valor: final[i] }))
      .sort((a, b) => b.base - a.base)
      .slice(0, MOSTRAR);
  }, [vocab, model, ctx, temp, topK]);

  const maior = linhas.length > 0 ? Math.max(...linhas.map((l) => l.valor)) : 1;

  return (
    <div className="demo reveal">
      <div className="demo-head">
        <span className="demo-title">{demos.sampling.title}</span>
        <span className="demo-tag">{demos.sampling.tag}</span>
      </div>
      <div className="demo-body">
        <p className="demo-lead">
          <Rich runs={demos.sampling.lead} />
        </p>

        <div className="demo-actions" style={{ marginBottom: "20px" }}>
          <span className="control-hint" style={{ marginRight: "4px" }}>
            caractere anterior:
          </span>
          {CONTEXTOS.map((c) => (
            <button
              key={c}
              type="button"
              className={c === ctx ? "chip chip-on" : "chip"}
              onClick={() => setCtx(c)}
              aria-pressed={c === ctx}
            >
              {displayChar(c).label}
            </button>
          ))}
        </div>

        <div className="controls">
          <div className="control">
            <label htmlFor="sp-temp">
              Temperatura τ <span className="control-val">{temp.toFixed(2)}</span>
            </label>
            <input
              id="sp-temp"
              type="range"
              min={0.2}
              max={2}
              step={0.05}
              value={temp}
              onChange={(e) => setTemp(Number(e.target.value))}
            />
            <span className="control-hint">
              Leve para 0,2 e veja uma barra engolir as outras; leve para 2 e veja todas se igualarem.
            </span>
          </div>
          <div className="control">
            <label htmlFor="sp-topk">
              Top-k <span className="control-val">{topK === 0 ? "desligado" : topK}</span>
            </label>
            <input
              id="sp-topk"
              type="range"
              min={0}
              max={12}
              step={1}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
            />
            <span className="control-hint">
              As barras cortadas vão a zero e a massa delas é redistribuída entre as que ficaram.
            </span>
          </div>
        </div>

        <div className="bars">
          {linhas.map((l) => {
            const ch = vocab.itos[l.i];
            const cortada = l.valor === 0;
            return (
              <div className={cortada ? "bar-row cut" : "bar-row"} key={l.i}>
                <span className="bar-key">
                  {displayChar(ch).label}
                </span>
                <span className="bar-track">
                  <span
                    className="bar-fill"
                    style={{ width: `${maior > 0 ? (l.valor / maior) * 100 : 0}%` }}
                  />
                </span>
                <span className="bar-val">{(l.valor * 100).toFixed(1)}%</span>
              </div>
            );
          })}
        </div>

        <p className="control-hint" style={{ marginTop: "14px" }}>
          Os {MOSTRAR} caracteres mais prováveis depois de <code>{displayChar(ctx).label}</code>, em ordem
          fixa. A barra mostra a probabilidade depois da temperatura e do top-k, normalizada pela maior.
        </p>
      </div>
      <div className="demo-foot">
        <Rich runs={demos.sampling.foot} />
      </div>
    </div>
  );
}
