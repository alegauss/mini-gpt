package minigpt.model;

import minigpt.core.Matrix;
import minigpt.core.Tensor;

import java.util.List;
import java.util.Random;

/**
 * Nivel 2: perceptron multicamadas (MLP) com <b>backpropagation manual</b>.
 *
 * <h2>Arquitetura (estilo Bengio 2003)</h2>
 * O modelo preve o proximo caractere a partir de uma janela FIXA de
 * {@code T} caracteres anteriores (aqui {@code T = 8}):
 * <pre>
 *   1. Embedding:   cada um dos T ids vira um vetor de dimensao E, olhando
 *                   a linha correspondente da tabela C (V×E). Concatenamos
 *                   os T vetores num unico vetor de dimensao T·E.
 *   2. Camada oculta: h = tanh(x·W1 + b1)      com W1 (T·E × H), b1 (1×H)
 *   3. Camada de saida: logits = h·W2 + b2      com W2 (H × V), b2 (1×V)
 *   4. Perda:       entropia cruzada entre softmax(logits) e o alvo.
 * </pre>
 *
 * <h2>Backpropagation derivada a mao</h2>
 * Diferente do Transformer (que usa autodiff), aqui escrevemos cada
 * gradiente explicitamente, aplicando a regra da cadeia camada por camada.
 * Com {@code P = softmax(logits)} e {@code y} o alvo, para um batch de
 * {@code B} exemplos (perda = media):
 * <pre>
 *   dLogits = (P − onehot(y)) / B                       (B×V)
 *   dW2     = Aᵀ · dLogits            db2 = Σ_b dLogits  (H×V), (1×V)
 *   dA      = dLogits · W2ᵀ                              (B×H)
 *   dH1     = dA ⊙ (1 − A²)          (derivada da tanh)  (B×H)
 *   dW1     = Xcatᵀ · dH1            db1 = Σ_b dH1        (T·E×H), (1×H)
 *   dXcat   = dH1 · W1ᵀ                                  (B×T·E)
 *   dC[id]  += fatia de dXcat correspondente aquela posicao (scatter-add)
 * </pre>
 * Cada passo esta comentado no codigo abaixo. Um teste
 * ({@code MlpGradCheckTest}) valida TODOS esses gradientes por diferencas
 * finitas, com erro &lt; 1e-5.
 *
 * <p>Os parametros sao guardados como {@link Tensor}-folha apenas para que
 * o {@link minigpt.train.AdamOptimizer} possa atualiza-los; o forward e o
 * backward NAO usam o grafo de autodiff — sao algebra pura com
 * {@link Matrix}.</p>
 */
public final class MlpModel implements TrainableModel {

    private final int vocabSize;
    private final int blockSize;   // T
    private final int embedDim;    // E
    private final int hiddenDim;   // H

    private final Tensor c;   // embedding (V, E)
    private final Tensor w1;  // (T*E, H)
    private final Tensor b1;  // (1, H)
    private final Tensor w2;  // (H, V)
    private final Tensor b2;  // (1, V)

    /**
     * Cria e inicializa aleatoriamente o MLP.
     *
     * @param vocabSize tamanho do vocabulario V
     * @param blockSize comprimento de contexto T
     * @param embedDim  dimensao do embedding E
     * @param hiddenDim tamanho da camada oculta H
     * @param seed      semente para a inicializacao dos pesos
     */
    public MlpModel(int vocabSize, int blockSize, int embedDim, int hiddenDim, long seed) {
        this.vocabSize = vocabSize;
        this.blockSize = blockSize;
        this.embedDim = embedDim;
        this.hiddenDim = hiddenDim;
        Random rng = new Random(seed);
        // Inicializacao: embeddings pequenos; pesos escalados por 1/sqrt(fan_in)
        // para manter a variancia das ativacoes controlada (evita saturar a tanh).
        this.c = new Tensor(randn(vocabSize, embedDim, 0.1, rng));
        int fanIn1 = blockSize * embedDim;
        this.w1 = new Tensor(randn(fanIn1, hiddenDim, 1.0 / Math.sqrt(fanIn1), rng));
        this.b1 = new Tensor(new double[1][hiddenDim]);
        this.w2 = new Tensor(randn(hiddenDim, vocabSize, 1.0 / Math.sqrt(hiddenDim), rng));
        this.b2 = new Tensor(new double[1][vocabSize]);
    }

    private static double[][] randn(int r, int col, double std, Random rng) {
        double[][] d = new double[r][col];
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < col; j++) {
                d[i][j] = rng.nextGaussian() * std;
            }
        }
        return d;
    }

    @Override
    public String name() {
        return "mlp";
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
        return List.of(c, w1, w2, b1, b2);
    }

    // ==================================================================
    // Forward: monta Xcat (B, T*E), calcula ativacoes e logits.
    // Retorna as pecas necessarias para o backward.
    // ==================================================================

    /** Constroi a janela de contexto de tamanho T para o exemplo, com
     * left-padding (repete o primeiro id) quando o contexto e curto. */
    private int[] window(int[] context) {
        int[] w = new int[blockSize];
        int pad = context.length > 0 ? context[0] : 0;
        for (int t = 0; t < blockSize; t++) {
            int srcIdx = context.length - blockSize + t;
            w[t] = (srcIdx >= 0) ? context[srcIdx] : pad;
        }
        return w;
    }

    /** Matriz Xcat (B, T*E): concatena os embeddings dos T ids de cada exemplo. */
    private double[][] embedConcat(int[][] windows) {
        int b = windows.length;
        double[][] xcat = new double[b][blockSize * embedDim];
        for (int i = 0; i < b; i++) {
            for (int t = 0; t < blockSize; t++) {
                int id = windows[i][t];
                System.arraycopy(c.data[id], 0, xcat[i], t * embedDim, embedDim);
            }
        }
        return xcat;
    }

    /** Logits (B, V) e ativacao oculta A (B, H), dado Xcat. */
    private double[][] forwardHidden(double[][] xcat, double[][] outHidden) {
        // H1 = Xcat·W1 + b1 ; A = tanh(H1)
        double[][] h1 = Matrix.matmul(xcat, w1.data);
        for (int i = 0; i < h1.length; i++) {
            for (int j = 0; j < hiddenDim; j++) {
                outHidden[i][j] = Math.tanh(h1[i][j] + b1.data[0][j]);
            }
        }
        // Logits = A·W2 + b2
        double[][] logits = Matrix.matmul(outHidden, w2.data);
        for (int i = 0; i < logits.length; i++) {
            for (int j = 0; j < vocabSize; j++) {
                logits[i][j] += b2.data[0][j];
            }
        }
        return logits;
    }

    @Override
    public double forwardBackward(int[][] x, int[][] y) {
        int b = x.length;
        // O MLP usa a janela inteira x[i] para prever o caractere seguinte,
        // que e y[i][T-1] (o ultimo alvo da janela deslizante).
        int[][] windows = new int[b][];
        int[] targets = new int[b];
        for (int i = 0; i < b; i++) {
            windows[i] = x[i];
            targets[i] = y[i][blockSize - 1];
        }

        // ----- FORWARD -----
        double[][] xcat = embedConcat(windows);
        double[][] a = new double[b][hiddenDim];       // ativacao tanh
        double[][] logits = forwardHidden(xcat, a);
        double[][] probs = Matrix.softmaxRows(logits); // P (B, V)

        double loss = 0.0;
        for (int i = 0; i < b; i++) {
            loss += -Math.log(probs[i][targets[i]]);
        }
        loss /= b;

        // ----- BACKWARD (regra da cadeia, passo a passo) -----
        // (1) Gradiente da entropia cruzada + softmax combinados:
        //     dLogits = (P - onehot(y)) / B
        double[][] dLogits = new double[b][vocabSize];
        for (int i = 0; i < b; i++) {
            for (int j = 0; j < vocabSize; j++) {
                double target = (j == targets[i]) ? 1.0 : 0.0;
                dLogits[i][j] = (probs[i][j] - target) / b;
            }
        }

        // (2) Camada de saida: Logits = A·W2 + b2
        //     dW2 = Aᵀ·dLogits ; db2 = Σ_linhas dLogits
        double[][] dW2 = Matrix.matmul(Matrix.transpose(a), dLogits); // (H, V)
        double[] db2 = colSums(dLogits);                              // (V)
        //     dA = dLogits·W2ᵀ
        double[][] dA = Matrix.matmul(dLogits, Matrix.transpose(w2.data)); // (B, H)

        // (3) Nao linearidade: A = tanh(H1) => dH1 = dA ⊙ (1 - A²)
        double[][] dH1 = new double[b][hiddenDim];
        for (int i = 0; i < b; i++) {
            for (int j = 0; j < hiddenDim; j++) {
                double t = a[i][j];
                dH1[i][j] = dA[i][j] * (1.0 - t * t);
            }
        }

        // (4) Camada oculta: H1 = Xcat·W1 + b1
        //     dW1 = Xcatᵀ·dH1 ; db1 = Σ_linhas dH1
        double[][] dW1 = Matrix.matmul(Matrix.transpose(xcat), dH1); // (T*E, H)
        double[] db1 = colSums(dH1);                                 // (H)
        //     dXcat = dH1·W1ᵀ
        double[][] dXcat = Matrix.matmul(dH1, Matrix.transpose(w1.data)); // (B, T*E)

        // (5) Embedding: cada fatia de dXcat volta para a linha do id usado
        //     (scatter-add, pois o mesmo caractere pode aparecer varias vezes).
        for (int i = 0; i < b; i++) {
            for (int t = 0; t < blockSize; t++) {
                int id = windows[i][t];
                int base = t * embedDim;
                for (int e = 0; e < embedDim; e++) {
                    c.grad[id][e] += dXcat[i][base + e];
                }
            }
        }

        // Acumula nos gradientes dos tensores-folha (o otimizador le daqui).
        addInto(w2.grad, dW2);
        addRowInto(b2.grad, db2);
        addInto(w1.grad, dW1);
        addRowInto(b1.grad, db1);

        return loss;
    }

    @Override
    public double forwardLossOnly(int[][] x, int[][] y) {
        int b = x.length;
        int[][] windows = new int[b][];
        int[] targets = new int[b];
        for (int i = 0; i < b; i++) {
            windows[i] = x[i];
            targets[i] = y[i][blockSize - 1];
        }
        double[][] xcat = embedConcat(windows);
        double[][] a = new double[b][hiddenDim];
        double[][] logits = forwardHidden(xcat, a);
        double[][] probs = Matrix.softmaxRows(logits);
        double loss = 0.0;
        for (int i = 0; i < b; i++) {
            loss += -Math.log(probs[i][targets[i]]);
        }
        return loss / b;
    }

    @Override
    public double[] nextProbabilities(int[] context) {
        int[] w = window(context);
        double[][] xcat = embedConcat(new int[][] { w });
        double[][] a = new double[1][hiddenDim];
        double[][] logits = forwardHidden(xcat, a);
        return Matrix.softmax(logits[0]);
    }

    @Override
    public double evaluateLoss(int[] ids) {
        if (ids.length < 2) {
            return 0.0;
        }
        double sum = 0.0;
        int n = 0;
        // Para cada posicao i>=1, usa os T caracteres anteriores como contexto.
        for (int i = 1; i < ids.length; i++) {
            int from = Math.max(0, i - blockSize);
            int[] ctx = new int[i - from];
            System.arraycopy(ids, from, ctx, 0, ctx.length);
            double[] p = nextProbabilities(ctx);
            sum += -Math.log(p[ids[i]]);
            n++;
        }
        return sum / n;
    }

    // ------------------------------------------------------------------
    // Utilidades de acumulacao de gradiente
    // ------------------------------------------------------------------

    private static double[] colSums(double[][] m) {
        double[] s = new double[m[0].length];
        for (double[] row : m) {
            for (int j = 0; j < row.length; j++) {
                s[j] += row[j];
            }
        }
        return s;
    }

    private static void addInto(double[][] dst, double[][] src) {
        for (int i = 0; i < dst.length; i++) {
            for (int j = 0; j < dst[0].length; j++) {
                dst[i][j] += src[i][j];
            }
        }
    }

    private static void addRowInto(double[][] dst, double[] src) {
        for (int j = 0; j < src.length; j++) {
            dst[0][j] += src[j];
        }
    }
}
