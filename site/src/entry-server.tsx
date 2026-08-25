import { renderToString } from "react-dom/server";
import { App } from "./App";

// O render do lado do build. scripts/prerender.mjs importa isto do bundle SSR e chama
// render(path) uma vez por rota, depois corrige o <head> a partir da mesma tabela de
// rotas. Os metadados são reexportados para o prerender ler exatamente a tabela que a
// asserção em routes.tsx já conferiu contra o mapa de componentes.
export { ROUTE_META, canonicalUrl, outputDir, OG_IMAGE } from "./routes";

/** O render hidratável escrito dentro do arquivo HTML. */
export function render(path: string): string {
  return renderToString(<App path={path} />);
}
