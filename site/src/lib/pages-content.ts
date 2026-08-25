// O texto das duas páginas que não são níveis: o formulário de matemática e o guia de
// execução. Mesmo formato dos níveis — blocos, não marcação.

import type { Block, Rich } from "./content-types";
import { productName } from "./site-content";

/* ================================================================== /matematica */

export type GlossItem = {
  /** a âncora: #<id>, usada pelo índice no topo da página */
  id: string;
  title: string;
  /** uma linha, em itálico, dizendo por que este verbete importa */
  why: string;
  blocks: Block[];
};

export const mathPage = {
  title: `A matemática do ${productName}`,
  description:
    "O formulário completo do projeto: notação, softmax estável, entropia cruzada, perplexidade, regra da cadeia, verificação por diferenças finitas, Adam, LayerNorm, atenção, embeddings, temperatura e top-k, cada fórmula com a legenda de todos os símbolos.",
  ogTitle: `A matemática do ${productName}`,
  ogDescription:
    "Doze verbetes, cada fórmula com a legenda de cada símbolo e o arquivo Java onde ela é implementada.",
  lead: [
    "Um verbete por conceito, em ordem de dependência: cada um só usa o que os anteriores já definiram. Toda fórmula vem com a legenda de ",
    { b: "todos" },
    " os símbolos e com o arquivo onde ela é implementada. Uma equação sem legenda é uma parede, e a página existe justamente para quem ainda não reconhece os símbolos.",
  ] as Rich,

  items: [
    {
      id: "notacao",
      title: "Notação e formas",
      why: "Metade dos erros em redes neurais são erros de forma, não de cálculo.",
      blocks: [
        {
          kind: "p",
          runs: [
            "Todo o projeto trabalha com matrizes ",
            { code: "double[][]" },
            " na convenção ",
            { b: "linha = exemplo" },
            ", coluna = característica. As letras são estáveis do começo ao fim:",
          ],
        },
        {
          kind: "formula",
          // As colunas destas duas linhas são construídas com espaços, e o <pre> as
          // preserva: mexer numa palavra sem recontar os espaços desalinha a coluna.
          eq: [
            "V  vocabulário      T  contexto      E  embedding",
            "H  camada oculta    B  lote          d  dimensão por cabeça",
          ],
          terms: [
            { sym: "V", def: ["quantos caracteres distintos o corpus tem. Um corpus em português costuma dar entre 70 e 110"] },
            { sym: "T", def: ["quantos caracteres o modelo enxerga: 1 no bigrama, 8 no MLP, 64 no Transformer"] },
            { sym: "B", def: ["quantos exemplos entram num passo de treino: 32 no MLP, 16 no Transformer"] },
          ],
          note: [
            "A regra que salva tempo: ",
            { b: "o gradiente de um tensor tem a mesma forma que o tensor" },
            ". Se ",
            { code: "W₂" },
            " é ",
            { code: "(H × V)" },
            ", então ",
            { code: "dW2" },
            " é ",
            { code: "(H × V)" },
            ", e isso já determina de que lado cada transposta entra.",
          ],
        },
      ],
    },
    {
      id: "softmax",
      title: "Softmax",
      why: "Como transformar números quaisquer em probabilidades, sem estourar o double.",
      blocks: [
        {
          kind: "p",
          runs: [
            "A saída de qualquer modelo aqui é um vetor de ",
            { b: "logits" },
            ": um número por caractere, sem restrição de sinal nem de soma. O softmax os transforma numa distribuição, preservando a ordem.",
          ],
        },
        {
          kind: "formula",
          eq: ["softmax(z)ᵢ  =  e^{zᵢ − max z}  /  Σⱼ e^{zⱼ − max z}"],
          terms: [
            { sym: "zᵢ", def: ["o logit do caractere ", { code: "i" }] },
            { sym: "max z", def: ["o maior logit, subtraído de todos antes de exponenciar"] },
          ],
          note: [
            "Subtrair o máximo ",
            { b: "não muda o resultado" },
            " (a constante cancela entre numerador e denominador) e é o que impede ",
            { code: "e^{800}" },
            " de virar infinito. Sem esse cuidado, o treino produz ",
            { code: "NaN" },
            " assim que os logits crescem. Está em ",
            { code: "Matrix.softmax" },
            ", e há um teste só para essa estabilidade.",
          ],
        },
      ],
    },
    {
      id: "entropia",
      title: "Entropia cruzada",
      why: "A perda que todos os três níveis minimizam, e a única métrica comparável entre eles.",
      blocks: [
        {
          kind: "formula",
          eq: ["L  =  −(1/N)  Σ_t  ln p(x_t real)"],
          terms: [
            { sym: "p(x_t real)", def: ["a probabilidade que o modelo deu ao caractere que de fato apareceu"] },
            { sym: "N", def: ["quantas posições entraram na média"] },
            { sym: "ln", def: ["logaritmo natural: a unidade é o ", { b: "nat" }, ". Com log₂ seria o bit"] },
          ],
          note: [
            "É a surpresa média do modelo. Zero seria certeza perfeita; ",
            { code: "ln V" },
            " é o chute uniforme. Como a média é por caractere, a perda de um bigrama e a de um Transformer são diretamente comparáveis, que é justamente o que permite dizer se um nível se pagou.",
          ],
        },
        {
          kind: "note",
          tone: "key",
          title: "O gradiente que vem de graça",
          runs: [
            "Derivando a entropia cruzada e o softmax ",
            { b: "juntos" },
            " em relação aos logits, tudo cancela e sobra ",
            { code: "P − onehot(y)" },
            ": a probabilidade prevista menos a desejada. É por isso que os dois nunca são implementados separadamente.",
          ],
        },
      ],
    },
    {
      id: "perplexidade",
      title: "Perplexidade",
      why: "A mesma informação da perda, numa escala que dá para explicar em voz alta.",
      blocks: [
        {
          kind: "formula",
          eq: ["PP  =  e^L"],
          terms: [{ sym: "L", def: ["a entropia cruzada em nats"] }],
          note: [
            "Leia como \"entre quantas opções igualmente prováveis o modelo está efetivamente escolhendo\". Perda 4,56 com V = 96 dá perplexidade 96, que é o chute puro. Perda 1,7 dá cerca de 5,5: o modelo reduziu 96 candidatos a menos de seis.",
          ],
        },
      ],
    },
    {
      id: "cadeia",
      title: "Regra da cadeia e backpropagation",
      why: "Backpropagation não é um algoritmo novo; é a regra da cadeia aplicada na ordem eficiente.",
      blocks: [
        {
          kind: "formula",
          eq: ["∂L/∂x  =  (∂L/∂y) · (∂y/∂x)"],
          terms: [
            { sym: "∂L/∂y", def: ["o gradiente que chegou da camada de cima: o que o resto da rede pede"] },
            { sym: "∂y/∂x", def: ["a derivada local desta operação, a única coisa que ela precisa saber"] },
          ],
          note: [
            "Cada camada faz uma coisa só: recebe o gradiente da saída e devolve o da entrada. É o que torna o backward ",
            { b: "modular" },
            ", e é literalmente a estrutura do ",
            { code: "Tensor" },
            ", onde cada operação registra a própria derivada local e mais nada.",
          ],
        },
        {
          kind: "p",
          runs: [
            "A ordem importa por custo: como a perda é um escalar, ir ",
            { b: "de trás para frente" },
            " (modo reverso) calcula todos os gradientes numa única passada. Ir de frente para trás exigiria uma passada por parâmetro.",
          ],
        },
      ],
    },
    {
      id: "gradcheck",
      title: "Verificação por diferenças finitas",
      why: "O único jeito de saber que o backward está certo sem confiar em quem o escreveu.",
      blocks: [
        {
          kind: "formula",
          eq: ["∂f/∂θ  ≈  ( f(θ+ε) − f(θ−ε) ) / (2ε)"],
          terms: [
            { sym: "ε", def: ["um passo minúsculo, aqui da ordem de ", { code: "1e-5" }] },
            { sym: "diferença central", def: ["mais precisa que a lateral: o erro cai com ", { code: "ε²" }, " em vez de ", { code: "ε" }] },
          ],
          note: [
            "Lento demais para treinar, ",
            { b: "independente" },
            " o bastante para testar. É o critério de aceite do projeto: erro abaixo de ",
            { code: "1e-5" },
            " em todos os gradientes, verificado por ",
            { code: "mvn test" },
            ".",
          ],
        },
      ],
    },
    {
      id: "embeddings",
      title: "Embeddings",
      why: "Como um caractere vira algo que tem 'proximidade' com outro caractere.",
      blocks: [
        {
          kind: "p",
          runs: [
            "Um id sozinho é arbitrário: nada faz o 41 ser mais parecido com o 42 do que com o 7. Um ",
            { b: "embedding" },
            " é uma tabela ",
            { code: "C" },
            " de forma ",
            { code: "(V × E)" },
            " em que cada caractere ocupa uma linha: um vetor que o treino ajusta livremente.",
          ],
        },
        {
          kind: "formula",
          eq: ["embed(id)  =  C[id]        (uma linha, E números)"],
          terms: [{ sym: "E", def: ["a dimensão do vetor: 24 no MLP, 128 no Transformer"] }],
          note: [
            "No backward, o gradiente volta apenas para as linhas que foram usadas, e volta ",
            { b: "somado" },
            ", porque o mesmo caractere pode aparecer várias vezes na mesma janela (o scatter-add). Ao fim do treino, vogais tendem a ficar próximas de vogais: ninguém programou isso, foi a perda que empurrou.",
          ],
        },
      ],
    },
    {
      id: "adam",
      title: "Adam",
      why: "Por que ninguém usa descida de gradiente pura.",
      blocks: [
        {
          kind: "formula",
          eq: [
            "m ← β₁·m + (1−β₁)·g            v ← β₂·v + (1−β₂)·g²",
            "m̂ = m / (1 − β₁ᵗ)              v̂ = v / (1 − β₂ᵗ)",
            "θ ← θ − lr · m̂ / (√v̂ + ε)",
          ],
          terms: [
            { sym: "g", def: ["o gradiente do passo atual"] },
            { sym: "m", def: ["o primeiro momento: a média móvel dos gradientes. Suaviza a direção, como inércia"] },
            { sym: "v", def: ["o segundo momento: a média dos gradientes ao quadrado. Estima a ", { b: "escala" }, " de cada coordenada"] },
            { sym: "β₁, β₂", def: ["os decaimentos, 0,9 e 0,999: os valores usuais, e os do projeto"] },
            { sym: "t", def: ["o número do passo, usado só na correção de viés"] },
          ],
          note: [
            "Dividir por ",
            { code: "√v̂" },
            " dá passo efetivo maior onde os gradientes são pequenos e menor onde são grandes, o que resolve o problema de uma única taxa de aprendizado servir para parâmetros de escalas muito diferentes. A correção de viés existe porque ",
            { code: "m" },
            " e ",
            { code: "v" },
            " começam em zero: sem ela, os primeiros passos seriam pequenos demais.",
          ],
        },
        {
          kind: "p",
          runs: [
            "O projeto aplica ainda ",
            { b: "weight decay desacoplado" },
            " (estilo AdamW): ",
            { code: "θ ← θ − lr·wd·θ" },
            ", uma regularização que puxa os pesos para zero independentemente do gradiente. Padrão ",
            { code: "1e-4" },
            "; zero desliga.",
          ],
        },
      ],
    },
    {
      id: "layernorm",
      title: "LayerNorm",
      why: "O que mantém os números numa faixa saudável enquanto a rede fica profunda.",
      blocks: [
        {
          kind: "formula",
          eq: ["y  =  γ · (x − μ) / √(σ² + ε)  +  β"],
          terms: [
            { sym: "μ, σ²", def: ["média e variância calculadas ", { b: "dentro de cada posição" }, ", sobre as E dimensões, e nunca sobre o lote"] },
            { sym: "γ, β", def: ["escala e deslocamento aprendidos, um par por dimensão: a rede pode desfazer a normalização se lhe convier"] },
            { sym: "ε", def: [{ code: "1e-5" }, ", para não dividir por zero"] },
          ],
          note: [
            "Normalizar por posição, e não pelo lote, é o que faz o LayerNorm funcionar igual com lote de 16 ou de 1, o que importa porque a geração processa uma sequência de cada vez.",
          ],
        },
      ],
    },
    {
      id: "atencao",
      title: "Atenção",
      why: "O mecanismo que define o Transformer, em uma linha.",
      blocks: [
        {
          kind: "formula",
          eq: ["atenção(Q, K, V)  =  softmax( Q·Kᵀ / √d  +  máscara ) · V"],
          terms: [
            { sym: "Q", def: ["o que a posição atual procura"] },
            { sym: "K", def: ["o que cada posição oferece"] },
            { sym: "V", def: ["o que cada posição entrega quando escolhida"] },
            { sym: "√d", def: ["a escala que impede o softmax de saturar"] },
            { sym: "máscara", def: [{ code: "−∞" }, " onde ", { code: "j > i" }, ": o futuro não pode ser olhado"] },
          ],
          note: [
            "A saída de cada posição é a média ponderada dos ",
            { code: "V" },
            " das posições que ela decidiu olhar, e essa decisão é recalculada a cada passo, a partir do conteúdo.",
          ],
        },
      ],
    },
    {
      id: "temperatura",
      title: "Temperatura e top-k",
      why: "Dois botões que mudam o texto sem mudar o modelo.",
      blocks: [
        {
          kind: "formula",
          eq: ["p'ᵢ  ∝  pᵢ^{1/τ}"],
          terms: [
            { sym: "τ = 1", def: ["a distribuição original, intocada"] },
            { sym: "τ < 1", def: ["esfria: concentra massa no mais provável. Texto conservador, tendendo a repetir"] },
            { sym: "τ > 1", def: ["esquenta: achata a distribuição. Texto criativo, tendendo a ruído"] },
          ],
          note: [
            "No limite ",
            { code: "τ → 0" },
            " vira ",
            { code: "argmax" },
            ". A conta é feita em log (",
            { code: "ln p'ᵢ = (1/τ)·ln pᵢ" },
            ", seguido de softmax) por estabilidade. O ",
            { b: "top-k" },
            " é ortogonal: mantém os k mais prováveis, zera o resto e renormaliza, o que corta a cauda de opções individualmente improváveis que, somadas, ainda ganham sorteios.",
          ],
        },
        {
          kind: "note",
          tone: "warn",
          title: "Nenhum dos dois melhora a perda",
          runs: [
            "Perda é medida sobre a distribuição do modelo, não sobre o sorteio. Temperatura e top-k mudam apenas o texto que sai: são decisões de ",
            { b: "apresentação" },
            ", e é útil não confundi-las com qualidade de modelo.",
          ],
        },
      ],
    },
    {
      id: "minilote",
      title: "Mini-lotes",
      why: "Por que o gradiente é estimado em 16 exemplos e não no corpus inteiro.",
      blocks: [
        {
          kind: "p",
          runs: [
            "O gradiente exato da perda média exigiria uma passada por todo o corpus a cada passo. Um lote aleatório de ",
            { code: "B" },
            " exemplos dá uma estimativa ",
            { b: "ruidosa e barata" },
            " do mesmo gradiente, e o ruído até ajuda, empurrando o otimizador para fora de mínimos ruins.",
          ],
        },
        {
          kind: "p",
          runs: [
            "É por isso que a perda impressa durante o treino oscila mesmo quando tudo vai bem: cada linha é medida num lote diferente. A tendência importa; o ponto isolado, não.",
          ],
        },
      ],
    },
  ] as GlossItem[],
} as const;

/* ================================================================== /como-rodar */

export const runPage = {
  title: `Como rodar o ${productName} na sua máquina`,
  description:
    "Pré-requisitos, os quatro comandos que importam, a tabela completa de opções da CLI, como obter um corpus de ~1 MB em português de domínio público, e o que esperar de cada nível.",
  ogTitle: `Como rodar o ${productName}`,
  ogDescription:
    "JDK 21, Maven e quatro comandos. Mais a tabela de opções, o guia de corpus e o que esperar de cada nível.",
  lead: [
    "Nenhuma GPU, nenhuma conta em nenhum serviço, nenhum download de modelo: bastam ",
    { b: "JDK 21 e Maven" },
    ". O primeiro texto gerado sai em menos de um minuto.",
  ] as Rich,

  prereqs: [
    { title: "JDK 21 ou mais novo", body: ["Qualquer distribuição: Temurin, Zulu, Corretto, Oracle. Confira com ", { code: "java -version" }, ". O build recusa JDK mais antigo, com uma mensagem dizendo isso."] as Rich },
    {
      title: "Maven 3.9+, ou nada",
      body: [
        "Confira com ",
        { code: "mvn -v" },
        ". Se preferir não instalar, o repositório traz o wrapper: troque ",
        { code: "mvn" },
        " por ",
        { code: "./mvnw" },
        " (ou ",
        { code: "mvnw.cmd" },
        " no Windows) em qualquer comando desta página, e ele baixa a versão certa sozinho.",
      ] as Rich,
    },
    { title: "Uns 2 GB de RAM livres", body: ["O Transformer com os padrões cabe folgado. O que consome tempo é a CPU, não a memória."] as Rich },
  ],

  steps: [
    {
      title: "Clone e teste",
      body: ["Antes de qualquer treino: ", { code: "mvn test" }, " roda a verificação de gradiente por diferenças finitas. Se ela passa, a matemática do repositório está íntegra na sua máquina."] as Rich,
      cmd: "git clone https://github.com/alegauss/mini-gpt && cd mini-gpt && mvn test",
    },
    {
      title: "Empacote",
      body: ["Gera ", { code: "target/mini-gpt-java.jar" }, ", que é o que todos os comandos seguintes usam."] as Rich,
      cmd: "mvn -q package -DskipTests",
    },
    {
      title: "Rode o nível 1",
      body: ["Instantâneo: conta os pares e já gera uma amostra. É o \"olá, mundo\" do projeto."] as Rich,
      cmd: "java -jar target/mini-gpt-java.jar train --model bigram",
    },
    {
      title: "Suba os degraus",
      body: ["O MLP treina em segundos. O Transformer leva cerca de 25 minutos com os padrões; comece com ", { code: "--steps 200" }, " se quiser só ver o formato da saída."] as Rich,
      cmd: "java -jar target/mini-gpt-java.jar train --model mlp --steps 3000",
    },
  ],

  extraCommands: [
    {
      why: ["Gerar a partir de um prompt, com temperatura e top-k. Lembre-se: ", { b: "mlp e transformer treinam do zero" }, " antes de gerar, porque o projeto não persiste pesos."] as Rich,
      cmd: 'java -jar target/mini-gpt-java.jar generate --model mlp --prompt "O menino " --length 200 --temp 0.8 --topk 5',
    },
    {
      why: ["Os três níveis lado a lado, no mesmo corpus e com o mesmo prompt, numa única saída."] as Rich,
      cmd: 'java -jar target/mini-gpt-java.jar compare --prompt "O menino " --steps 400',
    },
    {
      why: ["O Transformer completo, com a meta de perda de validação abaixo de 1,7. Reserve o tempo."] as Rich,
      cmd: "java -jar target/mini-gpt-java.jar train --model transformer --steps 2000",
    },
  ],

  cliRows: [
    { opt: "--model", meaning: ["bigram | mlp | transformer"] as Rich, def: "bigram" },
    { opt: "--corpus", meaning: ["caminho do ", { code: ".txt" }] as Rich, def: "data/corpus.txt" },
    { opt: "--prompt", meaning: ["texto inicial da geração"] as Rich, def: "vazio" },
    { opt: "--length", meaning: ["quantos caracteres gerar"] as Rich, def: "200" },
    { opt: "--temp", meaning: ["temperatura de amostragem (", { code: ">0" }, ")"] as Rich, def: "1.0" },
    { opt: "--topk", meaning: ["mantém os k mais prováveis (", { code: "0" }, " = desliga)"] as Rich, def: "0" },
    { opt: "--steps", meaning: ["passos de treino (mlp e transformer)"] as Rich, def: "mlp 3000, transf. 2000" },
    { opt: "--context", meaning: ["comprimento de contexto (block size)"] as Rich, def: "mlp 8, transf. 64" },
    { opt: "--embed", meaning: ["dimensão do embedding"] as Rich, def: "mlp 24, transf. 128" },
    { opt: "--hidden", meaning: ["tamanho da camada oculta do MLP"] as Rich, def: "128" },
    { opt: "--heads", meaning: ["cabeças de atenção (transformer)"] as Rich, def: "4" },
    { opt: "--blocks", meaning: ["blocos do transformer"] as Rich, def: "2" },
    { opt: "--batch", meaning: ["tamanho do mini-lote"] as Rich, def: "mlp 32, transf. 16" },
    { opt: "--lr", meaning: ["taxa de aprendizado"] as Rich, def: "1e-3" },
    { opt: "--seed", meaning: ["semente aleatória (reprodutibilidade)"] as Rich, def: "1234" },
  ],

  corpus: {
    title: "O corpus é metade do resultado",
    blocks: [
      {
        kind: "p",
        runs: [
          "O ",
          { code: "data/corpus.txt" },
          " que vem no repositório é um ",
          { b: "placeholder curto" },
          ": ele existe para o pipeline rodar assim que você clona, e é pequeno demais para um bom modelo. Com ele, os três níveis parecem melhores do que são, porque decoram em vez de generalizar.",
        ],
      },
      {
        kind: "list",
        items: [
          ["Um arquivo ", { code: ".txt" }, " em ", { b: "UTF-8" }, ", em português, de domínio público."],
          ["Alvo de tamanho: cerca de ", { b: "1 MB" }, " (aproximadamente um milhão de caracteres)."],
          ["Boas fontes: ", { a: { href: "https://www.gutenberg.org", label: "Projeto Gutenberg" } }, " (filtre por Portuguese, versão \"Plain Text UTF-8\"), ", { a: { href: "https://www.dominiopublico.gov.br", label: "Domínio Público (MEC)" } }, " e ", { a: { href: "https://pt.wikisource.org", label: "Wikisource em português" } }, "."],
          ["Autores cujas obras costumam estar disponíveis: Machado de Assis, Eça de Queirós, José de Alencar, Aluísio Azevedo."],
        ],
      },
      {
        kind: "note",
        tone: "tip",
        title: "Acentos não são problema",
        runs: [
          "O tokenizador trabalha em nível de caractere e trata cada caractere Unicode como um id. Mantenha a acentuação completa: o vocabulário fica um pouco maior e o texto gerado fica correto. Um corpus sem acento ensina o modelo a escrever sem acento.",
        ],
      },
      {
        kind: "code",
        caption: "juntar vários arquivos e conferir o tamanho",
        lines: ["cat parte1.txt parte2.txt parte3.txt > data/corpus.txt", "wc -c data/corpus.txt      # ~1000000 é um bom alvo"],
      },
    ] as Block[],
  },

  expect: {
    title: "O que esperar de cada nível",
    rows: [
      { level: "Bigrama", key: "n1", loss: "~2–3 nats", time: "instantâneo", text: "Textura de português, sem palavras reais." },
      { level: "MLP", key: "n2", loss: "abaixo do bigrama", time: "segundos", text: "Sílabas e palavras curtas; a frase não fecha." },
      { level: "Transformer", key: "n3", loss: "meta: < 1,7", time: "~25 min (2000 passos)", text: "Palavras reais e frases que começam a fechar." },
    ],
    note: [
      "Durante o treino a saída mostra ",
      { code: "passo" },
      ", ",
      { code: "loss_treino" },
      ", ",
      { code: "loss_val" },
      " e ",
      { code: "tempo" },
      ", e a cada 500 passos gera uma amostra de 100 caracteres, que é como se vê o texto sair do ruído.",
    ] as Rich,
  },

  troubles: [
    {
      title: "Corpus não encontrado",
      body: ["O comando falha logo no começo dizendo o caminho que tentou. Confira se está rodando da raiz do repositório, ou passe ", { code: "--corpus" }, " com um caminho absoluto."] as Rich,
    },
    {
      title: "O Transformer está lento demais",
      body: ["É esperado: são cerca de 25 minutos para 2000 passos numa CPU comum. Para experimentar, use ", { code: "--steps 200" }, " ou ", { code: "--context 16" }, ", já que a atenção é quadrática no contexto."] as Rich,
    },
    {
      title: "A perda de validação parou de cair",
      body: ["Se a de treino continua caindo e a de validação não, o modelo passou a decorar. Corpus maior é a primeira resposta; ", { code: "--embed" }, " menor é a segunda."] as Rich,
    },
    {
      title: "Textos diferentes a cada execução",
      body: ["Todo sorteio passa por ", { code: "--seed" }, ". Fixe a semente para comparar dois experimentos; sem isso, você está medindo o ruído do sorteio junto com o efeito da mudança."] as Rich,
    },
  ],
} as const;
