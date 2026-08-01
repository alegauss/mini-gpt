package minigpt.model;

/**
 * Nivel 1: modelo de bigrama por <b>contagem de pares</b>, sem gradiente.
 *
 * <h2>Ideia</h2>
 * A hipotese mais simples possivel: o proximo caractere depende apenas do
 * caractere imediatamente anterior. Estimamos a probabilidade condicional
 * diretamente contando quantas vezes cada par (a, b) ocorre no corpus:
 * <pre>
 *   N[a][b] = numero de vezes que 'b' aparece logo depois de 'a'
 *   p(b | a) = (N[a][b] + α) / (Σ_c (N[a][c] + α))
 * </pre>
 * Isso e maxima verossimilhanca (com suavizacao). Nao ha "treino" no
 * sentido de descida de gradiente: uma unica passada pelo corpus preenche
 * a matriz de contagens.
 *
 * <h2>Suavizacao de Laplace (add-α)</h2>
 * Somamos {@code α > 0} a toda contagem. Sem isso, um par nunca visto
 * teria probabilidade zero e a entropia cruzada explodiria para infinito
 * assim que ele aparecesse na validacao. Com {@code α = 1} (add-one),
 * todo par recebe massa minima e a loss permanece finita.
 *
 * <p>Este modelo estabelece a <b>linha de base</b>: qualquer modelo mais
 * sofisticado precisa bater a loss do bigrama para justificar sua
 * complexidade.</p>
 */
public final class BigramModel implements LanguageModel {

    private final int vocabSize;
    private final double alpha;

    /** N[a][b]: contagem do par (a seguido de b). */
    private final double[][] counts;

    /** Soma de cada linha de {@code counts} (denominadores nao suavizados). */
    private final double[] rowSums;

    /**
     * Cria um bigrama vazio (todas as contagens em zero).
     *
     * @param vocabSize tamanho do vocabulario {@code V}
     * @param alpha     constante de suavizacao de Laplace ({@code α > 0})
     */
    public BigramModel(int vocabSize, double alpha) {
        if (alpha <= 0.0) {
            throw new IllegalArgumentException("alpha deve ser > 0");
        }
        this.vocabSize = vocabSize;
        this.alpha = alpha;
        this.counts = new double[vocabSize][vocabSize];
        this.rowSums = new double[vocabSize];
    }

    /**
     * Treina o modelo contando todos os pares adjacentes do corpus.
     *
     * <p>Uma unica varredura: para cada posicao {@code i}, incrementa
     * {@code N[ids[i]][ids[i+1]]}. Complexidade {@code O(N)} no tamanho do
     * corpus.</p>
     *
     * @param ids corpus tokenizado
     */
    public void fit(int[] ids) {
        for (int i = 0; i + 1 < ids.length; i++) {
            int a = ids[i];
            int b = ids[i + 1];
            counts[a][b] += 1.0;
            rowSums[a] += 1.0;
        }
    }

    @Override
    public String name() {
        return "bigram";
    }

    @Override
    public int vocabSize() {
        return vocabSize;
    }

    @Override
    public int contextLength() {
        return 1; // usa somente o caractere anterior
    }

    /**
     * Probabilidade suavizada da linha {@code a}:
     * {@code p(b | a) = (N[a][b] + α) / (rowSum[a] + α·V)}.
     *
     * @param a id do caractere de contexto
     * @return distribuicao sobre o proximo caractere, tamanho {@code V}
     */
    private double[] rowProbabilities(int a) {
        double denom = rowSums[a] + alpha * vocabSize;
        double[] p = new double[vocabSize];
        double[] row = counts[a];
        for (int b = 0; b < vocabSize; b++) {
            p[b] = (row[b] + alpha) / denom;
        }
        return p;
    }

    @Override
    public double[] nextProbabilities(int[] context) {
        // Sem contexto: distribuicao uniforme (nada em que se basear).
        if (context.length == 0) {
            double[] p = new double[vocabSize];
            java.util.Arrays.fill(p, 1.0 / vocabSize);
            return p;
        }
        int a = context[context.length - 1];
        return rowProbabilities(a);
    }

    @Override
    public double evaluateLoss(int[] ids) {
        if (ids.length < 2) {
            return 0.0;
        }
        double sum = 0.0;
        int n = 0;
        for (int i = 0; i + 1 < ids.length; i++) {
            int a = ids[i];
            int b = ids[i + 1];
            double denom = rowSums[a] + alpha * vocabSize;
            double pb = (counts[a][b] + alpha) / denom;
            sum += -Math.log(pb);
            n++;
        }
        return sum / n;
    }
}
