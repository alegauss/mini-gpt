import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Blocks } from "../components/ui/Blocks";
import { Rich } from "../components/ui/Rich";
import { mathPage } from "../lib/pages-content";
import { levels } from "../lib/levels";
import { page } from "../lib/site-content";

// O formulário. Existe para ser aberto numa segunda aba enquanto se lê uma página de
// nível: cada verbete tem âncora própria, e o índice do topo é a lista dessas âncoras.
export function MathPage() {
  return (
    <>
      <Nav />

      <header className="page-hero">
        <div className="wrap narrow">
          <a className="back-link" href={page("/")}>
            ← início
          </a>
          <div className="kicker kicker-plain">Formulário</div>
          <h1>{mathPage.title}</h1>
          <p className="lead">
            <Rich runs={mathPage.lead} />
          </p>
        </div>
      </header>

      <section>
        <div className="wrap narrow">
          <nav className="toc" aria-label="Índice dos verbetes">
            {mathPage.items.map((item) => (
              <a key={item.id} href={`#${item.id}`}>
                {item.title}
              </a>
            ))}
          </nav>

          <div className="gloss">
            {mathPage.items.map((item) => (
              <article className="gloss-item reveal" id={item.id} key={item.id}>
                <h2>{item.title}</h2>
                <p className="why">{item.why}</p>
                <Blocks blocks={item.blocks} />
              </article>
            ))}
          </div>

          <nav className="page-nav">
            <a href={page(`/niveis/${levels[0].slug}`)}>
              <span className="nav-hint">Onde isto é usado</span>← Nível 1
            </a>
            <a className="next" href={page("/como-rodar")}>
              <span className="nav-hint">E agora</span>Como rodar →
            </a>
          </nav>
        </div>
      </section>

      <Footer />
    </>
  );
}
