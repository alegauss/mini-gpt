package minigpt.data;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;

/**
 * Tokenizador em nivel de caractere: converte texto em sequencias de
 * inteiros e vice-versa.
 *
 * <h2>Ideia matematica</h2>
 * Um modelo de linguagem nao opera sobre letras, e sim sobre numeros.
 * O tokenizador define uma bijecao entre um conjunto finito de caracteres
 * (o "vocabulario" {@code V}) e os inteiros {@code 0, 1, ..., V-1}:
 * <pre>
 *   stoi: caractere -&gt; id      (string to integer)
 *   itos: id -&gt; caractere      (integer to string)
 * </pre>
 * Cada id sera depois usado como indice de linha em matrizes de
 * embedding e como classe-alvo na entropia cruzada. Como e uma bijecao,
 * {@code decode(encode(t)) == t} para todo texto {@code t} formado apenas
 * por caracteres conhecidos.
 *
 * <p>O vocabulario e construido de forma <b>determinista</b>: os
 * caracteres distintos do corpus sao ordenados (ordem de code point
 * Unicode) e recebem ids crescentes. Isso garante que o mesmo corpus
 * gere sempre o mesmo mapeamento, essencial para salvar/carregar modelos.</p>
 */
public final class CharTokenizer {

    /** Mapa caractere -&gt; id. */
    private final Map<Character, Integer> stoi;

    /** Mapa id -&gt; caractere (o indice do array e o id). */
    private final char[] itos;

    private CharTokenizer(Map<Character, Integer> stoi, char[] itos) {
        this.stoi = stoi;
        this.itos = itos;
    }

    /**
     * Constroi um tokenizador a partir de um texto, coletando o conjunto
     * de caracteres distintos e ordenando-os por code point.
     *
     * @param text corpus de treino (nao pode ser vazio)
     * @return tokenizador cujo vocabulario cobre exatamente os caracteres
     *         presentes em {@code text}
     * @throws IllegalArgumentException se {@code text} for vazio
     */
    public static CharTokenizer fromText(String text) {
        if (text.isEmpty()) {
            throw new IllegalArgumentException("Corpus vazio: nada para tokenizar.");
        }
        // TreeSet<Character> mantem os caracteres ordenados por valor Unicode.
        TreeSet<Character> chars = new TreeSet<>();
        for (int i = 0; i < text.length(); i++) {
            chars.add(text.charAt(i));
        }
        char[] itos = new char[chars.size()];
        Map<Character, Integer> stoi = new LinkedHashMap<>();
        int id = 0;
        for (char c : chars) {
            itos[id] = c;
            stoi.put(c, id);
            id++;
        }
        return new CharTokenizer(stoi, itos);
    }

    /**
     * Tamanho do vocabulario {@code V}.
     *
     * @return numero de caracteres distintos conhecidos
     */
    public int vocabSize() {
        return itos.length;
    }

    /**
     * Codifica um texto numa sequencia de ids.
     *
     * @param text texto de entrada; todo caractere deve pertencer ao vocabulario
     * @return array de ids, tamanho igual ao numero de caracteres de {@code text}
     * @throws IllegalArgumentException se algum caractere for desconhecido
     */
    public int[] encode(String text) {
        int[] ids = new int[text.length()];
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            Integer id = stoi.get(c);
            if (id == null) {
                throw new IllegalArgumentException(
                        "Caractere fora do vocabulario: '" + c
                        + "' (code point " + (int) c + ")");
            }
            ids[i] = id;
        }
        return ids;
    }

    /**
     * Decodifica uma sequencia de ids de volta para texto.
     *
     * @param ids array de ids validos {@code (0 <= id < V)}
     * @return texto reconstruido
     * @throws IllegalArgumentException se algum id estiver fora da faixa
     */
    public String decode(int[] ids) {
        StringBuilder sb = new StringBuilder(ids.length);
        for (int id : ids) {
            if (id < 0 || id >= itos.length) {
                throw new IllegalArgumentException("Id fora da faixa: " + id);
            }
            sb.append(itos[id]);
        }
        return sb.toString();
    }

    /**
     * Converte um unico id no seu caractere.
     *
     * @param id id valido
     * @return caractere correspondente
     */
    public char idToChar(int id) {
        return itos[id];
    }

    /**
     * Converte um unico caractere no seu id.
     *
     * @param c caractere conhecido
     * @return id correspondente
     * @throws IllegalArgumentException se o caractere for desconhecido
     */
    public int charToId(char c) {
        Integer id = stoi.get(c);
        if (id == null) {
            throw new IllegalArgumentException("Caractere fora do vocabulario: '" + c + "'");
        }
        return id;
    }

    /**
     * Salva o vocabulario num arquivo de texto UTF-8, uma linha por id.
     *
     * <p>Formato: a linha de indice {@code i} contem o caractere de id
     * {@code i}, escapado para sobreviver a quebras de linha e barras.
     * Assim o mapeamento pode ser recarregado identico com
     * {@link #load(Path)}.</p>
     *
     * @param path caminho de destino
     */
    public void save(Path path) {
        List<String> lines = new ArrayList<>(itos.length);
        for (char c : itos) {
            lines.add(escape(c));
        }
        try {
            if (path.getParent() != null) {
                Files.createDirectories(path.getParent());
            }
            Files.write(path, lines, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("Falha ao salvar vocabulario", e);
        }
    }

    /**
     * Carrega um vocabulario previamente salvo por {@link #save(Path)}.
     *
     * @param path caminho do arquivo de vocabulario
     * @return tokenizador com o mesmo mapeamento id &lt;-&gt; caractere
     */
    public static CharTokenizer load(Path path) {
        try {
            List<String> lines = Files.readAllLines(path, StandardCharsets.UTF_8);
            char[] itos = new char[lines.size()];
            Map<Character, Integer> stoi = new LinkedHashMap<>();
            for (int id = 0; id < lines.size(); id++) {
                char c = unescape(lines.get(id));
                itos[id] = c;
                stoi.put(c, id);
            }
            return new CharTokenizer(stoi, itos);
        } catch (IOException e) {
            throw new UncheckedIOException("Falha ao carregar vocabulario", e);
        }
    }

    // ------------------------------------------------------------------
    // Escape simples para caracteres de controle, para o arquivo de
    // vocabulario ter exatamente uma linha por id.
    // ------------------------------------------------------------------

    private static String escape(char c) {
        switch (c) {
            case '\n': return "\\n";
            case '\r': return "\\r";
            case '\t': return "\\t";
            case '\\': return "\\\\";
            default:   return String.valueOf(c);
        }
    }

    private static char unescape(String s) {
        switch (s) {
            case "\\n": return '\n';
            case "\\r": return '\r';
            case "\\t": return '\t';
            case "\\\\": return '\\';
            default:
                if (s.length() != 1) {
                    throw new IllegalArgumentException("Linha de vocabulario invalida: '" + s + "'");
                }
                return s.charAt(0);
        }
    }
}
