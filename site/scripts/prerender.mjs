// O prerender: um render por rota, com o <head> corrigido por substituição-ou-erro, para
// que um template que mudou quebre o build em vez de publicar uma página com o título de
// outra rota. Lê o bundle SSR produzido por `vite build --ssr`, e os metadados vêm da
// mesma tabela que routes.tsx já conferiu contra o mapa de componentes — então uma rota
// que falte de um dos lados nunca chega a este laço.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  render,
  ROUTE_META,
  canonicalUrl,
  outputDir,
  OG_IMAGE,
} from "../dist-server/entry-server.js";

const here = dirname(fileURLToPath(import.meta.url));
const distDir = join(here, "..", "dist");
const template = readFileSync(join(distDir, "index.html"), "utf8");

/** Substitui a única ocorrência de `find`, ou lança — âncora sumida é template desviado. */
function replaceOrThrow(html, find, replacement, label) {
  if (typeof find === "string") {
    if (!html.includes(find)) {
      throw new Error(`prerender: o template não contém mais ${label}`);
    }
    return html.replace(find, replacement);
  }
  if (!find.test(html)) {
    throw new Error(`prerender: o template não contém mais ${label}`);
  }
  return html.replace(find, replacement);
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

if (ROUTE_META.length === 0) {
  throw new Error("prerender: ROUTE_META está vazio — nada a renderizar");
}

const byteLength = (s) => Buffer.byteLength(s, "utf8");
const manifestRoutes = [];

for (const meta of ROUTE_META) {
  const body = render(meta.path);
  const canonical = canonicalUrl(meta.path);

  let html = template;

  html = replaceOrThrow(
    html,
    /<title>[\s\S]*?<\/title>/,
    `<title>${escapeHtml(meta.title)}</title>`,
    "um <title>",
  );

  html = replaceOrThrow(
    html,
    /<meta\s+name="description"[\s\S]*?\/>/,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    'um <meta name="description">',
  );

  const headBlock = [
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="pt_BR" />`,
    `<meta property="og:title" content="${escapeHtml(meta.ogTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.ogDescription)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta property="og:image" content="${escapeHtml(OG_IMAGE)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:image" content="${escapeHtml(OG_IMAGE)}" />`,
  ].join("\n    ");
  html = replaceOrThrow(html, "</head>", `  ${headBlock}\n  </head>`, "um </head>");

  html = replaceOrThrow(
    html,
    '<div id="root"></div>',
    `<div id="root">${body}</div>`,
    'o ponto de montagem <div id="root">',
  );

  const rel = outputDir(meta.path);
  const dir = join(distDir, rel);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);

  const htmlPath = rel ? `${rel}/index.html` : "index.html";
  manifestRoutes.push({
    path: meta.path,
    url: canonical,
    title: meta.title,
    description: meta.description,
    html: htmlPath,
    htmlBytes: byteLength(html),
  });
  console.log(`prerenderizado ${meta.path.padEnd(22)} -> ${htmlPath}  (${byteLength(html)} bytes)`);
}

// O manifesto lista as rotas e seus tamanhos. Sem carimbo de data do build: a mesma
// entrada produz a mesma saída, byte a byte.
const manifest = {
  name: "mini-gpt-java",
  base: "/mini-gpt/",
  llms: "llms.txt",
  routes: manifestRoutes,
};
writeFileSync(join(distDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

// --- robots.txt e sitemap.xml ---
// Gerados a partir do mesmo ROUTE_META que o laço acima percorreu, então uma rota que
// existe aparece e uma rota apagada some, sem uma segunda lista para manter atualizada.

/**
 * Quando o site foi editado pela última vez, em YYYY-MM-DD, segundo o git.
 *
 * Não é o relógio do build: uma reconstrução que não mudou nada diria ao rastreador que
 * todas as páginas mudaram. Uma data só para todas as rotas, de propósito — um `lastmod`
 * por URL exigiria saber quais fontes compõem qual página, o que é um grafo de módulos ou
 * uma tabela mantida à mão. Uma data sobre a árvore inteira é uma afirmação mais fraca e
 * verdadeira.
 */
function lastAuthoredChange() {
  try {
    const stamp = execFileSync(
      "git",
      ["log", "-1", "--format=%cs", "--", "src", "public", "index.html"],
      { cwd: join(here, ".."), encoding: "utf8" },
    ).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(stamp)) {
      return stamp;
    }
  } catch {
    // um tarball sem .git, ou git fora do PATH. Um sitemap sem lastmod é válido e não diz
    // nada, o que é melhor do que uma data chutada.
  }
  return null;
}

const lastmod = lastAuthoredChange();
const urls = ROUTE_META.map((meta) => {
  const loc = `    <loc>${escapeHtml(canonicalUrl(meta.path))}</loc>`;
  return lastmod
    ? `  <url>\n${loc}\n    <lastmod>${lastmod}</lastmod>\n  </url>`
    : `  <url>\n${loc}\n  </url>`;
});

writeFileSync(
  join(distDir, "sitemap.xml"),
  '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + urls.join("\n")
    + "\n</urlset>\n",
);

const sitemapUrl = `${canonicalUrl("/")}sitemap.xml`;
writeFileSync(join(distDir, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl}\n`);

console.log(
  `prerender: ${ROUTE_META.length} rota(s) + manifest.json`
    + `, sitemap.xml (lastmod ${lastmod ?? "omitido"}) e robots.txt escritos em dist/`,

);
