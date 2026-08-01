package minigpt.data;

import org.junit.jupiter.api.Test;

import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Testa janelas de contexto, split e mini-batches. */
class DatasetTest {

    private static int[] range(int n) {
        int[] a = new int[n];
        for (int i = 0; i < n; i++) {
            a[i] = i % 7; // valores pequenos, repetidos
        }
        return a;
    }

    @Test
    void splitSomaAoTamanhoTotal() {
        int[] data = range(100);
        Dataset ds = new Dataset(data, 8, 0.9);
        assertEquals(100, ds.trainSize() + ds.valSize());
        assertTrue(ds.trainSize() > 0);
        assertTrue(ds.valSize() > 0);
    }

    @Test
    void batchTemFormaCorretaEAlvoDeslocado() {
        int[] data = range(200);
        int block = 8;
        Dataset ds = new Dataset(data, block, 0.9);
        Random rng = new Random(42);
        Dataset.Batch batch = ds.nextBatch(4, true, rng);

        assertEquals(4, batch.x().length);
        assertEquals(block, batch.x()[0].length);
        assertEquals(4, batch.y().length);
        assertEquals(block, batch.y()[0].length);

        // y[b][t] deve ser o caractere seguinte a x[b][t]: como o corpus de
        // treino aqui e i%7, o proximo de v e (v+1)%7... exceto onde o corte
        // do split quebra a sequencia. Verificamos a relacao dentro do bloco:
        // x[b][t+1] == y[b][t] por construcao das janelas.
        for (int b = 0; b < 4; b++) {
            for (int t = 0; t < block - 1; t++) {
                assertEquals(batch.x()[b][t + 1], batch.y()[b][t],
                        "y[t] deve coincidir com x[t+1] dentro da janela");
            }
        }
    }

    @Test
    void corpusCurtoLanca() {
        assertThrows(IllegalArgumentException.class, () -> new Dataset(range(5), 8, 0.9));
    }

    @Test
    void blockSizeInvalidoLanca() {
        assertThrows(IllegalArgumentException.class, () -> new Dataset(range(100), 0, 0.9));
    }

    @Test
    void trainFractionInvalidaLanca() {
        assertThrows(IllegalArgumentException.class, () -> new Dataset(range(100), 8, 1.5));
    }
}
