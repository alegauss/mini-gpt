import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// O GitHub Pages deriva este prefixo do nome do repositório: o site é servido em
// https://alegauss.github.io/mini-gpt/, então toda URL canônica, caminho de asset e
// entrada do sitemap carrega o prefixo. Escrito aqui e em src/routes.tsx, e em mais
// lugar nenhum.
export const BASE = "/mini-gpt/";

export default defineConfig({
  base: BASE,
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
