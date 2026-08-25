import { footer, page, productName, sponsor } from "../lib/site-content";
import { TokenStream } from "./ui/TokenStream";

export function Footer() {
  return (
    <footer>
      <TokenStream className="stream--footer" />
      <div className="wrap">
        <div className="foot-grid">
          <a className="foot-brand" href={page("/")}>
            <img src={`${page("/")}logo.svg`} alt="" width={28} height={28} />
            {productName}
          </a>
          <div className="foot-links">
            {footer.links.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <Sponsor />
        <p className="disclaimer">{footer.disclaimer}</p>
      </div>
    </footer>
  );
}

/**
 * O bloco de patrocínio.
 *
 * Renderizado no servidor junto com o resto da página, então o patrocinador está no HTML
 * servido em vez de ser injetado depois da carga — um apoio que um rastreador só
 * encontraria executando JavaScript não valeria a declaração.
 *
 * Os cartões carregam as marcas reais sobre uma placa branca, reproduzidas como foram
 * publicadas: recolorir a marca de outra pessoa para combinar com esta paleta não é
 * detalhe de estilo, é alterar o que ela é.
 */
function Sponsor() {
  return (
    <div className="sponsor">
      <img
        className="sponsor-mark"
        src={sponsor.logo}
        alt={`Logotipo ${sponsor.name}`}
        width={42}
        height={42}
        loading="lazy"
        decoding="async"
      />
      <div className="sponsor-body">
        <span className="sponsor-label">{sponsor.label}</span>
        <a className="sponsor-name" href={sponsor.url} target="_blank" rel="noopener">
          {sponsor.name}
        </a>
        <p>
          {sponsor.summary} {sponsor.license}. Mais em{" "}
          <a href={sponsor.url} target="_blank" rel="noopener">
            {sponsor.siteLabel}
          </a>
          .
        </p>
        <div className="sponsor-products">
          {sponsor.products.map((product) => (
            <a
              key={product.url}
              className="sponsor-product"
              href={product.url}
              target="_blank"
              rel="noopener"
            >
              <img
                src={product.logo}
                alt={`Logotipo ${product.name}`}
                width={28}
                height={28}
                loading="lazy"
                decoding="async"
              />
              <span>
                <b>{product.name}</b>
                <small>{product.inline}</small>
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
