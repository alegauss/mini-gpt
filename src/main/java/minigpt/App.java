package minigpt;

import minigpt.data.CharTokenizer;
import minigpt.data.Dataset;
import minigpt.generate.Sampler;
import minigpt.model.BigramModel;
import minigpt.model.LanguageModel;
import minigpt.model.MlpModel;
import minigpt.model.TrainableModel;
import minigpt.model.TransformerModel;
import minigpt.train.Trainer;

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
 *   <li>{@code generate} — treina e gera texto a partir de um prompt.</li>
 *   <li>{@code compare}  — treina os tres modelos no mesmo corpus e imprime
 *       as saidas lado a lado.</li>
 * </ul>
 *
 * <p>Os modelos {@code mlp} e {@code transformer} nao persistem pesos entre
 * execucoes: cada comando treina do zero (rapido para o MLP; use
 * {@code --steps} para ajustar o Transformer). O {@code bigram} apenas conta
 * pares, sem treino iterativo.</p>
 *
 * <h2>Exemplos</h2>
 * <pre>
 *   java -jar target/mini-gpt-java.jar train --model transformer --steps 3000
 *   java -jar target/mini-gpt-java.jar generate --model mlp --prompt "O " --length 200
 *   java -jar target/mini-gpt-java.jar compare --prompt "O " --steps 500
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
        long seed = longOpt(opts, "seed", DEFAULT_SEED);

        String text = readCorpus(corpusPath);
        CharTokenizer tokenizer = CharTokenizer.fromText(text);
        int[] ids = tokenizer.encode(text);

        int context = contextFor(modelName, opts);
        Dataset dataset = new Dataset(ids, context, 0.9);

        System.out.println("== Treino: modelo '" + modelName + "' ==");
        System.out.println("Corpus: " + corpusPath + " (" + text.length()
                + " caracteres, vocabulario V=" + tokenizer.vocabSize() + ")");
        System.out.println("Contexto=" + context + " | Treino: " + dataset.trainSize()
                + " tokens | Validacao: " + dataset.valSize() + " tokens\n");

        LanguageModel model = buildAndTrain(modelName, tokenizer, dataset, opts,
                defaultSteps(modelName, opts), true);

        // Salva o vocabulario (util para inspecao / uso futuro).
        Path vocabPath = Path.of("target", modelName + ".vocab");
        tokenizer.save(vocabPath);
        System.out.println("\nVocabulario salvo em " + vocabPath);

        Random rng = new Random(seed);
        Sampler sampler = new Sampler(model, tokenizer, rng);
        String sample = sampler.generate("", 200, 0.9, 0);
        System.out.println("\n--- amostra final (200 caracteres, temp=0.9) ---");
        System.out.println(sample);
    }

    private static void cmdGenerate(Map<String, String> opts) {
        String modelName = opts.getOrDefault("model", "bigram");
        String corpusPath = opts.getOrDefault("corpus", DEFAULT_CORPUS);
        String prompt = opts.getOrDefault("prompt", "");
        int length = intOpt(opts, "length", 200);
        double temperature = doubleOpt(opts, "temp", 1.0);
        int topK = intOpt(opts, "topk", 0);
        long seed = longOpt(opts, "seed", DEFAULT_SEED);

        String text = readCorpus(corpusPath);
        CharTokenizer tokenizer = CharTokenizer.fromText(text);
        int[] ids = tokenizer.encode(text);
        int context = contextFor(modelName, opts);
        Dataset dataset = new Dataset(ids, context, 0.9);

        if (!modelName.equals("bigram")) {
            System.out.println("(treinando '" + modelName + "' por "
                    + defaultSteps(modelName, opts) + " passos...)");
        }
        LanguageModel model = buildAndTrain(modelName, tokenizer, dataset, opts,
                defaultSteps(modelName, opts), false);

        Random rng = new Random(seed);
        Sampler sampler = new Sampler(model, tokenizer, rng);
        String out = sampler.generate(prompt, length, temperature, topK);
        System.out.println(out);
    }

    private static void cmdCompare(Map<String, String> opts) {
        String corpusPath = opts.getOrDefault("corpus", DEFAULT_CORPUS);
        String prompt = opts.getOrDefault("prompt", "");
        int length = intOpt(opts, "length", 200);
        double temperature = doubleOpt(opts, "temp", 0.9);
        int topK = intOpt(opts, "topk", 0);
        long seed = longOpt(opts, "seed", DEFAULT_SEED);

        String text = readCorpus(corpusPath);
        CharTokenizer tokenizer = CharTokenizer.fromText(text);
        int[] ids = tokenizer.encode(text);

        String[] levels = { "bigram", "mlp", "transformer" };
        System.out.println("== compare (prompt=\"" + prompt + "\", "
                + length + " caracteres, temp=" + temperature + ") ==");
        System.out.println("Corpus: " + text.length() + " caracteres, V="
                + tokenizer.vocabSize() + "\n");

        for (String levelName : levels) {
            int context = contextFor(levelName, opts);
            Dataset dataset = new Dataset(ids, context, 0.9);
            // Menos passos no compare para ser rapido; ajustavel com --steps.
            int steps = intOpt(opts, "steps", levelName.equals("transformer") ? 400 : 800);
            System.out.println("### " + levelName + " (treinando "
                    + (levelName.equals("bigram") ? "por contagem" : steps + " passos") + ") ###");
            LanguageModel model = buildAndTrain(levelName, tokenizer, dataset, opts, steps, false);
            double valLoss = valLossEstimate(model, dataset);
            Random rng = new Random(seed);
            Sampler sampler = new Sampler(model, tokenizer, rng);
            String out = sampler.generate(prompt, length, temperature, topK);
            System.out.printf("loss_val=%.4f%n%s%n%n", valLoss, out);
        }
    }

    // ------------------------------------------------------------------
    // Construcao e treino de modelos
    // ------------------------------------------------------------------

    /**
     * Constroi o modelo pedido e o treina (o bigrama apenas conta pares).
     *
     * @param name    bigram | mlp | transformer
     * @param tok     tokenizador
     * @param ds      dataset ja com o contexto correto para o modelo
     * @param opts    opcoes da CLI
     * @param steps   numero de passos de treino (ignorado pelo bigrama)
     * @param verbose imprime progresso do treino
     * @return modelo pronto para gerar/avaliar
     */
    private static LanguageModel buildAndTrain(String name, CharTokenizer tok, Dataset ds,
                                               Map<String, String> opts, int steps, boolean verbose) {
        long seed = longOpt(opts, "seed", DEFAULT_SEED);
        switch (name) {
            case "bigram": {
                BigramModel m = new BigramModel(tok.vocabSize(), 1.0);
                m.fit(ds.trainIds());
                if (verbose) {
                    System.out.printf("loss_treino=%.4f loss_val=%.4f%n",
                            m.evaluateLoss(ds.trainIds()), m.evaluateLoss(ds.valIds()));
                }
                return m;
            }
            case "mlp": {
                int embed = intOpt(opts, "embed", 24);
                int hidden = intOpt(opts, "hidden", 128);
                MlpModel m = new MlpModel(tok.vocabSize(), ds.blockSize(), embed, hidden, seed);
                trainModel(m, ds, tok, opts, steps, verbose);
                return m;
            }
            case "transformer": {
                int embed = intOpt(opts, "embed", 128);
                int heads = intOpt(opts, "heads", 4);
                int nblocks = intOpt(opts, "blocks", 2);
                TransformerModel m = new TransformerModel(
                        tok.vocabSize(), ds.blockSize(), embed, heads, nblocks, seed);
                trainModel(m, ds, tok, opts, steps, verbose);
                return m;
            }
            default:
                throw new IllegalArgumentException("Modelo desconhecido: " + name);
        }
    }

    private static void trainModel(TrainableModel m, Dataset ds, CharTokenizer tok,
                                   Map<String, String> opts, int steps, boolean verbose) {
        int batch = intOpt(opts, "batch", m.name().equals("transformer") ? 16 : 32);
        double lr = doubleOpt(opts, "lr", 1e-3);
        long seed = longOpt(opts, "seed", DEFAULT_SEED);
        int evalInterval = Math.max(1, Math.min(100, steps / 10));
        Trainer.Config cfg = new Trainer.Config(
                steps, batch, lr, 1e-4, evalInterval, 500, 100, 1.0, 10, seed, verbose);
        new Trainer(m, ds, tok, cfg).train();
    }

    private static double valLossEstimate(LanguageModel model, Dataset ds) {
        if (model instanceof TrainableModel tm) {
            return Trainer.estimateLoss(tm, ds, false, 10, 16, new Random(0));
        }
        return model.evaluateLoss(ds.valIds());
    }

    /** Contexto (block size) padrao de cada modelo, sobreponivel por --context. */
    private static int contextFor(String name, Map<String, String> opts) {
        int def;
        switch (name) {
            case "transformer": def = 64; break;
            case "mlp":         def = 8;  break;
            default:            def = 8;  break; // bigrama usa so trainIds
        }
        return intOpt(opts, "context", def);
    }

    /** Numero de passos padrao por modelo (bigrama nao treina). */
    private static int defaultSteps(String name, Map<String, String> opts) {
        int def;
        switch (name) {
            case "transformer": def = 2000; break; // ~25 min em CPU comum
            case "mlp":         def = 3000; break; // rapido (poucos segundos)
            default:            def = 0;    break;
        }
        return intOpt(opts, "steps", def);
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
                    + "Veja data/README.md para instrucoes.");
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
                "  generate  Treina e gera texto a partir de um prompt.",
                "  compare   Treina os tres modelos e imprime as saidas lado a lado.",
                "  help      Mostra esta ajuda.",
                "",
                "Opcoes comuns:",
                "  --model    bigram | mlp | transformer   (padrao: bigram)",
                "  --corpus   caminho do .txt                (padrao: data/corpus.txt)",
                "  --prompt   texto inicial                  (padrao: vazio)",
                "  --length   caracteres a gerar             (padrao: 200)",
                "  --temp     temperatura de amostragem      (padrao: 1.0)",
                "  --topk     mantem os k mais provaveis      (padrao: 0 = desligado)",
                "  --steps    passos de treino (mlp/transformer)",
                "  --context  comprimento de contexto        (mlp=8, transformer=64)",
                "  --embed    dimensao do embedding          (mlp=24, transformer=128)",
                "  --hidden   tamanho da camada oculta do MLP (padrao: 128)",
                "  --heads    cabecas de atencao (transformer) (padrao: 4)",
                "  --blocks   blocos do transformer            (padrao: 2)",
                "  --batch    tamanho do mini-batch           (mlp=32, transformer=16)",
                "  --lr       taxa de aprendizado             (padrao: 1e-3)",
                "  --seed     semente aleatoria               (padrao: " + DEFAULT_SEED + ")"));
    }
}
