package minigpt.model;

import minigpt.core.Tensor;

import java.util.List;

/**
 * Modelo treinavel por gradiente: estende {@link LanguageModel} com o que
 * o {@link minigpt.train.Trainer} e o {@link minigpt.train.AdamOptimizer}
 * precisam.
 *
 * <p>Os dois niveis avancados implementam esta interface de formas
 * diferentes, mas com a MESMA assinatura:</p>
 * <ul>
 *   <li>{@link minigpt.model.MlpModel} (ETAPA 2) calcula os gradientes
 *       <b>a mao</b> (backprop manual) e os escreve nos tensores-folha.</li>
 *   <li>{@link minigpt.model.TransformerModel} (ETAPA 3) monta o grafo de
 *       autodiff e deixa {@link Tensor#backwardAll()} calcular tudo.</li>
 * </ul>
 * Em ambos, o resultado e o mesmo: gradientes em {@code param.grad}, prontos
 * para o otimizador.
 */
public interface TrainableModel extends LanguageModel {

    /**
     * Lista dos parametros treinaveis (tensores-folha). O otimizador itera
     * sobre ela para atualizar {@code data} a partir de {@code grad}.
     *
     * @return parametros do modelo
     */
    List<Tensor> parameters();

    /**
     * Passo de treino sobre um mini-batch: calcula a perda media e
     * <b>preenche os gradientes</b> dos parametros.
     *
     * <p>Assume que os gradientes ja foram zerados. Cada linha de {@code x}
     * e uma janela de contexto de tamanho {@code T}; {@code y} contem, na
     * mesma posicao, o caractere-alvo seguinte.</p>
     *
     * @param x contexto, forma {@code (B, T)}
     * @param y alvos, forma {@code (B, T)}
     * @return perda media (entropia cruzada em nats) do batch
     */
    double forwardBackward(int[][] x, int[][] y);

    /**
     * Igual a {@link #forwardBackward} mas <b>sem</b> calcular gradientes:
     * so o forward, para medir a perda de validacao.
     *
     * @param x contexto, forma {@code (B, T)}
     * @param y alvos, forma {@code (B, T)}
     * @return perda media do batch
     */
    double forwardLossOnly(int[][] x, int[][] y);
}
