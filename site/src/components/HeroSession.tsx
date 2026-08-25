import { useEffect, useRef, useState } from "react";
import { heroSession } from "../lib/site-content";

// A sessão de treino que abre a página.
//
// Ela se escreve sozinha, linha a linha, porque o que se quer mostrar não é uma tela: é
// uma passagem do tempo — a perda caindo e o texto saindo do ruído. Uma captura estática
// mostraria o fim sem mostrar o percurso, que é justamente a parte que ensina.
//
// A reprodução é do cliente, e só dele. O HTML prerenderizado traz todas as linhas
// visíveis, então quem chega sem JavaScript (ou um rastreador) lê a sessão inteira de uma
// vez. É por isso que o estado inicial mostra tudo e o efeito é que o esconde: o primeiro
// render do cliente tem que bater, byte a byte, com o arquivo que o prerender escreveu.

/** Quanto tempo cada linha espera antes de a próxima entrar. */
function atraso(texto: string): number {
  if (texto.startsWith("  --- amostra")) return 320; // a pausa antes do texto gerado
  if (texto.trim() === "") return 90;
  return 150;
}

export function HeroSession() {
  const total = heroSession.lines.length;
  const [visiveis, setVisiveis] = useState(total);
  const [tocando, setTocando] = useState(false);
  const scrollRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const reduzido =
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduzido) return;

    setTocando(true);
    setVisiveis(0);

    let i = 0;
    let timer = 0;
    const passo = () => {
      i += 1;
      setVisiveis(i);
      if (i < total) {
        timer = window.setTimeout(passo, atraso(heroSession.lines[i - 1].text));
      }
    };
    timer = window.setTimeout(passo, 420);
    return () => window.clearTimeout(timer);
  }, [total]);

  // Acompanha a última linha ESCRITA, não o fim do elemento.
  //
  // As linhas ainda não reveladas continuam ocupando espaço (só a opacidade é zero, para
  // que o terminal não pule de altura a cada linha nova). Rolar até `scrollHeight` levaria
  // a vista para dentro desse espaço em branco — o efeito seria um terminal vazio rolando
  // sozinho. O alvo certo é a base do último filho visível.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !tocando || visiveis === 0) return;
    const ultima = el.children[visiveis - 1] as HTMLElement | undefined;
    if (!ultima) return;
    const alvo = ultima.offsetTop + ultima.offsetHeight - el.clientHeight;
    el.scrollTop = Math.max(0, alvo);
  }, [visiveis, tocando]);

  return (
    <div className={tocando ? "session session--playing" : "session"}>
      <div className="term">
        <div className="bar">
          <i />
          <i />
          <i />
          <span>{heroSession.title}</span>
        </div>
        <pre ref={scrollRef}>
          {heroSession.lines.map((line, i) => (
            <div
              key={i}
              className={
                tocando && i >= visiveis ? "session-line" : "session-line in"
              }
            >
              <span className={line.tone}>{line.text === "" ? " " : line.text}</span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
