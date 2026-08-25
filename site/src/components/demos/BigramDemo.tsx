import { useMemo, useState } from "react";
import {
  Bigram,
  DEMO_CORPUS,
  ORDEM1_CORPUS,
  ORDEM1_LEXICO,
  buildVocab,
  encode,
  generateBigram,
  mulberry32,
  palavrasForaDoLexico,
} from "../../lib/minigpt";
import { demos } from "../../lib/site-content";
import { Rich } from "../ui/Rich";

// Demonstração 2 — o nível 1 inteiro, treinado no navegador.
//
// A contagem roda uma vez (useMemo) e vale para todos os α: a suavização entra só na hora
// de dividir, que é exatamente como o Java faz. Por isso arrastar o α é instantâneo — não
// há nada para retreinar.
//
// A semente é estado: mesma semente, mesmo texto, aqui e a cada recarga da página. É a
// mesma promessa que `--seed` faz na linha de comando, e é o que torna o passo a passo
// reproduzível para quem estiver acompanhando.

const SEMENTE_INICIAL = 20240824;
const COMPRIMENTO = 320;

// O α padrão daqui é menor do que o do repositório (que usa 1,0), e a diferença é o
// tamanho do corpus, não uma discordância. A suavização acrescenta `α·V` de massa a cada
// linha; num corpus de 1 MB isso é desprezível perto das contagens reais, mas nos poucos
// milhares de caracteres desta página seria a maior parte da linha — e o texto sairia
// pior do que um bigrama honestamente é. O controle fica visível justamente para que essa
// disputa entre contagem e suavização possa ser vista acontecendo.
const ALPHA_PADRAO = 0.3;

// Os dois corpora entre os quais a demonstração alterna. O segundo existe para responder à
// pergunta que todo mundo faz depois de ver o primeiro falhar: "então dá para acertar?".
// Dá — quando a linguagem é de ordem 1, que é a hipótese que o bigrama assume. O prompt
// muda junto porque "O menino " não existe no léxico de doze palavras.
const CORPORA = {
  portugues: { rotulo: "Português", texto: DEMO_CORPUS, prompt: "O menino ", lexico: null },
  ordem1: { rotulo: "Linguagem de ordem 1", texto: ORDEM1_CORPUS, prompt: "mar ", lexico: ORDEM1_LEXICO },
} as const;
type CorpusKey = keyof typeof CORPORA;

export function BigramDemo() {
  const [corpusKey, setCorpusKey] = useState<CorpusKey>("portugues");
  const corpus = CORPORA[corpusKey];

  const { vocab, model, ids } = useMemo(() => {
    const v = buildVocab(corpus.texto);
    const encoded = encode(v, corpus.texto);
    const m = new Bigram(v.itos.length);
    m.fit(encoded);
    return { vocab: v, model: m, ids: encoded };
  }, [corpus.texto]);

  const [alpha, setAlpha] = useState(ALPHA_PADRAO);
  const [temp, setTemp] = useState(1);
  const [topK, setTopK] = useState(0);
  const [prompt, setPrompt] = useState<string>(CORPORA.portugues.prompt);
  const [semente, setSemente] = useState(SEMENTE_INICIAL);

  function trocarCorpus(k: CorpusKey) {
    setCorpusKey(k);
    setPrompt(CORPORA[k].prompt);
  }

  const texto = useMemo(
    () =>
      generateBigram(model, vocab, {
        prompt,
        length: COMPRIMENTO,
        alpha,
        temperature: temp,
        topK,
        rng: mulberry32(semente),
      }),
    [model, vocab, prompt, alpha, temp, topK, semente],
  );

  const perda = useMemo(() => model.loss(ids, alpha), [model, ids, alpha]);
  const v = vocab.itos.length;
  const naoVistos = useMemo(() => model.unseenPairs(), [model]);
  const perdaUniforme = Math.log(v);

  // Só a linguagem de ordem 1 tem resposta certa, então só nela esta conta existe.
  const foraDoLexico = useMemo(
    () => (corpus.lexico ? palavrasForaDoLexico(texto, corpus.lexico) : null),
    [texto, corpus.lexico],
  );

  return (
    <div className="demo reveal">
      <div className="demo-head">
        <span className="demo-title">{demos.bigram.title}</span>
        <span className="demo-tag">{demos.bigram.tag}</span>
      </div>
      <div className="demo-body">
        <p className="demo-lead">
          <Rich runs={demos.bigram.lead} />
        </p>

        <div className="demo-row">
          <div className="field">
            <span className="field-label">Corpus</span>
            <div className="seg">
              {(Object.keys(CORPORA) as CorpusKey[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`seg-btn${k === corpusKey ? " on" : ""}`}
                  aria-pressed={k === corpusKey}
                  onClick={() => trocarCorpus(k)}
                >
                  {CORPORA[k].rotulo}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="demo-row">
          <div className="field">
            <label htmlFor="bg-prompt">Prompt (o texto de partida)</label>
            <input
              id="bg-prompt"
              type="text"
              value={prompt}
              maxLength={40}
              onChange={(e) => setPrompt(e.target.value)}
              spellCheck={false}
            />
          </div>
        </div>

        <div className="controls">
          <div className="control">
            <label htmlFor="bg-alpha">
              Suavização α <span className="control-val">{alpha.toFixed(2)}</span>
            </label>
            <input
              id="bg-alpha"
              type="range"
              min={0.01}
              max={3}
              step={0.01}
              value={alpha}
              onChange={(e) => setAlpha(Number(e.target.value))}
            />
            <span className="control-hint">
              Massa mínima dada a todo par, inclusive aos que nunca ocorreram. Suba até 3 e veja o texto
              virar ruído: a suavização passou a pesar mais que as contagens.
            </span>
          </div>
          <div className="control">
            <label htmlFor="bg-temp">
              Temperatura τ <span className="control-val">{temp.toFixed(2)}</span>
            </label>
            <input
              id="bg-temp"
              type="range"
              min={0.2}
              max={2}
              step={0.05}
              value={temp}
              onChange={(e) => setTemp(Number(e.target.value))}
            />
            <span className="control-hint">Abaixo de 1 esfria e repete; acima de 1 esquenta e delira.</span>
          </div>
          <div className="control">
            <label htmlFor="bg-topk">
              Top-k <span className="control-val">{topK === 0 ? "desligado" : topK}</span>
            </label>
            <input
              id="bg-topk"
              type="range"
              min={0}
              max={20}
              step={1}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
            />
            <span className="control-hint">Mantém só os k mais prováveis e renormaliza. 0 desliga.</span>
          </div>
        </div>

        <div className="gen-out">
          <span className="prompt">{prompt}</span>
          {texto}
          <span className="caret" aria-hidden="true" />
        </div>

        <div className="demo-actions" style={{ marginTop: "16px" }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setSemente((s) => s + 1)}
          >
            Gerar outra vez
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setAlpha(ALPHA_PADRAO);
              setTemp(1);
              setTopK(0);
              setSemente(SEMENTE_INICIAL);
            }}
          >
            Voltar aos padrões
          </button>
          <span className="control-hint">semente {semente}</span>
        </div>

        <div className="tok-meta">
          <span>
            vocabulário: <b>V = {v}</b>
          </span>
          <span>
            perda no corpus: <b>{perda.toFixed(3)}</b> nats
          </span>
          <span>
            chute uniforme (ln V): <b>{perdaUniforme.toFixed(3)}</b>
          </span>
          <span>
            pares nunca vistos: <b>{naoVistos}</b> de {v * v}
          </span>
          {foraDoLexico !== null && (
            <span className={foraDoLexico === 0 ? "tok-ok" : "tok-bad"}>
              palavras inválidas: <b>{foraDoLexico}</b>
              {foraDoLexico === 0 ? " — texto perfeito" : ""}
            </span>
          )}
        </div>
      </div>
      <div className="demo-foot">
        <Rich runs={demos.bigram.foot} />
        <p>
          <Rich runs={demos.bigram.foot2} />
        </p>
        <p>
          <Rich runs={demos.bigram.foot3} />
        </p>
      </div>
    </div>
  );
}
