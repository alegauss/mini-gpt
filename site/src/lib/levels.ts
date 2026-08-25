// Os três níveis, como registros.
//
// Cada registro alimenta ao mesmo tempo o cartão na página inicial, a página de
// profundidade, a rota e os metadados dela. Um nível não pode existir com cartão e sem
// página, nem com página e sem título — porque é tudo o mesmo objeto.

import type { Block, Rich } from "./content-types";

export type Exercise = { id: string; title: string; body: Rich };

export type Level = {
  /** o pedaço de URL: /niveis/<slug>/ */
  slug: string;
  n: 1 | 2 | 3;
  /** a chave de cor, compartilhada com o CSS: n1 = âmbar, n2 = ciano, n3 = violeta */
  key: "n1" | "n2" | "n3";
  name: string;
  /** o arquivo do repositório onde este nível mora */
  file: string;
  /** como pedir este nível na linha de comando */
  flag: string;
  tagline: string;
  card: Rich;
  teaches: string[];
  stats: { label: string; value: string }[];

  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  lead: Rich;
  blocks: Block[];
  exercises: Exercise[];
};

/* ================================================================== NÍVEL 1 */

const bigrama: Level = {
  slug: "bigrama",
  n: 1,
  key: "n1",
  name: "Bigrama",
  file: "model/BigramModel.java",
  flag: "--model bigram",
  tagline: "Contar pares. Só isso.",
  card: [
    "O próximo caractere depende ",
    { b: "apenas" },
    " do anterior. Estimamos a probabilidade contando quantas vezes cada par apareceu no corpus e dividindo. Não há gradiente, não há pesos, não há laço de treino.",
  ],
  teaches: [
    "Tokenização em nível de caractere",
    "Estimativa de máxima verossimilhança",
    "Suavização de Laplace: por que p = 0 é catastrófico",
    "Entropia cruzada como métrica",
    "Amostragem com temperatura e top-k",
  ],
  stats: [
    { label: "Contexto", value: "1 caractere" },
    { label: "Treino", value: "instantâneo" },
    { label: "Perda esperada", value: "~2–3 nats" },
  ],

  title: "Nível 1: Bigrama — mini-gpt-java",
  description:
    "O modelo de linguagem mais simples que ainda é um modelo de linguagem: conta pares de caracteres, normaliza com suavização de Laplace e amostra. Sem gradiente, sem pesos, sem treino iterativo.",
  ogTitle: "Nível 1 — Bigrama",
  ogDescription:
    "Máxima verossimilhança por contagem, suavização de Laplace e entropia cruzada. O degrau mais baixo do mini-gpt-java, explicado linha a linha.",
  lead: [
    "O modelo mais simples que ainda merece o nome. Ele estabelece a ",
    { b: "linha de base" },
    ": qualquer coisa mais sofisticada precisa bater a perda do bigrama para justificar a própria complexidade.",
  ],

  blocks: [
    { kind: "h", text: "A hipótese" },
    {
      kind: "p",
      runs: [
        "A regra do produto diz que a probabilidade de um texto é o produto de ",
        { code: "p(x_t | x₁ … x_{t−1})" },
        " sobre todas as posições. O problema é que esse condicional depende de um passado que cresce sem parar: não há como tabelá-lo. O bigrama resolve isso com a hipótese mais agressiva possível.",
      ],
    },
    {
      kind: "formula",
      eq: ["p(x_t | x₁ … x_{t−1})   ≈   p(x_t | x_{t−1})"],
      terms: [
        { sym: "x_{t−1}", def: ["o caractere imediatamente anterior — o único que o modelo enxerga"] },
        { sym: "≈", def: ["não é uma igualdade: é uma ", { b: "aposta" }, ", e uma que sabemos ser falsa"] },
      ],
      note: [
        "Com essa hipótese o condicional vira uma tabela ",
        { code: "V × V" },
        ": uma linha por caractere de contexto, uma coluna por caractere possível. Com V = 96, são 9.216 números — cabem na memória e podem ser contados numa passada.",
      ],
    },
    {
      kind: "note",
      tone: "key",
      title: "A ideia que vale a página inteira",
      runs: [
        "Um modelo de linguagem é uma ",
        { b: "tabela de probabilidades condicionais" },
        ". Tudo o que os níveis 2 e 3 fazem é comprimir essa tabela — que seria grande demais para o contexto real — dentro de uma função com parâmetros. Mas o objeto que se quer estimar continua sendo este.",
      ],
    },

    { kind: "h", text: "Estimar contando" },
    {
      kind: "p",
      runs: [
        "Como estimar ",
        { code: "p(b | a)" },
        " a partir de um corpus? Contando. Se ",
        { code: "a" },
        " apareceu 1.000 vezes e em 300 delas foi seguido de ",
        { code: "b" },
        ", a estimativa é 0,3. Isso tem nome — ",
        { b: "estimativa de máxima verossimilhança" },
        " — e é, demonstravelmente, a tabela que torna o corpus observado o mais provável possível.",
      ],
    },
    {
      kind: "formula",
      eq: ["N[a][b]  =  quantas vezes 'b' apareceu logo depois de 'a'", "p(b | a)  =  ( N[a][b] + α )  /  ( Σ_c N[a][c] + α·V )"],
      terms: [
        { sym: "N[a][b]", def: ["a contagem crua do par, preenchida numa varredura só"] },
        { sym: "Σ_c N[a][c]", def: ["quantas vezes ", { code: "a" }, " apareceu no total — o denominador sem suavização"] },
        { sym: "α", def: ["a constante de suavização (o projeto usa ", { code: "α = 1" }, ")"] },
        { sym: "V", def: ["o tamanho do vocabulário; ", { code: "α·V" }, " é a massa total que a suavização acrescenta à linha"] },
      ],
    },
    {
      kind: "p",
      runs: [
        "O treino inteiro do nível 1 são estas cinco linhas. Não é uma simplificação didática: é literalmente o corpo de ",
        { code: "BigramModel.fit()" },
        ".",
      ],
    },
    {
      kind: "code",
      caption: "model/BigramModel.java — o método fit() completo",
      lines: [
        "for (int i = 0; i + 1 < ids.length; i++) {",
        "    int a = ids[i];",
        "    int b = ids[i + 1];",
        "    counts[a][b] += 1.0;",
        "    rowSums[a]   += 1.0;",
        "}",
      ],
    },
    {
      kind: "p",
      runs: [
        "Complexidade ",
        { code: "O(N)" },
        " no tamanho do corpus, uma passada, sem gradiente. Um megabyte de texto é contado antes de você tirar a mão do teclado.",
      ],
    },

    { kind: "h", text: "Por que α não pode ser zero" },
    {
      kind: "p",
      runs: [
        "Suponha que o par ",
        { code: "\"zq\"" },
        " nunca apareceu no corpus de treino. Sem suavização, ",
        { code: "p(q | z) = 0" },
        ". Agora esse par aparece uma única vez na validação, e a perda daquela posição é ",
        { code: "−ln 0 = +∞" },
        ". A média de qualquer coisa com um infinito dentro é infinito: uma ocorrência isolada destrói a métrica inteira.",
      ],
    },
    {
      kind: "note",
      tone: "warn",
      title: "Probabilidade zero é uma afirmação forte demais",
      runs: [
        "Dizer ",
        { code: "p = 0" },
        " é afirmar que aquilo é ",
        { b: "impossível" },
        ", não apenas raro. Nenhum corpus finito autoriza essa conclusão. A suavização de Laplace (",
        { code: "add-α" },
        ") soma α a toda contagem, o que dá massa mínima a todo par e mantém a perda finita — ao custo de tirar um pouco de probabilidade dos pares que de fato ocorreram.",
      ],
    },
    {
      kind: "p",
      runs: [
        "É por isso que o construtor recusa ",
        { code: "α ≤ 0" },
        " com uma exceção, em vez de aceitar e falhar de forma obscura mais tarde. Na demonstração da página inicial você pode arrastar o α e ver a perda subir dos dois lados: pouco demais deixa a cauda perigosa, muito demais afoga as contagens reais em ruído uniforme.",
      ],
    },

    { kind: "h", text: "O que a perda significa" },
    {
      kind: "formula",
      eq: ["L  =  −(1/N) Σ ln p(x_t | x_{t−1})", "L_uniforme  =  ln V  ≈  4,56   (para V = 96)"],
      terms: [
        { sym: "L", def: ["a entropia cruzada média, em ", { b: "nats por caractere" }] },
        { sym: "ln V", def: ["a perda de um modelo que chuta uniformemente — o teto que qualquer modelo tem que furar"] },
      ],
      note: [
        "Um bigrama num corpus real de português chega a algo entre 2 e 3 nats. Isso significa que, sabendo apenas o caractere anterior, a incerteza sobre o próximo caiu de 96 opções equivalentes para o equivalente a cerca de ",
        { code: "e^2,4 ≈ 11" },
        ". É pouco, e é muito mais do que nada.",
      ],
    },
    {
      kind: "p",
      runs: [
        "Se você preferir pensar em ",
        { b: "perplexidade" },
        ", é só exponenciar: ",
        { code: "PP = e^L" },
        ". Ela responde à pergunta \"entre quantas opções igualmente prováveis o modelo está efetivamente escolhendo?\" — e é a mesma informação, numa escala mais intuitiva.",
      ],
    },

    { kind: "h", text: "O que esperar do texto" },
    {
      kind: "list",
      items: [
        ["A ", { b: "textura" }, " do português aparece: a proporção certa de vogais, acentos em posições plausíveis, palavras com tamanho verossímil."],
        ["Palavras reais quase não aparecem — e as que aparecem são curtas e frequentes: ", { code: "de" }, ", ", { code: "a" }, ", ", { code: "que" }, "."],
        ["Não há concordância, não há sintaxe, não há memória: depois de escrever ", { code: "menin" }, ", o modelo já esqueceu que estava escrevendo uma palavra."],
      ],
    },
    {
      kind: "note",
      tone: "tip",
      title: "É esse esquecimento que motiva o nível 2",
      runs: [
        "O bigrama não falha por falta de dados nem por má estimativa — a estimativa dele é ",
        { b: "ótima" },
        " dado o que ele olha. Ele falha porque olha um caractere só. A pergunta natural passa a ser: e se olhasse oito?",
      ],
    },
  ],

  exercises: [
    {
      id: "E1",
      title: "Meça a linha de base",
      body: [
        "Rode ",
        { code: "train --model bigram" },
        " e anote a perda de validação. Compare com ",
        { code: "ln V" },
        " (o V aparece no cabeçalho da saída). Quanto do caminho até a certeza um único caractere de contexto já percorreu?",
      ],
    },
    {
      id: "E2",
      title: "Quebre a suavização",
      body: [
        "Em ",
        { code: "App.java" },
        ", troque o ",
        { code: "1.0" },
        " passado ao construtor do ",
        { code: "BigramModel" },
        " por ",
        { code: "1e-9" },
        " e depois por ",
        { code: "50" },
        ". Explique, sem rodar, o que cada extremo faz com a perda — e depois confira.",
      ],
    },
    {
      id: "E3",
      title: "Conte o que nunca aconteceu",
      body: [
        "Escreva um laço que conte quantas das ",
        { code: "V²" },
        " células de ",
        { code: "counts" },
        " continuam em zero depois do ",
        { code: "fit()" },
        ". Essa fração é exatamente a superfície que a suavização está cobrindo.",
      ],
    },
    {
      id: "E4",
      title: "Encontre o τ que engana",
      body: [
        "Gere com ",
        { code: "--temp 0.4" },
        ", ",
        { code: "1.0" },
        " e ",
        { code: "1.6" },
        ". Existe uma temperatura em que o bigrama parece mais inteligente do que é? Por que ela não melhora a perda?",
      ],
    },
  ],
};

/* ================================================================== NÍVEL 2 */

const mlp: Level = {
  slug: "mlp",
  n: 2,
  key: "n2",
  name: "MLP",
  file: "model/MlpModel.java",
  flag: "--model mlp",
  tagline: "Oito caracteres, e cada gradiente derivado à mão.",
  card: [
    "Uma rede rasa que olha uma janela fixa de ",
    { b: "oito caracteres" },
    ". Embedding, concatenação, camada linear, ",
    { code: "tanh" },
    ", camada de saída. Todos os gradientes escritos explicitamente, na ordem da regra da cadeia.",
  ],
  teaches: [
    "Embeddings: caracteres como vetores aprendidos",
    "Backpropagation camada a camada",
    "O gradiente conjunto de softmax + entropia cruzada",
    "A derivada da tanh e a saturação",
    "Scatter-add e mini-lotes",
  ],
  stats: [
    { label: "Contexto", value: "8 caracteres" },
    { label: "Treino", value: "poucos segundos" },
    { label: "Perda esperada", value: "abaixo do bigrama" },
  ],

  title: "Nível 2: MLP com backpropagation manual — mini-gpt-java",
  description:
    "Uma rede rasa estilo Bengio 2003 que prevê o próximo caractere a partir de uma janela de oito. Todos os gradientes são derivados à mão, comentados passo a passo e conferidos por diferenças finitas.",
  ogTitle: "Nível 2 — MLP com backprop manual",
  ogDescription:
    "Embedding, concatenação, tanh e softmax — com a cadeia de gradientes inteira escrita à mão e validada com erro abaixo de 1e-5.",
  lead: [
    "Aqui aparece o gradiente. E aparece ",
    { b: "sem autodiff" },
    ": cada derivada é escrita explicitamente, para que você veja de onde ela vem antes de deixar uma biblioteca calculá-la por você.",
  ],

  blocks: [
    { kind: "h", text: "A limitação que este nível resolve" },
    {
      kind: "p",
      runs: [
        "O bigrama esquece tudo, exceto um caractere. A correção óbvia seria contar trigramas, tetragramas, e assim por diante — mas a tabela cresce como ",
        { code: "V^k" },
        ". Com V = 96 e uma janela de oito, seriam ",
        { code: "96⁸" },
        " linhas, cerca de sete mil trilhões. E, pior do que o tamanho: a esmagadora maioria delas ficaria em zero, porque nenhum corpus contém todas as combinações — de modo que a tabela gigante não teria nada a dizer justamente sobre as janelas que você mais precisa prever.",
      ],
    },
    {
      kind: "note",
      tone: "key",
      title: "A saída não é uma tabela maior, é uma função",
      runs: [
        "Em vez de tabelar todas as janelas, aprendemos uma ",
        { b: "função" },
        " com poucos milhares de parâmetros que mapeia qualquer janela para uma distribuição. Janelas parecidas produzem saídas parecidas — o que a tabela nunca conseguiria, porque para ela ",
        { code: "\"o menin\"" },
        " e ",
        { code: "\"a menin\"" },
        " são duas linhas sem relação nenhuma.",
      ],
    },

    { kind: "h", text: "A arquitetura" },
    { kind: "figure", name: "mlp", caption: ["O caminho de ida, do id ao logit. Cada seta é uma linha de ", { code: "MlpModel.java" }, "."] },
    {
      kind: "formula",
      eq: [
        "x     =  concat( C[id₁], C[id₂], …, C[id_T] )        (T·E)",
        "a     =  tanh( x · W₁ + b₁ )                          (H)",
        "logits =  a · W₂ + b₂                                  (V)",
        "L     =  entropia cruzada( softmax(logits), alvo )",
      ],
      terms: [
        { sym: "C", def: ["a tabela de embeddings, ", { code: "V × E" }, ". A linha ", { code: "C[id]" }, " é o vetor que representa aquele caractere — e é ", { b: "aprendida" }, ", não escolhida"] },
        { sym: "T", def: ["o comprimento da janela: 8 por padrão (", { code: "--context" }, ")"] },
        { sym: "E", def: ["a dimensão do embedding: 24 por padrão (", { code: "--embed" }, ")"] },
        { sym: "H", def: ["o tamanho da camada oculta: 128 por padrão (", { code: "--hidden" }, ")"] },
        { sym: "tanh", def: ["a não linearidade. Sem ela, duas camadas lineares colapsam numa só — e a rede inteira vira uma regressão linear"] },
      ],
      note: [
        "É a arquitetura de Bengio (2003), a mesma que popularizou a ideia de embeddings aprendidos. Repare que a concatenação é o ponto fraco: cada posição da janela recebe o seu próprio bloco de pesos em ",
        { code: "W₁" },
        ", então o que a rede aprende sobre a posição 3 não vale nada para a posição 4. Guarde isso — é exatamente o que a atenção vai consertar no nível 3.",
      ],
    },

    { kind: "h", text: "O gradiente que cai do céu" },
    {
      kind: "p",
      runs: [
        "Derivar a entropia cruzada e o softmax separadamente é trabalhoso e numericamente instável. Derivar os dois ",
        { b: "juntos" },
        " produz uma das expressões mais bonitas da área — e a única fórmula deste nível que vale a pena decorar:",
      ],
    },
    {
      kind: "formula",
      eq: ["∂L / ∂logits   =   ( P  −  onehot(y) )  /  B"],
      terms: [
        { sym: "P", def: ["as probabilidades previstas, ", { code: "softmax(logits)" }, " — uma linha por exemplo do lote"] },
        { sym: "onehot(y)", def: ["um vetor com 1 na posição do caractere correto e 0 em todas as outras"] },
        { sym: "B", def: ["o tamanho do mini-lote; dividir por ele é o que faz a perda ser uma ", { b: "média" }, " e não uma soma"] },
      ],
      note: [
        "Leia em português: ",
        { b: "o gradiente é o erro" },
        ". \"Quanta probabilidade eu dei\" menos \"quanta eu deveria ter dado\". Se o modelo deu 0,7 ao caractere certo, aquela coordenada recebe ",
        { code: "0,7 − 1 = −0,3" },
        " e o passo de treino ",
        { b: "aumenta" },
        " aquele logit. Todos os outros recebem o próprio ",
        { code: "P" },
        ", positivo, e são empurrados para baixo.",
      ],
    },

    { kind: "h", text: "A cadeia inteira, na ordem em que ela roda" },
    {
      kind: "p",
      runs: [
        "A partir de ",
        { code: "dLogits" },
        ", cada passo seguinte é uma aplicação mecânica da regra da cadeia, andando de trás para frente pelo caminho de ida. Este bloco é o comentário de classe de ",
        { code: "MlpModel" },
        ", copiado — e cada linha dele existe, comentada, no corpo de ",
        { code: "forwardBackward()" },
        ".",
      ],
    },
    {
      kind: "code",
      caption: "model/MlpModel.java — a derivação, na ordem do backward",
      lines: [
        "dLogits = (P − onehot(y)) / B                        (B×V)",
        "dW2     = Aᵀ · dLogits        db2 = Σ_b dLogits      (H×V), (1×V)",
        "dA      = dLogits · W2ᵀ                              (B×H)",
        "dH1     = dA ⊙ (1 − A²)      (derivada da tanh)      (B×H)",
        "dW1     = Xcatᵀ · dH1        db1 = Σ_b dH1           (T·E×H), (1×H)",
        "dXcat   = dH1 · W1ᵀ                                  (B×T·E)",
        "dC[id] += fatia de dXcat daquela posição (scatter-add)",
      ],
    },
    {
      kind: "note",
      tone: "tip",
      title: "Um truque para conferir sem fazer conta",
      runs: [
        "O gradiente de um tensor tem ",
        { b: "sempre a mesma forma que o tensor" },
        ". Se ",
        { code: "W₁" },
        " é ",
        { code: "(T·E × H)" },
        ", então ",
        { code: "dW1" },
        " também é. Isso sozinho já determina de que lado cada transposta entra na multiplicação — e elimina a maior parte dos erros de derivação antes mesmo de você derivar.",
      ],
    },

    { kind: "h", text: "A derivada da tanh, e por que ela some" },
    {
      kind: "formula",
      eq: ["a = tanh(z)        ⇒        da/dz = 1 − a²"],
      terms: [
        { sym: "a", def: ["a ativação que o forward já calculou — a derivada não precisa de ", { code: "z" }, ", só do resultado"] },
        { sym: "1 − a²", def: ["vale 1 quando ", { code: "a = 0" }, " e cai a zero quando ", { code: "a → ±1" }] },
      ],
      note: [
        "Aí está a ",
        { b: "saturação" },
        ": um neurônio empurrado para ±1 tem derivada quase nula, e o gradiente que passa por ele desaparece — ele para de aprender sem dar nenhum sinal. É por isso que ",
        { code: "W₁" },
        " é inicializado com desvio ",
        { code: "1/√fan_in" },
        ": para as ativações começarem na região central, onde a derivada ainda é grande.",
      ],
    },

    { kind: "h", text: "O scatter-add nos embeddings" },
    {
      kind: "p",
      runs: [
        "O último passo do backward é o mais fácil de errar. Cada exemplo usou T linhas da tabela ",
        { code: "C" },
        ", e o mesmo caractere pode aparecer várias vezes na mesma janela — pense em ",
        { code: "\"casa da \"" },
        ", com três ",
        { code: "a" },
        ". O gradiente de cada uso tem que ser ",
        { b: "somado" },
        " na linha correspondente, nunca atribuído.",
      ],
    },
    {
      kind: "code",
      caption: "model/MlpModel.java — o gradiente volta para as linhas usadas",
      lines: [
        "for (int i = 0; i < b; i++) {",
        "    for (int t = 0; t < blockSize; t++) {",
        "        int id = windows[i][t];",
        "        int base = t * embedDim;",
        "        for (int e = 0; e < embedDim; e++) {",
        "            c.grad[id][e] += dXcat[i][base + e];   // +=, nunca =",
        "        }",
        "    }",
        "}",
      ],
    },
    {
      kind: "note",
      tone: "warn",
      title: "Um '=' no lugar de um '+=' treina em silêncio",
      runs: [
        "Trocar o acúmulo por atribuição faz o modelo aprender com apenas um dos usos de cada caractere. A perda ainda cai, o programa não reclama, e o resultado é só um pouco pior — o tipo de defeito que se descobre semanas depois. É a razão de o ",
        { code: "MlpGradCheckTest" },
        " existir.",
      ],
    },

    { kind: "h", text: "Como sabemos que está certo" },
    {
      kind: "p",
      runs: [
        "Cada uma das derivações acima é conferida contra a definição de derivada, por diferença central, com erro abaixo de ",
        { code: "1e-5" },
        ". O teste perturba um parâmetro de cada vez, mede a perda dos dois lados e compara com o que o backward afirmou. Nenhum gradiente deste nível está no repositório sem ter passado por isso.",
      ],
    },
    { kind: "code", caption: "o teste que sustenta o nível inteiro", lines: ["mvn test -Dtest=MlpGradCheckTest"] },

    { kind: "h", text: "O que esperar do texto" },
    {
      kind: "list",
      items: [
        ["A perda cai claramente abaixo da do bigrama — o primeiro sinal concreto de que a complexidade se pagou."],
        ["Sílabas legítimas aparecem, e depois palavras curtas inteiras: o modelo aprendeu que ", { code: "q" }, " é seguido de ", { code: "u" }, ", que ", { code: "nh" }, " existe e ", { code: "hn" }, " não."],
        ["A frase ainda não fecha: com oito caracteres de janela, não há como manter concordância nem lembrar o sujeito."],
        ["O treino leva segundos, o que faz deste o nível certo para experimentar hiperparâmetro."],
      ],
    },
  ],

  exercises: [
    {
      id: "E1",
      title: "Estique a janela",
      body: [
        "Rode com ",
        { code: "--context 4" },
        ", ",
        { code: "8" },
        " e ",
        { code: "16" },
        ", mantendo o resto igual. A perda melhora sempre? A partir de que ponto o ganho não paga o custo — e por que a concatenação torna esse custo linear em T?",
      ],
    },
    {
      id: "E2",
      title: "Comprima o embedding",
      body: [
        "Use ",
        { code: "--embed 2" },
        ". Cada caractere vira um ponto no plano. Imprima a tabela ",
        { code: "C" },
        " ao fim do treino: vogais caem perto de vogais? Onde ficam o espaço e a quebra de linha?",
      ],
    },
    {
      id: "E3",
      title: "Tire a não linearidade",
      body: [
        "Substitua ",
        { code: "Math.tanh(...)" },
        " pela identidade e ajuste o backward (a derivada vira 1). A rede continua treinando — mas prove que ela deixou de ser mais expressiva que uma única camada linear.",
      ],
    },
    {
      id: "E4",
      title: "Quebre um gradiente de propósito",
      body: [
        "Troque ",
        { code: "c.grad[id][e] +=" },
        " por ",
        { code: "=" },
        " e rode ",
        { code: "mvn test" },
        ". Qual teste falha, e o que exatamente ele reporta? Depois desfaça e repare que a perda de treino ",
        { b: "também" },
        " caía com o bug.",
      ],
    },
  ],
};

/* ================================================================== NÍVEL 3 */

const transformer: Level = {
  slug: "transformer",
  n: 3,
  key: "n3",
  name: "Transformer",
  file: "model/TransformerModel.java",
  flag: "--model transformer",
  tagline: "Atenção causal, e um autodiff que deriva sozinho.",
  card: [
    "Um GPT em miniatura: embeddings de token e de posição, ",
    { b: "self-attention causal multi-head" },
    ", LayerNorm, conexões residuais, feed-forward e pesos amarrados. Aqui ninguém escreve gradiente — o grafo do ",
    { code: "Tensor" },
    " faz isso.",
  ],
  teaches: [
    "Atenção: consultas, chaves e valores",
    "A máscara causal e por que ela é indispensável",
    "Embeddings de posição",
    "LayerNorm e conexões residuais",
    "Diferenciação automática em modo reverso",
  ],
  stats: [
    { label: "Contexto", value: "64 caracteres" },
    { label: "Treino", value: "~25 min (2000 passos)" },
    { label: "Perda alvo", value: "< 1,7" },
  ],

  title: "Nível 3: Transformer mínimo — mini-gpt-java",
  description:
    "Um GPT em miniatura treinado com autodiff reverso escrito à mão: atenção causal multi-head, LayerNorm, residuais, feed-forward e pesos amarrados, em Java puro e sem GPU.",
  ogTitle: "Nível 3 — Transformer mínimo",
  ogDescription:
    "Atenção causal multi-head, LayerNorm, residuais e um grafo de autodiff escrito do zero. Perda de validação abaixo de 1,7 em CPU comum.",
  lead: [
    "O degrau final. Duas mudanças o separam do nível 2: o contexto deixa de ser uma janela rígida e passa a ser ",
    { b: "ponderado pelo próprio modelo" },
    "; e os gradientes deixam de ser escritos à mão e passam a ser derivados por um grafo.",
  ],

  blocks: [
    { kind: "h", text: "A limitação que este nível resolve" },
    {
      kind: "p",
      runs: [
        "O MLP concatena a janela. Isso tem duas consequências ruins. Primeira: cada posição ganha um bloco próprio de pesos, então o que a rede aprende na posição 3 não transfere para a posição 4. Segunda: a janela é rígida — oito caracteres, sempre, sejam eles relevantes ou não.",
      ],
    },
    {
      kind: "note",
      tone: "key",
      title: "A pergunta que a atenção responde",
      runs: [
        "Em vez de \"quais são os oito caracteres anteriores?\", a atenção pergunta: ",
        { b: "dos caracteres anteriores, de quais eu preciso agora, e quanto?" },
        " Os pesos dessa mistura não são fixos: são calculados a cada posição, a partir do próprio conteúdo.",
      ],
    },

    { kind: "h", text: "Consultas, chaves e valores" },
    { kind: "figure", name: "atencao", caption: ["Uma cabeça de atenção. As três projeções saem do mesmo ", { code: "x" }, " — daí o nome ", { i: "self" }, "-attention."] },
    {
      kind: "formula",
      eq: ["Q = x·W_Q     K = x·W_K     V = x·W_V", "atenção(Q, K, V)  =  softmax( Q·Kᵀ / √d  +  máscara ) · V"],
      terms: [
        { sym: "Q (query)", def: ["o que a posição atual ", { b: "procura" }, " — uma pergunta, em forma de vetor"] },
        { sym: "K (key)", def: ["o que cada posição anterior ", { b: "oferece" }, " — um rótulo com que a pergunta é comparada"] },
        { sym: "V (value)", def: ["o que cada posição ", { b: "entrega" }, ", se for escolhida"] },
        { sym: "Q·Kᵀ", def: ["o produto escalar de cada pergunta com cada rótulo: alto quando combinam"] },
        { sym: "√d", def: ["o fator de escala, com ", { code: "d = E / número de cabeças" }] },
      ],
      note: [
        "O softmax por linha transforma essas afinidades em pesos que somam 1. A saída de uma posição é a ",
        { b: "média ponderada" },
        " dos valores das posições que ela decidiu olhar. Nada aqui é fixo: mude o texto e os pesos mudam.",
      ],
    },
    {
      kind: "p",
      runs: [
        "Multi-head é o mesmo mecanismo repetido em subespaços independentes. Com ",
        { code: "E = 128" },
        " e 4 cabeças, cada cabeça trabalha em ",
        { code: "d = 32" },
        " dimensões e pode se especializar — uma acompanha a palavra em curso, outra o começo da frase — e as saídas são concatenadas de volta a 128.",
      ],
    },

    { kind: "h", text: "Por que dividir por √d" },
    {
      kind: "p",
      runs: [
        "O produto escalar de dois vetores aleatórios de dimensão ",
        { code: "d" },
        " tem desvio padrão proporcional a ",
        { code: "√d" },
        ". Sem correção, com d = 32 os escores chegam ao softmax grandes demais; ele satura, um peso vai a quase 1 e os outros a quase 0 — e a derivada do softmax saturado é quase nula. O modelo ",
        { b: "para de aprender antes de começar" },
        ".",
      ],
    },
    {
      kind: "note",
      tone: "tip",
      title: "Um padrão que se repete",
      runs: [
        "Escala e inicialização existem, quase sempre, pelo mesmo motivo: manter os valores na faixa em que a derivada ainda é grande. Foi por isso que o nível 2 inicializou os pesos com ",
        { code: "1/√fan_in" },
        ", e é por isso que aqui se divide por ",
        { code: "√d" },
        ". Duas aparições da mesma preocupação.",
      ],
    },

    { kind: "h", text: "A máscara causal" },
    {
      kind: "p",
      runs: [
        "Nada no mecanismo acima impede a posição 5 de olhar a posição 9. E a posição 9 é justamente o caractere que a posição 5 deveria prever. Sem impedimento, o modelo aprende a copiar a resposta: a perda de treino despenca e o modelo generaliza zero.",
      ],
    },
    {
      kind: "formula",
      eq: ["escores[i][j]  =  −∞      sempre que  j > i"],
      terms: [
        { sym: "i", def: ["a posição que está prevendo"] },
        { sym: "j", def: ["a posição sendo olhada"] },
        { sym: "−∞", def: ["porque ", { code: "e^{−∞} = 0" }, ": depois do softmax, o peso é exatamente zero, não apenas pequeno"] },
      ],
      note: [
        "O ",
        { code: "Tensor.causalMask" },
        " aplica isso antes do softmax, e não depois. Zerar depois exigiria renormalizar à mão e ainda deixaria o gradiente fluir pelo caminho proibido — o mascaramento tem que acontecer onde o softmax possa vê-lo.",
      ],
    },

    { kind: "h", text: "Posição: a atenção não tem ordem" },
    {
      kind: "p",
      runs: [
        "Embaralhe as posições de entrada e a atenção devolve as mesmas saídas, embaralhadas junto. Ela é uma operação sobre um ",
        { b: "conjunto" },
        ", não sobre uma sequência — e uma sequência de caracteres embaralhada não é português. A correção é somar, a cada posição, um vetor que depende só do índice:",
      ],
    },
    {
      kind: "code",
      caption: "model/TransformerModel.java — token mais posição",
      lines: ["Tensor x = Tensor.add(", "        Tensor.rows(tokEmb, tokIds),   // quem é o caractere", "        Tensor.rows(posEmb, posIds));  // onde ele está"],
    },
    {
      kind: "p",
      runs: [
        "Os dois embeddings são aprendidos. A soma parece ingênua — e funciona porque o espaço tem 128 dimensões, sobrando direções para carregar as duas informações sem que uma apague a outra.",
      ],
    },

    { kind: "h", text: "LayerNorm e conexões residuais" },
    { kind: "figure", name: "bloco", caption: ["Um bloco. O nível 3 empilha dois deles por padrão (", { code: "--blocks" }, ")."] },
    {
      kind: "formula",
      eq: ["x  ←  x  +  atenção( LayerNorm(x) )", "x  ←  x  +  feedForward( LayerNorm(x) )"],
      terms: [
        { sym: "LayerNorm", def: ["normaliza cada ", { b: "posição" }, " para média 0 e variância 1, depois reescala por ", { code: "γ" }, " e ", { code: "β" }, " aprendidos"] },
        { sym: "x + …", def: ["a conexão residual: a sub-camada aprende uma ", { b: "correção" }, ", não uma substituição"] },
      ],
      note: [
        "O residual é o que torna a profundidade viável. Como a derivada de ",
        { code: "x + f(x)" },
        " em relação a ",
        { code: "x" },
        " é ",
        { code: "1 + f'(x)" },
        ", existe sempre um caminho por onde o gradiente chega intacto às camadas de baixo. Sem ele, o gradiente atravessa um produto de fatores e desaparece.",
      ],
    },

    { kind: "h", text: "Pesos amarrados" },
    {
      kind: "p",
      runs: [
        "A cabeça de saída poderia ser mais uma matriz ",
        { code: "E × V" },
        ". Em vez disso, o projeto reaproveita a tabela de embeddings transposta: ",
        { code: "logits = x · tokEmbᵀ" },
        ". Faz sentido pelos dois lados — a mesma matriz que diz \"este caractere é este vetor\" serve para perguntar \"qual caractere se parece com este vetor?\" — e economiza ",
        { code: "V × E" },
        " parâmetros, o que também regulariza.",
      ],
    },

    { kind: "h", text: "O autodiff, em três frases" },
    {
      kind: "p",
      runs: [
        "Um ",
        { code: "Tensor" },
        " guarda três coisas: o valor, o gradiente acumulado e uma referência às entradas que o produziram, junto com a função que propaga o gradiente para elas. Cada operação (",
        { code: "matmul" },
        ", ",
        { code: "layerNorm" },
        ", ",
        { code: "softmaxRows" },
        ", …) constrói um nó novo e registra esse caminho de volta. Ao final, ",
        { code: "loss.backwardAll()" },
        " percorre o grafo em ordem topológica reversa, aplicando cada propagação uma vez.",
      ],
    },
    {
      kind: "note",
      tone: "key",
      title: "É por isso que o nível 2 vem antes",
      runs: [
        "Quem já derivou ",
        { code: "dW2 = Aᵀ·dLogits" },
        " à mão reconhece a mesma expressão dentro do ",
        { code: "backward" },
        " do ",
        { code: "matmul" },
        ". O autodiff não é uma caixa-preta nova: é o nível 2 escrito uma vez por operação, em vez de uma vez por modelo.",
      ],
    },

    { kind: "h", text: "O lote achatado" },
    {
      kind: "p",
      runs: [
        "Quase tudo no Transformer age em cada posição independentemente: embeddings, LayerNorm, as projeções Q/K/V, o feed-forward e a cabeça de saída. Empilhando as ",
        { code: "B" },
        " sequências de comprimento ",
        { code: "T" },
        " numa única matriz ",
        { code: "(B·T, E)" },
        ", essas camadas viram ",
        { b: "uma" },
        " multiplicação grande em vez de B pequenas — o que importa muito em CPU. Só a atenção mistura posições, e por isso só ela é feita sequência por sequência.",
      ],
    },

    { kind: "h", text: "O que esperar do texto" },
    {
      kind: "list",
      items: [
        ["A menor perda dos três níveis. A meta declarada do projeto é ", { b: "validação abaixo de 1,7" }, " num corpus real de ~1 MB."],
        ["Palavras reais na maior parte do tempo, e frases que começam a fechar: concordância de gênero e número aparece sozinha."],
        ["Com os padrões (2000 passos, lote 16), cerca de ", { b: "25 minutos" }, " numa CPU comum, sem GPU. Mais ", { code: "--steps" }, " leva mais fundo, ao custo de tempo."],
        ["A distância entre a perda de treino e a de validação é o que você deve vigiar: se a primeira cai e a segunda para, o modelo passou a decorar."],
      ],
    },
  ],

  exercises: [
    {
      id: "E1",
      title: "Uma cabeça ou quatro",
      body: [
        "Compare ",
        { code: "--heads 1" },
        " com ",
        { code: "--heads 4" },
        ", mantendo ",
        { code: "--embed 128" },
        ". O número de parâmetros é praticamente o mesmo — então qualquer diferença de perda vem da ",
        { b: "estrutura" },
        ", não do tamanho.",
      ],
    },
    {
      id: "E2",
      title: "Encurte o contexto",
      body: [
        "Rode com ",
        { code: "--context 16" },
        " e com ",
        { code: "64" },
        ". Quanto o contexto longo vale, em nats? E quanto ele custa, em segundos por passo? (A atenção é quadrática em T.)",
      ],
    },
    {
      id: "E3",
      title: "Fure a máscara",
      body: [
        "Remova a chamada a ",
        { code: "Tensor.causalMask" },
        " e treine por 200 passos. A perda de ",
        { b: "treino" },
        " despenca; a de validação, não. Explique o que o modelo aprendeu a fazer — e por que é inútil.",
      ],
    },
    {
      id: "E4",
      title: "Empilhe mais um bloco",
      body: [
        "Rode com ",
        { code: "--blocks 3" },
        ". Custa mais tempo por passo e melhora a perda? Depois pense: se as conexões residuais não existissem, o que aconteceria com o gradiente ao atravessar três blocos?",
      ],
    },
  ],
};

export const levels: readonly Level[] = [bigrama, mlp, transformer];

export function levelBySlug(slug: string): Level {
  const found = levels.find((l) => l.slug === slug);
  if (!found) throw new Error(`levels: não existe nível com slug "${slug}"`);
  return found;
}
