import { levels } from "../../lib/levels";
import { levelsSection, page } from "../../lib/site-content";
import { Rich } from "../ui/Rich";

// A escada. Os três cartões saem dos mesmos registros que geram as páginas de
// profundidade — então o que o cartão promete e o que a página entrega são,
// literalmente, o mesmo objeto.
export function Levels() {
  return (
    <section id="niveis">
      <div className="wrap">
        <div className="sec-head">
          <div className="eyebrow">{levelsSection.eyebrow}</div>
          <h2>{levelsSection.title}</h2>
          <p>
            <Rich runs={levelsSection.lead} />
          </p>
        </div>

        <div className="levels">
          {levels.map((l) => (
            <a className={`level level-${l.key} reveal`} key={l.slug} href={page(`/niveis/${l.slug}`)}>
              <div className="level-top">
                <span className="level-num">{l.n}</span>
                <span className="level-name">{l.name}</span>
              </div>
              <div className="level-file">{l.file}</div>
              <div className="level-tagline">{l.tagline}</div>
              <p>
                <Rich runs={l.card} />
              </p>
              <ul className="level-teaches">
                {l.teaches.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <div className="level-foot">
                {l.stats.map((s) => (
                  <div className="level-stat" key={s.label}>
                    <span>{s.label}</span>
                    <b>{s.value}</b>
                  </div>
                ))}
                <span className="level-go">Ler o nível {l.n} →</span>
              </div>
            </a>
          ))}
        </div>

        <p className="tbl-note" style={{ marginTop: "26px" }}>
          <Rich runs={levelsSection.footnote} />
        </p>
      </div>
    </section>
  );
}
