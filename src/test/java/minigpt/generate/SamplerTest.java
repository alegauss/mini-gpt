package minigpt.generate;

import minigpt.data.CharTokenizer;
import minigpt.model.BigramModel;
import org.junit.jupiter.api.Test;

import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Testa a geracao: tamanho, prefixo do prompt, temperatura baixa e top-k. */
class SamplerTest {

    private static Sampler samplerParaCorpus(String texto, long seed) {
        CharTokenizer tok = CharTokenizer.fromText(texto);
        BigramModel m = new BigramModel(tok.vocabSize(), 1.0);
        m.fit(tok.encode(texto));
        return new Sampler(m, tok, new Random(seed));
    }

    @Test
    void gerarRespeitaComprimentoEPrompt() {
        Sampler s = samplerParaCorpus("abcabcabcabc", 1L);
        String out = s.generate("ab", 10, 1.0, 0);
        assertTrue(out.startsWith("ab"), "saida deve comecar com o prompt");
        assertEquals(2 + 10, out.length(), "prompt (2) + 10 novos caracteres");
    }

    @Test
    void saidaContemApenasCaracteresDoVocabulario() {
        String texto = "o gato subiu no telhado";
        Sampler s = samplerParaCorpus(texto, 7L);
        String out = s.generate("", 50, 1.0, 0);
        for (int i = 0; i < out.length(); i++) {
            assertTrue(texto.indexOf(out.charAt(i)) >= 0,
                    "caractere gerado '" + out.charAt(i) + "' deve existir no corpus");
        }
    }

    @Test
    void temperaturaBaixaEDeterministicaEmParFerreo() {
        // Corpus onde 'a' e sempre seguido de 'b'; com temperatura minima e
        // top-k=1 a geracao vira praticamente argmax: apos 'a' sai 'b'.
        Sampler s = samplerParaCorpus("abababababababab", 3L);
        String out = s.generate("a", 5, 0.01, 1);
        // Depois de 'a', o mais provavel e 'b'; depois de 'b', o mais provavel
        // e 'a'. Espera-se alternancia "ababa...".
        assertTrue(out.startsWith("ab"), "esperava alternancia comecando por 'ab', veio: " + out);
    }

    @Test
    void reprodutivelComMesmaSeed() {
        String texto = "o rato roeu a roupa do rei";
        String a = samplerParaCorpus(texto, 99L).generate("o", 30, 1.0, 0);
        String b = samplerParaCorpus(texto, 99L).generate("o", 30, 1.0, 0);
        assertEquals(a, b, "mesma seed deve produzir a mesma saida");
    }
}
