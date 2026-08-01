package minigpt.data;

import java.util.Random;

/**
 * Fornece janelas de contexto e mini-batches para o treino.
 *
 * <h2>Janelas de contexto (context windows)</h2>
 * Um modelo de linguagem aprende a prever o proximo caractere dado os
 * anteriores. Fixando um comprimento de contexto {@code T} (o "block
 * size"), transformamos um corpus linear de ids
 * {@code d[0], d[1], ...} numa colecao de pares (entrada, alvo):
 * <pre>
 *   x = d[i .. i+T-1]      (T caracteres de contexto)
 *   y = d[i+1 .. i+T]      (os mesmos deslocados de 1: o "proximo char")
 * </pre>
 * Ou seja, para cada posicao {@code t} da janela, o modelo ve
 * {@code x[t]} e deve prever {@code y[t] = x[t+1]}. Um unico bloco de
 * tamanho {@code T} contem, portanto, {@code T} exemplos de previsao
 * encadeados.
 *
 * <h2>Split treino/validacao</h2>
 * Reservamos os primeiros {@code trainFraction} do corpus para treino e o
 * restante para validacao. Como o texto e sequencial, cortamos por
 * posicao (nao embaralhamos caracteres): assim a validacao mede
 * generalizacao para um trecho que o modelo nunca viu.
 *
 * <h2>Mini-batches</h2>
 * Em vez de um exemplo por vez, amostramos {@code B} posicoes iniciais
 * aleatorias e empilhamos os blocos numa matriz {@code (B, T)}. A media
 * do gradiente sobre o lote reduz o ruido da estimativa e acelera o
 * treino.
 */
public final class Dataset {

    private final int[] trainIds;
    private final int[] valIds;
    private final int blockSize;

    /**
     * Cria um dataset dividindo o corpus em treino e validacao.
     *
     * @param data          corpus inteiro ja tokenizado (ids)
     * @param blockSize     comprimento de contexto {@code T}
     * @param trainFraction fracao do corpus usada para treino (ex.: 0.9)
     * @throws IllegalArgumentException se os parametros forem invalidos ou
     *         o corpus for curto demais para formar um bloco
     */
    public Dataset(int[] data, int blockSize, double trainFraction) {
        if (blockSize < 1) {
            throw new IllegalArgumentException("blockSize deve ser >= 1");
        }
        if (trainFraction <= 0.0 || trainFraction >= 1.0) {
            throw new IllegalArgumentException("trainFraction deve estar em (0, 1)");
        }
        if (data.length < blockSize + 2) {
            throw new IllegalArgumentException(
                    "Corpus curto demais: precisa de pelo menos blockSize+2 = "
                    + (blockSize + 2) + " tokens, mas tem " + data.length);
        }
        this.blockSize = blockSize;
        int split = (int) (data.length * trainFraction);
        // Garante que cada particao consiga formar ao menos um bloco (x,y).
        split = Math.max(blockSize + 1, Math.min(split, data.length - (blockSize + 1)));
        this.trainIds = new int[split];
        this.valIds = new int[data.length - split];
        System.arraycopy(data, 0, trainIds, 0, split);
        System.arraycopy(data, split, valIds, 0, valIds.length);
    }

    /**
     * Comprimento de contexto {@code T}.
     *
     * @return block size
     */
    public int blockSize() {
        return blockSize;
    }

    /**
     * Numero de tokens na particao de treino.
     *
     * @return tamanho do split de treino
     */
    public int trainSize() {
        return trainIds.length;
    }

    /**
     * Numero de tokens na particao de validacao.
     *
     * @return tamanho do split de validacao
     */
    public int valSize() {
        return valIds.length;
    }

    /**
     * Um mini-batch: entradas {@code x} e alvos {@code y}, ambos
     * {@code (B, T)}. Para cada linha {@code b} e coluna {@code t},
     * {@code y[b][t]} e o caractere que segue {@code x[b][t]}.
     *
     * @param x entradas, forma {@code (B, T)}
     * @param y alvos, forma {@code (B, T)}
     */
    public record Batch(int[][] x, int[][] y) {
    }

    /**
     * Amostra um mini-batch de tamanho {@code batchSize} da particao
     * indicada.
     *
     * <p>Para cada exemplo escolhemos uma posicao inicial {@code i}
     * uniformemente em {@code [0, N - T - 1]} e extraimos
     * {@code x = ids[i .. i+T-1]}, {@code y = ids[i+1 .. i+T]}.</p>
     *
     * @param batchSize numero de exemplos {@code B}
     * @param train     {@code true} para amostrar do treino, {@code false}
     *                  para validacao
     * @param rng       fonte de aleatoriedade (para reprodutibilidade)
     * @return mini-batch {@code (x, y)} de forma {@code (B, T)}
     */
    public Batch nextBatch(int batchSize, boolean train, Random rng) {
        int[] ids = train ? trainIds : valIds;
        int maxStart = ids.length - blockSize - 1; // ultima posicao inicial valida
        int[][] x = new int[batchSize][blockSize];
        int[][] y = new int[batchSize][blockSize];
        for (int b = 0; b < batchSize; b++) {
            int start = rng.nextInt(maxStart + 1);
            for (int t = 0; t < blockSize; t++) {
                x[b][t] = ids[start + t];
                y[b][t] = ids[start + t + 1];
            }
        }
        return new Batch(x, y);
    }

    /**
     * Acesso somente-leitura aos ids de treino (usado, por exemplo, pelo
     * bigrama para contar pares em todo o corpus de treino).
     *
     * @return referencia interna ao array de treino (nao modificar)
     */
    public int[] trainIds() {
        return trainIds;
    }

    /**
     * Acesso somente-leitura aos ids de validacao.
     *
     * @return referencia interna ao array de validacao (nao modificar)
     */
    public int[] valIds() {
        return valIds;
    }
}
