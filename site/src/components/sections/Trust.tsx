import { trust } from "../../lib/site-content";
import { Blocks } from "../ui/Blocks";
import { CommandLine } from "../ui/CopyButton";
import { Rich } from "../ui/Rich";

export function Trust() {
  return (
    <section id="testes">
      <div className="wrap narrow">
        <div className="sec-head">
          <div className="eyebrow">{trust.eyebrow}</div>
          <h2>{trust.title}</h2>
          <p>
            <Rich runs={trust.lead} />
          </p>
        </div>

        <div className="reveal">
          <Blocks blocks={trust.blocks} />
        </div>

        <div className="grid two reveal" style={{ marginTop: "28px" }}>
          {trust.items.map((item) => (
            <div className="card" key={item.title}>
              <h3>
                <code>{item.title}</code>
              </h3>
              <p>
                <Rich runs={item.body} />
              </p>
            </div>
          ))}
        </div>

        <div className="reveal" style={{ marginTop: "24px" }}>
          <CommandLine cmd={trust.command} />
        </div>
      </div>
    </section>
  );
}
