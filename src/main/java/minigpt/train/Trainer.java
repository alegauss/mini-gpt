package minigpt.train;

import minigpt.data.CharTokenizer;
import minigpt.data.Dataset;
import minigpt.generate.Sampler;
import minigpt.model.TrainableModel;

import java.util.Random;

/**
 * Laco de treino por descida de gradiente estocastica, comum ao MLP
 * (ETAPA 2) e ao Transformer (ETAPA 3).
 *
 * <h2>O que um passo de treino faz</h2>
 * <ol>
 *   <li>Amostra um mini-batch de janelas de contexto do conjunto de treino.</li>
 *   <li>Zera os gradientes e roda o forward+backward do modelo, obtendo a
 *       perda e preenchendo {@code param.grad}.</li>
 *   <li>Pede ao {@link AdamOptimizer} um passo, que ajusta os parametros na
 *       direcao que reduz a perda.</li>
 * </ol>
 * Periodicamente medimos a perda de <b>validacao</b> (em dados nao usados
 * no ajuste) para detectar overfitting, e a cada 500 passos geramos uma
 * amostra de texto — assim o aluno ve a saida evoluir de ruido para
 * fragmentos com cara de portugues.
 *
 * <h2>Por que mini-batches</h2>
 * Estimar o gradiente em todo o corpus a cada passo seria caro. Um lote
 * aleatorio de {@code B} exemplos da uma estimativa ruidosa, porem barata,
 * do gradiente medio — e o ruido ate ajuda a escapar de minimos ruins.
 */
public final class Trainer {

    /**
     * Hiperparametros do treino.
     *
     * @param maxSteps       numero de passos de gradiente
     * @param batchSize      exemplos por passo (B)
     * @param learningRate   taxa de aprendizado do Adam
     * @param weightDecay    regularizacao L2 desacoplada (0 desliga)
     * @param evalInterval   de quantos em quantos passos medir a validacao
     * @param sampleInterval de quantos em quantos passos gerar uma amostra
     * @param sampleLength   tamanho da amostra gerada (caracteres)
     * @param sampleTemp     temperatura da amostragem durante o treino
     * @param valBatches     quantos batches de validacao usar por medida
     * @param seed           semente para batches e amostragem
     * @param verbose        imprime progresso e amostras durante o treino
     */
    public record Config(
            int maxSteps,
            int batchSize,
            double learningRate,
            double weightDecay,
            int evalInterval,
            int sampleInterval,
            int sampleLength,
            double sampleTemp,
            int valBatches,
            long seed,
            boolean verbose) {

        /** Configuracao padrao razoavel para CPU comum. */
        public static Config defaults() {
            return new Config(3000, 32, 1e-3, 1e-4,
                    100, 500, 100, 1.0, 20, 1234L, true);
        }

        /** Copia esta configuracao trocando o numero de passos. */
        public Config withSteps(int steps) {
            return new Config(steps, batchSize, learningRate, weightDecay, evalInterval,
                    sampleInterval, sampleLength, sampleTemp, valBatches, seed, verbose);
        }

        /** Copia esta configuracao trocando o modo verboso. */
        public Config withVerbose(boolean v) {
            return new Config(maxSteps, batchSize, learningRate, weightDecay, evalInterval,
                    sampleInterval, sampleLength, sampleTemp, valBatches, seed, v);
        }
    }

    private final TrainableModel model;
    private final Dataset dataset;
    private final CharTokenizer tokenizer;
    private final Config cfg;

    /**
     * @param model     modelo treinavel
     * @param dataset   fonte de mini-batches (ja dividido treino/validacao)
     * @param tokenizer para gerar amostras legiveis durante o treino
     * @param cfg       hiperparametros
     */
    public Trainer(TrainableModel model, Dataset dataset, CharTokenizer tokenizer, Config cfg) {
        this.model = model;
        this.dataset = dataset;
        this.tokenizer = tokenizer;
        this.cfg = cfg;
    }

    /**
     * Executa o treino, imprimindo progresso, e devolve o modelo treinado.
     *
     * @return o mesmo modelo, com parametros ajustados
     */
    public TrainableModel train() {
        AdamOptimizer opt = new AdamOptimizer(model.parameters(), cfg.learningRate(),
                0.9, 0.999, 1e-8, cfg.weightDecay());
        Random batchRng = new Random(cfg.seed());
        Random sampleRng = new Random(cfg.seed() + 1);

        long t0 = System.nanoTime();
        if (cfg.verbose()) {
            System.out.printf("%-7s %-12s %-12s %-8s%n", "passo", "loss_treino", "loss_val", "tempo");
        }

        for (int step = 1; step <= cfg.maxSteps(); step++) {
            Dataset.Batch batch = dataset.nextBatch(cfg.batchSize(), true, batchRng);
            opt.zeroGrad();
            double trainLoss = model.forwardBackward(batch.x(), batch.y());
            opt.step();

            boolean report = step == 1 || step == cfg.maxSteps()
                    || step % cfg.evalInterval() == 0;
            if (cfg.verbose() && report) {
                double valLoss = estimateLoss(model, dataset, false,
                        cfg.valBatches(), cfg.batchSize(), batchRng);
                double secs = (System.nanoTime() - t0) / 1e9;
                System.out.printf("%-7d %-12.4f %-12.4f %-7.2fs%n",
                        step, trainLoss, valLoss, secs);
            }

            if (cfg.verbose() && step % cfg.sampleInterval() == 0) {
                Sampler sampler = new Sampler(model, tokenizer, sampleRng);
                String sample = sampler.generate("", cfg.sampleLength(), cfg.sampleTemp(), 0);
                System.out.println("  --- amostra (" + cfg.sampleLength()
                        + " caracteres) ---");
                System.out.println("  " + sample.replace("\n", "\n  "));
            }
        }
        return model;
    }

    /**
     * Estima a perda media sobre {@code batches} mini-batches amostrados da
     * particao indicada (treino ou validacao), sem calcular gradientes.
     *
     * @param model      modelo a avaliar
     * @param dataset    fonte de dados
     * @param train      {@code true} para treino, {@code false} para validacao
     * @param batches    quantos mini-batches promediar
     * @param batchSize  tamanho de cada mini-batch
     * @param rng        fonte de aleatoriedade
     * @return perda media (nats por caractere)
     */
    public static double estimateLoss(TrainableModel model, Dataset dataset, boolean train,
                                      int batches, int batchSize, Random rng) {
        double sum = 0.0;
        for (int i = 0; i < batches; i++) {
            Dataset.Batch b = dataset.nextBatch(batchSize, train, rng);
            sum += model.forwardLossOnly(b.x(), b.y());
        }
        return sum / batches;
    }
}
