package minigpt.model;

import minigpt.core.Tensor;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Valida a backpropagation MANUAL do {@link MlpModel} por
 * <b>diferencas finitas</b> — o criterio de aceite central da ETAPA 2.
 *
 * <p>Para cada parametro {@code θ_k}, comparamos o gradiente analitico
 * (derivado a mao no {@code forwardBackward}) com a estimativa numerica
 * pela diferenca central {@code (L(θ+h) − L(θ−h)) / 2h}. Se as derivadas
 * escritas a mao estiverem corretas, o erro relativo maximo fica bem
 * abaixo de {@code 1e-5}.</p>
 */
class MlpGradCheckTest {

    private static final double H = 1e-6;
    private static final double RTOL = 1e-5;
    private static final double ATOL = 1e-6;

    @Test
    void gradientesManuaisConferemComDiferencasFinitas() {
        int vocab = 6, block = 3, embed = 4, hidden = 5, batch = 4;
        MlpModel model = new MlpModel(vocab, block, embed, hidden, 123L);

        // Batch aleatorio, mas fixo, dentro do vocabulario.
        Random rng = new Random(7);
        int[][] x = new int[batch][block];
        int[][] y = new int[batch][block];
        for (int i = 0; i < batch; i++) {
            for (int t = 0; t < block; t++) {
                x[i][t] = rng.nextInt(vocab);
                y[i][t] = rng.nextInt(vocab);
            }
        }

        // Gradiente analitico (backprop manual). Zera antes de acumular.
        for (Tensor p : model.parameters()) {
            p.zeroGrad();
        }
        model.forwardBackward(x, y);

        double worstRel = 0.0;
        List<Tensor> params = model.parameters();
        for (Tensor p : params) {
            for (int i = 0; i < p.rows(); i++) {
                for (int j = 0; j < p.cols(); j++) {
                    double orig = p.data[i][j];

                    p.data[i][j] = orig + H;
                    double lp = model.forwardLossOnly(x, y);
                    p.data[i][j] = orig - H;
                    double lm = model.forwardLossOnly(x, y);
                    p.data[i][j] = orig;

                    double numeric = (lp - lm) / (2 * H);
                    double analytic = p.grad[i][j];
                    double absErr = Math.abs(numeric - analytic);
                    double relErr = absErr / Math.max(1e-12, Math.abs(numeric) + Math.abs(analytic));
                    // Tolerancia combinada: passa por erro absoluto OU relativo.
                    assertTrue(absErr < ATOL || relErr < RTOL,
                            "gradiente incorreto em (" + i + "," + j + "): num=" + numeric
                            + " an=" + analytic);
                    if (absErr >= ATOL) {
                        worstRel = Math.max(worstRel, relErr);
                    }
                }
            }
        }
        assertTrue(worstRel < RTOL,
                "erro relativo maximo do gradiente do MLP = " + worstRel + " (< " + RTOL + ")");
    }

    @Test
    void probabilidadesSomamUm() {
        MlpModel model = new MlpModel(10, 8, 8, 16, 1L);
        double[] p = model.nextProbabilities(new int[] { 1, 2, 3 });
        double sum = 0.0;
        for (double v : p) {
            sum += v;
        }
        assertTrue(Math.abs(sum - 1.0) < 1e-9);
    }
}
