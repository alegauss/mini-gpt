import type { ComponentType } from "react";
import { Landing } from "./pages/Landing";
import { LevelPage } from "./pages/Level";
import { MathPage } from "./pages/Math";
import { RunPage } from "./pages/Run";
import { meta } from "./lib/site-content";
import { levels } from "./lib/levels";
import { mathPage, runPage } from "./lib/pages-content";

// O GitHub Pages deriva o prefixo do nome do repositório: o site é servido em
// https://alegauss.github.io/mini-gpt/, então a URL canônica, a og:url, o sitemap e todo
// caminho de saída o carregam. Escrito aqui e em vite.config.ts, e em mais lugar nenhum.
export const SITE_ORIGIN = "https://alegauss.github.io";
export const BASE = "/mini-gpt/";

/** O cartão social, rasterizado em dist/og.png. Absoluto, porque quem busca o cartão não
 *  está nesta origem. */
export const OG_IMAGE = `${SITE_ORIGIN}${BASE}og.png`;

export type RouteMeta = {
  /** caminho da aplicação, com barra inicial: "/" ou "/matematica" ou "/niveis/mlp" */
  path: string;
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
};

// A tabela de metadados. Uma linha por rota; o prerender a lê para corrigir o <head> de
// cada página. Acrescentar uma página é uma linha aqui E uma linha em ROUTES — a asserção
// no fim deste módulo recusa qualquer uma das duas sozinha, no momento do import, nos dois
// sentidos.
export const ROUTE_META: RouteMeta[] = [
  {
    path: "/",
    title: meta.title,
    description: meta.description,
    ogTitle: meta.og.title,
    ogDescription: meta.og.description,
  },
  // Os três níveis leem os próprios metadados do mesmo registro que gera a rota e a
  // página, então um nível não pode existir com rota e sem título.
  ...levels.map((l) => ({
    path: `/niveis/${l.slug}`,
    title: l.title,
    description: l.description,
    ogTitle: l.ogTitle,
    ogDescription: l.ogDescription,
  })),
  {
    path: "/matematica",
    title: mathPage.title,
    description: mathPage.description,
    ogTitle: mathPage.ogTitle,
    ogDescription: mathPage.ogDescription,
  },
  {
    path: "/como-rodar",
    title: runPage.title,
    description: runPage.description,
    ogTitle: runPage.ogTitle,
    ogDescription: runPage.ogDescription,
  },
];

// O mapa rota → componente. O cliente (App) e o prerender (entry-server) leem esta mesma
// fonte, então uma rota não pode renderizar uma página no cliente e outra no arquivo
// estático.
export const ROUTES: { path: string; component: ComponentType }[] = [
  { path: "/", component: Landing },
  ...levels.map((l) => ({
    path: `/niveis/${l.slug}`,
    // um componente estável por registro, amarrado a ele
    component: function BoundLevel() {
      return <LevelPage level={l} />;
    },
  })),
  { path: "/matematica", component: MathPage },
  { path: "/como-rodar", component: RunPage },
];

/** A URL canônica / og:url de uma rota, carregando o prefixo que a URL nunca perde. */
export function canonicalUrl(path: string): string {
  const rel = path === "/" ? "" : `${path.replace(/^\//, "")}/`;
  return `${SITE_ORIGIN}${BASE}${rel}`;
}

/** O caminho do arquivo HTML de uma rota, relativo a dist/. "/" → "", "/matematica" → "matematica". */
export function outputDir(path: string): string {
  return path === "/" ? "" : path.replace(/^\//, "");
}

// --- o par, conferido nos dois sentidos no momento do import ---
// Uma rota com componente e sem metadados é prerenderizada sob o título de outra; uma rota
// com metadados e sem componente nunca vira arquivo. As duas falhas são silenciosas em
// tempo de execução, então são feitas barulhentas no import: este throw derruba o tsc, o
// build ou o prerender, o que importar primeiro.
(function assertRoutePair(): void {
  const metaPaths = ROUTE_META.map((r) => r.path);
  const compPaths = ROUTES.map((r) => r.path);
  const metaSet = new Set(metaPaths);
  const compSet = new Set(compPaths);
  if (metaSet.size !== metaPaths.length) {
    throw new Error("routes: um caminho aparece duas vezes em ROUTE_META");
  }
  if (compSet.size !== compPaths.length) {
    throw new Error("routes: um caminho aparece duas vezes em ROUTES");
  }
  for (const p of compSet) {
    if (!metaSet.has(p)) {
      throw new Error(`routes: "${p}" tem página mas não tem metadados — acrescente em ROUTE_META`);
    }
  }
  for (const p of metaSet) {
    if (!compSet.has(p)) {
      throw new Error(`routes: "${p}" tem metadados mas não tem página — acrescente em ROUTES`);
    }
  }
})();

export function metaFor(path: string): RouteMeta {
  const found = ROUTE_META.find((r) => r.path === path);
  if (!found) throw new Error(`routes: não há metadados para "${path}"`);
  return found;
}

export function componentFor(path: string): ComponentType {
  const found = ROUTES.find((r) => r.path === path);
  if (!found) throw new Error(`routes: não há página para "${path}"`);
  return found.component;
}

/** Tira o prefixo do Vite de um pathname do navegador e normaliza para um caminho da aplicação. */
export function toAppPath(pathname: string): string {
  let p = pathname;
  if (p.startsWith(BASE)) {
    p = "/" + p.slice(BASE.length);
  } else if (p === BASE.replace(/\/$/, "")) {
    p = "/";
  }
  if (p.length > 1) {
    p = p.replace(/\/+$/, "");
  }
  return p === "" ? "/" : p;
}
