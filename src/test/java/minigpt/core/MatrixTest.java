package minigpt.core;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Testa as operacoes de algebra linear feitas a mao. */
class MatrixTest {

    @Test
    void matmulProdutoConhecido() {
        // [[1,2],[3,4]] · [[5,6],[7,8]] = [[19,22],[43,50]]
        double[][] a = { {1, 2}, {3, 4} };
        double[][] b = { {5, 6}, {7, 8} };
        double[][] c = Matrix.matmul(a, b);
        assertArrayEquals(new double[] {19, 22}, c[0], 1e-12);
        assertArrayEquals(new double[] {43, 50}, c[1], 1e-12);
    }

    @Test
    void matmulDimensoesIncompativeisLanca() {
        double[][] a = { {1, 2, 3} };       // (1,3)
        double[][] b = { {1, 2}, {3, 4} };  // (2,2)
        assertThrows(IllegalArgumentException.class, () -> Matrix.matmul(a, b));
    }

    @Test
    void transpostaTrocaLinhasEColunas() {
        double[][] a = { {1, 2, 3}, {4, 5, 6} }; // (2,3)
        double[][] t = Matrix.transpose(a);      // (3,2)
        assertEquals(3, t.length);
        assertEquals(2, t[0].length);
        assertEquals(1, t[0][0]);
        assertEquals(4, t[0][1]);
        assertEquals(6, t[2][1]);
    }

    @Test
    void matvecProdutoInterno() {
        double[][] a = { {1, 0, 2}, {0, 3, 0} };
        double[] x = {4, 5, 6};
        double[] y = Matrix.matvec(a, x);
        // linha0: 1*4 + 0*5 + 2*6 = 16 ; linha1: 0*4 + 3*5 + 0*6 = 15
        assertArrayEquals(new double[] {16, 15}, y, 1e-12);
    }

    @Test
    void softmaxSomaUmENaoNegativo() {
        double[] z = {1.0, 2.0, 3.0, -1.0};
        double[] p = Matrix.softmax(z);
        double sum = 0.0;
        for (double v : p) {
            assertTrue(v >= 0.0, "probabilidade nao pode ser negativa");
            sum += v;
        }
        assertEquals(1.0, sum, 1e-12);
        // maior logit -> maior probabilidade
        assertTrue(p[2] > p[1] && p[1] > p[0]);
    }

    @Test
    void softmaxEstavelComScoresGrandes() {
        // Sem o deslocamento pelo maximo, e^1000 estouraria para Infinity.
        double[] z = {1000.0, 1000.0, 1000.0};
        double[] p = Matrix.softmax(z);
        assertArrayEquals(new double[] {1.0 / 3, 1.0 / 3, 1.0 / 3}, p, 1e-12);
    }

    @Test
    void softmaxInvarianteASomaDeConstante() {
        // softmax(z) == softmax(z + c) para qualquer constante c.
        double[] z = {0.5, -1.0, 2.0};
        double[] p1 = Matrix.softmax(z);
        double[] z2 = { z[0] + 10, z[1] + 10, z[2] + 10 };
        double[] p2 = Matrix.softmax(z2);
        assertArrayEquals(p1, p2, 1e-12);
    }
}
