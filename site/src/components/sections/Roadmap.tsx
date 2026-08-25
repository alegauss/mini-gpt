import { roadmap, repoUrl } from "../../lib/site-content";
import { Rich } from "../ui/Rich";

// O roteiro de leitura. É a seção mais professoral do site e a mais útil para quem chegou
// decidido a estudar: a ordem em que cada arquivo só depende do que o anterior já
// explicou. Cada item leva direto ao arquivo no GitHub.
export function Roadmap() {
  return (
    <section id="roteiro">
      <div className="wrap narrow">
        <div className="sec-head">
          <div className="eyebrow">{roadmap.eyebrow}</div>
          <h2>{roadmap.title}</h2>
          <p>
            <Rich runs={roadmap.lead} />
          </p>
        </div>

        <div className="path">
          {roadmap.items.map((item, i) => (
            <a
              className="path-item reveal"
              key={item.file}
              href={`${repoUrl}/blob/main/src/main/java/minigpt/${item.file}`}
            >
              <span className="path-n">{i + 1}</span>
              <span>
                <span className="path-file">{item.file}</span>
                <span className="path-why">{item.why}</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
