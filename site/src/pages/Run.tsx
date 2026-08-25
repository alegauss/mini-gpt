import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Blocks } from "../components/ui/Blocks";
import { CommandLine } from "../components/ui/CopyButton";
import { Rich } from "../components/ui/Rich";
import { runPage } from "../lib/pages-content";
import { levels } from "../lib/levels";
import { page } from "../lib/site-content";

export function RunPage() {
  return (
    <>
      <Nav />

      <header className="page-hero">
        <div className="wrap narrow">
          <a className="back-link" href={page("/")}>
            ← início
          </a>
          <div className="kicker kicker-plain">Guia prático</div>
          <h1>{runPage.title}</h1>
          <p className="lead">
            <Rich runs={runPage.lead} />
          </p>
        </div>
      </header>

      <section>
        <div className="wrap narrow">
          <h2 className="sub-head">Pré-requisitos</h2>
          <ul className="feat-list reveal">
            {runPage.prereqs.map((p) => (
              <li key={p.title}>
                <span className="chk" aria-hidden="true">
                  ✓
                </span>
                <span>
                  <b>{p.title}</b> — <Rich runs={p.body} />
                </span>
              </li>
            ))}
          </ul>

          <h2 className="sub-head">Os quatro passos</h2>
          <div className="steps reveal">
            {runPage.steps.map((s, i) => (
              <div className="step" key={s.title}>
                <div className="n">{i + 1}</div>
                <h4>{s.title}</h4>
                <p>
                  <Rich runs={s.body} />
                </p>
              </div>
            ))}
          </div>
          <div className="cmd-list reveal">
            {runPage.steps.map((s) => (
              <CommandLine cmd={s.cmd} key={s.cmd} />
            ))}
          </div>

          <h2 className="sub-head">Depois que isso funcionar</h2>
          <div className="cmd-list reveal">
            {runPage.extraCommands.map((c) => (
              <div className="cmd-item" key={c.cmd}>
                <p className="cmd-why">
                  <Rich runs={c.why} />
                </p>
                <CommandLine cmd={c.cmd} />
              </div>
            ))}
          </div>

          <h2 className="sub-head">Todas as opções</h2>
          <div className="table-scroll reveal">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Opção</th>
                  <th>Significado</th>
                  <th>Padrão</th>
                </tr>
              </thead>
              <tbody>
                {runPage.cliRows.map((r) => (
                  <tr key={r.opt}>
                    <td>
                      <code>{r.opt}</code>
                    </td>
                    <td>
                      <Rich runs={r.meaning} />
                    </td>
                    <td>
                      <code>{r.def}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tbl-note">
            Os modelos <code>mlp</code> e <code>transformer</code> treinam do zero a cada execução (o
            projeto não persiste pesos), por isso <code>generate</code> e <code>compare</code> incluem
            uma fase de treino antes de gerar.
          </p>

          <h2 className="sub-head">{runPage.corpus.title}</h2>
          <div className="reveal">
            <Blocks blocks={runPage.corpus.blocks} />
          </div>

          <h2 className="sub-head">{runPage.expect.title}</h2>
          <div className="table-scroll reveal">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Nível</th>
                  <th>Perda de validação</th>
                  <th>Tempo de treino</th>
                  <th>O texto</th>
                </tr>
              </thead>
              <tbody>
                {runPage.expect.rows.map((r) => (
                  <tr key={r.level}>
                    <td>
                      <b style={{ color: `var(--${r.key})` }}>{r.level}</b>
                    </td>
                    <td className="num">{r.loss}</td>
                    <td className="num">{r.time}</td>
                    <td>{r.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tbl-note">
            <Rich runs={runPage.expect.note} />
          </p>

          <h2 className="sub-head">Quando algo der errado</h2>
          <div className="exs reveal">
            {runPage.troubles.map((t) => (
              <div className="ex" key={t.title}>
                <h4>{t.title}</h4>
                <p>
                  <Rich runs={t.body} />
                </p>
              </div>
            ))}
          </div>

          <nav className="page-nav">
            <a href={page(`/niveis/${levels[0].slug}`)}>
              <span className="nav-hint">Comece por aqui</span>← Nível 1
            </a>
            <a className="next" href={page("/matematica")}>
              <span className="nav-hint">Se um símbolo travar</span>A matemática →
            </a>
          </nav>
        </div>
      </section>

      <Footer />
    </>
  );
}
