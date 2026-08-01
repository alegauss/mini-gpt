package minigpt.data;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** Testa a bijecao caractere &lt;-&gt; id e o salvar/carregar do vocabulario. */
class CharTokenizerTest {

    @Test
    void decodeEncodeEIdentidade() {
        String texto = "olho a lua no ceu\nazul";
        CharTokenizer tok = CharTokenizer.fromText(texto);
        int[] ids = tok.encode(texto);
        assertEquals(texto, tok.decode(ids));
    }

    @Test
    void vocabularioOrdenadoEDeterminista() {
        // "abc" e "cba" produzem o mesmo mapeamento (ordenacao por code point).
        CharTokenizer t1 = CharTokenizer.fromText("abc");
        CharTokenizer t2 = CharTokenizer.fromText("cba");
        assertEquals(t1.charToId('a'), t2.charToId('a'));
        assertEquals(t1.charToId('b'), t2.charToId('b'));
        assertEquals(t1.charToId('c'), t2.charToId('c'));
        assertEquals(0, t1.charToId('a'));
        assertEquals(2, t1.charToId('c'));
    }

    @Test
    void vocabSizeContaCaracteresDistintos() {
        CharTokenizer tok = CharTokenizer.fromText("aaabbbccc");
        assertEquals(3, tok.vocabSize());
    }

    @Test
    void caractereDesconhecidoLanca() {
        CharTokenizer tok = CharTokenizer.fromText("abc");
        assertThrows(IllegalArgumentException.class, () -> tok.encode("z"));
    }

    @Test
    void corpusVazioLanca() {
        assertThrows(IllegalArgumentException.class, () -> CharTokenizer.fromText(""));
    }

    @Test
    void salvaECarregaPreservaMapeamento(@TempDir Path dir) {
        String texto = "linha um\nlinha\tdois\\ tres";
        CharTokenizer original = CharTokenizer.fromText(texto);
        Path vocab = dir.resolve("vocab.txt");
        original.save(vocab);

        CharTokenizer carregado = CharTokenizer.load(vocab);
        assertEquals(original.vocabSize(), carregado.vocabSize());
        // Os ids devem ser identicos para todo o texto.
        assertArrayEquals(original.encode(texto), carregado.encode(texto));
        assertEquals(texto, carregado.decode(carregado.encode(texto)));
    }
}
