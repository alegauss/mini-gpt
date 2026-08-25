import { hero, heroSession, page, repoUrl } from "../../lib/site-content";
import { levels } from "../../lib/levels";
import { Rich } from "../ui/Rich";
import { HeroSession } from "../HeroSession";
import { TokenStream } from "../ui/TokenStream";

export function Hero() {
  const primeiro = levels[0];
  return (
    <header className="hero" id="topo">
      <div className="wrap">
        <img className="hero-icon" src={`${page("/")}logo.svg`} alt="Logotipo do mini-gpt-java" />
        <div className="badge">
          <span className="dot" /> {hero.badge}
        </div>
        <h1>
          {hero.titleLead}
          <br />
          <span className="grad">{hero.titleAccent}</span>
        </h1>
        <p className="sub">
          <Rich runs={hero.sub} />
        </p>
        <div className="hero-cta">
          <a className="btn btn-primary" href={page(`/niveis/${primeiro.slug}`)}>
            {hero.ctaPrimary}
          </a>
          <a className="btn btn-ghost" href={repoUrl}>
            {hero.ctaGhost}
          </a>
        </div>

        <div className="session-eyebrow">{heroSession.eyebrow}</div>
        <HeroSession />
        <p className="session-note">
          <Rich runs={heroSession.note} />
        </p>

        <div className="hero-meta">
          {hero.meta.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <div className="pills">
          {hero.pills.map((runs, i) => (
            <span className="pill" key={i}>
              <Rich runs={runs} />
            </span>
          ))}
        </div>
      </div>
      <TokenStream />
    </header>
  );
}
