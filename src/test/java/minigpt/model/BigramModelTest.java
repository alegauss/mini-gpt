package minigpt.model;

import minigpt.data.CharTokenizer;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Testa o bigrama por contagem: probabilidades, suavizacao e loss. */
class BigramModelTest {

    @Test
    void probabilidadesSomamUm() {
        CharTokenizer tok = CharTokenizer.fromText("abcabcabc");
        BigramModel m = new BigramModel(tok.vocabSize(), 1.0);
        m.fit(tok.encode("abcabcabc"));
        double[] p = m.nextProbabilities(new int[] { tok.charToId('a') });
        double sum = 0.0;
        for (double v : p) {
            assertTrue(v > 0.0, "suavizacao garante probabilidade estritamente positiva");
            sum += v;
        }
        assertEquals(1.0, sum, 1e-12);
    }

    @Test
    void aprendeParDominante() {
        // No corpus "ababab", depois de 'a' vem quase sempre 'b'.
        CharTokenizer tok = CharTokenizer.fromText("ababababab");
        BigramModel m = new BigramModel(tok.vocabSize(), 1.0);
        m.fit(tok.encode("ababababab"));
        double[] p = m.nextProbabilities(new int[] { tok.charToId('a') });
        assertTrue(p[tok.charToId('b')] > p[tok.charToId('a')],
                "'b' deve ser mais provavel que 'a' depois de 'a'");
    }

    @Test
    void lossFinitaMesmoComParNuncaVisto() {
        // Suavizacao de Laplace impede probabilidade zero -> loss finita.
        CharTokenizer tok = CharTokenizer.fromText("abcd");
        BigramModel m = new BigramModel(tok.vocabSize(), 1.0);
        m.fit(tok.encode("aaaa")); // so viu o par (a,a)
        double loss = m.evaluateLoss(tok.encode("abcd"));
        assertTrue(Double.isFinite(loss) && loss > 0.0);
    }

    @Test
    void lossMenorQueUniforme() {
        // Um bigrama treinado deve prever melhor que o chute uniforme,
        // cuja entropia cruzada e ln(V).
        String texto = "o rato roeu a roupa do rei de roma o rato roeu a roupa";
        CharTokenizer tok = CharTokenizer.fromText(texto);
        BigramModel m = new BigramModel(tok.vocabSize(), 1.0);
        int[] ids = tok.encode(texto);
        m.fit(ids);
        double loss = m.evaluateLoss(ids);
        double uniforme = Math.log(tok.vocabSize());
        assertTrue(loss < uniforme,
                "loss do bigrama (" + loss + ") deve ser menor que ln(V)=" + uniforme);
    }
}
