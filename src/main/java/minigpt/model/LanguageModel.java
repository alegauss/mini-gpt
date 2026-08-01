package minigpt.model;

/**
 * Contrato comum aos tres niveis de modelo (bigrama, MLP, transformer).
 *
 * <h2>O que todo modelo de linguagem faz</h2>
 * Dado um contexto de caracteres ja vistos, o modelo produz uma
 * distribuicao de probabilidade sobre o proximo caractere:
 * <pre>
 *   p(x_t | x_{t-1}, x_{t-2}, ...) = nextProbabilities(context)
 * </pre>
 * O vetor devolvido tem tamanho {@code V} (o vocabulario), entradas nao
 * negativas e soma 1. A geracao de texto e apenas: amostrar um caractere
 * dessa distribuicao, anexa-lo ao contexto e repetir.
 *
 * <h2>Qualidade de um modelo: entropia cruzada</h2>
 * Medimos quao bom e o modelo pela <b>entropia cruzada media</b> (em nats)
 * entre a distribuicao prevista e o caractere real que ocorreu:
 * <pre>
 *   loss = -(1/N) · Σ_i ln p(x_i | contexto_i)
 * </pre>
 * Quanto menor a loss, mais probabilidade o modelo atribuia ao texto
 * verdadeiro. A perplexidade {@code e^{loss}} pode ser lida como "entre
 * quantos caracteres o modelo hesita, em media".
 */
public interface LanguageModel {

    /**
     * Nome curto do modelo, para logs e para o comando {@code compare}.
     *
     * @return identificador legivel (ex.: "bigram", "mlp", "transformer")
     */
    String name();

    /**
     * Tamanho do vocabulario {@code V}.
     *
     * @return numero de caracteres que o modelo distingue
     */
    int vocabSize();

    /**
     * Numero maximo de caracteres anteriores que o modelo usa como
     * contexto (1 para o bigrama; o "block size" para MLP e transformer).
     *
     * @return comprimento de contexto
     */
    int contextLength();

    /**
     * Distribuicao de probabilidade sobre o proximo caractere, dado o
     * contexto.
     *
     * <p>O {@code context} contem os ids ja gerados/observados; cada
     * modelo usa apenas o sufixo de que precisa (o bigrama, so o ultimo
     * caractere). O resultado tem tamanho {@code V} e soma 1.</p>
     *
     * @param context ids anteriores (pode ter qualquer tamanho, inclusive 0)
     * @return vetor de probabilidades, tamanho {@code V}
     */
    double[] nextProbabilities(int[] context);

    /**
     * Entropia cruzada media (nats por caractere) do modelo sobre uma
     * sequencia inteira de ids.
     *
     * <p>Para cada posicao {@code i >= 1}, usa o contexto disponivel para
     * prever {@code ids[i]} e acumula {@code -ln p(ids[i] | contexto)}.
     * Divide pelo numero de previsoes. Serve para reportar loss de treino
     * e de validacao de forma comparavel entre os tres modelos.</p>
     *
     * @param ids sequencia de caracteres tokenizados
     * @return loss media em nats
     */
    double evaluateLoss(int[] ids);
}
