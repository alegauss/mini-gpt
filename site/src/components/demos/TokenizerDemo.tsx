import { useMemo, useState } from "react";
import { DEMO_CORPUS, buildVocab, displayChar } from "../../lib/minigpt";
import { demos } from "../../lib/site-content";
import { Rich } from "../ui/Rich";

// Demonstração 1 — o tokenizador.
//
// O vocabulário é construído a partir do corpus da página, exatamente como
// `CharTokenizer.fromText` faz: caracteres distintos, ordenados por code point, ids
// crescentes. O texto digitado é então codificado contra ESSE vocabulário — inclusive
// quando um caractere não está nele, que é o caso mais instrutivo dos dois.

const EXEMPLO = "O menino olhava o rio.";

export function TokenizerDemo() {
  const vocab = useMemo(() => buildVocab(DEMO_CORPUS), []);
  const [text, setText] = useState(EXEMPLO);

  const tokens = useMemo(
    () =>
      Array.from(text).map((ch) => {
        const id = vocab.stoi.get(ch);
        const { label, invisible } = displayChar(ch);
        return { ch, label, invisible, id };
      }),
    [text, vocab],
  );

  const desconhecidos = tokens.filter((t) => t.id === undefined).length;

  return (
    <div className="demo reveal">
      <div className="demo-head">
        <span className="demo-title">{demos.tokenizer.title}</span>
        <span className="demo-tag">{demos.tokenizer.tag}</span>
      </div>
      <div className="demo-body">
        <p className="demo-lead">
          <Rich runs={demos.tokenizer.lead} />
        </p>

        <div className="demo-row">
          <div className="field">
            <label htmlFor="tok-input">Escreva alguma coisa</label>
            <input
              id="tok-input"
              type="text"
              value={text}
              maxLength={64}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
            />
          </div>
        </div>

        <div className="tok-grid">
          {tokens.map((t, i) => (
            <span
              className={t.invisible ? "tok tok-space" : "tok"}
              key={i}
              title={t.id === undefined ? "fora do vocabulário deste corpus" : `id ${t.id}`}
            >
              <span className="tok-char">{t.label}</span>
              <span className="tok-id">{t.id === undefined ? "—" : t.id}</span>
            </span>
          ))}
        </div>

        <div className="tok-meta">
          <span>
            vocabulário do corpus: <b>V = {vocab.itos.length}</b>
          </span>
          <span>
            caracteres digitados: <b>{tokens.length}</b>
          </span>
          <span>
            fora do vocabulário: <b>{desconhecidos}</b>
          </span>
        </div>

        {desconhecidos > 0 && (
          <div className="note note--warn" style={{ marginTop: "16px" }}>
            <strong className="note-title">Um caractere que o corpus não tem</strong>
            Os quadrinhos com <code>—</code> não existem no vocabulário construído a partir deste corpus,
            então não há id para eles, e o modelo não consegue representá-los. É o que
            acontece de verdade quando se treina num texto sem acentuação e depois se pede para gerar
            português correto: a informação nunca esteve lá.
          </div>
        )}
      </div>
      <div className="demo-foot">
        <Rich runs={demos.tokenizer.foot} />
      </div>
    </div>
  );
}
