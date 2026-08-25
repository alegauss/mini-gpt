import { levels } from "../../lib/levels";
import { closing, page } from "../../lib/site-content";
import { Rich } from "../ui/Rich";

export function Closing() {
  const primeiro = levels[0];
  return (
    <section id="comecar">
      <div className="wrap">
        <div className="banner reveal">
          <h2>{closing.title}</h2>
          <p>
            <Rich runs={closing.body} />
          </p>
          <p>
            <Rich runs={closing.body2} />
          </p>
          <div className="banner-cta">
            <a className="btn btn-primary" href={page(`/niveis/${primeiro.slug}`)}>
              {closing.ctaPrimary}
            </a>
            <a className="btn btn-ghost" href={page("/como-rodar")}>
              {closing.ctaGhost}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
