package minigpt.core;

import java.util.ArrayList;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Set;

/**
 * No de um grafo de computacao com <b>diferenciacao automatica em modo
 * reverso</b> (reverse-mode autodiff, o "backprop" generico).
 *
 * <h2>Ideia</h2>
 * Cada {@code Tensor} guarda um <b>valor</b> ({@link #data}, uma matriz
 * {@code double[][]}) e um <b>gradiente</b> ({@link #grad}, mesma forma).
 * As operacoes ({@code matmul}, {@code tanh}, ...) constroem novos tensores
 * e registram, em cada um, uma pequena funcao {@link #backward} que sabe
 * como propagar o gradiente da saida para as entradas usando a
 * <b>regra da cadeia</b>:
 * <pre>
 *   se  L depende de out  e  out = f(a, b),  entao
 *   ∂L/∂a += (∂out/∂a)ᵀ · (∂L/∂out)
 * </pre>
 * Chamar {@link #backwardAll()} num tensor escalar (a "loss") faz uma
 * ordenacao topologica do grafo e executa as funcoes {@code backward} na
 * ordem inversa, preenchendo {@code grad} de todos os nos — inclusive dos
 * parametros treinaveis (as folhas do grafo).
 *
 * <h2>Duplo papel</h2>
 * O mesmo tipo serve para duas coisas no projeto:
 * <ul>
 *   <li><b>Caixa de valor+gradiente</b>: o MLP (ETAPA 2) cria tensores-folha
 *       como parametros e preenche {@code grad} <i>a mao</i>, sem usar o
 *       grafo. O {@link minigpt.train.AdamOptimizer} atualiza esses tensores.</li>
 *   <li><b>No de autodiff</b>: o Transformer (ETAPA 3) monta o grafo com as
 *       operacoes abaixo e deixa {@link #backwardAll()} calcular os
 *       gradientes automaticamente. O <i>mesmo</i> otimizador atualiza os
 *       mesmos tensores.</li>
 * </ul>
 *
 * <p>Para simplicidade didatica, todo tensor e uma matriz 2D. Vetores sao
 * matrizes {@code (1, n)}; escalares sao {@code (1, 1)}.</p>
 */
public final class Tensor {

    /** Valor do no, forma {@code (rows, cols)}. */
    public double[][] data;

    /** Gradiente acumulado {@code ∂L/∂data}, mesma forma de {@link #data}. */
    public double[][] grad;

    /** Rotulo opcional, util para depuracao. */
    public String label = "";

    /** Pais no grafo (entradas da operacao que criou este no). */
    private final List<Tensor> parents = new ArrayList<>();

    /** Propagacao local do gradiente para os pais. Folhas usam no-op. */
    private Runnable backward = () -> { };

    /**
     * Cria um tensor-folha a partir de um valor. O gradiente comeca zerado.
     *
     * @param data valor inicial (a referencia e usada diretamente)
     */
    public Tensor(double[][] data) {
        this.data = data;
        this.grad = new double[data.length][data[0].length];
    }

    /** @return numero de linhas. */
    public int rows() {
        return data.length;
    }

    /** @return numero de colunas. */
    public int cols() {
        return data[0].length;
    }

    /** Zera o gradiente (usar antes de cada passo de treino nas folhas). */
    public void zeroGrad() {
        for (double[] row : grad) {
            java.util.Arrays.fill(row, 0.0);
        }
    }

    // ==================================================================
    // Orquestracao do backward
    // ==================================================================

    /**
     * Executa o backprop a partir deste no (que deve ser escalar, forma
     * {@code (1,1)}, tipicamente a loss).
     *
     * <p>Constroi a ordem topologica do grafo, semeia {@code grad = 1} na
     * saida (pois {@code ∂L/∂L = 1}) e roda as funcoes locais em ordem
     * inversa, acumulando gradientes nas entradas.</p>
     */
    public void backwardAll() {
        List<Tensor> topo = new ArrayList<>();
        Set<Tensor> visited = Collections.newSetFromMap(new IdentityHashMap<>());
        buildTopo(this, topo, visited);
        this.grad[0][0] = 1.0;
        Collections.reverse(topo);
        for (Tensor t : topo) {
            t.backward.run();
        }
    }

    private static void buildTopo(Tensor node, List<Tensor> topo, Set<Tensor> visited) {
        if (visited.contains(node)) {
            return;
        }
        visited.add(node);
        for (Tensor p : node.parents) {
            buildTopo(p, topo, visited);
        }
        topo.add(node);
    }

    // ==================================================================
    // Fabricas de operacoes (cada uma registra seu backward local)
    // ==================================================================

    private static double[][] zerosLike(double[][] a) {
        return new double[a.length][a[0].length];
    }

    /**
     * Produto matricial {@code C = A · B}.
     *
     * <p>Backward (regra da cadeia para matmul):
     * {@code dA += dC · Bᵀ} e {@code dB += Aᵀ · dC}.</p>
     *
     * @param a tensor {@code (m,k)}
     * @param b tensor {@code (k,n)}
     * @return {@code (m,n)}
     */
    public static Tensor matmul(Tensor a, Tensor b) {
        int m = a.rows(), k = a.cols(), n = b.cols();
        // Para matrizes grandes, distribuimos as linhas entre os nucleos da
        // CPU. Cada thread escreve linhas distintas do resultado, entao nao
        // ha condicao de corrida. Matrizes pequenas rodam sequencialmente
        // (o custo de paralelizar nao compensa).
        boolean par = (long) m * n * k >= PAR_THRESHOLD;
        double[][] out = new double[m][n];
        parFor(m, par, i -> {
            double[] arow = a.data[i];
            double[] orow = out[i];
            for (int p = 0; p < k; p++) {
                double aip = arow[p];
                double[] brow = b.data[p];
                for (int j = 0; j < n; j++) {
                    orow[j] += aip * brow[j];
                }
            }
        });
        Tensor c = new Tensor(out);
        c.parents.add(a);
        c.parents.add(b);
        c.backward = () -> {
            // dA[i][p] += Σ_j dC[i][j] · B[p][j]   (paraleliza sobre as linhas i)
            parFor(m, par, i -> {
                double[] cg = c.grad[i];
                double[] ag = a.grad[i];
                for (int p = 0; p < k; p++) {
                    double s = 0.0;
                    double[] brow = b.data[p];
                    for (int j = 0; j < n; j++) {
                        s += cg[j] * brow[j];
                    }
                    ag[p] += s;
                }
            });
            // dB[p][j] += Σ_i A[i][p] · dC[i][j]   (paraleliza sobre as linhas p)
            parFor(k, par, p -> {
                double[] bg = b.grad[p];
                for (int j = 0; j < n; j++) {
                    double s = 0.0;
                    for (int i = 0; i < m; i++) {
                        s += a.data[i][p] * c.grad[i][j];
                    }
                    bg[j] += s;
                }
            });
        };
        return c;
    }

    /** Acima deste numero de multiplicacoes, {@link #matmul} usa varias threads. */
    private static final long PAR_THRESHOLD = 1L << 18;

    /**
     * Laco {@code for i in [0,n)} que roda em paralelo (varias threads)
     * quando {@code parallel} e verdadeiro, ou sequencial caso contrario.
     */
    private static void parFor(int n, boolean parallel, java.util.function.IntConsumer body) {
        if (parallel && n > 1) {
            java.util.stream.IntStream.range(0, n).parallel().forEach(body);
        } else {
            for (int i = 0; i < n; i++) {
                body.accept(i);
            }
        }
    }

    /**
     * Soma elemento a elemento {@code A + B} (mesma forma).
     *
     * <p>Backward: {@code dA += dOut}, {@code dB += dOut}.</p>
     *
     * @param a primeiro tensor
     * @param b segundo tensor, mesma forma
     * @return soma
     */
    public static Tensor add(Tensor a, Tensor b) {
        double[][] out = zerosLike(a.data);
        for (int i = 0; i < a.rows(); i++) {
            for (int j = 0; j < a.cols(); j++) {
                out[i][j] = a.data[i][j] + b.data[i][j];
            }
        }
        Tensor c = new Tensor(out);
        c.parents.add(a);
        c.parents.add(b);
        c.backward = () -> {
            for (int i = 0; i < a.rows(); i++) {
                for (int j = 0; j < a.cols(); j++) {
                    a.grad[i][j] += c.grad[i][j];
                    b.grad[i][j] += c.grad[i][j];
                }
            }
        };
        return c;
    }

    /**
     * Soma um vetor-linha de vies a cada linha: {@code out[i] = x[i] + bias}.
     *
     * <p>Usado nas camadas lineares. Backward: {@code dx += dOut} e
     * {@code dbias += Σ_i dOut[i]} (o vies afeta todas as linhas, entao seu
     * gradiente e a soma sobre as linhas).</p>
     *
     * @param x    tensor {@code (m,n)}
     * @param bias tensor {@code (1,n)}
     * @return {@code (m,n)}
     */
    public static Tensor addRowVector(Tensor x, Tensor bias) {
        int m = x.rows(), n = x.cols();
        double[][] out = new double[m][n];
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                out[i][j] = x.data[i][j] + bias.data[0][j];
            }
        }
        Tensor c = new Tensor(out);
        c.parents.add(x);
        c.parents.add(bias);
        c.backward = () -> {
            for (int i = 0; i < m; i++) {
                for (int j = 0; j < n; j++) {
                    x.grad[i][j] += c.grad[i][j];
                    bias.grad[0][j] += c.grad[i][j];
                }
            }
        };
        return c;
    }

    /**
     * Produto de Hadamard (elemento a elemento) {@code A ⊙ B}, mesma forma.
     *
     * <p>Backward (regra do produto): {@code dA += B ⊙ dOut} e
     * {@code dB += A ⊙ dOut}.</p>
     *
     * @param a primeiro tensor
     * @param b segundo tensor, mesma forma
     * @return produto elemento a elemento
     */
    public static Tensor mul(Tensor a, Tensor b) {
        double[][] out = zerosLike(a.data);
        for (int i = 0; i < a.rows(); i++) {
            for (int j = 0; j < a.cols(); j++) {
                out[i][j] = a.data[i][j] * b.data[i][j];
            }
        }
        Tensor c = new Tensor(out);
        c.parents.add(a);
        c.parents.add(b);
        c.backward = () -> {
            for (int i = 0; i < a.rows(); i++) {
                for (int j = 0; j < a.cols(); j++) {
                    a.grad[i][j] += b.data[i][j] * c.grad[i][j];
                    b.grad[i][j] += a.data[i][j] * c.grad[i][j];
                }
            }
        };
        return c;
    }

    /**
     * Multiplicacao por escalar constante {@code s · X}.
     *
     * <p>Backward: {@code dX += s · dOut}.</p>
     *
     * @param x tensor
     * @param s escalar constante
     * @return tensor escalado
     */
    public static Tensor scale(Tensor x, double s) {
        double[][] out = zerosLike(x.data);
        for (int i = 0; i < x.rows(); i++) {
            for (int j = 0; j < x.cols(); j++) {
                out[i][j] = x.data[i][j] * s;
            }
        }
        Tensor c = new Tensor(out);
        c.parents.add(x);
        c.backward = () -> {
            for (int i = 0; i < x.rows(); i++) {
                for (int j = 0; j < x.cols(); j++) {
                    x.grad[i][j] += s * c.grad[i][j];
                }
            }
        };
        return c;
    }

    /**
     * Nao linearidade {@code tanh} elemento a elemento.
     *
     * <p>Backward: como {@code d/dz tanh(z) = 1 - tanh(z)^2}, temos
     * {@code dX += (1 - out^2) · dOut}.</p>
     *
     * @param x tensor
     * @return {@code tanh(x)}
     */
    public static Tensor tanh(Tensor x) {
        double[][] out = zerosLike(x.data);
        for (int i = 0; i < x.rows(); i++) {
            for (int j = 0; j < x.cols(); j++) {
                out[i][j] = Math.tanh(x.data[i][j]);
            }
        }
        Tensor c = new Tensor(out);
        c.parents.add(x);
        c.backward = () -> {
            for (int i = 0; i < x.rows(); i++) {
                for (int j = 0; j < x.cols(); j++) {
                    double t = c.data[i][j];
                    x.grad[i][j] += (1.0 - t * t) * c.grad[i][j];
                }
            }
        };
        return c;
    }

    /**
     * Transposta {@code Xᵀ}. Backward: {@code dX += (dOut)ᵀ}.
     *
     * @param x tensor {@code (m,n)}
     * @return {@code (n,m)}
     */
    public static Tensor transpose(Tensor x) {
        int m = x.rows(), n = x.cols();
        double[][] out = new double[n][m];
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                out[j][i] = x.data[i][j];
            }
        }
        Tensor c = new Tensor(out);
        c.parents.add(x);
        c.backward = () -> {
            for (int i = 0; i < m; i++) {
                for (int j = 0; j < n; j++) {
                    x.grad[i][j] += c.grad[j][i];
                }
            }
        };
        return c;
    }

    /**
     * Seleciona linhas de uma tabela (operacao de <i>embedding lookup</i>).
     *
     * <p>{@code out[t] = table[idx[t]]}. Backward espalha (scatter-add) o
     * gradiente de volta para as linhas escolhidas:
     * {@code dtable[idx[t]] += dOut[t]}. Linhas nao usadas nao recebem
     * gradiente.</p>
     *
     * @param table tabela {@code (V, E)} (parametro treinavel)
     * @param idx   indices das linhas a coletar, tamanho {@code T}
     * @return {@code (T, E)}
     */
    public static Tensor rows(Tensor table, int[] idx) {
        int t = idx.length, e = table.cols();
        double[][] out = new double[t][e];
        for (int i = 0; i < t; i++) {
            System.arraycopy(table.data[idx[i]], 0, out[i], 0, e);
        }
        Tensor c = new Tensor(out);
        c.parents.add(table);
        c.backward = () -> {
            for (int i = 0; i < t; i++) {
                for (int j = 0; j < e; j++) {
                    table.grad[idx[i]][j] += c.grad[i][j];
                }
            }
        };
        return c;
    }

    /**
     * Recorta um bloco de colunas {@code [from, from+len)} (usado para
     * separar as cabecas de atencao).
     *
     * <p>Backward: {@code dX[i][from+j] += dOut[i][j]}.</p>
     *
     * @param x    tensor {@code (m, n)}
     * @param from coluna inicial (inclusiva)
     * @param len  numero de colunas
     * @return {@code (m, len)}
     */
    public static Tensor sliceCols(Tensor x, int from, int len) {
        int m = x.rows();
        double[][] out = new double[m][len];
        for (int i = 0; i < m; i++) {
            System.arraycopy(x.data[i], from, out[i], 0, len);
        }
        Tensor c = new Tensor(out);
        c.parents.add(x);
        c.backward = () -> {
            for (int i = 0; i < m; i++) {
                for (int j = 0; j < len; j++) {
                    x.grad[i][from + j] += c.grad[i][j];
                }
            }
        };
        return c;
    }

    /**
     * Recorta um bloco de linhas {@code [from, from+len)} (usado para
     * separar as sequencias dentro de um batch achatado).
     *
     * <p>Backward: {@code dX[from+i][j] += dOut[i][j]}.</p>
     *
     * @param x    tensor {@code (m, n)}
     * @param from linha inicial (inclusiva)
     * @param len  numero de linhas
     * @return {@code (len, n)}
     */
    public static Tensor sliceRows(Tensor x, int from, int len) {
        int n = x.cols();
        double[][] out = new double[len][n];
        for (int i = 0; i < len; i++) {
            System.arraycopy(x.data[from + i], 0, out[i], 0, n);
        }
        Tensor c = new Tensor(out);
        c.parents.add(x);
        c.backward = () -> {
            for (int i = 0; i < len; i++) {
                for (int j = 0; j < n; j++) {
                    x.grad[from + i][j] += c.grad[i][j];
                }
            }
        };
        return c;
    }

    /**
     * Empilha tensores ao longo das linhas (remonta o batch achatado).
     *
     * <p>Backward: envia cada faixa de linhas de volta a parte de origem.</p>
     *
     * @param parts tensores com o mesmo numero de colunas
     * @return tensor cuja altura e a soma das alturas
     */
    public static Tensor concatRows(List<Tensor> parts) {
        int n = parts.get(0).cols();
        int total = 0;
        for (Tensor p : parts) {
            total += p.rows();
        }
        double[][] out = new double[total][n];
        int[] offsets = new int[parts.size()];
        int offset = 0;
        for (int pi = 0; pi < parts.size(); pi++) {
            offsets[pi] = offset;
            Tensor p = parts.get(pi);
            for (int i = 0; i < p.rows(); i++) {
                System.arraycopy(p.data[i], 0, out[offset + i], 0, n);
            }
            offset += p.rows();
        }
        Tensor c = new Tensor(out);
        for (Tensor p : parts) {
            c.parents.add(p);
        }
        c.backward = () -> {
            for (int pi = 0; pi < parts.size(); pi++) {
                Tensor p = parts.get(pi);
                int off = offsets[pi];
                for (int i = 0; i < p.rows(); i++) {
                    for (int j = 0; j < n; j++) {
                        p.grad[i][j] += c.grad[off + i][j];
                    }
                }
            }
        };
        return c;
    }

    /**
     * Concatena tensores ao longo das colunas (une as cabecas de atencao).
     *
     * <p>Backward: divide o gradiente de volta para cada parte, no bloco de
     * colunas correspondente.</p>
     *
     * @param parts tensores com o mesmo numero de linhas
     * @return tensor cuja largura e a soma das larguras
     */
    public static Tensor concatCols(List<Tensor> parts) {
        int m = parts.get(0).rows();
        int total = 0;
        for (Tensor p : parts) {
            total += p.cols();
        }
        double[][] out = new double[m][total];
        int offset = 0;
        int[] offsets = new int[parts.size()];
        for (int pi = 0; pi < parts.size(); pi++) {
            offsets[pi] = offset;
            Tensor p = parts.get(pi);
            for (int i = 0; i < m; i++) {
                System.arraycopy(p.data[i], 0, out[i], offset, p.cols());
            }
            offset += p.cols();
        }
        Tensor c = new Tensor(out);
        for (Tensor p : parts) {
            c.parents.add(p);
        }
        c.backward = () -> {
            for (int pi = 0; pi < parts.size(); pi++) {
                Tensor p = parts.get(pi);
                int off = offsets[pi];
                for (int i = 0; i < m; i++) {
                    for (int j = 0; j < p.cols(); j++) {
                        p.grad[i][j] += c.grad[i][off + j];
                    }
                }
            }
        };
        return c;
    }

    /**
     * Mascara causal: zera (com {@code -∞} efetivo) as posicoes futuras
     * antes do softmax de atencao, para que a posicao {@code i} so possa
     * "olhar" para {@code j ≤ i}.
     *
     * <p>Para {@code j > i} colocamos uma constante muito negativa, cuja
     * exponencial no softmax vira ~0. Backward: o gradiente so flui nas
     * posicoes permitidas ({@code j ≤ i}); as mascaradas eram constantes.</p>
     *
     * @param scores matriz {@code (T, T)} de scores de atencao
     * @return scores com o triangulo superior mascarado
     */
    public static Tensor causalMask(Tensor scores) {
        int t = scores.rows();
        double[][] out = new double[t][t];
        final double neg = -1e30;
        for (int i = 0; i < t; i++) {
            for (int j = 0; j < t; j++) {
                out[i][j] = (j <= i) ? scores.data[i][j] : neg;
            }
        }
        Tensor c = new Tensor(out);
        c.parents.add(scores);
        c.backward = () -> {
            for (int i = 0; i < t; i++) {
                for (int j = 0; j <= i; j++) {
                    scores.grad[i][j] += c.grad[i][j];
                }
            }
        };
        return c;
    }

    /**
     * Softmax aplicado linha a linha.
     *
     * <p>Para cada linha, {@code p_j = e^{z_j} / Σ_k e^{z_k}} (com o
     * deslocamento pelo maximo para estabilidade). Backward usa a jacobiana
     * do softmax: {@code dz_j = p_j · (g_j - Σ_k p_k g_k)}, onde
     * {@code g = dOut} da linha.</p>
     *
     * @param x logits {@code (m, n)}
     * @return probabilidades {@code (m, n)}, cada linha somando 1
     */
    public static Tensor softmaxRows(Tensor x) {
        int m = x.rows(), n = x.cols();
        double[][] out = new double[m][n];
        for (int i = 0; i < m; i++) {
            double max = Double.NEGATIVE_INFINITY;
            for (int j = 0; j < n; j++) {
                if (x.data[i][j] > max) {
                    max = x.data[i][j];
                }
            }
            double sum = 0.0;
            for (int j = 0; j < n; j++) {
                out[i][j] = Math.exp(x.data[i][j] - max);
                sum += out[i][j];
            }
            for (int j = 0; j < n; j++) {
                out[i][j] /= sum;
            }
        }
        Tensor c = new Tensor(out);
        c.parents.add(x);
        c.backward = () -> {
            for (int i = 0; i < m; i++) {
                double dot = 0.0; // Σ_k p_k g_k
                for (int j = 0; j < n; j++) {
                    dot += c.data[i][j] * c.grad[i][j];
                }
                for (int j = 0; j < n; j++) {
                    x.grad[i][j] += c.data[i][j] * (c.grad[i][j] - dot);
                }
            }
        };
        return c;
    }

    /**
     * Normalizacao por camada (LayerNorm), aplicada em cada linha.
     *
     * <p>Para cada linha {@code x} de {@code N} features:
     * {@code μ = média(x)}, {@code σ² = média((x-μ)²)},
     * {@code x̂ = (x-μ)/√(σ²+ε)}, {@code y = γ ⊙ x̂ + β}. Isso mantem as
     * ativacoes com media 0 e variancia 1 antes de reescalar por parametros
     * aprendidos {@code γ, β} (forma {@code (1,N)}), estabilizando o treino.</p>
     *
     * <p>Backward: usa a formula classica da LayerNorm. Sendo
     * {@code dŷ = dy ⊙ γ}, para cada linha:
     * {@code dx = (1/√(σ²+ε)) · (dŷ - média(dŷ) - x̂·média(dŷ⊙x̂))};
     * {@code dγ += Σ_linhas dy⊙x̂}; {@code dβ += Σ_linhas dy}.</p>
     *
     * @param x     ativacoes {@code (T, N)}
     * @param gamma escala aprendida {@code (1, N)}
     * @param beta  deslocamento aprendido {@code (1, N)}
     * @param eps   constante de estabilidade (ex.: 1e-5)
     * @return {@code (T, N)} normalizado
     */
    public static Tensor layerNorm(Tensor x, Tensor gamma, Tensor beta, double eps) {
        int t = x.rows(), n = x.cols();
        double[][] out = new double[t][n];
        double[] mu = new double[t];
        double[] invStd = new double[t];
        double[][] xhat = new double[t][n];
        for (int i = 0; i < t; i++) {
            double mean = 0.0;
            for (int j = 0; j < n; j++) {
                mean += x.data[i][j];
            }
            mean /= n;
            double var = 0.0;
            for (int j = 0; j < n; j++) {
                double d = x.data[i][j] - mean;
                var += d * d;
            }
            var /= n;
            double is = 1.0 / Math.sqrt(var + eps);
            mu[i] = mean;
            invStd[i] = is;
            for (int j = 0; j < n; j++) {
                xhat[i][j] = (x.data[i][j] - mean) * is;
                out[i][j] = gamma.data[0][j] * xhat[i][j] + beta.data[0][j];
            }
        }
        Tensor c = new Tensor(out);
        c.parents.add(x);
        c.parents.add(gamma);
        c.parents.add(beta);
        c.backward = () -> {
            for (int i = 0; i < t; i++) {
                // dxhat = dy ⊙ γ ; e as medias necessarias
                double meanDxhat = 0.0;
                double meanDxhatXhat = 0.0;
                double[] dxhat = new double[n];
                for (int j = 0; j < n; j++) {
                    dxhat[j] = c.grad[i][j] * gamma.data[0][j];
                    meanDxhat += dxhat[j];
                    meanDxhatXhat += dxhat[j] * xhat[i][j];
                    // gradientes dos parametros (somados sobre as linhas)
                    gamma.grad[0][j] += c.grad[i][j] * xhat[i][j];
                    beta.grad[0][j] += c.grad[i][j];
                }
                meanDxhat /= n;
                meanDxhatXhat /= n;
                for (int j = 0; j < n; j++) {
                    x.grad[i][j] += invStd[i]
                            * (dxhat[j] - meanDxhat - xhat[i][j] * meanDxhatXhat);
                }
            }
        };
        return c;
    }

    /**
     * Soma de todos os elementos, reduzindo a um escalar {@code (1,1)}.
     *
     * <p>Backward: cada elemento contribui igualmente, entao
     * {@code dX[i][j] += dOut} (o mesmo escalar para todas as posicoes).
     * Util para montar perdas escalares e para verificacao de gradiente.</p>
     *
     * @param x tensor qualquer
     * @return escalar com a soma
     */
    public static Tensor sum(Tensor x) {
        double s = 0.0;
        for (int i = 0; i < x.rows(); i++) {
            for (int j = 0; j < x.cols(); j++) {
                s += x.data[i][j];
            }
        }
        Tensor c = new Tensor(new double[][] { { s } });
        c.parents.add(x);
        c.backward = () -> {
            double g = c.grad[0][0];
            for (int i = 0; i < x.rows(); i++) {
                for (int j = 0; j < x.cols(); j++) {
                    x.grad[i][j] += g;
                }
            }
        };
        return c;
    }

    /**
     * Entropia cruzada media a partir de <i>logits</i> por linha e alvos
     * inteiros — combina softmax e log-verossimilhanca num unico no
     * numericamente estavel.
     *
     * <p>Para cada linha {@code t}: {@code p = softmax(logits[t])} e a perda
     * e {@code -ln p[alvo_t]}. A saida e a media sobre as {@code T} linhas.
     * Backward (o gradiente classico e limpo): para a linha {@code t},
     * {@code dlogits[t] = (p - onehot(alvo_t)) / T}.</p>
     *
     * @param logits  scores nao normalizados {@code (T, V)}
     * @param targets id do caractere correto em cada linha, tamanho {@code T}
     * @return tensor escalar {@code (1,1)} com a perda media
     */
    public static Tensor crossEntropyRows(Tensor logits, int[] targets) {
        int t = logits.rows(), v = logits.cols();
        double[][] probs = new double[t][v];
        double loss = 0.0;
        for (int i = 0; i < t; i++) {
            double max = Double.NEGATIVE_INFINITY;
            for (int j = 0; j < v; j++) {
                if (logits.data[i][j] > max) {
                    max = logits.data[i][j];
                }
            }
            double sum = 0.0;
            for (int j = 0; j < v; j++) {
                probs[i][j] = Math.exp(logits.data[i][j] - max);
                sum += probs[i][j];
            }
            for (int j = 0; j < v; j++) {
                probs[i][j] /= sum;
            }
            loss += -Math.log(probs[i][targets[i]]);
        }
        loss /= t;
        Tensor c = new Tensor(new double[][] { { loss } });
        c.parents.add(logits);
        c.backward = () -> {
            double g = c.grad[0][0] / t;
            for (int i = 0; i < t; i++) {
                for (int j = 0; j < v; j++) {
                    double target = (j == targets[i]) ? 1.0 : 0.0;
                    logits.grad[i][j] += (probs[i][j] - target) * g;
                }
            }
        };
        return c;
    }
}
