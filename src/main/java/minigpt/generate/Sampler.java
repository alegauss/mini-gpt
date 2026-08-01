package minigpt.generate;

import minigpt.data.CharTokenizer;
import minigpt.model.LanguageModel;

import java.util.Arrays;
import java.util.Random;

/**
 * Gera texto a partir de um modelo, com controle de <b>temperatura</b> e
 * <b>top-k</b>.
 *
 * <h2>Amostragem autoregressiva</h2>
 * A geracao e um laco: partindo de um contexto inicial, o modelo produz
 * {@code p(proximo | contexto)}, sorteamos um caractere dessa
 * distribuicao, anexamos ao contexto e repetimos. Como cada passo
 * consome a propria saida do passo anterior, o processo e "autoregressivo".
 *
 * <h2>Temperatura</h2>
 * Antes de amostrar, reescalamos as probabilidades por um expoente
 * {@code 1/τ}:
 * <pre>
 *   p'_i ∝ p_i^{1/τ}
 * </pre>
 * <ul>
 *   <li>{@code τ = 1}: distribuicao original.</li>
 *   <li>{@code τ &lt; 1}: "esfria" — concentra massa nos caracteres mais
 *       provaveis, texto mais conservador/repetitivo.</li>
 *   <li>{@code τ &gt; 1}: "esquenta" — achata a distribuicao, texto mais
 *       aleatorio/criativo.</li>
 * </ul>
 * No limite {@code τ → 0} vira argmax (sempre o mais provavel).
 *
 * <h2>Top-k</h2>
 * Opcionalmente mantemos apenas os {@code k} caracteres de maior
 * probabilidade, zeramos o resto e renormalizamos. Isso corta a "cauda"
 * de opcoes improvaveis que, somadas, ainda produzem ruido.
 */
public final class Sampler {

    private final LanguageModel model;
    private final CharTokenizer tokenizer;
    private final Random rng;

    /**
     * @param model     modelo que fornece as distribuicoes
     * @param tokenizer para converter ids em caracteres
     * @param rng       fonte de aleatoriedade (permite reprodutibilidade)
     */
    public Sampler(LanguageModel model, CharTokenizer tokenizer, Random rng) {
        this.model = model;
        this.tokenizer = tokenizer;
        this.rng = rng;
    }

    /**
     * Gera texto continuando a partir de um prompt.
     *
     * @param prompt      texto inicial (pode ser vazio)
     * @param maxNewChars quantos caracteres novos gerar
     * @param temperature temperatura {@code τ > 0}
     * @param topK        se {@code > 0}, mantem apenas os {@code k} mais
     *                    provaveis; se {@code <= 0}, usa toda a distribuicao
     * @return prompt seguido dos caracteres gerados
     */
    public String generate(String prompt, int maxNewChars, double temperature, int topK) {
        if (temperature <= 0.0) {
            throw new IllegalArgumentException("temperature deve ser > 0");
        }
        // Contexto inicial: o prompt tokenizado. Se vazio, comecamos com uma
        // quebra de linha, que costuma marcar inicio de frase no corpus.
        int[] seed = prompt.isEmpty()
                ? safeSeed()
                : tokenizer.encode(prompt);

        int ctxLen = model.contextLength();
        // Buffer com os ids ja produzidos (prompt + gerados).
        int[] history = Arrays.copyOf(seed, seed.length);

        StringBuilder out = new StringBuilder(prompt);
        for (int step = 0; step < maxNewChars; step++) {
            int[] context = tail(history, ctxLen);
            double[] probs = model.nextProbabilities(context);
            probs = applyTemperature(probs, temperature);
            if (topK > 0) {
                probs = applyTopK(probs, topK);
            }
            int next = sample(probs);
            out.append(tokenizer.idToChar(next));
            history = append(history, next);
        }
        return out.toString();
    }

    /** Semente quando nao ha prompt: um unico caractere valido (id 0). */
    private int[] safeSeed() {
        return new int[] { 0 };
    }

    /**
     * Reescala as probabilidades pela temperatura: {@code p'_i ∝ p_i^{1/τ}}.
     *
     * <p>Trabalhamos em log para estabilidade: {@code ln p'_i = (1/τ)·ln p_i},
     * seguido de softmax (que renormaliza). Probabilidades zero (por
     * exemplo apos top-k) sao tratadas como {@code -∞} em log e voltam a
     * zero apos exponenciar.</p>
     */
    private double[] applyTemperature(double[] p, double temperature) {
        double invT = 1.0 / temperature;
        double[] logits = new double[p.length];
        double max = Double.NEGATIVE_INFINITY;
        for (int i = 0; i < p.length; i++) {
            logits[i] = (p[i] > 0.0) ? invT * Math.log(p[i]) : Double.NEGATIVE_INFINITY;
            if (logits[i] > max) {
                max = logits[i];
            }
        }
        double sum = 0.0;
        double[] out = new double[p.length];
        for (int i = 0; i < p.length; i++) {
            out[i] = Math.exp(logits[i] - max);
            sum += out[i];
        }
        for (int i = 0; i < out.length; i++) {
            out[i] /= sum;
        }
        return out;
    }

    /**
     * Mantem apenas os {@code k} maiores; zera o resto e renormaliza.
     */
    private double[] applyTopK(double[] p, int k) {
        if (k >= p.length) {
            return p;
        }
        // Encontra o k-esimo maior valor como limiar.
        double[] sorted = Arrays.copyOf(p, p.length);
        Arrays.sort(sorted); // crescente
        double threshold = sorted[p.length - k];

        double[] out = new double[p.length];
        double sum = 0.0;
        for (int i = 0; i < p.length; i++) {
            if (p[i] >= threshold) {
                out[i] = p[i];
                sum += p[i];
            }
        }
        if (sum == 0.0) {
            return p; // fallback defensivo (nao deve ocorrer)
        }
        for (int i = 0; i < out.length; i++) {
            out[i] /= sum;
        }
        return out;
    }

    /**
     * Amostra um indice de uma distribuicao discreta pelo metodo da
     * transformada inversa: sorteia {@code u ∈ [0,1)} e devolve o menor
     * {@code i} tal que {@code Σ_{j≤i} p_j > u}.
     */
    private int sample(double[] p) {
        double u = rng.nextDouble();
        double acc = 0.0;
        for (int i = 0; i < p.length; i++) {
            acc += p[i];
            if (u < acc) {
                return i;
            }
        }
        return p.length - 1; // guarda contra erro de arredondamento
    }

    /** Ultimos {@code n} elementos de {@code arr} (ou todos, se menor). */
    private static int[] tail(int[] arr, int n) {
        if (arr.length <= n) {
            return arr;
        }
        return Arrays.copyOfRange(arr, arr.length - n, arr.length);
    }

    /** Retorna uma copia de {@code arr} com {@code value} anexado ao fim. */
    private static int[] append(int[] arr, int value) {
        int[] out = Arrays.copyOf(arr, arr.length + 1);
        out[arr.length] = value;
        return out;
    }
}
