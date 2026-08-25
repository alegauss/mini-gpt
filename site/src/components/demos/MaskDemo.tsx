import { useState } from "react";
import { demos } from "../../lib/site-content";
import { Rich } from "../ui/Rich";

// Demonstração 4 — a máscara causal.
//
// Uma grade T×T: a linha `i` é a posição que está prevendo, a coluna `j` é a posição que
// ela olha. A célula acende quando `j ≤ i`. É literalmente o que `Tensor.causalMask` faz,
// só que ali o "apagado" é `−∞` somado aos escores antes do softmax — que é o que garante
// peso exatamente zero, e não apenas pequeno.
//
// A grade é binária de propósito. Os pesos de verdade saem do softmax e dependem do
// conteúdo; o que a máscara decide é apenas o que está no jogo.

const SEQ = Array.from("o menino");
const T = SEQ.length;

function rotulo(ch: string): string {
  return ch === " " ? "␣" : ch;
}

export function MaskDemo() {
  const [pos, setPos] = useState(5);

  return (
    <div className="demo reveal">
      <div className="demo-head">
        <span className="demo-title">{demos.mask.title}</span>
        <span className="demo-tag">{demos.mask.tag}</span>
      </div>
      <div className="demo-body">
        <p className="demo-lead">
          <Rich runs={demos.mask.lead} />
        </p>

        <div className="mask-wrap">
          <div>
            <div className="mask-grid" style={{ gridTemplateColumns: `repeat(${T + 1}, 30px)` }}>
              {/* canto vazio + cabeçalho das colunas (as posições olhadas) */}
              <span className="mask-axis-lbl" aria-hidden="true" />
              {SEQ.map((ch, j) => (
                <span className="mask-axis-lbl" key={`h${j}`}>
                  {rotulo(ch)}
                </span>
              ))}

              {SEQ.map((rowCh, i) => (
                <Row key={i} i={i} rowCh={rowCh} pos={pos} />
              ))}
            </div>

            <div className="mask-legend">
              <span>
                <i className="mask-swatch" style={{ background: "var(--violet)" }} /> pode olhar
              </span>
              <span>
                <i className="mask-swatch" style={{ background: "var(--panel-2)" }} /> bloqueado (−∞)
              </span>
              <span>
                <i className="mask-swatch" style={{ background: "var(--violet)", outline: "2px solid var(--cyan)" }} /> a
                própria posição
              </span>
            </div>
          </div>

          <div className="mask-side">
            <div className="control" style={{ marginBottom: "18px" }}>
              <label htmlFor="mk-pos">
                Posição sendo prevista <span className="control-val">i = {pos}</span>
              </label>
              <input
                id="mk-pos"
                type="range"
                min={0}
                max={T - 1}
                step={1}
                value={pos}
                onChange={(e) => setPos(Number(e.target.value))}
              />
            </div>

            <h4>O que a posição {pos} enxerga</h4>
            <p>
              Ela pode olhar <b>{pos + 1}</b> {pos === 0 ? "posição" : "posições"}:{" "}
              <code>{SEQ.slice(0, pos + 1).map(rotulo).join(" ")}</code>. Tudo o que vem depois está a{" "}
              <code>−∞</code> e sai do softmax com peso exatamente zero.
            </p>
            <p>
              Repare na posição <b>0</b>: ela só pode olhar para si mesma. É o caso em que a atenção não
              tem nada a somar, e é por isso que o começo de qualquer geração é o pedaço mais frágil do
              texto.
            </p>
            <p>
              E repare que o triângulo cheio é exatamente o desenho do logotipo deste site: é a figura
              que o projeto inteiro existe para explicar.
            </p>
          </div>
        </div>
      </div>
      <div className="demo-foot">
        <Rich runs={demos.mask.foot} />
      </div>
    </div>
  );
}

/** Uma linha da grade: o rótulo da posição e as T células. */
function Row({ i, rowCh, pos }: { i: number; rowCh: string; pos: number }) {
  const ativa = i === pos;
  return (
    <>
      <span className="mask-axis-lbl">{rotulo(rowCh)}</span>
      {SEQ.map((_, j) => {
        const podeOlhar = j <= i;
        const classes = ["mask-cell"];
        classes.push(podeOlhar ? "on" : "off");
        if (podeOlhar && i === j) classes.push("self");
        if (!ativa) classes.push("dimmed");
        return (
          <span
            className={classes.join(" ")}
            key={j}
            style={
              podeOlhar
                ? { background: `rgba(109, 74, 255, ${0.35 + 0.5 * (ativa ? 1 : 0.4)})` }
                : undefined
            }
            title={podeOlhar ? `posição ${i} olha a posição ${j}` : `posição ${i} não pode olhar a ${j}`}
          >
            {podeOlhar ? "" : "×"}
          </span>
        );
      })}
    </>
  );
}
