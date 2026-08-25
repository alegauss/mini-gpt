# site — o material didático do Mini GPT

O site público do projeto, em português do Brasil, servido em
<https://alegauss.github.io/mini-gpt/>.

Ele não é uma vitrine do repositório: é a **aula**. O README explica o que o projeto faz;
o site explica *por que cada conta é aquela*, com as demonstrações rodando no navegador
antes de o leitor instalar qualquer coisa.

## Rodar

```bash
npm install
npm run dev        # desenvolvimento, em http://localhost:5173/mini-gpt/
npm run build      # tsc + cliente + cartão social + SSR + prerender -> dist/
npm run preview    # serve o dist/ construído
```

## Como está montado

React 19 + Vite + TypeScript, **sem roteador**: cada rota é um arquivo estático que o
prerender escreve, e todo link entre páginas é uma carga completa. Sem Tailwind, sem
biblioteca de componentes — uma folha de estilo (`src/index.css`) com tokens de cor, na
mesma linha do resto do projeto: pouca dependência, e o que existe dá para ler.

```
site/
├── index.html                  o template; o script de tema roda antes da primeira pintura
├── public/
│   ├── logo.svg                a marca: a máscara causal
│   ├── og.svg                  a fonte do cartão social (rasterizado no build)
│   └── llms.txt                resumo do projeto para agentes
├── scripts/
│   ├── og-image.mjs            og.svg -> dist/og.png, 1200×630
│   └── prerender.mjs           um HTML por rota + manifest, sitemap e robots
└── src/
    ├── routes.tsx              a tabela de rotas e a asserção que a protege
    ├── lib/
    │   ├── content-types.ts    Rich e Block: o texto é dado, não marcação
    │   ├── site-content.ts     o texto da página inicial
    │   ├── levels.ts           os três níveis (cartão + página + metadados, num registro só)
    │   ├── pages-content.ts    /matematica e /como-rodar
    │   ├── minigpt.ts          tradução fiel do nível 1 e da amostragem, para as demos
    │   └── theme.ts            claro/escuro, com a escolha guardada vencendo o sistema
    ├── components/
    │   ├── demos/              as quatro demonstrações interativas
    │   ├── figures/            as figuras SVG, sensíveis ao tema
    │   ├── sections/           as seções da página inicial
    │   └── ui/                 Rich, Blocks, CopyButton, ThemeToggle, TokenStream
    └── pages/                  Landing, Level, Math, Run
```

### Duas regras que o código sustenta sozinho

1. **O texto vive nos módulos de `lib/`, e em mais lugar nenhum.** Uma seção importa um
   valor e o renderiza. Assim uma afirmação sobre o projeto é um elemento de array que um
   revisor confere contra o Java, e não uma string soldada dentro do componente que a
   exibe.

2. **Uma rota não pode existir pela metade.** `routes.tsx` cruza a tabela de metadados com
   o mapa de componentes nos dois sentidos e lança no momento do import. Uma página sem
   título seria prerenderizada sob o título de outra rota, e uma rota sem página nunca
   viraria arquivo — as duas falhas são silenciosas em produção, então são feitas
   barulhentas no build.

## As demonstrações

`src/lib/minigpt.ts` é uma tradução linha a linha de `CharTokenizer.java`,
`BigramModel.java` e `Sampler.java` para TypeScript. O aluno vê o nível 1 funcionando de
verdade — vocabulário, contagem de pares, suavização de Laplace, temperatura, top-k e
amostragem por transformada inversa — e depois reconhece as mesmas contas no Java.

A única diferença deliberada é o gerador pseudoaleatório: `java.util.Random` tem algoritmo
próprio, então a mesma semente não produz o mesmo texto nos dois lados. A
reprodutibilidade, essa vale nos dois.

O corpus das demonstrações também mora nesse arquivo e é curto — alguns milhares de
caracteres — para tudo acontecer no clique. Isso tem um efeito visível: com tão pouco
texto, um `α` alto afoga as contagens reais. O controle de `α` fica à mostra na página
justamente por isso.

## Publicação

`.github/workflows/site.yml`. O build roda em todo push (é o portão); o deploy no GitHub
Pages só dispara em `workflow_dispatch`. Antes do primeiro deploy é preciso ajustar, uma
única vez, **Settings → Pages → Source: GitHub Actions**.
