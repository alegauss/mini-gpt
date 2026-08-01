package minigpt.model;

import minigpt.core.Tensor;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Verifica, por <b>diferencas finitas</b>, os gradientes de TODO o grafo do
 * {@link TransformerModel} — atencao causal, LayerNorm, residuais e cabeca
 * com pesos amarrados juntos. Usa uma configuracao minuscula para rodar
 * rapido; se o autodiff compoe corretamente, o erro relativo fica &lt; 1e-5.
 */
class TransformerGradCheckTest {

    private static final double H = 1e-6;
    private static final double RTOL = 1e-5;
    private static final double ATOL = 1e-6;

    @Test
    void gradientesDoGrafoCompletoConferem() {
        int vocab = 5, block = 4, embed = 8, heads = 2, nblocks = 1;
        TransformerModel model = new TransformerModel(vocab, block, embed, heads, nblocks, 42L);

        // Batch pequeno e fixo.
        Random rng = new Random(3);
        int batch = 2;
        int[][] x = new int[batch][block];
        int[][] y = new int[batch][block];
        for (int i = 0; i < batch; i++) {
            for (int t = 0; t < block; t++) {
                x[i][t] = rng.nextInt(vocab);
                y[i][t] = rng.nextInt(vocab);
            }
        }

        // Gradiente analitico via autodiff.
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
                    // Tolerancia combinada (ver TensorGradCheckTest): alguns
                    // gradientes sao legitimamente ~0 (ex.: vies de chave, que
                    // some no softmax), onde so o erro absoluto faz sentido.
                    assertTrue(absErr < ATOL || relErr < RTOL,
                            "gradiente incorreto no param de forma (" + p.rows() + ","
                            + p.cols() + ") em (" + i + "," + j + "): num=" + numeric
                            + " an=" + analytic);
                    if (absErr >= ATOL) {
                        worstRel = Math.max(worstRel, relErr);
                    }
                }
            }
        }
        assertTrue(worstRel < RTOL,
                "erro relativo maximo do gradiente do Transformer = " + worstRel
                + " (< " + RTOL + ")");
    }
}
