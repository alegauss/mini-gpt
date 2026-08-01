package minigpt.train;

import minigpt.data.CharTokenizer;
import minigpt.data.Dataset;
import minigpt.model.MlpModel;
import minigpt.model.TransformerModel;
import org.junit.jupiter.api.Test;

import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Testes de integracao: verificam que o laco de treino ({@link Trainer} +
 * {@link AdamOptimizer}) de fato REDUZ a perda, tanto para o MLP (ETAPA 2)
 * quanto para o Transformer (ETAPA 3). Usam um corpus sintetico e
 * repetitivo, facil de aprender, e configuracoes pequenas para rodar rapido.
 */
class TrainingLearnsTest {

    /** Corpus previsivel: um padrao curto repetido muitas vezes. */
    private static Dataset syntheticDataset(CharTokenizer[] out, int blockSize) {
        StringBuilder sb = new StringBuilder();
        String pattern = "abcdefabcdef ";
        while (sb.length() < 4000) {
            sb.append(pattern);
        }
        CharTokenizer tok = CharTokenizer.fromText(sb.toString());
        out[0] = tok;
        return new Dataset(tok.encode(sb.toString()), blockSize, 0.9);
    }

    @Test
    void mlpReduzPerda() {
        int block = 4;
        CharTokenizer[] tok = new CharTokenizer[1];
        Dataset ds = syntheticDataset(tok, block);
        MlpModel model = new MlpModel(tok[0].vocabSize(), block, 8, 16, 1L);

        Random rng = new Random(0);
        double before = Trainer.estimateLoss(model, ds, true, 10, 16, rng);
        Trainer.Config cfg = new Trainer.Config(
                300, 16, 5e-3, 0.0, 1_000_000, 1_000_000, 50, 1.0, 5, 5L, false);
        new Trainer(model, ds, tok[0], cfg).train();
        double after = Trainer.estimateLoss(model, ds, true, 10, 16, rng);

        assertTrue(after < before - 0.3,
                "MLP: perda deveria cair (antes=" + before + ", depois=" + after + ")");
    }

    @Test
    void transformerReduzPerda() {
        int block = 8;
        CharTokenizer[] tok = new CharTokenizer[1];
        Dataset ds = syntheticDataset(tok, block);
        TransformerModel model = new TransformerModel(
                tok[0].vocabSize(), block, 16, 2, 1, 7L);

        Random rng = new Random(0);
        double before = Trainer.estimateLoss(model, ds, true, 5, 8, rng);
        Trainer.Config cfg = new Trainer.Config(
                120, 8, 3e-3, 0.0, 1_000_000, 1_000_000, 50, 1.0, 3, 5L, false);
        new Trainer(model, ds, tok[0], cfg).train();
        double after = Trainer.estimateLoss(model, ds, true, 5, 8, rng);

        assertTrue(after < before - 0.3,
                "Transformer: perda deveria cair (antes=" + before + ", depois=" + after + ")");
    }
}
