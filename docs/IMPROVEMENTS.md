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

## Block B — O repositório que um estudante encontra

### §MG2 O README com acentos

O README está todo sem acentos: "nivel de caractere", "o objetivo e didatico", "a
matematica por tras do codigo", "tres niveis", "demonstracoes". O site, as classes e a
aula são escritos em português correto, e o português é o diferencial do projeto: o
público é o estudante brasileiro que conhece Java (visibility, `produtos/mini-gpt.md`,
30/10/2026). O Alexandre decidiu em 30/10/2026 que o projeto fica em português, então o
conserto é acentuar, não traduzir.

O README é a primeira coisa que o GitHub mostra e o texto que os buscadores e os
assistentes leem do repositório; um README sem acentos parece rascunho, e "nivel" ou
"matematica" não casam com quem busca "nível" e "matemática".

O conserto: o README inteiro com a ortografia do português, sem mudar o conteúdo nem os
exemplos de código; `data/README.md` e os comentários de cabeçalho que o README cita
conferidos do mesmo jeito. Uma busca pelas palavras mais comuns sem acento ("nivel",
"tres", "codigo", "matematica", "voce", "nao") no repositório, fora do código, volta
vazia.

### §MG3 Java como linguagem do repositório

O GitHub mostra TypeScript como linguagem principal do repositório: o site em `site/`
tem cerca de 200 KB de TypeScript contra 147 KB de Java em `src/`. Quem procura projetos
pela linguagem Java, no filtro da busca do GitHub ou nos tópicos, não encontra o Mini
GPT, e quem chega vê "TypeScript" ao lado de um projeto que se vende como "um GPT em
Java" (visibility, `produtos/mini-gpt.md`, 30/10/2026).

O conserto é um `.gitattributes` na raiz que tira o site da conta do Linguist sem
tirá-lo do repositório:

    site/** linguist-documentation

O site é a aula, então `linguist-documentation` diz o que ele é; `linguist-vendored`
também serviria, mas o site não é código de terceiros. Depois do push, a barra de
linguagens do repositório mostra Java em primeiro lugar, e os tópicos do repositório
incluem `java`.

### §MG4 O changelog com o que já foi entregue

`docs/CHANGELOG.md` só tem o título e o cabeçalho do bloco A. O projeto, porém, está
completo como material didático: os três níveis (bigrama, MLP com backpropagation à mão,
Transformer com autodiff), os testes que conferem os gradientes por diferenças finitas,
e o site com a aula, o formulário e quatro demonstrações interativas (visibility,
`produtos/mini-gpt.md`, 30/10/2026). Tudo isso foi feito antes da adoção do roadkeep,
por isso nada passou pelo `ship`.

Um changelog vazio diz a quem chega que o projeto não entregou nada, e o roadkeep não
tem história em que se apoiar quando uma tarefa nova repetir algo já feito.

O conserto: cada entrega já feita entra no changelog pelo `roadkeep record add`, com uma
frase do que passou a funcionar, lida do histórico do git (os commits de cada nível, dos
testes de gradiente e do site), num bloco próprio para o que veio antes da adoção.
Nenhum arquivo do roadkeep é editado à mão.
