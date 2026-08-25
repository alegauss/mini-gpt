// O texto vive aqui e em mais lugar nenhum. Cada seção importa um valor deste módulo e
// apenas o renderiza — então uma afirmação é um elemento de array que um revisor confere
// contra o código do projeto, não uma string soldada dentro da marcação que a exibe. A
// composição (qual seção, em que ordem, e as figuras SVG) mora no JSX; este arquivo são
// as palavras.

import type { Block, Rich } from "./content-types";

/* ------------------------------------------------------------------ meta e cromo */

export const meta = {
  title: "mini-gpt-java — um GPT escrito à mão, em Java puro",
  description:
    "Curso aberto e código-fonte de um modelo de linguagem em nível de caractere escrito do zero em Java, sem nenhuma biblioteca de machine learning. Três níveis: bigrama por contagem, MLP com backpropagation manual e um Transformer mínimo com autodiff.",
  og: {
    title: "mini-gpt-java",
    description:
      "Três níveis, do bigrama que conta pares até um Transformer com atenção causal — toda a álgebra escrita à mão em double[][], para você poder ler cada conta.",
  },
} as const;

export const repoUrl = "https://github.com/alegauss/mini-gpt";
export const parentUrl = "https://alegauss.github.io/";
export const BASE_PATH = "/mini-gpt/";

/** Um caminho de página, já com o prefixo que o GitHub Pages exige. */
export function page(path: string): string {
  return path === "/" ? BASE_PATH : `${BASE_PATH}${path.replace(/^\//, "")}/`;
}

export const navLinks = [
  { href: page("/niveis/bigrama"), label: "Nível 1" },
  { href: page("/niveis/mlp"), label: "Nível 2" },
  { href: page("/niveis/transformer"), label: "Nível 3" },
  { href: page("/matematica"), label: "Matemática" },
  { href: page("/como-rodar"), label: "Como rodar" },
];

export const footer = {
  links: [
    { href: page("/"), label: "Início" },
    { href: page("/matematica"), label: "Matemática" },
    { href: page("/como-rodar"), label: "Como rodar" },
    { href: repoUrl, label: "GitHub" },
    { href: `${repoUrl}/blob/main/README.md`, label: "README" },
  ],
  disclaimer:
    "Projeto didático e independente. Não é um produto, não é rápido e não pretende competir com nenhuma biblioteca de machine learning — pretende ser legível. Os trechos de terminal deste site ilustram o formato da saída do treino; os números que a sua máquina imprimir dependem do seu corpus, do seu hardware e da sua semente.",
} as const;

/* ------------------------------------------------------------------ herói */

export const hero = {
  badge: "Java 17 · Maven · zero bibliotecas de ML",
  titleLead: "Um GPT escrito à mão,",
  titleAccent: "para você entender cada conta",
  sub: [
    "Um modelo de linguagem em ",
    { b: "nível de caractere" },
    ", treinado do zero em Java puro. Sem PyTorch, sem TensorFlow, sem DJL: toda a álgebra linear é ",
    { code: "double[][]" },
    " que você consegue ler de cima a baixo. Três níveis, do bigrama que só conta pares até um Transformer com atenção causal.",
  ] as Rich,
  ctaPrimary: "Começar pelo nível 1",
  ctaGhost: "★ Ver no GitHub",
  meta: [
    "Java 17+ e Maven",
    "Uma única dependência: JUnit 5",
    "Roda em CPU comum, sem GPU",
    "Gradientes conferidos por diferenças finitas",
  ],
  pills: [
    [{ b: "Nível 1" }, " — Bigrama: contagem pura, sem gradiente"] as Rich,
    [{ b: "Nível 2" }, " — MLP: backpropagation derivada à mão"] as Rich,
    [{ b: "Nível 3" }, " — Transformer: autodiff e atenção"] as Rich,
  ],
} as const;

/**
 * A sessão de treino que abre a página.
 *
 * Cada linha carrega a sua cor. É o formato que `Trainer.train()` realmente imprime —
 * cabeçalho, uma linha por medida e uma amostra a cada 500 passos — com números que
 * seguem a meta declarada no README (perda de validação abaixo de 1,7 em 2000 passos,
 * cerca de 25 minutos numa CPU comum). O rodapé da seção diz isso em voz alta: é uma
 * ilustração do formato, não um log capturado da sua máquina.
 */
export type SessionLine = { text: string; tone?: "ok" | "hl" | "cy" | "dim" | "warn" | "white" };

export const heroSession = {
  eyebrow: "Um treino, do começo ao fim",
  title: "mini-gpt-java — train --model transformer",
  lines: [
    { text: "$ java -jar target/mini-gpt-java.jar train --model transformer --steps 2000", tone: "ok" },
    { text: "== Treino: modelo 'transformer' ==", tone: "white" },
    { text: "Corpus: data/corpus.txt (1043271 caracteres, vocabulario V=96)", tone: "dim" },
    { text: "Contexto=64 | Treino: 938943 tokens | Validacao: 104328 tokens", tone: "dim" },
    { text: "" },
    { text: "passo   loss_treino  loss_val     tempo", tone: "hl" },
    { text: "1       4.5762       4.5701       0.71s" },
    { text: "100     2.8410       2.8395       75.94s" },
    { text: "300     2.2137       2.2088       226.15s" },
    { text: "500     2.0431       2.0396       376.02s" },
    { text: "  --- amostra (100 caracteres) ---", tone: "dim" },
    { text: "  o mento de sua parte de comprar a estava da porta, e o menta de casa de dia", tone: "cy" },
    { text: "1000    1.8502       1.8571       751.38s" },
    { text: "  --- amostra (100 caracteres) ---", tone: "dim" },
    { text: "  a noite chegava devagar, e o menino nao sabia mais o que dizia na porta", tone: "cy" },
    { text: "1500    1.7410       1.7566       1126.77s" },
    { text: "  --- amostra (100 caracteres) ---", tone: "dim" },
    { text: "  o velho abriu a loja com cuidado e olhou para a rua, como fazia todos os dias", tone: "cy" },
    { text: "2000    1.6588       1.6902       1502.44s" },
    { text: "  --- amostra (100 caracteres) ---", tone: "dim" },
    { text: "  as criancas corriam pela rua estreita e chamavam umas as outras pelos nomes", tone: "cy" },
    { text: "", tone: "dim" },
    { text: "Vocabulario salvo em target/transformer.vocab", tone: "ok" },
  ] as SessionLine[],
  note: [
    "Repare no que acontece entre o passo 500 e o 2000: o modelo não ganha um dicionário, ele ganha ",
    { b: "estatística" },
    ". Primeiro sílabas, depois palavras, depois concordância. Nenhuma regra de português foi escrita em lugar nenhum — só a conta de prever o próximo caractere, repetida duas mil vezes. A sessão acima ilustra o formato que ",
    { code: "Trainer" },
    " imprime e segue a meta do projeto (perda de validação abaixo de 1,7); os números da sua máquina dependem do seu corpus.",
  ] as Rich,
} as const;

/* ------------------------------------------------------------------ a ideia central */

export const idea = {
  eyebrow: "A ideia central",
  title: "Um modelo de linguagem faz uma coisa só",
  lead: [
    "Ele responde a uma pergunta, repetidamente: ",
    { b: "dado o texto até aqui, qual é o próximo caractere?" },
    " Tudo o que este projeto constrói — contagem, gradiente, atenção — são maneiras cada vez melhores de responder a essa única pergunta.",
  ] as Rich,
  blocks: [
    {
      kind: "formula",
      eq: ["p(x₁, x₂, …, x_T)  =  ∏  p(x_t | x₁ … x_{t−1})"],
      terms: [
        {
          sym: "x_t",
          def: [
            "o caractere na posição ",
            { code: "t" },
            " — aqui, uma letra, um espaço ou uma quebra de linha, não uma palavra",
          ],
        },
        { sym: "p(x_t | …)", def: ["a probabilidade daquele caractere ", { b: "dado tudo o que veio antes" }] },
        {
          sym: "∏",
          def: [
            "o produto sobre todas as posições: a probabilidade do texto inteiro é o produto das probabilidades de cada passo",
          ],
        },
      ],
      note: [
        "Essa igualdade é só a regra do produto da probabilidade, sem nenhuma hipótese escondida. O que muda de um nível para o outro é ",
        { b: "quanto do passado" },
        " cada modelo consegue de fato usar: o bigrama usa um caractere, o MLP usa oito, o Transformer usa sessenta e quatro — e decide sozinho a quais deles prestar atenção.",
      ],
    },
    {
      kind: "h",
      text: "E como se mede se a resposta foi boa",
    },
    {
      kind: "p",
      runs: [
        "Prever uma distribuição não é acertar ou errar: é apostar. A métrica precisa premiar quem deu probabilidade alta ao caractere que de fato veio, e punir quem deu quase nenhuma. A entropia cruzada faz exatamente isso — e é a mesma nos três níveis, o que permite compará-los.",
      ],
    },
    {
      kind: "formula",
      eq: ["L  =  −  (1/N)  Σ  ln p(x_t real)"],
      terms: [
        { sym: "L", def: ["a ", { b: "entropia cruzada" }, ": a perda que o treino minimiza"] },
        { sym: "N", def: ["quantas posições foram avaliadas"] },
        {
          sym: "ln p",
          def: [
            "o logaritmo natural da probabilidade que o modelo deu ao caractere que ",
            { b: "de fato" },
            " apareceu",
          ],
        },
      ],
      note: [
        "Leia assim: se o modelo dá probabilidade alta ao caractere certo, ",
        { code: "−ln p" },
        " fica perto de zero. Se dá probabilidade quase nula, o valor explode. A perda é a ",
        { b: "surpresa média" },
        " do modelo, medida em nats por caractere. Um modelo que chuta uniformemente entre ",
        { code: "V" },
        " caracteres tem perda ",
        { code: "ln V" },
        " — com V = 96, isso é 4,56. Todo nível deste projeto começa exatamente aí, e desce.",
      ],
    },
  ] as Block[],
};

/* ------------------------------------------------------------------ o pipeline */

export const pipeline = {
  eyebrow: "O caminho completo",
  title: "Do arquivo de texto ao texto gerado",
  lead: [
    "São seis etapas, e nenhuma delas é mágica. Cada caixa abaixo é um arquivo do repositório que você pode abrir hoje.",
  ] as Rich,
  steps: [
    {
      ico: "📄",
      title: "Corpus",
      file: "data/corpus.txt",
      body: [
        "Um arquivo ",
        { code: ".txt" },
        " em UTF-8. Cerca de 1 MB de português em domínio público é o alvo — quanto mais consistente o texto, mais legível a saída.",
      ] as Rich,
    },
    {
      ico: "🔤",
      title: "Tokenizador",
      file: "data/CharTokenizer.java",
      body: [
        "Cada caractere distinto vira um número. Os caracteres são ordenados por code point, então o mesmo corpus gera sempre os mesmos ids — uma bijeção, com ",
        { code: "decode(encode(t)) == t" },
        ".",
      ] as Rich,
    },
    {
      ico: "🪟",
      title: "Janelas e lotes",
      file: "data/Dataset.java",
      body: [
        "O corpus linear vira pares ",
        { code: "(x, y)" },
        ": ",
        { code: "y" },
        " é ",
        { code: "x" },
        " deslocado de uma posição. Os primeiros 90% são treino, o resto é validação — cortados por posição, nunca embaralhados.",
      ] as Rich,
    },
    {
      ico: "🧠",
      title: "Modelo",
      file: "model/*.java",
      body: [
        "O nível que você escolheu transforma o contexto em ",
        { b: "logits" },
        ": um número por caractere do vocabulário, ainda sem normalizar.",
      ] as Rich,
    },
    {
      ico: "📉",
      title: "Treino",
      file: "train/Trainer.java",
      body: [
        "Sorteia um mini-lote, roda forward e backward, e pede um passo ao ",
        { code: "AdamOptimizer" },
        ". A cada 500 passos gera uma amostra, para você ver o texto evoluir.",
      ] as Rich,
    },
    {
      ico: "✨",
      title: "Amostragem",
      file: "generate/Sampler.java",
      body: [
        "Softmax nos logits, temperatura, top-k, sorteio. O caractere sorteado entra no contexto e o laço recomeça — é isso que quer dizer ",
        { b: "autoregressivo" },
        ".",
      ] as Rich,
    },
  ],
} as const;

/* ------------------------------------------------------------------ os níveis (chamada) */

export const levelsSection = {
  eyebrow: "Três níveis",
  title: "Uma escada, não um salto",
  lead: [
    "Cada degrau resolve uma limitação concreta do degrau anterior, e cada um tem que ",
    { b: "bater a perda" },
    " do anterior para justificar a própria complexidade. É por isso que o projeto começa por um modelo que qualquer pessoa entende em cinco minutos.",
  ] as Rich,
  footnote: [
    "As perdas abaixo pressupõem um corpus real de cerca de 1 MB em português. Com o placeholder curto que vem no repositório, os três níveis parecem melhores do que são — o modelo decora em vez de generalizar, e é ",
    { b: "isso" },
    " que a perda de validação existe para denunciar.",
  ] as Rich,
} as const;

/* ------------------------------------------------------------------ demonstrações */

export const demos = {
  eyebrow: "Veja acontecer",
  title: "As contas, rodando no seu navegador",
  lead: [
    "As quatro demonstrações abaixo são traduções fiéis do código Java do repositório, reescritas em TypeScript para rodarem aqui. Mexa nos controles: o objetivo é você ",
    { b: "sentir" },
    " o que cada parâmetro faz antes de ler a fórmula.",
  ] as Rich,

  tokenizer: {
    title: "1. Tokenizador em nível de caractere",
    tag: "CharTokenizer.java",
    lead: [
      "Escreva qualquer coisa. Cada caractere distinto do corpus recebeu um id na ordem do code point Unicode — e é ",
      { b: "esse número" },
      ", não a letra, que entra na conta. Repare que o espaço e a quebra de linha também são caracteres, e que ",
      { code: "ã" },
      " é um id como qualquer outro.",
    ] as Rich,
    foot: [
      "É isto que ",
      { code: "stoi" },
      " e ",
      { code: "itos" },
      " fazem no Java. Nível de caractere é a escolha didática do projeto: o vocabulário fica pequeno (dezenas de ids em vez de dezenas de milhares) e o modelo tem que aprender a ",
      { b: "soletrar" },
      " — o que torna o progresso visível a olho nu.",
    ] as Rich,
  },

  bigram: {
    title: "2. O nível 1 inteiro, treinado agora",
    tag: "BigramModel.java",
    lead: [
      "Este botão faz o que ",
      { code: "fit()" },
      " faz: uma passada pelo corpus contando pares. Depois gera texto sorteando da distribuição contada. É o modelo inteiro — ",
      { b: "não há mais nada" },
      " no nível 1.",
    ] as Rich,
    foot: [
      "O texto tem a textura do português — a proporção de vogais, os acentos em lugares plausíveis, o tamanho das palavras — e quase nenhuma palavra real. Essa distância entre ",
      { i: "parecer" },
      " e ",
      { i: "ser" },
      " é exatamente o que o nível 2 vai atacar. Um aviso honesto sobre o α: o repositório usa ",
      { code: "α = 1" },
      " porque conta com um corpus de ~1 MB; aqui são poucos milhares de caracteres, e ",
      { code: "α·V" },
      " passaria a pesar mais do que as contagens reais. Por isso o padrão desta demonstração é menor — e por isso o controle está à mostra: arraste-o para os dois extremos e veja a suavização deixar de proteger e passar a afogar.",
    ] as Rich,
  },

  sampling: {
    title: "3. Temperatura e top-k",
    tag: "Sampler.java",
    lead: [
      "A distribuição abaixo é real: são as probabilidades do próximo caractere depois de um ",
      { code: "a" },
      ", contadas no mesmo corpus. Os dois controles não mudam o modelo — mudam apenas ",
      { b: "como se sorteia dele" },
      ".",
    ] as Rich,
    foot: [
      "Temperatura baixa concentra a massa no mais provável (texto conservador e repetitivo); temperatura alta achata a distribuição (texto criativo e ruidoso). O top-k corta a cauda: opções individualmente improváveis que, somadas, ainda roubam sorteios. No limite ",
      { code: "τ → 0" },
      " a amostragem vira ",
      { code: "argmax" },
      " e o texto passa a se repetir para sempre.",
    ] as Rich,
  },

  mask: {
    title: "4. A máscara causal",
    tag: "TransformerModel.java",
    lead: [
      "Cada linha é uma posição da sequência; cada coluna é uma posição que ela ",
      { b: "pode olhar" },
      ". Arraste o controle para escolher a posição que está sendo prevista e veja o que ela enxerga.",
    ] as Rich,
    foot: [
      "As células apagadas viram ",
      { code: "−∞" },
      " antes do softmax, o que as leva a peso exatamente zero depois dele. Sem essa máscara, o modelo veria o caractere que deveria prever — a perda de treino despencaria e o modelo não aprenderia absolutamente nada útil. É o bug mais comum e mais silencioso da área.",
    ] as Rich,
  },
} as const;

/* ------------------------------------------------------------------ confiança / testes */

export const trust = {
  eyebrow: "Como saber que está certo",
  title: "Um gradiente errado treina em silêncio",
  lead: [
    "Um sinal de menos trocado numa derivada não quebra nada: o programa roda, a perda cai um pouco e o modelo fica ruim sem dizer por quê. É o tipo de defeito que consome semanas. Por isso todo gradiente deste projeto é conferido contra a definição de derivada.",
  ] as Rich,
  blocks: [
    {
      kind: "formula",
      eq: ["∂f/∂θ  ≈  ( f(θ + ε) − f(θ − ε) ) / (2ε)"],
      terms: [
        { sym: "f", def: ["a perda, como função de um único parâmetro"] },
        { sym: "θ", def: ["o parâmetro sendo conferido — um número dentro de uma matriz de pesos"] },
        { sym: "ε", def: ["um deslocamento minúsculo, da ordem de ", { code: "1e-5" }] },
      ],
      note: [
        "A diferença central é lenta demais para treinar (uma perturbação por parâmetro, duas avaliações cada), mas é ",
        { b: "independente" },
        " do backward que se quer testar. Se o gradiente analítico e o numérico batem até a quinta casa, o backward está certo. Se não batem, o teste falha e diz qual tensor.",
      ],
    },
  ] as Block[],
  items: [
    {
      title: "MlpGradCheckTest",
      body: [
        "Confere ",
        { b: "todos" },
        " os gradientes derivados à mão do nível 2 — ",
        { code: "dC" },
        ", ",
        { code: "dW1" },
        ", ",
        { code: "db1" },
        ", ",
        { code: "dW2" },
        ", ",
        { code: "db2" },
        " — com erro abaixo de ",
        { code: "1e-5" },
        ".",
      ] as Rich,
    },
    {
      title: "TransformerGradCheckTest",
      body: [
        "Confere o grafo inteiro do nível 3: atenção, LayerNorm, residuais, feed-forward e a cabeça de pesos amarrados, todos pelo mesmo critério.",
      ] as Rich,
    },
    {
      title: "TensorGradCheckTest",
      body: [
        "Confere mais de doze operações do autodiff isoladamente — ",
        { code: "matmul" },
        ", ",
        { code: "softmaxRows" },
        ", ",
        { code: "layerNorm" },
        ", ",
        { code: "causalMask" },
        ", ",
        { code: "crossEntropyRows" },
        " e outras.",
      ] as Rich,
    },
    {
      title: "TrainingLearnsTest",
      body: [
        "Confere a afirmação que importa no fim: que ",
        { code: "Trainer" },
        " mais ",
        { code: "AdamOptimizer" },
        " de fato ",
        { b: "reduzem a perda" },
        " do MLP e do Transformer.",
      ] as Rich,
    },
  ],
  command: "mvn test",
} as const;

/* ------------------------------------------------------------------ roteiro de leitura */

export const roadmap = {
  eyebrow: "Roteiro de estudo",
  title: "A ordem em que eu leria os arquivos",
  lead: [
    "O repositório tem treze classes; estas dez são o caminho. Lidas nesta ordem, cada uma só usa o que a anterior já explicou — e nenhuma exige que você acredite em nada por enquanto.",
  ] as Rich,
  items: [
    {
      file: "data/CharTokenizer.java",
      why: "Onde texto vira número. Comece aqui: é a única classe que não precisa de matemática nenhuma.",
    },
    {
      file: "data/Dataset.java",
      why: "Onde o corpus vira exemplos de treino, e onde mora a divisão treino/validação.",
    },
    {
      file: "model/BigramModel.java",
      why: "O nível 1 inteiro, em 134 linhas. Leia o Javadoc: a matemática está toda no comentário de classe.",
    },
    {
      file: "generate/Sampler.java",
      why: "Como uma distribuição vira texto. Temperatura e top-k, com a conta feita em log por estabilidade.",
    },
    {
      file: "core/Matrix.java",
      why: "A álgebra crua: matmul, transposta e o softmax estável. Curta, e usada por todo o resto.",
    },
    {
      file: "model/MlpModel.java",
      why: "O nível 2. A cadeia de gradientes está comentada passo a passo, na ordem em que ela é executada.",
    },
    {
      file: "train/AdamOptimizer.java",
      why: "Por que ninguém usa descida de gradiente pura. Dois momentos, correção de viés, e só.",
    },
    {
      file: "train/Trainer.java",
      why: "O laço: sorteia lote, zera gradientes, forward+backward, um passo. Poucas dezenas de linhas que valem por um capítulo.",
    },
    {
      file: "core/Tensor.java",
      why: "O autodiff. A classe mais densa do projeto — leia depois de ter derivado os gradientes do MLP à mão.",
    },
    {
      file: "model/TransformerModel.java",
      why: "O nível 3. Com o Tensor entendido, este arquivo lê-se quase como pseudocódigo.",
    },
  ],
} as const;

/* ------------------------------------------------------------------ restrições do projeto */

export const rules = {
  eyebrow: "As regras do jogo",
  title: "O que este projeto se proíbe de fazer",
  lead: [
    "As restrições não são estética: cada uma existe para que o código continue legível por quem está aprendendo.",
  ] as Rich,
  items: [
    {
      ico: "🚫",
      title: "Nenhuma biblioteca de ML",
      body: [
        "Nada de DJL, ND4J, DL4J ou TensorFlow. Toda a álgebra linear é escrita à mão com ",
        { code: "double[][]" },
        " — porque uma chamada de biblioteca é exatamente o ponto em que o aprendizado pararia.",
      ] as Rich,
    },
    {
      ico: "🧪",
      title: "Uma dependência, só nos testes",
      body: [
        "JUnit 5, e mais nada. O ",
        { code: "pom.xml" },
        " cabe numa tela, e ",
        { code: "mvn test" },
        " roda numa máquina recém-formatada.",
      ] as Rich,
    },
    {
      ico: "📐",
      title: "A matemática mora no código",
      body: [
        "Cada classe traz, no Javadoc, a fórmula que ela implementa. O comentário e a linha de código ficam a centímetros um do outro — que é a única distância em que os dois se mantêm sincronizados.",
      ] as Rich,
    },
    {
      ico: "🖥️",
      title: "CPU comum, sem GPU",
      body: [
        "O ",
        { code: "Tensor.matmul" },
        " distribui as linhas do resultado entre os núcleos com um ",
        { code: "parallel stream" },
        ". É o que mantém o Transformer dentro de meia hora sem recorrer a nada nativo.",
      ] as Rich,
    },
    {
      ico: "🎲",
      title: "Reprodutível por semente",
      body: [
        "Todo sorteio passa por um ",
        { code: "Random" },
        " com semente explícita (",
        { code: "--seed" },
        "). Mesma semente, mesmo corpus, mesmo texto — o que torna um experimento comparável com o anterior.",
      ] as Rich,
    },
    {
      ico: "🔍",
      title: "Nada de peso mágico",
      body: [
        "Os modelos treináveis não persistem pesos: cada execução treina do zero. É mais lento e é honesto — não existe um arquivo binário fazendo o trabalho que o código deveria mostrar.",
      ] as Rich,
    },
  ],
} as const;

/* ------------------------------------------------------------------ chamada final */

export const closing = {
  title: "Comece pelo degrau mais baixo",
  body: [
    "O nível 1 não tem gradiente, não tem matriz de pesos e não tem laço de treino — e ainda assim já é um modelo de linguagem completo, com tokenização, probabilidade, perda e amostragem. Entendido ele, os outros dois são a mesma ideia com mais álgebra.",
  ] as Rich,
  body2: [
    "Se você preferir começar pelas mãos, ",
    { code: "mvn test" },
    " e depois ",
    { code: "compare" },
    " colocam os três níveis lado a lado no mesmo corpus, com o mesmo prompt.",
  ] as Rich,
  ctaPrimary: "Ir para o nível 1",
  ctaGhost: "Como rodar na sua máquina",
} as const;
