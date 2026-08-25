import { rules } from "../../lib/site-content";
import { Rich } from "../ui/Rich";

export function Rules() {
  return (
    <section id="regras">
      <div className="wrap">
        <div className="sec-head">
          <div className="eyebrow">{rules.eyebrow}</div>
          <h2>{rules.title}</h2>
          <p>
            <Rich runs={rules.lead} />
          </p>
        </div>

        <div className="grid">
          {rules.items.map((item) => (
            <div className="card reveal" key={item.title}>
              <div className="ico" aria-hidden="true">
                {item.ico}
              </div>
              <h3>{item.title}</h3>
              <p>
                <Rich runs={item.body} />
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
