package minigpt.core;

import java.util.Arrays;

/**
 * Algebra linear escrita a mao sobre {@code double[][]}, sem nenhuma
 * biblioteca externa. O objetivo NAO e desempenho maximo, e sim que um
 * estudante consiga ler cada laco e reconhecer a formula matematica
 * correspondente.
 *
 * <h2>Convencao de forma</h2>
 * Uma matriz {@code A} de forma {@code (m, n)} e um vetor de {@code m}
 * linhas, cada uma com {@code n} colunas: {@code A[i][j]} e a entrada da
 * linha {@code i}, coluna {@code j}. Vetores sao representados como
 * {@code double[]} (um unico "eixo").
 *
 * <h2>Operacoes centrais</h2>
 * <ul>
 *   <li><b>Produto matricial</b> {@code C = A · B}, com
 *       {@code C[i][j] = Σ_k A[i][k] · B[k][j]}. Exige que o numero de
 *       colunas de {@code A} seja igual ao numero de linhas de {@code B}.</li>
 *   <li><b>Transposta</b> {@code Aᵀ}, com {@code Aᵀ[j][i] = A[i][j]}.
 *       Troca linhas por colunas.</li>
 *   <li><b>Softmax</b> transforma um vetor de "scores" reais
 *       {@code z} numa distribuicao de probabilidade
 *       {@code p_i = e^{z_i} / Σ_j e^{z_j}}, com {@code p_i ≥ 0} e
 *       {@code Σ p_i = 1}. Subtraimos o maximo antes de exponenciar para
 *       evitar overflow numerico (o resultado e identico pois
 *       {@code e^{z_i - c} / Σ e^{z_j - c} = e^{z_i} / Σ e^{z_j}}).</li>
 * </ul>
 *
 * Todos os metodos sao estaticos e puros (nao modificam os argumentos),
 * salvo os claramente marcados como "in-place".
 */
public final class Matrix {

    private Matrix() {
        // Classe utilitaria: nao deve ser instanciada.
    }

    /**
     * Cria uma matriz {@code (rows, cols)} preenchida com zeros.
     *
     * @param rows numero de linhas (m)
     * @param cols numero de colunas (n)
     * @return matriz nula de forma {@code (rows, cols)}
     */
    public static double[][] zeros(int rows, int cols) {
        return new double[rows][cols];
    }

    /**
     * Produto matricial {@code C = A · B}.
     *
     * <p>Matematica: sendo {@code A} de forma {@code (m, k)} e {@code B}
     * de forma {@code (k, n)}, o resultado {@code C} tem forma
     * {@code (m, n)} e cada entrada e um produto interno entre uma linha
     * de {@code A} e uma coluna de {@code B}:
     * {@code C[i][j] = Σ_{p=0}^{k-1} A[i][p] · B[p][j]}.</p>
     *
     * @param a matriz esquerda, forma {@code (m, k)}
     * @param b matriz direita, forma {@code (k, n)}
     * @return produto {@code A · B}, forma {@code (m, n)}
     * @throws IllegalArgumentException se as dimensoes internas nao casarem
     */
    public static double[][] matmul(double[][] a, double[][] b) {
        int m = a.length;
        int k = a[0].length;
        int n = b[0].length;
        if (b.length != k) {
            throw new IllegalArgumentException(
                    "Dimensoes incompativeis: A e (" + m + "," + k + ") "
                    + "mas B e (" + b.length + "," + n + ")");
        }
        double[][] c = new double[m][n];
        for (int i = 0; i < m; i++) {
            for (int p = 0; p < k; p++) {
                double aip = a[i][p];
                if (aip == 0.0) {
                    continue; // pequena otimizacao de leitura para matrizes esparsas
                }
                double[] brow = b[p];
                double[] crow = c[i];
                for (int j = 0; j < n; j++) {
                    crow[j] += aip * brow[j];
                }
            }
        }
        return c;
    }

    /**
     * Produto matriz-vetor {@code y = A · x}.
     *
     * <p>Matematica: {@code y[i] = Σ_j A[i][j] · x[j]}. Cada saida e o
     * produto interno da linha {@code i} de {@code A} com o vetor
     * {@code x}.</p>
     *
     * @param a matriz, forma {@code (m, n)}
     * @param x vetor, tamanho {@code n}
     * @return vetor {@code y}, tamanho {@code m}
     * @throws IllegalArgumentException se {@code x.length != n}
     */
    public static double[] matvec(double[][] a, double[] x) {
        int m = a.length;
        int n = a[0].length;
        if (x.length != n) {
            throw new IllegalArgumentException(
                    "A e (" + m + "," + n + ") mas x tem tamanho " + x.length);
        }
        double[] y = new double[m];
        for (int i = 0; i < m; i++) {
            double s = 0.0;
            double[] row = a[i];
            for (int j = 0; j < n; j++) {
                s += row[j] * x[j];
            }
            y[i] = s;
        }
        return y;
    }

    /**
     * Transposta {@code Aᵀ}, com {@code Aᵀ[j][i] = A[i][j]}.
     *
     * @param a matriz, forma {@code (m, n)}
     * @return transposta, forma {@code (n, m)}
     */
    public static double[][] transpose(double[][] a) {
        int m = a.length;
        int n = a[0].length;
        double[][] t = new double[n][m];
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                t[j][i] = a[i][j];
            }
        }
        return t;
    }

    /**
     * Soma elemento a elemento {@code A + B} (mesma forma).
     *
     * @param a primeira matriz
     * @param b segunda matriz, mesma forma de {@code a}
     * @return soma {@code A + B}
     */
    public static double[][] add(double[][] a, double[][] b) {
        int m = a.length;
        int n = a[0].length;
        double[][] c = new double[m][n];
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                c[i][j] = a[i][j] + b[i][j];
            }
        }
        return c;
    }

    /**
     * Soma de vetores {@code a + b} (mesmo tamanho).
     *
     * @param a primeiro vetor
     * @param b segundo vetor, mesmo tamanho de {@code a}
     * @return soma elemento a elemento
     */
    public static double[] add(double[] a, double[] b) {
        double[] c = new double[a.length];
        for (int i = 0; i < a.length; i++) {
            c[i] = a[i] + b[i];
        }
        return c;
    }

    /**
     * Multiplica uma matriz por um escalar: {@code s · A}.
     *
     * @param a matriz
     * @param s escalar
     * @return matriz escalada
     */
    public static double[][] scale(double[][] a, double s) {
        int m = a.length;
        int n = a[0].length;
        double[][] c = new double[m][n];
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                c[i][j] = a[i][j] * s;
            }
        }
        return c;
    }

    /**
     * Softmax numericamente estavel de um vetor de scores.
     *
     * <p>Matematica: {@code p_i = e^{z_i - c} / Σ_j e^{z_j - c}}, onde
     * {@code c = max_j z_j}. O deslocamento por {@code c} nao altera o
     * resultado (o fator {@code e^{-c}} cancela no numerador e
     * denominador) mas evita {@code e^{z}} estourar para infinito quando
     * os scores sao grandes.</p>
     *
     * @param z vetor de scores (logits), tamanho {@code V}
     * @return distribuicao de probabilidade, tamanho {@code V}, somando 1
     */
    public static double[] softmax(double[] z) {
        double max = Double.NEGATIVE_INFINITY;
        for (double v : z) {
            if (v > max) {
                max = v;
            }
        }
        double sum = 0.0;
        double[] p = new double[z.length];
        for (int i = 0; i < z.length; i++) {
            p[i] = Math.exp(z[i] - max);
            sum += p[i];
        }
        for (int i = 0; i < p.length; i++) {
            p[i] /= sum;
        }
        return p;
    }

    /**
     * Aplica softmax linha a linha de uma matriz de logits.
     *
     * <p>Cada linha e tratada como um vetor de scores independente e
     * convertida numa distribuicao de probabilidade. Util quando temos um
     * lote de {@code B} exemplos, cada um com {@code V} logits.</p>
     *
     * @param logits matriz, forma {@code (B, V)}
     * @return matriz de probabilidades, forma {@code (B, V)}
     */
    public static double[][] softmaxRows(double[][] logits) {
        double[][] out = new double[logits.length][];
        for (int i = 0; i < logits.length; i++) {
            out[i] = softmax(logits[i]);
        }
        return out;
    }

    /**
     * Copia profunda de uma matriz.
     *
     * @param a matriz de origem
     * @return copia independente com os mesmos valores
     */
    public static double[][] copy(double[][] a) {
        double[][] c = new double[a.length][];
        for (int i = 0; i < a.length; i++) {
            c[i] = Arrays.copyOf(a[i], a[i].length);
        }
        return c;
    }

    /**
     * Representacao textual compacta para depuracao.
     *
     * @param a matriz
     * @return string com uma linha por linha da matriz
     */
    public static String toString(double[][] a) {
        StringBuilder sb = new StringBuilder();
        for (double[] row : a) {
            sb.append(Arrays.toString(row)).append('\n');
        }
        return sb.toString();
    }
}
