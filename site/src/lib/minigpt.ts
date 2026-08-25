/**
 * O nível 1 e a amostragem, reescritos em TypeScript para rodarem no navegador.
 *
 * Isto é uma tradução fiel, linha a linha, de três arquivos do repositório:
 * `data/CharTokenizer.java`, `model/BigramModel.java` e `generate/Sampler.java`.
 * A intenção é que o aluno veja o algoritmo funcionando antes de instalar qualquer
 * coisa — e depois reconheça, no Java, exatamente as mesmas contas.
 *
 * O que muda em relação ao Java: só o gerador de números aleatórios. `java.util.Random`
 * tem um algoritmo próprio, então a mesma semente aqui e lá produz textos diferentes;
 * tudo o mais (o vocabulário, as contagens, a suavização, a temperatura, o top-k e a
 * amostragem por transformada inversa) é a mesma aritmética.
 */

/* ------------------------------------------------------------------ tokenizador */

export type Vocab = {
  /** id → caractere. O índice do array é o id. */
  itos: string[];
  /** caractere → id. */
  stoi: Map<string, number>;
};

/**
 * Constrói o vocabulário de um texto: os caracteres distintos, ordenados por code point
 * Unicode, recebendo ids crescentes.
 *
 * A ordenação é o que torna o mapeamento determinista — o mesmo corpus gera sempre os
 * mesmos ids, o que é essencial para salvar e recarregar um modelo.
 */
export function buildVocab(text: string): Vocab {
  const distinct = Array.from(new Set(Array.from(text)));
  distinct.sort((a, b) => (a.codePointAt(0) ?? 0) - (b.codePointAt(0) ?? 0));
  const stoi = new Map<string, number>();
  distinct.forEach((ch, i) => stoi.set(ch, i));
  return { itos: distinct, stoi };
}

/** Texto → ids. Caracteres fora do vocabulário são descartados. */
export function encode(vocab: Vocab, text: string): number[] {
  const out: number[] = [];
  for (const ch of text) {
    const id = vocab.stoi.get(ch);
    if (id !== undefined) out.push(id);
  }
  return out;
}

/** ids → texto. */
export function decode(vocab: Vocab, ids: number[]): string {
  return ids.map((id) => vocab.itos[id] ?? "").join("");
}

/** Como um caractere aparece na tela quando ele não tem forma visível. */
export function displayChar(ch: string): { label: string; invisible: boolean } {
  if (ch === " ") return { label: "␣", invisible: true };
  if (ch === "\n") return { label: "⏎", invisible: true };
  if (ch === "\t") return { label: "⇥", invisible: true };
  return { label: ch, invisible: false };
}

/* ------------------------------------------------------------------ bigrama */

/**
 * O modelo de bigrama: conta pares e normaliza.
 *
 * `p(b | a) = (N[a][b] + α) / (Σ_c N[a][c] + α·V)`
 *
 * Não há treino por gradiente: uma única varredura pelo corpus preenche a matriz de
 * contagens, e a probabilidade sai de uma divisão.
 */
export class Bigram {
  readonly vocabSize: number;
  private readonly counts: Float64Array;
  private readonly rowSums: Float64Array;

  constructor(vocabSize: number) {
    this.vocabSize = vocabSize;
    // Uma matriz V×V achatada: N[a][b] mora em counts[a·V + b].
    this.counts = new Float64Array(vocabSize * vocabSize);
    this.rowSums = new Float64Array(vocabSize);
  }

  /** Conta todos os pares adjacentes do corpus. Uma passada, O(N). */
  fit(ids: number[]): void {
    for (let i = 0; i + 1 < ids.length; i++) {
      const a = ids[i];
      const b = ids[i + 1];
      this.counts[a * this.vocabSize + b] += 1;
      this.rowSums[a] += 1;
    }
  }

  /** Quantas vezes o par (a, b) foi visto, sem suavização. */
  count(a: number, b: number): number {
    return this.counts[a * this.vocabSize + b];
  }

  /** A distribuição suavizada do próximo caractere, dado o caractere `a`. */
  row(a: number, alpha: number): number[] {
    const v = this.vocabSize;
    const denom = this.rowSums[a] + alpha * v;
    const p = new Array<number>(v);
    for (let b = 0; b < v; b++) {
      p[b] = (this.counts[a * v + b] + alpha) / denom;
    }
    return p;
  }

  /**
   * A entropia cruzada média, em nats por caractere: a média de `−ln p(real)` sobre
   * todas as posições. É o número que diz o quanto o modelo se surpreende.
   */
  loss(ids: number[], alpha: number): number {
    if (ids.length < 2) return 0;
    const v = this.vocabSize;
    let sum = 0;
    let n = 0;
    for (let i = 0; i + 1 < ids.length; i++) {
      const a = ids[i];
      const b = ids[i + 1];
      const denom = this.rowSums[a] + alpha * v;
      const pb = (this.counts[a * v + b] + alpha) / denom;
      sum += -Math.log(pb);
      n++;
    }
    return sum / n;
  }

  /** Quantos dos V² pares possíveis nunca apareceram no corpus. */
  unseenPairs(): number {
    let unseen = 0;
    for (let i = 0; i < this.counts.length; i++) {
      if (this.counts[i] === 0) unseen++;
    }
    return unseen;
  }
}

/* ------------------------------------------------------------------ amostragem */

/**
 * Reescala uma distribuição pela temperatura: `p'ᵢ ∝ pᵢ^(1/τ)`.
 *
 * A conta é feita em log, por estabilidade: `ln p'ᵢ = (1/τ)·ln pᵢ`, seguida de um softmax
 * que renormaliza. Probabilidade zero vira `−∞` em log e volta a zero ao exponenciar.
 *
 * τ < 1 esfria (concentra massa no mais provável); τ > 1 esquenta (achata a distribuição).
 */
export function applyTemperature(p: number[], temperature: number): number[] {
  const invT = 1 / temperature;
  const logits = new Array<number>(p.length);
  let max = -Infinity;
  for (let i = 0; i < p.length; i++) {
    logits[i] = p[i] > 0 ? invT * Math.log(p[i]) : -Infinity;
    if (logits[i] > max) max = logits[i];
  }
  let sum = 0;
  const out = new Array<number>(p.length);
  for (let i = 0; i < p.length; i++) {
    out[i] = Math.exp(logits[i] - max);
    sum += out[i];
  }
  for (let i = 0; i < out.length; i++) out[i] /= sum;
  return out;
}

/**
 * Mantém apenas os `k` maiores, zera o resto e renormaliza.
 *
 * O limiar é o k-ésimo maior valor, e o corte é `p ≥ limiar` — igual ao Java. Em caso de
 * empate no limiar, isso mantém mais de `k` candidatos, o que é a escolha conservadora:
 * cortar um empate arbitrariamente seria pior do que manter os dois.
 */
export function applyTopK(p: number[], k: number): number[] {
  if (k <= 0 || k >= p.length) return p;
  const sorted = [...p].sort((a, b) => a - b); // crescente
  const threshold = sorted[p.length - k];

  const out = new Array<number>(p.length).fill(0);
  let sum = 0;
  for (let i = 0; i < p.length; i++) {
    if (p[i] >= threshold) {
      out[i] = p[i];
      sum += p[i];
    }
  }
  if (sum === 0) return p;
  for (let i = 0; i < out.length; i++) out[i] /= sum;
  return out;
}

/**
 * Sorteia um índice de uma distribuição discreta pela transformada inversa: sorteia
 * `u ∈ [0,1)` e devolve o menor `i` tal que a soma acumulada até `i` passa de `u`.
 */
export function sampleFrom(p: number[], u: number): number {
  let acc = 0;
  for (let i = 0; i < p.length; i++) {
    acc += p[i];
    if (u < acc) return i;
  }
  return p.length - 1; // guarda contra erro de arredondamento
}

/**
 * Um gerador pseudoaleatório pequeno e com semente (mulberry32).
 *
 * Existe para que "a mesma semente dá o mesmo texto" seja verdade também aqui — a mesma
 * propriedade que `--seed` garante na linha de comando. O algoritmo é outro, então os
 * textos não coincidem entre o navegador e o Java; a reprodutibilidade, sim.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Gera texto com o bigrama, exatamente como o `Sampler` faz: pega a distribuição do
 * próximo caractere, aplica temperatura, aplica top-k, sorteia, anexa e repete.
 */
export function generateBigram(
  model: Bigram,
  vocab: Vocab,
  opts: {
    prompt: string;
    length: number;
    alpha: number;
    temperature: number;
    topK: number;
    rng: () => number;
  },
): string {
  const seedIds = encode(vocab, opts.prompt);
  let last = seedIds.length > 0 ? seedIds[seedIds.length - 1] : 0;
  const out: string[] = [];
  for (let step = 0; step < opts.length; step++) {
    let p = model.row(last, opts.alpha);
    p = applyTemperature(p, opts.temperature);
    if (opts.topK > 0) p = applyTopK(p, opts.topK);
    const next = sampleFrom(p, opts.rng());
    out.push(vocab.itos[next] ?? "");
    last = next;
  }
  return out.join("");
}

/* ------------------------------------------------------------------ corpus da demonstração */

/**
 * O corpus das demonstrações desta página.
 *
 * Escrito com acentuação completa, porque é assim que o português é e porque o
 * tokenizador em nível de caractere trata `ã` como qualquer outro caractere: um id a mais
 * no vocabulário.
 *
 * O tamanho é uma escolha, e ela tem consequência visível. Um corpus de dois mil
 * caracteres deixava a maior parte dos pares possíveis sem nenhuma ocorrência — e aí a
 * massa que a suavização acrescenta a cada linha (`α·V`) pesa mais do que as contagens
 * reais, o que empurra o modelo na direção do sorteio uniforme e faz o texto sair pior do
 * que um bigrama honestamente é. Este corpus é várias vezes maior por isso, e a
 * demonstração ainda deixa o α na mão de quem lê, porque essa disputa entre contagem e
 * suavização é justamente a lição do nível 1.
 *
 * Mesmo assim, ele continua sendo minúsculo perto do alvo real: `data/README.md` explica
 * como colocar cerca de 1 MB de texto em domínio público — Machado de Assis, Eça de
 * Queirós, José de Alencar — no lugar do placeholder do repositório.
 */
export const DEMO_CORPUS = `A manhã chegava devagar sobre a cidade, e o rio corria manso entre as pedras.
O menino sentava na beira da água e ficava contando os círculos que as pedras
faziam ao cair. Havia um cheiro de pão quente vindo da padaria da esquina, e o
velho relojoeiro abria a porta da loja com o mesmo cuidado de todos os dias.

As crianças corriam pela rua estreita, riam alto e chamavam umas às outras pelos
nomes. Nas janelas, cortinas brancas balançavam ao sabor da brisa. Uma mulher
regava as flores da varanda e cantarolava uma canção antiga, dessas que a avó
dela costumava cantar quando a tarde caía sobre os telhados.

O pai do menino contava histórias à noite: barcos, tempestades e ilhas distantes
onde moravam pessoas que falavam línguas estranhas e bonitas. O menino ouvia tudo
sem piscar, e depois sonhava com mares que nunca tinha visto, com portos cheios de
gente e com o som da água batendo no casco de madeira velha.

Na escola, a professora escrevia palavras no quadro e pedia que cada um lesse a
sua em voz alta. O menino gostava das palavras compridas, das que precisavam de
fôlego para chegar ao fim. Achava que uma palavra grande guardava mais coisas
dentro dela, como uma casa com muitos quartos e muitas janelas abertas.

Quando a noite chegava, a cidade ficava quieta. Só o rio continuava, teimoso,
levando embora o que o dia tinha deixado. O menino dormia ouvindo aquela água, e
a água entrava no sonho dele como entra uma frase repetida muitas vezes: sem que
a gente perceba, ela vira parte do jeito de pensar.

De manhã tudo recomeçava. O bonde passava com um ruído metálico, carregando gente
apressada para o trabalho. O menino descia a ladeira devagar, chutando uma pedra
pequena, e pensava que talvez o mundo inteiro fosse assim: uma coisa depois da
outra, cada uma puxando a seguinte, até formar uma história comprida.

A padeira acordava antes de todo mundo. Acendia o forno ainda no escuro, abria os
sacos de farinha e deixava a massa descansar sobre a mesa de madeira. Dizia que a
massa precisava de tempo do mesmo jeito que a gente precisa, e que ter pressa com
o pão era o mesmo que ter pressa com uma conversa: no fim não sai nada bom.

O menino passava na padaria antes da escola e ficava olhando o forno aberto. O
calor batia no rosto dele e cheirava a coisa boa. A padeira dava um pedaço de pão
quente e mandava correr, senão chegava tarde. Ele corria, com o pão na mão, pela
mesma rua estreita de sempre, contando os passos até o portão.

Na sala de aula, a janela dava para o pátio, e o pátio dava para o rio. Quando a
professora escrevia no quadro, o menino olhava a água e pensava nas ilhas do pai.
Depois voltava para as palavras, porque gostava delas também. Escrevia devagar,
caprichando nas letras, como quem tem medo de estragar uma coisa bonita.

Um dia a professora pediu que cada um escrevesse uma história de verdade. O menino
levou a tarde inteira pensando, sentado na beira da água. Escreveu sobre um barco
que saía do porto de manhã e voltava de noite, carregado de coisas que ninguém
sabia nomear. Escreveu sobre o cheiro do pão e sobre o ruído do bonde. Escreveu
sobre o pai, sobre a padeira e sobre o relojoeiro que abria a loja com cuidado.

Quando leu em voz alta, a sala ficou quieta. A professora não disse nada por um
tempo, e depois disse que era isso mesmo: uma história é uma coisa puxando a
outra, do começo ao fim, sem que a gente veja o fio. O menino guardou a frase e
levou para casa, junto com o caderno e com o resto do pão.

De noite, o pai perguntou como tinha sido o dia. O menino contou tudo, sem pressa,
do jeito que a padeira falava da massa. O pai ouviu até o fim, olhando o teto, e
depois disse que no dia seguinte iam os dois até o porto ver os barcos de perto.
O menino demorou a dormir. Ficou ouvindo o rio, contando os passos que faltavam
para a manhã chegar, e a água foi levando o pensamento dele devagarinho, até que
o quarto ficou escuro de vez e a cidade inteira dormiu junto.

No porto havia cordas grossas, caixas empilhadas e homens que gritavam nomes de
lugares. O menino andou entre as caixas segurando a mão do pai, olhando os cascos
pintados e a água batendo neles sem parar. Perguntou de onde vinha cada barco, e
o pai respondeu o que sabia e inventou o resto, que é o que todo pai faz.

Na volta, compraram pão na esquina e comeram andando. O menino ia calado, pensando
que o mundo era maior do que a rua dele e menor do que ele imaginava, tudo ao
mesmo tempo. Chegando em casa, abriu o caderno e escreveu mais um pedaço da
história, porque agora sabia como o porto cheirava de manhã.`;
