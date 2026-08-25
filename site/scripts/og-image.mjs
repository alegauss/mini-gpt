// O cartão social. Um og:image apontando para um .svg é um retângulo vazio em toda
// plataforma que renderiza card, então public/og.svg é rasterizado para dist/og.png em
// 1200x630 a cada build — e o cartão se refaz sempre que a marca ou o texto mudam.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const here = dirname(fileURLToPath(import.meta.url));
const siteDir = join(here, "..");
const svgPath = join(siteDir, "public", "og.svg");
const outPath = join(siteDir, "dist", "og.png");

const svg = readFileSync(svgPath, "utf8");

const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
  // o cartão nomeia DejaVu explicitamente; carregar as fontes do sistema é o que faz o
  // texto dele existir
  font: { loadSystemFonts: true, defaultFontFamily: "DejaVu Sans" },
});
const png = resvg.render();
const buf = png.asPng();

const { width, height } = png;
if (width !== 1200 || height !== 630) {
  throw new Error(`og-image: esperava 1200x630, obtive ${width}x${height}`);
}

writeFileSync(outPath, buf);
console.log(`og-image: dist/og.png  ${width}x${height}  (${(buf.length / 1024).toFixed(0)} kB)`);
