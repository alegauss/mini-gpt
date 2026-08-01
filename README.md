# mini-gpt-java

Um modelo de linguagem generativo em **nivel de caractere**, treinado do
zero em **Java puro**, sem nenhuma biblioteca de machine learning. O
objetivo e didatico: cada classe explica a **matematica** por tras do
codigo, e o projeto evolui em tres niveis, do mais simples ao mais
sofisticado.

## Restricoes do projeto

- **Java 17+**, **Maven**.
- Unica dependencia: **JUnit 5** (apenas testes).
- **Nada** de DJL, ND4J, DL4J ou TensorFlow. Toda a algebra linear e
  escrita a mao com `double[][]`, para o codigo ser legivel por estudantes.

## Como rodar

Pre-requisitos: JDK 17+ e Maven.

```bash
# 1. Rodar os testes (inclui verificacao de gradiente por diferencas finitas)
mvn test

# 2. Empacotar um JAR executavel
mvn -q package -DskipTests

# 3. Bigrama: conta pares e gera uma amostra na hora
java -jar target/mini-gpt-java.jar train --model bigram

# 4. MLP: treina (poucos segundos) e mostra a loss caindo + amostras
java -jar target/mini-gpt-java.jar train --model mlp --steps 3000

# 5. Transformer: treina (~25 min em CPU comum com corpus de ~1MB)
java -jar target/mini-gpt-java.jar train --model transformer --steps 2000

# 6. Gerar texto a partir de um prompt
java -jar target/mini-gpt-java.jar generate --model mlp --prompt "O menino " \
    --length 200 --temp 0.8 --topk 5

# 7. Comparar os tres modelos lado a lado (mesmo corpus, mesmo prompt)
java -jar target/mini-gpt-java.jar compare --prompt "O menino " --steps 400
```

> O corpus padrao (`data/corpus.txt`) e um **placeholder curto** — bom para
> testar o pipeline, pequeno demais para bons resultados. Veja
> [`data/README.md`](data/README.md) para colocar um texto real de ~1 MB em
> portugues, de dominio publico. As metas de loss abaixo pressupoem esse
> corpus maior.

### Opcoes da CLI

| Opcao       | Significado                                   | Padrao                    |
|-------------|-----------------------------------------------|---------------------------|
| `--model`   | `bigram` \| `mlp` \| `transformer`            | `bigram`                  |
| `--corpus`  | caminho do `.txt`                             | `data/corpus.txt`         |
| `--prompt`  | texto inicial da geracao                      | vazio                     |
| `--length`  | quantos caracteres gerar                      | `200`                     |
| `--temp`    | temperatura de amostragem (`>0`)              | `1.0`                     |
| `--topk`    | mantem os `k` mais provaveis (`0` = desliga)  | `0`                       |
| `--steps`   | passos de treino (mlp/transformer)            | mlp `3000`, transf `2000` |
| `--context` | comprimento de contexto (block size)          | mlp `8`, transf `64`      |
| `--embed`   | dimensao do embedding                         | mlp `24`, transf `128`    |
| `--hidden`  | tamanho da camada oculta do MLP               | `128`                     |
| `--heads`   | cabecas de atencao (transformer)              | `4`                       |
| `--blocks`  | blocos do transformer                         | `2`                       |
| `--batch`   | tamanho do mini-batch                         | mlp `32`, transf `16`     |
| `--lr`      | taxa de aprendizado                           | `1e-3`                    |
| `--seed`    | semente aleatoria (reprodutibilidade)         | `1234`                    |

Os modelos `mlp` e `transformer` **treinam do zero a cada execucao** (nao
persistem pesos); por isso `generate` e `compare` incluem uma fase de
treino antes de gerar.

## Estrutura

```
mini-gpt-java/
├── pom.xml
├── data/
│   ├── corpus.txt              placeholder curto (troque por ~1MB real)
│   └── README.md               como obter um corpus de dominio publico
├── src/main/java/minigpt/
│   ├── App.java                CLI: train | generate | compare
│   ├── core/
│   │   ├── Matrix.java         matmul, transposta, softmax estavel, ...
│   │   └── Tensor.java         autodiff reverso (valor + gradiente + grafo)
│   ├── data/
│   │   ├── CharTokenizer.java  char <-> int, salva/carrega vocabulario
│   │   └── Dataset.java        janelas de contexto e mini-batches
│   ├── model/
│   │   ├── LanguageModel.java     interface comum (gerar + avaliar)
│   │   ├── TrainableModel.java    interface dos modelos com gradiente
│   │   ├── BigramModel.java       NIVEL 1 (contagem de pares)
│   │   ├── MlpModel.java          NIVEL 2 (backprop manual)
│   │   └── TransformerModel.java  NIVEL 3 (autodiff)
│   ├── train/
│   │   ├── Trainer.java        laco de treino, split treino/validacao
│   │   └── AdamOptimizer.java  Adam com correcao de vies
│   └── generate/Sampler.java   amostragem com temperatura e top-k
└── src/test/java/minigpt/      testes unitarios (JUnit 5)
```

## O que cada nivel ensina

### Nivel 1 — Bigrama (`BigramModel`)

O modelo mais simples possivel: o proximo caractere depende **apenas** do
anterior. Estimamos `p(b | a)` **contando** os pares `(a, b)` no corpus e
normalizando. Nao ha gradiente — uma unica passada preenche a matriz de
contagens.

Ensina: tokenizacao em nivel de caractere, estimativa de maxima
verossimilhanca, **suavizacao de Laplace** (por que `p = 0` e catastrofico),
**entropia cruzada** como metrica, e amostragem com **temperatura**/**top-k**.
O texto gerado tem a "textura" do portugues, mas nao forma palavras — o que
motiva os proximos niveis.

### Nivel 2 — MLP com backpropagation manual (`MlpModel`)

Uma rede rasa (embedding → concatenacao → camada linear → `tanh` → camada
de saida) que olha uma janela fixa de **8 caracteres**. Todos os gradientes
sao **derivados a mao** e comentados passo a passo, seguindo a regra da
cadeia: `dLogits → dW2/db2 → dA → dH1 → dW1/db1 → dXcat → dC`.

Ensina: **cross-entropy** como funcao de perda, **backpropagation** camada a
camada, a derivada da `tanh`, o gradiente combinado de softmax+cross-entropy
(`P − onehot`), e o **scatter-add** nos embeddings. O teste
`MlpGradCheckTest` valida TODOS esses gradientes por **diferencas finitas**
(erro < 1e-5).

### Nivel 3 — Transformer minimo (`TransformerModel`)

Um GPT em miniatura treinado com o **autodiff** de `Tensor` (grafo reverso):
embeddings de token e de posicao, **self-attention causal multi-head**,
**LayerNorm**, blocos **residuais**, rede feed-forward e cabeca de linguagem
com **pesos amarrados** (weight tying). Aqui ninguem escreve gradiente a
mao — o `backwardAll()` percorre o grafo.

Ensina: como a **atencao** pondera posicoes (`softmax(Q·Kᵀ/√d)`), por que a
**mascara causal** impede olhar o futuro, o papel dos embeddings de
**posicao**, e como **LayerNorm + residuais** estabilizam redes profundas.
`TransformerGradCheckTest` valida o grafo inteiro por diferencas finitas.

## Tabela de hiperparametros

| Parametro           | Bigrama | MLP   | Transformer |
|---------------------|---------|-------|-------------|
| Contexto (block)    | 1       | 8     | 64          |
| Dim. de embedding   | —       | 24    | 128         |
| Camada oculta       | —       | 128   | 4×128 = 512 |
| Cabecas de atencao  | —       | —     | 4           |
| Blocos              | —       | —     | 2           |
| Batch               | —       | 32    | 16          |
| Taxa de aprendizado | —       | 1e-3  | 1e-3        |
| Otimizador          | —       | Adam  | Adam        |
| Suavizacao α        | 1.0     | —     | —           |

## O que esperar de cada nivel

Com um corpus real de ~1 MB em portugues:

- **Bigrama:** loss de validacao alta (~2–3 nats); texto com aparencia de
  portugues mas sem palavras reais. Treino instantaneo.
- **MLP:** loss menor que o bigrama; comeca a formar silabas e palavras
  curtas. Treino de poucos segundos.
- **Transformer:** menor loss dos tres; frases mais coerentes. Meta:
  **loss de validacao < 1.7**. Com os padroes (2000 passos, batch 16) o
  treino leva **~25 min em CPU comum** (sem GPU). Para chegar mais fundo
  no alvo, aumente `--steps` (ex.: `--steps 4000`), ao custo de mais tempo.

Durante o treino, a saida mostra `passo`, `loss_treino`, `loss_val` e
`tempo`, e a cada **500 passos** gera uma amostra de 100 caracteres — assim
da para ver o texto evoluir de ruido para fragmentos com cara de portugues.

## Desempenho

Toda a algebra e feita a mao em `double[][]`. O `Tensor.matmul` distribui as
linhas do resultado entre os nucleos da CPU (paralelismo simples via
`parallel stream`), o que mantem o Transformer dentro do orcamento de tempo
sem recorrer a bibliotecas nativas.

## Testes

```bash
mvn test
```

Cobrem: `Matrix` (incl. estabilidade do softmax); autodiff de `Tensor`
(12+ operacoes checadas por diferencas finitas); `CharTokenizer`
(bijecao + persistencia); `Dataset` (janelas e split); `BigramModel`;
**gradientes manuais do MLP** e **gradientes do grafo do Transformer**
(ambos < 1e-5); e que o `Trainer` + `AdamOptimizer` **reduzem a perda** de
MLP e Transformer.

### Criterios de aceite

- `mvn test` passa; verificacao de gradiente com erro **< 1e-5**. ✔
- Transformer capaz de **loss de validacao < 1.7** num corpus real de ~1 MB.
- Roda em maquina **sem GPU** em **menos de 30 minutos** (padroes do
  Transformer: 2000 passos ≈ 25 min em CPU comum).
