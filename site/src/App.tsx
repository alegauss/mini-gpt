import { useEffect } from "react";
import { componentFor } from "./routes";

// A casca do cliente. Sem roteador: a página é escolhida no mapa de rotas pelo caminho
// atual, e todo link entre rotas é uma carga completa, porque cada rota é um arquivo
// estático que o prerender já escreveu. O mesmo App é o que o entry-server renderiza do
// lado do build, então cliente e arquivo estático concordam por construção.
export function App({ path }: { path: string }) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    // Isto só alterna a classe de opacidade do próprio elemento; nunca rola nada.
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [path]);

  const Page = componentFor(path);
  return <Page />;
}
