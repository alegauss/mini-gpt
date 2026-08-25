import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Blocks } from "../components/ui/Blocks";
import { CommandLine } from "../components/ui/CopyButton";
import { Rich } from "../components/ui/Rich";
import { levels, type Level } from "../lib/levels";
import { page, repoUrl } from "../lib/site-content";

// Uma página de nível. Recebe o registro inteiro, então tudo o que ela mostra — título,
// cor, arquivo, comando, blocos, exercícios — vem de um lugar só, e o cartão da página
// inicial não pode discordar dela.
export function LevelPage({ level }: { level: Level }) {
  const idx = levels.findIndex((l) => l.slug === level.slug);
  const anterior = idx > 0 ? levels[idx - 1] : null;
  const proximo = idx < levels.length - 1 ? levels[idx + 1] : null;

  return (
    <>
      <Nav />

      <header className="page-hero">
        <div className="wrap narrow">
          <a className="back-link" href={page("/")}>
            ← início
          </a>
          <div className={`kicker kicker-${level.key}`}>
            Nível {level.n} · {level.file}
          </div>
          <h1>{level.name}</h1>
          <p className="lead">
            <Rich runs={level.lead} />
          </p>
          <div className="chips">
            {level.stats.map((s) => (
              <span className="chip" key={s.label}>
                {s.label}: {s.value}
              </span>
            ))}
          </div>
        </div>
      </header>

      <section>
        <div className="wrap narrow">
          <CommandLine cmd={`java -jar target/mini-gpt-java.jar train ${level.flag}`} />

          <h2 className="sub-head" style={{ marginTop: "42px" }}>
            O nível por dentro
          </h2>
          <div className="reveal">
            <Blocks blocks={level.blocks} />
          </div>

          <h2 className="ex-head">Para fazer com as mãos</h2>
          <p className="ex-lead">
            Nenhum destes exercícios pede uma biblioteca nova, e todos cabem numa sessão. O terceiro e o
            quarto de cada nível são os que mais ensinam, porque quebram alguma coisa de propósito.
          </p>
          <div className="exs reveal">
            {level.exercises.map((ex) => (
              <div className="ex" key={ex.id}>
                <h4>
                  <em>{ex.id}</em>
                  {ex.title}
                </h4>
                <p>
                  <Rich runs={ex.body} />
                </p>
              </div>
            ))}
          </div>

          <div className="note note--tip" style={{ marginTop: "26px" }}>
            <strong className="note-title">O arquivo deste nível</strong>
            Tudo o que esta página explica está em{" "}
            <a
              className="feature-link"
              href={`${repoUrl}/blob/main/src/main/java/minigpt/${level.file}`}
            >
              <code>{level.file}</code>
            </a>
            . O Javadoc da classe traz a mesma matemática, ao lado da linha que a implementa.
          </div>

          <nav className="page-nav">
            {anterior ? (
              <a href={page(`/niveis/${anterior.slug}`)}>
                <span className="nav-hint">Nível anterior</span>← {anterior.name}
              </a>
            ) : (
              <a href={page("/matematica")}>
                <span className="nav-hint">Se um símbolo travar</span>← A matemática
              </a>
            )}
            {proximo ? (
              <a className="next" href={page(`/niveis/${proximo.slug}`)}>
                <span className="nav-hint">Próximo nível</span>
                {proximo.name} →
              </a>
            ) : (
              <a className="next" href={page("/como-rodar")}>
                <span className="nav-hint">E agora</span>Como rodar →
              </a>
            )}
          </nav>
        </div>
      </section>

      <Footer />
    </>
  );
}
