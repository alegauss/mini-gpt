import { navLinks, page, parentUrl, repoUrl } from "../lib/site-content";
import { ThemeToggle } from "./ui/ThemeToggle";

export function Nav() {
  return (
    <nav>
      <div className="wrap">
        <div className="nav-left">
          <a className="brand" href={page("/")}>
            <img src={`${page("/")}logo.svg`} alt="" width={30} height={30} />
            mini-gpt-java
          </a>
          <a className="parent" href={parentUrl} title="alegauss — pequenas ferramentas">
            <span className="pre">parte de</span>
            <b>alegauss</b>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 17 17 7" />
              <path d="M9 7h8v8" />
            </svg>
          </a>
        </div>
        <div className="nav-links">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
          <a className="btn btn-ghost" href={repoUrl}>
            ★ GitHub
          </a>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
