# Improvements

## Block A — O site no design system compartilhado

### §MG1 O site no design system compartilhado

`site/src` carrega `components/Nav.tsx`, `components/Footer.tsx` com o bloco de
patrocínio, `components/AdSlot.tsx`, `components/sections/Hero.tsx` e
`components/ui/CopyButton.tsx`, `ThemeToggle.tsx` e `Rich.tsx`, além de
`scripts/prerender.mjs` e `scripts/og-image.mjs`: o molde que outros sete sites de
produto da alegauss copiam com os mesmos nomes. `index.css` declara os próprios tokens
`--bg*`, `--panel*`, `--violet*` e `--accent*` para os dois modos de cor.

A mudança, depois do piloto (claude-tray T389):

- `data-tone="cool"`: o fundo é um branco tingido de violeta (`#f8f7fd`) e um
  quase-preto (`#0b0a16`), não argila, então o tom quente mudaria a página.
- O acento vem do `projects.json` do hub (`109,74,255`, claro `#8b6bff`), o `--violet`
  que a página já usa. As três cores de nível (âmbar, ciano, violeta) são conteúdo da
  aula e ficam no `index.css` do site.
- Os componentes compartilhados vêm de `./site`; `HeroSession`, as demonstrações, as
  figuras, `Blocks`, `TokenStream`, as seções da aula, as páginas `Level`, `Math` e
  `Run` e `lib/` ficam em `site/src`.
- O build chama os helpers de `./vite` no lugar dos dois scripts.
- O Google Analytics só carrega depois do consentimento, o mesmo fluxo do hub (AG1).

Pronto quando `site/src` não tiver nenhum dos arquivos que `./site` fornece; o HTML
pré-renderizado de cada rota tiver o mesmo texto de antes; capturas de tela clara e
escura de cada rota forem comparadas antes e depois, com as diferenças listadas no
commit; e o site aparecer no `consumers.json` do design system.
