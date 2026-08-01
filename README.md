# mini-gpt-java

Um modelo de linguagem generativo em **nivel de caractere**, treinado do
zero em **Java puro**, sem nenhuma biblioteca de machine learning. O
objetivo e didatico: cada classe explica a **matematica** por tras do
codigo, e o projeto evolui em tres niveis, do mais simples ao mais
sofisticado.

> **Estado atual: ETAPA 1 concluida (bigrama).**
> As ETAPAS 2 (MLP com backpropagation manual) e 3 (Transformer minimo)
> serao adicionadas em seguida.

## Restricoes do projeto

- **Java 17+**, **Maven**.
- Unica dependencia: **JUnit 5** (apenas testes).
- **Nada** de DJL, ND4J, DL4J ou TensorFlow. Toda a algebra linear e
  escrita a mao com `double[][]`, para o codigo ser legivel por estudantes.

## Como rodar

Pre-requisitos: JDK 17+ e Maven.

```bash
# 1. Rodar os testes
mvn test

# 2. Empacotar um JAR executavel
mvn -q package -DskipTests

# 3. Treinar o bigrama e ver uma amostra gerada
java -jar target/mini-gpt-java.jar train --model bigram

# 4. Gerar texto a partir de um prompt
java -jar target/mini-gpt-java.jar generate --model bigram \
    --prompt "O menino " --length 200 --temp 0.8 --topk 5

# 5. Comparar os modelos lado a lado (por enquanto so o bigrama existe)
java -jar target/mini-gpt-java.jar compare --prompt "O menino " --temp 0.8 --topk 5
```

O corpus padrao e `data/corpus.txt`. O arquivo que vem no repositorio e um
**placeholder curto** — veja [`data/README.md`](data/README.md) para
instrucoes de como colocar um texto real de ~1 MB em portugues, de dominio
publico.

### Opcoes da CLI

| Opcao       | Significado                                   | Padrao             |
|-------------|-----------------------------------------------|--------------------|
| `--model`   | `bigram` \| `mlp` \| `transformer`            | `bigram`           |
| `--corpus`  | caminho do `.txt`                             | `data/corpus.txt`  |
| `--prompt`  | texto inicial da geracao                      | vazio              |
| `--length`  | quantos caracteres gerar                      | `200`              |
| `--temp`    | temperatura de amostragem (`>0`)              | `1.0`              |
| `--topk`    | mantem os `k` mais provaveis (`0` = desliga)  | `0`                |
| `--context` | comprimento de contexto (block size)          | `8`                |
| `--seed`    | semente aleatoria (reprodutibilidade)         | `1234`             |

## Estrutura

```
mini-gpt-java/
├── pom.xml
├── data/
│   ├── corpus.txt              placeholder + (veja data/README.md)
│   └── README.md               como obter um corpus real de ~1 MB
├── src/main/java/minigpt/
│   ├── App.java                CLI: train | generate | compare
│   ├── core/Matrix.java        matmul, transposta, softmax, ...
│   ├── data/CharTokenizer.java char <-> int, salva/carrega vocabulario
│   ├── data/Dataset.java       janelas de contexto e mini-batches
│   ├── model/LanguageModel.java  interface comum aos 3 niveis
│   ├── model/BigramModel.java    NIVEL 1 (contagem de pares)
│   └── generate/Sampler.java   amostragem com temperatura e top-k
└── src/test/java/minigpt/      testes unitarios (JUnit 5)
```

Classes previstas para as proximas etapas: `core/Tensor.java` (autodiff),
`model/MlpModel.java`, `model/TransformerModel.java`, `train/Trainer.java`,
`train/AdamOptimizer.java`.

## O que cada nivel ensina

### Nivel 1 — Bigrama (ETAPA 1, pronto)

O modelo mais simples possivel: o proximo caractere depende **apenas** do
anterior. Estimamos `p(b | a)` **contando** quantas vezes o par `(a, b)`
aparece no corpus e normalizando. Nao ha gradiente nem treino iterativo —
uma unica passada preenche a matriz de contagens.

Conceitos introduzidos:

- **Tokenizacao em nivel de caractere** (`CharTokenizer`): a bijecao
  caractere ↔ inteiro que todo modelo precisa.
- **Estimativa de maxima verossimilhanca** por contagem.
- **Suavizacao de Laplace (add-α)**: por que `p = 0` e catastrofico
  (a entropia cruzada iria a infinito) e como somar `α` resolve.
- **Entropia cruzada** como medida de qualidade e a **linha de base** que
  os modelos seguintes precisam superar.
- **Amostragem** autoregressiva com **temperatura** e **top-k**
  (`Sampler`).

O bigrama nao tem memoria alem de um caractere; o texto gerado tem a
"textura" do portugues (combinacoes de letras plausiveis) mas nao forma
palavras nem frases coerentes. Esse limite e exatamente a motivacao para
os proximos niveis.

### Nivel 2 — MLP com backpropagation manual (ETAPA 2, em breve)

Uma rede neural rasa (camada linear + `tanh`) que olha uma janela de 8
caracteres. Introduz **cross-entropy** como funcao de perda e
**gradientes derivados a mao**, passo a passo, validados por
**diferencas finitas**.

### Nivel 3 — Transformer minimo (ETAPA 3, em breve)

Um mini-autodiff (grafo reverso), **embeddings** de token e posicao,
**self-attention causal multi-head**, **LayerNorm** e blocos residuais.

## Tabela de hiperparametros

| Parametro           | Bigrama | MLP (previsto) | Transformer (previsto) |
|---------------------|---------|----------------|------------------------|
| Contexto            | 1       | 8              | 64                     |
| Dim. de embedding   | —       | —              | 128                    |
| Cabecas de atencao  | —       | —              | 4                      |
| Blocos              | —       | —              | 2                      |
| Suavizacao α        | 1.0     | —              | —                      |

## O que esperar de cada nivel

- **Bigrama:** loss de validacao alta; texto com aparencia de portugues mas
  sem palavras reais. Rapido (uma passada pelo corpus).
- **MLP:** loss menor que o bigrama; comeca a formar fragmentos de
  palavras.
- **Transformer:** menor loss dos tres; frases mais coerentes. A meta e
  loss de validacao **< 1.7** em CPU comum, em menos de 30 minutos.

## Testes

```bash
mvn test
```

Cobrem: operacoes de `Matrix` (incluindo estabilidade numerica do
softmax), a bijecao e a persistencia do `CharTokenizer`, as janelas de
contexto do `Dataset`, as probabilidades e a loss do `BigramModel`, e a
geracao do `Sampler` (comprimento, prompt, reprodutibilidade, top-k).
