package minigpt.train;

import minigpt.core.Tensor;

import java.util.List;

/**
 * Otimizador <b>Adam</b> (Adaptive Moment Estimation), que atualiza os
 * parametros a partir dos gradientes acumulados em cada {@link Tensor}.
 *
 * <h2>Ideia</h2>
 * A descida de gradiente simples faz {@code θ ← θ − lr·g}. Adam melhora
 * isso mantendo duas <b>medias moveis exponenciais</b> por parametro:
 * <pre>
 *   m ← β₁·m + (1−β₁)·g        (1º momento: media dos gradientes)
 *   v ← β₂·v + (1−β₂)·g²       (2º momento: media dos gradientes ao quadrado)
 * </pre>
 * O primeiro momento {@code m} suaviza a direcao (como "momento"/inercia);
 * o segundo {@code v} estima a escala de cada coordenada, permitindo um
 * passo efetivo maior onde os gradientes sao pequenos e menor onde sao
 * grandes.
 *
 * <h2>Correcao de vies</h2>
 * Como {@code m} e {@code v} comecam em zero, no inicio ficam enviesados
 * para baixo. Corrigimos dividindo pelas potencias de {@code β}:
 * <pre>
 *   m̂ = m / (1 − β₁ᵗ)     v̂ = v / (1 − β₂ᵗ)
 *   θ ← θ − lr · m̂ / (√v̂ + ε)
 * </pre>
 * onde {@code t} e o numero do passo. O {@code ε} evita divisao por zero.
 *
 * <p>Opcionalmente aplica <b>weight decay</b> desacoplado (estilo AdamW):
 * {@code θ ← θ − lr·wd·θ}, uma regularizacao que puxa os pesos para zero.</p>
 */
public final class AdamOptimizer {

    private final List<Tensor> params;
    private final double lr;
    private final double beta1;
    private final double beta2;
    private final double eps;
    private final double weightDecay;

    /** Primeiro momento por parametro (mesma forma do parametro). */
    private final double[][][] m;
    /** Segundo momento por parametro. */
    private final double[][][] v;

    /** Contador de passos (para a correcao de vies). */
    private int t = 0;

    /**
     * @param params      parametros treinaveis (tensores-folha)
     * @param lr          taxa de aprendizado
     * @param beta1       decaimento do 1º momento (tipico 0.9)
     * @param beta2       decaimento do 2º momento (tipico 0.999)
     * @param eps         estabilidade numerica (tipico 1e-8)
     * @param weightDecay regularizacao L2 desacoplada (0 para desligar)
     */
    public AdamOptimizer(List<Tensor> params, double lr, double beta1, double beta2,
                         double eps, double weightDecay) {
        this.params = params;
        this.lr = lr;
        this.beta1 = beta1;
        this.beta2 = beta2;
        this.eps = eps;
        this.weightDecay = weightDecay;
        this.m = new double[params.size()][][];
        this.v = new double[params.size()][][];
        for (int p = 0; p < params.size(); p++) {
            Tensor par = params.get(p);
            m[p] = new double[par.rows()][par.cols()];
            v[p] = new double[par.rows()][par.cols()];
        }
    }

    /**
     * Construtor com hiperparametros padrao ({@code β₁=0.9, β₂=0.999,
     * ε=1e-8}) e sem weight decay.
     *
     * @param params parametros treinaveis
     * @param lr     taxa de aprendizado
     */
    public AdamOptimizer(List<Tensor> params, double lr) {
        this(params, lr, 0.9, 0.999, 1e-8, 0.0);
    }

    /** Zera os gradientes de todos os parametros (chamar antes do forward). */
    public void zeroGrad() {
        for (Tensor p : params) {
            p.zeroGrad();
        }
    }

    /**
     * Aplica um passo de Adam usando os gradientes atualmente em
     * {@code param.grad}.
     */
    public void step() {
        t++;
        double biasCorr1 = 1.0 - Math.pow(beta1, t);
        double biasCorr2 = 1.0 - Math.pow(beta2, t);
        for (int p = 0; p < params.size(); p++) {
            Tensor par = params.get(p);
            double[][] mp = m[p];
            double[][] vp = v[p];
            for (int i = 0; i < par.rows(); i++) {
                for (int j = 0; j < par.cols(); j++) {
                    double g = par.grad[i][j];
                    mp[i][j] = beta1 * mp[i][j] + (1 - beta1) * g;
                    vp[i][j] = beta2 * vp[i][j] + (1 - beta2) * g * g;
                    double mHat = mp[i][j] / biasCorr1;
                    double vHat = vp[i][j] / biasCorr2;
                    double update = mHat / (Math.sqrt(vHat) + eps);
                    if (weightDecay != 0.0) {
                        update += weightDecay * par.data[i][j];
                    }
                    par.data[i][j] -= lr * update;
                }
            }
        }
    }
}
