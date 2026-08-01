package minigpt.core;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Random;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Verifica os gradientes do autodiff ({@link Tensor}) por
 * <b>diferencas finitas</b>.
 *
 * <h2>Metodo</h2>
 * Para uma funcao escalar {@code L(θ)}, a derivada em relacao a cada
 * parametro {@code θ_k} e aproximada pela diferenca central:
 * <pre>
 *   ∂L/∂θ_k ≈ (L(θ_k + h) − L(θ_k − h)) / (2h)
 * </pre>
 * cujo erro e {@code O(h²)}. Comparamos essa estimativa numerica com o
 * gradiente analitico produzido por {@link Tensor#backwardAll()}. Se o
 * autodiff estiver correto, a diferenca relativa maxima fica muito abaixo
 * de {@code 1e-5}.
 */
class TensorGradCheckTest {

    private static final double H = 1e-6;
    private static final double RTOL = 1e-5;
    private static final double ATOL = 1e-6;

    /**
     * Roda a verificacao para uma funcao que constroi um escalar a partir
     * de uma lista de tensores de entrada. Perturba cada elemento de cada
     * entrada e compara o gradiente numerico com o analitico.
     *
     * <p>Usa uma tolerancia <b>combinada</b> (absoluta OU relativa): um
     * elemento passa se {@code |num−an| < ATOL} ou se o erro relativo for
     * {@code < RTOL}. A parte absoluta e essencial porque alguns gradientes
     * sao legitimamente ~0 (ex.: um vies de chave na atencao, que some no
     * softmax por ser um deslocamento constante por linha); nesses casos o
     * erro relativo e instavel embora o absoluto seja desprezivel. Um bug de
     * verdade falha nos dois criterios ao mesmo tempo.</p>
     */
    private static void checkGradient(Tensor[] inputs, Function<Tensor[], Tensor> fn) {
        for (Tensor in : inputs) {
            in.zeroGrad();
        }
        Tensor loss = fn.apply(inputs);
        loss.backwardAll();

        double worstRelSignificant = 0.0;
        for (Tensor in : inputs) {
            for (int i = 0; i < in.rows(); i++) {
                for (int j = 0; j < in.cols(); j++) {
                    double orig = in.data[i][j];

                    in.data[i][j] = orig + H;
                    double lp = fn.apply(copyInputs(inputs)).data[0][0];
                    in.data[i][j] = orig - H;
                    double lm = fn.apply(copyInputs(inputs)).data[0][0];
                    in.data[i][j] = orig;

                    double numeric = (lp - lm) / (2 * H);
                    double analytic = in.grad[i][j];
                    double absErr = Math.abs(numeric - analytic);
                    double relErr = absErr / Math.max(1e-12, Math.abs(numeric) + Math.abs(analytic));
                    boolean ok = absErr < ATOL || relErr < RTOL;
                    assertTrue(ok, "gradiente incorreto em (" + i + "," + j + "): numerico="
                            + numeric + " analitico=" + analytic
                            + " (absErr=" + absErr + ", relErr=" + relErr + ")");
                    if (absErr >= ATOL) {
                        worstRelSignificant = Math.max(worstRelSignificant, relErr);
                    }
                }
            }
        }
        assertTrue(worstRelSignificant < RTOL,
                "erro relativo maximo (gradientes significativos) " + worstRelSignificant
                + " deveria ser < " + RTOL);
    }

    /**
     * As funcoes {@code fn} sao reavaliadas em forward-only durante a
     * perturbacao; como reutilizam os MESMOS tensores de entrada (para ler
     * {@code data} perturbado), precisamos garantir grafos independentes.
     * Aqui apenas devolvemos as mesmas referencias: a funcao reconstroi o
     * grafo a cada chamada, entao os nos intermediarios sao novos.
     */
    private static Tensor[] copyInputs(Tensor[] inputs) {
        return inputs;
    }

    private static Tensor randn(int r, int c, Random rng) {
        double[][] d = new double[r][c];
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) {
                d[i][j] = rng.nextGaussian();
            }
        }
        return new Tensor(d);
    }

    @Test
    void matmulGradient() {
        Random rng = new Random(1);
        Tensor a = randn(3, 4, rng);
        Tensor b = randn(4, 2, rng);
        checkGradient(new Tensor[] { a, b },
                t -> Tensor.sum(Tensor.matmul(t[0], t[1])));
    }

    @Test
    void addAndScaleGradient() {
        Random rng = new Random(2);
        Tensor a = randn(3, 3, rng);
        Tensor b = randn(3, 3, rng);
        checkGradient(new Tensor[] { a, b },
                t -> Tensor.sum(Tensor.scale(Tensor.add(t[0], t[1]), 2.5)));
    }

    @Test
    void addRowVectorGradient() {
        Random rng = new Random(3);
        Tensor x = randn(4, 5, rng);
        Tensor bias = randn(1, 5, rng);
        checkGradient(new Tensor[] { x, bias },
                t -> Tensor.sum(Tensor.addRowVector(t[0], t[1])));
    }

    @Test
    void tanhGradient() {
        Random rng = new Random(4);
        Tensor x = randn(3, 4, rng);
        checkGradient(new Tensor[] { x },
                t -> Tensor.sum(Tensor.tanh(t[0])));
    }

    @Test
    void transposeGradient() {
        Random rng = new Random(5);
        Tensor x = randn(3, 4, rng);
        // Combina com matmul para produzir gradiente nao trivial.
        checkGradient(new Tensor[] { x },
                t -> Tensor.sum(Tensor.matmul(t[0], Tensor.transpose(t[0]))));
    }

    @Test
    void softmaxRowsGradient() {
        Random rng = new Random(6);
        Tensor x = randn(3, 5, rng);
        // Multiplica por pesos para o gradiente que chega ao softmax variar
        // por posicao (senao a soma do softmax e constante = 1).
        Tensor w = randn(3, 5, rng);
        checkGradient(new Tensor[] { x, w },
                t -> Tensor.sum(elementwiseMulViaConcat(Tensor.softmaxRows(t[0]), t[1])));
    }

    @Test
    void layerNormGradient() {
        Random rng = new Random(7);
        Tensor x = randn(4, 6, rng);
        Tensor gamma = randn(1, 6, rng);
        Tensor beta = randn(1, 6, rng);
        Tensor w = randn(4, 6, rng);
        checkGradient(new Tensor[] { x, gamma, beta },
                t -> Tensor.sum(elementwiseMulViaConcat(
                        Tensor.layerNorm(t[0], t[1], t[2], 1e-5), w)));
    }

    @Test
    void crossEntropyGradient() {
        Random rng = new Random(8);
        Tensor logits = randn(4, 7, rng);
        int[] targets = { 0, 3, 6, 2 };
        checkGradient(new Tensor[] { logits },
                t -> Tensor.crossEntropyRows(t[0], targets));
    }

    @Test
    void rowsGatherGradient() {
        Random rng = new Random(9);
        Tensor table = randn(5, 3, rng);
        int[] idx = { 0, 2, 2, 4 }; // repete indice para testar acumulacao
        Tensor w = randn(4, 3, rng);
        checkGradient(new Tensor[] { table },
                t -> Tensor.sum(elementwiseMulViaConcat(Tensor.rows(t[0], idx), w)));
    }

    @Test
    void sliceAndConcatGradient() {
        Random rng = new Random(10);
        Tensor x = randn(3, 6, rng);
        checkGradient(new Tensor[] { x }, t -> {
            Tensor left = Tensor.sliceCols(t[0], 0, 3);
            Tensor right = Tensor.sliceCols(t[0], 3, 3);
            Tensor cat = Tensor.concatCols(List.of(right, left)); // troca metades
            return Tensor.sum(Tensor.tanh(cat));
        });
    }

    @Test
    void causalMaskAttentionGradient() {
        Random rng = new Random(11);
        Tensor q = randn(4, 3, rng);
        Tensor k = randn(4, 3, rng);
        Tensor v = randn(4, 3, rng);
        // Um bloco de atencao causal completo (scores -> mask -> softmax -> ·V).
        checkGradient(new Tensor[] { q, k, v }, t -> {
            Tensor scores = Tensor.scale(
                    Tensor.matmul(t[0], Tensor.transpose(t[1])), 1.0 / Math.sqrt(3));
            Tensor att = Tensor.softmaxRows(Tensor.causalMask(scores));
            return Tensor.sum(Tensor.matmul(att, t[2]));
        });
    }

    @Test
    void sliceAndConcatRowsGradient() {
        Random rng = new Random(13);
        Tensor x = randn(6, 4, rng);
        checkGradient(new Tensor[] { x }, t -> {
            Tensor top = Tensor.sliceRows(t[0], 0, 3);
            Tensor bottom = Tensor.sliceRows(t[0], 3, 3);
            Tensor cat = Tensor.concatRows(List.of(bottom, top)); // troca metades
            return Tensor.sum(Tensor.tanh(cat));
        });
    }

    @Test
    void mulGradient() {
        Random rng = new Random(12);
        Tensor a = randn(3, 4, rng);
        Tensor b = randn(3, 4, rng);
        checkGradient(new Tensor[] { a, b },
                t -> Tensor.sum(Tensor.mul(t[0], t[1])));
    }

    /** Multiplicacao elemento a elemento, delegando ao op {@link Tensor#mul}. */
    private static Tensor elementwiseMulViaConcat(Tensor a, Tensor b) {
        return Tensor.mul(a, b);
    }
}
