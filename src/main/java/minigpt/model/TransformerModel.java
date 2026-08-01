package minigpt.model;

import minigpt.core.Matrix;
import minigpt.core.Tensor;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Nivel 3: um Transformer minimo (estilo GPT), treinado com o
 * <b>autodiff</b> de {@link Tensor} — nenhum gradiente e escrito a mao.
 *
 * <h2>Componentes</h2>
 * <ol>
 *   <li><b>Embeddings de token e posicao.</b> Cada id vira um vetor
 *       (linha da tabela {@code tokEmb}); somamos um vetor que depende da
 *       POSICAO na sequencia ({@code posEmb}), pois a atencao, sozinha, nao
 *       enxerga ordem.</li>
 *   <li><b>Self-attention causal multi-head.</b> Para cada posicao, o modelo
 *       calcula consultas {@code Q}, chaves {@code K} e valores {@code V};
 *       o peso que a posicao {@code i} da a posicao {@code j} e
 *       {@code softmax(Qᵢ·Kⱼ / √d)}, restrito a {@code j ≤ i} (mascara
 *       causal: nao se pode olhar o futuro). Varias "cabecas" fazem isso em
 *       subespacos diferentes e sao concatenadas.</li>
 *   <li><b>LayerNorm</b> antes de cada sub-camada e <b>conexoes residuais</b>
 *       ({@code x + sub(x)}), que estabilizam e facilitam o fluxo do
 *       gradiente em profundidade.</li>
 *   <li><b>Rede feed-forward</b> por posicao: {@code tanh(x·W1+b1)·W2+b2},
 *       expandindo para {@code 4·E} e voltando.</li>
 *   <li><b>Cabeca de linguagem com pesos amarrados</b>: os logits sao
 *       {@code x_final · tokEmbᵀ}, reaproveitando a tabela de embeddings
 *       (weight tying) — menos parametros e melhor generalizacao.</li>
 * </ol>
 *
 * <h2>Hiperparametros padrao</h2>
 * contexto (block) 64, embedding 128, 4 cabecas, 2 blocos, feed-forward
 * 4×128 = 512. Alvo: perda de validacao &lt; 1.7 num corpus real de ~1MB,
 * em CPU comum, em menos de 30 minutos.
 */
public final class TransformerModel implements TrainableModel {

    private static final double LN_EPS = 1e-5;

    private final int vocabSize;
    private final int blockSize;   // T (contexto maximo)
    private final int embedDim;    // E
    private final int numHeads;    // H
    private final int headDim;     // d = E / H
    private final int numBlocks;

    private final Tensor tokEmb;   // (V, E)
    private final Tensor posEmb;   // (block, E)
    private final Tensor lnfG;     // (1, E)  LayerNorm final (gamma)
    private final Tensor lnfB;     // (1, E)  LayerNorm final (beta)
    private final List<Block> blocks = new ArrayList<>();
    private final List<Tensor> params = new ArrayList<>();

    /** Parametros de um bloco Transformer (atencao + feed-forward). */
    private static final class Block {
        Tensor ln1G, ln1B;                 // LayerNorm 1
        Tensor wq, bq, wk, bk, wv, bv;     // projecoes Q, K, V
        Tensor wo, bo;                     // projecao de saida da atencao
        Tensor ln2G, ln2B;                 // LayerNorm 2
        Tensor wff1, bff1, wff2, bff2;     // feed-forward
    }

    /**
     * Cria e inicializa o Transformer.
     *
     * @param vocabSize tamanho do vocabulario V
     * @param blockSize contexto maximo T
     * @param embedDim  dimensao do embedding E (deve ser divisivel por numHeads)
     * @param numHeads  numero de cabecas de atencao
     * @param numBlocks numero de blocos empilhados
     * @param seed      semente da inicializacao
     */
    public TransformerModel(int vocabSize, int blockSize, int embedDim,
                            int numHeads, int numBlocks, long seed) {
        if (embedDim % numHeads != 0) {
            throw new IllegalArgumentException("embedDim deve ser divisivel por numHeads");
        }
        this.vocabSize = vocabSize;
        this.blockSize = blockSize;
        this.embedDim = embedDim;
        this.numHeads = numHeads;
        this.headDim = embedDim / numHeads;
        this.numBlocks = numBlocks;

        Random rng = new Random(seed);
        double embStd = 0.02; // inicializacao pequena, estilo GPT
        this.tokEmb = param(randn(vocabSize, embedDim, embStd, rng));
        this.posEmb = param(randn(blockSize, embedDim, embStd, rng));

        double wStd = 1.0 / Math.sqrt(embedDim);
        for (int b = 0; b < numBlocks; b++) {
            Block blk = new Block();
            blk.ln1G = param(ones(1, embedDim));
            blk.ln1B = param(new double[1][embedDim]);
            blk.wq = param(randn(embedDim, embedDim, wStd, rng));
            blk.bq = param(new double[1][embedDim]);
            blk.wk = param(randn(embedDim, embedDim, wStd, rng));
            blk.bk = param(new double[1][embedDim]);
            blk.wv = param(randn(embedDim, embedDim, wStd, rng));
            blk.bv = param(new double[1][embedDim]);
            blk.wo = param(randn(embedDim, embedDim, wStd, rng));
            blk.bo = param(new double[1][embedDim]);
            blk.ln2G = param(ones(1, embedDim));
            blk.ln2B = param(new double[1][embedDim]);
            int ff = 4 * embedDim;
            blk.wff1 = param(randn(embedDim, ff, wStd, rng));
            blk.bff1 = param(new double[1][ff]);
            blk.wff2 = param(randn(ff, embedDim, 1.0 / Math.sqrt(ff), rng));
            blk.bff2 = param(new double[1][embedDim]);
            blocks.add(blk);
        }
        this.lnfG = param(ones(1, embedDim));
        this.lnfB = param(new double[1][embedDim]);
    }

    /** Cria a partir dos hiperparametros padrao (contexto 64, embed 128, 4 cabecas, 2 blocos). */
    public static TransformerModel withDefaults(int vocabSize, long seed) {
        return new TransformerModel(vocabSize, 64, 128, 4, 2, seed);
    }

    private Tensor param(double[][] data) {
        Tensor t = new Tensor(data);
        params.add(t);
        return t;
    }

    private static double[][] randn(int r, int c, double std, Random rng) {
        double[][] d = new double[r][c];
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) {
                d[i][j] = rng.nextGaussian() * std;
            }
        }
        return d;
    }

    private static double[][] ones(int r, int c) {
        double[][] d = new double[r][c];
        for (double[] row : d) {
            java.util.Arrays.fill(row, 1.0);
        }
        return d;
    }

    @Override
    public String name() {
        return "transformer";
    }

    @Override
    public int vocabSize() {
        return vocabSize;
    }

    @Override
    public int contextLength() {
        return blockSize;
    }

    @Override
    public List<Tensor> parameters() {
        return params;
    }

    // ==================================================================
    // Forward: constroi o grafo de autodiff para UMA sequencia de ids.
    // ==================================================================

    /**
     * Forward de um <b>batch</b> de sequencias, achatando as {@code B}
     * sequencias de comprimento {@code T} numa unica matriz {@code (B·T, E)}.
     *
     * <p>Motivo: quase tudo no Transformer age em cada posicao de forma
     * independente (embeddings, LayerNorm, projecoes Q/K/V, feed-forward,
     * cabeca de saida). Empilhando todas as posicoes do batch numa so
     * matriz, essas camadas viram <b>uma</b> multiplicacao grande — muito
     * mais eficiente em CPU do que {@code B} multiplicacoes pequenas. Apenas
     * a atencao mistura posicoes DENTRO de cada sequencia, entao so ela e
     * feita por sequencia (fatiando as linhas correspondentes).</p>
     *
     * @param xb    batch de ids, forma {@code (B, T)} (todas com o mesmo T)
     * @param seqLen comprimento T de cada sequencia
     * @param batch  numero de sequencias B
     * @return logits achatados, forma {@code (B·T, V)} (a sequencia {@code s}
     *         ocupa as linhas {@code [s·T, (s+1)·T)})
     */
    private Tensor forwardLogitsBatch(int[][] xb, int seqLen, int batch) {
        int bt = batch * seqLen;
        int[] tokIds = new int[bt];
        int[] posIds = new int[bt];
        for (int s = 0; s < batch; s++) {
            for (int i = 0; i < seqLen; i++) {
                tokIds[s * seqLen + i] = xb[s][i];
                posIds[s * seqLen + i] = i;
            }
        }
        // x = embedding do token + embedding da posicao   (B·T, E)
        Tensor x = Tensor.add(Tensor.rows(tokEmb, tokIds), Tensor.rows(posEmb, posIds));

        for (Block blk : blocks) {
            // Sub-camada 1: atencao, com LayerNorm e residual.
            Tensor a = Tensor.layerNorm(x, blk.ln1G, blk.ln1B, LN_EPS);
            Tensor attn = selfAttention(a, blk, seqLen, batch);
            x = Tensor.add(x, attn);
            // Sub-camada 2: feed-forward, com LayerNorm e residual.
            Tensor f = Tensor.layerNorm(x, blk.ln2G, blk.ln2B, LN_EPS);
            Tensor ff = feedForward(f, blk);
            x = Tensor.add(x, ff);
        }
        Tensor xf = Tensor.layerNorm(x, lnfG, lnfB, LN_EPS);
        // Cabeca de linguagem com pesos amarrados: logits = xf · tokEmbᵀ
        return Tensor.matmul(xf, Tensor.transpose(tokEmb));
    }

    /**
     * Self-attention causal multi-head sobre o batch achatado {@code a}
     * ({@code B·T, E}). As projecoes Q/K/V sao feitas de uma vez sobre todo
     * o batch; a mistura de posicoes (scores + softmax + ·V) e feita por
     * sequencia, pois posicoes de sequencias diferentes nao se atendem.
     */
    private Tensor selfAttention(Tensor a, Block blk, int seqLen, int batch) {
        // Projecoes lineares em todo o batch: Q = a·Wq + bq, idem K, V.
        Tensor q = Tensor.addRowVector(Tensor.matmul(a, blk.wq), blk.bq); // (B·T, E)
        Tensor k = Tensor.addRowVector(Tensor.matmul(a, blk.wk), blk.bk);
        Tensor v = Tensor.addRowVector(Tensor.matmul(a, blk.wv), blk.bv);

        double invSqrtD = 1.0 / Math.sqrt(headDim);
        List<Tensor> seqOutputs = new ArrayList<>(batch);
        for (int s = 0; s < batch; s++) {
            // Fatia as T linhas desta sequencia.
            Tensor qs = Tensor.sliceRows(q, s * seqLen, seqLen); // (T, E)
            Tensor ks = Tensor.sliceRows(k, s * seqLen, seqLen);
            Tensor vs = Tensor.sliceRows(v, s * seqLen, seqLen);
            List<Tensor> heads = new ArrayList<>(numHeads);
            for (int h = 0; h < numHeads; h++) {
                int off = h * headDim;
                Tensor qh = Tensor.sliceCols(qs, off, headDim); // (T, d)
                Tensor kh = Tensor.sliceCols(ks, off, headDim);
                Tensor vh = Tensor.sliceCols(vs, off, headDim);
                // scores = (Qh · Khᵀ) / √d ; mascara causal ; softmax por linha
                Tensor scores = Tensor.scale(
                        Tensor.matmul(qh, Tensor.transpose(kh)), invSqrtD);
                Tensor att = Tensor.softmaxRows(Tensor.causalMask(scores));
                heads.add(Tensor.matmul(att, vh)); // (T, d)
            }
            seqOutputs.add(Tensor.concatCols(heads)); // (T, E)
        }
        Tensor concat = Tensor.concatRows(seqOutputs); // (B·T, E) de volta
        return Tensor.addRowVector(Tensor.matmul(concat, blk.wo), blk.bo);
    }

    /** Rede feed-forward por posicao: tanh(f·W1+b1)·W2+b2. */
    private Tensor feedForward(Tensor f, Block blk) {
        Tensor h = Tensor.tanh(Tensor.addRowVector(Tensor.matmul(f, blk.wff1), blk.bff1));
        return Tensor.addRowVector(Tensor.matmul(h, blk.wff2), blk.bff2);
    }

    @Override
    public double forwardBackward(int[][] x, int[][] y) {
        int b = x.length;
        int t = x[0].length;
        // Um unico grafo para todo o batch achatado. A entropia cruzada ja
        // promedia sobre as B·T posicoes, entao o backward de um so no da os
        // gradientes medios do batch inteiro.
        Tensor logits = forwardLogitsBatch(x, t, b);
        Tensor loss = Tensor.crossEntropyRows(logits, flatten(y, b, t));
        loss.backwardAll();
        return loss.data[0][0];
    }

    @Override
    public double forwardLossOnly(int[][] x, int[][] y) {
        int b = x.length;
        int t = x[0].length;
        Tensor logits = forwardLogitsBatch(x, t, b);
        return Tensor.crossEntropyRows(logits, flatten(y, b, t)).data[0][0];
    }

    /** Achata alvos {@code (B, T)} para {@code B·T} na ordem linha-a-linha. */
    private static int[] flatten(int[][] y, int b, int t) {
        int[] out = new int[b * t];
        for (int s = 0; s < b; s++) {
            System.arraycopy(y[s], 0, out, s * t, t);
        }
        return out;
    }

    @Override
    public double[] nextProbabilities(int[] context) {
        // Usa no maximo os ultimos blockSize tokens.
        int t = Math.min(context.length, blockSize);
        int[] ids;
        if (t == 0) {
            ids = new int[] { 0 };
        } else {
            ids = new int[t];
            System.arraycopy(context, context.length - t, ids, 0, t);
        }
        Tensor logits = forwardLogitsBatch(new int[][] { ids }, t, 1);
        // Distribuicao do proximo caractere = softmax da ULTIMA posicao.
        double[] last = logits.data[logits.rows() - 1];
        return Matrix.softmax(last);
    }

    @Override
    public double evaluateLoss(int[] ids) {
        if (ids.length < 2) {
            return 0.0;
        }
        // Percorre a sequencia em janelas de tamanho blockSize e promedia a
        // entropia cruzada de cada posicao prevista.
        double sum = 0.0;
        int n = 0;
        for (int start = 0; start < ids.length - 1; start += blockSize) {
            int end = Math.min(start + blockSize, ids.length - 1);
            int t = end - start;
            int[] ctx = new int[t];
            int[] tgt = new int[t];
            System.arraycopy(ids, start, ctx, 0, t);
            System.arraycopy(ids, start + 1, tgt, 0, t);
            Tensor logits = forwardLogitsBatch(new int[][] { ctx }, t, 1);
            sum += Tensor.crossEntropyRows(logits, tgt).data[0][0] * t;
            n += t;
        }
        return sum / n;
    }
}
