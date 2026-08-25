// O texto do site é dado, não marcação.
//
// Um parágrafo é uma lista de trechos etiquetados (`Rich`) em vez de HTML cru, para que
// as seções o renderizem sem `dangerouslySetInnerHTML` e para que um revisor consiga
// conferir uma afirmação olhando um elemento de array, não uma string soldada dentro do
// componente que a exibe.
//
// Um bloco é a unidade maior: parágrafo, subtítulo, fórmula com legenda, bloco de código,
// aviso, lista ou figura. As páginas de profundidade e o glossário são listas de blocos,
// e existe um único renderizador para todos eles (components/ui/Blocks.tsx). Acrescentar
// um tipo de bloco é acrescentar um `case` lá — e o TypeScript aponta se faltar.

export type Run =
  | string
  | { code: string }
  | { b: string }
  | { i: string }
  | { a: { href: string; label: string } };

export type Rich = Run[];

/** As figuras SVG desenhadas à mão, escolhidas por nome a partir do conteúdo. */
export type FigureName = "pipeline" | "mlp" | "bloco" | "atencao";

export type Block =
  /** Um parágrafo. */
  | { kind: "p"; runs: Rich }
  /** Um subtítulo dentro da seção. */
  | { kind: "h"; text: string }
  /**
   * Uma fórmula, sempre com a legenda de cada símbolo. Uma equação sem legenda é uma
   * parede: o aluno que não reconhece um símbolo não tem por onde entrar, e é exatamente
   * o aluno para quem este site existe.
   */
  | { kind: "formula"; eq: string[]; terms?: { sym: string; def: Rich }[]; note?: Rich }
  /** Um trecho de código ou de saída de terminal, uma linha por elemento. */
  | { kind: "code"; lines: string[]; caption?: string }
  /** Um aviso: dica, cuidado, ou a ideia-chave da seção. */
  | { kind: "note"; tone: "tip" | "warn" | "key"; title: string; runs: Rich }
  /** Uma lista de itens curtos. */
  | { kind: "list"; items: Rich[] }
  /** Uma das figuras SVG, com legenda opcional. */
  | { kind: "figure"; name: FigureName; caption?: Rich };
