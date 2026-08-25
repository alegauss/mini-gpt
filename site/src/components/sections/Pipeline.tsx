import { pipeline } from "../../lib/site-content";
import { Figure } from "../figures/Figures";
import { Rich } from "../ui/Rich";

export function Pipeline() {
  return (
    <section id="pipeline">
      <div className="wrap">
        <div className="sec-head">
          <div className="eyebrow">{pipeline.eyebrow}</div>
          <h2>{pipeline.title}</h2>
          <p>
            <Rich runs={pipeline.lead} />
          </p>
        </div>

        <figure className="reveal" style={{ margin: "0 0 34px" }}>
          <div className="figure-frame">
            <Figure name="pipeline" />
          </div>
        </figure>

        <div className="grid">
          {pipeline.steps.map((s) => (
            <div className="card reveal" key={s.title}>
              <div className="ico" aria-hidden="true">
                {s.ico}
              </div>
              <h3>{s.title}</h3>
              <p style={{ marginBottom: "8px" }}>
                <code>{s.file}</code>
              </p>
              <p>
                <Rich runs={s.body} />
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
