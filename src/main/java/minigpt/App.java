package minigpt;

import minigpt.data.CharTokenizer;
import minigpt.data.Dataset;
import minigpt.generate.Sampler;
import minigpt.model.BigramModel;
import minigpt.model.LanguageModel;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;

/**
 * Interface de linha de comando do mini-gpt-java.
 *
 * <h2>Subcomandos</h2>
 * <ul>
 *   <li>{@code train}    — treina um modelo e reporta loss de treino/validacao.</li>
 *   <li>{@code generate} — gera texto a partir de um prompt.</li>
 *   <li>{@code compare}  — roda os modelos disponiveis no mesmo prompt,
 *       lado a lado.</li>
 * </ul>
 *
 * <p><b>Estado atual (ETAPA 1):</b> apenas o {@link BigramModel} esta
 * implementado. Os niveis MLP (ETAPA 2) e Transformer (ETAPA 3) serao
 * adicionados nas proximas etapas; ate la os subcomandos avisam quando um
 * modelo ainda nao existe.</p>
 *
 * <h2>Exemplos</h2>
 * <pre>
 *   mvn -q exec:java             # (ou via JAR) mostra a ajuda
 *   java -jar target/mini-gpt-java.jar train --model bigram
 *   java -jar target/mini-gpt-java.jar generate --model bigram --prompt "O " --length 200
 *   java -jar target/mini-gpt-java.jar compare --prompt "O "
 * </pre>
 */
public final class App {

    private static final String DEFAULT_CORPUS = "data/corpus.txt";
    private static final long DEFAULT_SEED = 1234L;

    private App() {
    }

    /**
     * Ponto de entrada.
     *
     * @param args primeiro elemento e o subcomando; o resto sao opcoes
     *             {@code --chave valor}
     */
    public static void main(String[] args) {
        if (args.length == 0) {
            printHelp();
            return;
        }
        String command = args[0];
        Map<String, String> opts = parseOptions(args);
        switch (command) {
            case "train":    cmdTrain(opts);    break;
            case "generate": cmdGenerate(opts); break;
            case "compare":  cmdCompare(opts);  break;
            case "help":
            case "--help":
            case "-h":       printHelp();       break;
            default:
                System.out.println("Subcomando desconhecido: " + command);
                printHelp();
        }
    }

    // ------------------------------------------------------------------
    // Subcomandos
    // ------------------------------------------------------------------

    private static void cmdTrain(Map<String, String> opts) {
        String modelName = opts.getOrDefault("model", "bigram");
        String corpusPath = opts.getOrDefault("corpus", DEFAULT_CORPUS);
        int blockSize = intOpt(opts, "context", 8);
        long seed = longOpt(opts, "seed", DEFAULT_SEED);

        String text = readCorpus(corpusPath);
        CharTokenizer tokenizer = CharTokenizer.fromText(text);
        int[] ids = tokenizer.encode(text);
        Dataset dataset = new Dataset(ids, blockSize, 0.9);

        System.out.println("== Treino: modelo '" + modelName + "' ==");
        System.out.println("Corpus: " + corpusPath + " (" + text.length()
                + " caracteres, vocabulario V=" + tokenizer.vocabSize() + ")");
        System.out.println("Treino: " + dataset.trainSize()
                + " tokens | Validacao: " + dataset.valSize() + " tokens");

        long t0 = System.nanoTime();
        LanguageModel model = buildAndTrain(modelName, tokenizer, dataset);
        if (model == null) {
            return;
        }
        double trainLoss = model.evaluateLoss(dataset.trainIds());
        double valLoss = model.evaluateLoss(dataset.valIds());
        double secs = (System.nanoTime() - t0) / 1e9;

        System.out.printf("passo=%-6s loss_treino=%.4f loss_val=%.4f tempo=%.2fs%n",
                "final", trainLoss, valLoss, secs);

        // Salva o vocabulario para geracao posterior.
        Path vocabPath = Path.of("target", modelName + ".vocab");
        tokenizer.save(vocabPath);
        System.out.println("Vocabulario salvo em " + vocabPath);

        // Amostra final, para o aluno ver o resultado imediatamente.
        Random rng = new Random(seed);
        Sampler sampler = new Sampler(model, tokenizer, rng);
        String sample = sampler.generate("", 200, 1.0, 0);
        System.out.println("\n--- amostra (200 caracteres, temp=1.0) ---");
        System.out.println(sample);
    }

    private static void cmdGenerate(Map<String, String> opts) {
        String modelName = opts.getOrDefault("model", "bigram");
        String corpusPath = opts.getOrDefault("corpus", DEFAULT_CORPUS);
        String prompt = opts.getOrDefault("prompt", "");
        int length = intOpt(opts, "length", 200);
        double temperature = doubleOpt(opts, "temp", 1.0);
        int topK = intOpt(opts, "topk", 0);
        int blockSize = intOpt(opts, "context", 8);
        long seed = longOpt(opts, "seed", DEFAULT_SEED);

        String text = readCorpus(corpusPath);
        CharTokenizer tokenizer = CharTokenizer.fromText(text);
        int[] ids = tokenizer.encode(text);
        Dataset dataset = new Dataset(ids, blockSize, 0.9);

        LanguageModel model = buildAndTrain(modelName, tokenizer, dataset);
        if (model == null) {
            return;
        }
        Random rng = new Random(seed);
        Sampler sampler = new Sampler(model, tokenizer, rng);
        String out = sampler.generate(prompt, length, temperature, topK);
        System.out.println(out);
    }

    private static void cmdCompare(Map<String, String> opts) {
        String corpusPath = opts.getOrDefault("corpus", DEFAULT_CORPUS);
        String prompt = opts.getOrDefault("prompt", "");
        int length = intOpt(opts, "length", 200);
        double temperature = doubleOpt(opts, "temp", 1.0);
        int topK = intOpt(opts, "topk", 0);
        int blockSize = intOpt(opts, "context", 8);
        long seed = longOpt(opts, "seed", DEFAULT_SEED);

        String text = readCorpus(corpusPath);
        CharTokenizer tokenizer = CharTokenizer.fromText(text);
        int[] ids = tokenizer.encode(text);
        Dataset dataset = new Dataset(ids, blockSize, 0.9);

        String[] levels = { "bigram", "mlp", "transformer" };
        System.out.println("== compare (prompt=\"" + prompt + "\", "
                + length + " caracteres, temp=" + temperature + ") ==\n");

        for (String levelName : levels) {
            LanguageModel model = tryBuildAndTrain(levelName, tokenizer, dataset);
            System.out.println("### " + levelName + " ###");
            if (model == null) {
                System.out.println("(ainda nao implementado - chega numa etapa futura)\n");
                continue;
            }
            double valLoss = model.evaluateLoss(dataset.valIds());
            Random rng = new Random(seed);
            Sampler sampler = new Sampler(model, tokenizer, rng);
            String out = sampler.generate(prompt, length, temperature, topK);
            System.out.printf("loss_val=%.4f%n%s%n%n", valLoss, out);
        }
    }

    // ------------------------------------------------------------------
    // Construcao de modelos
    // ------------------------------------------------------------------

    /**
     * Constroi e treina o modelo pedido; imprime aviso e devolve
     * {@code null} se o nivel ainda nao existir.
     */
    private static LanguageModel buildAndTrain(String name, CharTokenizer tok, Dataset ds) {
        LanguageModel m = tryBuildAndTrain(name, tok, ds);
        if (m == null) {
            System.out.println("Modelo '" + name + "' ainda nao implementado nesta etapa.");
            System.out.println("Disponivel agora: bigram (ETAPA 1).");
        }
        return m;
    }

    /** Igual a {@link #buildAndTrain}, mas silencioso: devolve null sem log. */
    private static LanguageModel tryBuildAndTrain(String name, CharTokenizer tok, Dataset ds) {
        switch (name) {
            case "bigram": {
                BigramModel model = new BigramModel(tok.vocabSize(), 1.0);
                model.fit(ds.trainIds());
                return model;
            }
            case "mlp":
            case "transformer":
                // Serao implementados nas ETAPAS 2 e 3.
                return null;
            default:
                throw new IllegalArgumentException("Modelo desconhecido: " + name);
        }
    }

    // ------------------------------------------------------------------
    // Utilidades
    // ------------------------------------------------------------------

    private static String readCorpus(String path) {
        Path p = Path.of(path);
        if (!Files.exists(p)) {
            throw new IllegalStateException(
                    "Corpus nao encontrado em '" + path + "'.\n"
                    + "Coloque um arquivo .txt em portugues (UTF-8) nesse caminho. "
                    + "Veja data/corpus.txt para instrucoes.");
        }
        try {
            return Files.readString(p, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("Falha ao ler o corpus", e);
        }
    }

    /**
     * Analisa opcoes no formato {@code --chave valor}. Opcoes sem valor
     * (seguidas de outra opcao ou do fim) viram {@code "true"}.
     */
    private static Map<String, String> parseOptions(String[] args) {
        Map<String, String> opts = new HashMap<>();
        for (int i = 1; i < args.length; i++) {
            String a = args[i];
            if (a.startsWith("--")) {
                String key = a.substring(2);
                if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
                    opts.put(key, args[++i]);
                } else {
                    opts.put(key, "true");
                }
            }
        }
        return opts;
    }

    private static int intOpt(Map<String, String> opts, String key, int def) {
        return opts.containsKey(key) ? Integer.parseInt(opts.get(key)) : def;
    }

    private static long longOpt(Map<String, String> opts, String key, long def) {
        return opts.containsKey(key) ? Long.parseLong(opts.get(key)) : def;
    }

    private static double doubleOpt(Map<String, String> opts, String key, double def) {
        return opts.containsKey(key) ? Double.parseDouble(opts.get(key)) : def;
    }

    private static void printHelp() {
        System.out.println(String.join("\n",
                "mini-gpt-java — modelo de linguagem em nivel de caractere, do zero.",
                "",
                "Uso:",
                "  <cmd> [--opcao valor ...]",
                "",
                "Subcomandos:",
                "  train     Treina um modelo e reporta loss de treino/validacao.",
                "  generate  Gera texto a partir de um prompt.",
                "  compare   Roda os modelos disponiveis lado a lado.",
                "  help      Mostra esta ajuda.",
                "",
                "Opcoes comuns:",
                "  --model    bigram | mlp | transformer   (padrao: bigram)",
                "  --corpus   caminho do .txt                (padrao: data/corpus.txt)",
                "  --prompt   texto inicial                  (padrao: vazio)",
                "  --length   caracteres a gerar             (padrao: 200)",
                "  --temp     temperatura de amostragem      (padrao: 1.0)",
                "  --topk     mantem os k mais provaveis      (padrao: 0 = desligado)",
                "  --context  comprimento de contexto        (padrao: 8)",
                "  --seed     semente aleatoria              (padrao: " + DEFAULT_SEED + ")",
                "",
                "Etapa atual: 1 (bigrama). MLP e Transformer chegam nas etapas 2 e 3."));
    }
}
