import { footer, page } from "../lib/site-content";
import { TokenStream } from "./ui/TokenStream";

export function Footer() {
  return (
    <footer>
      <TokenStream className="stream--footer" />
      <div className="wrap">
        <div className="foot-grid">
          <a className="foot-brand" href={page("/")}>
            <img src={`${page("/")}logo.svg`} alt="" width={28} height={28} />
            mini-gpt-java
          </a>
          <div className="foot-links">
            {footer.links.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <p className="disclaimer">{footer.disclaimer}</p>
      </div>
    </footer>
  );
}
