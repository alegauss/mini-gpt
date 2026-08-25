import type { FigureName } from "../../lib/content-types";

// As figuras do site, desenhadas à mão em SVG.
//
// Todas usam os tokens de cor da folha de estilo (`var(--line)`, `var(--accent)`, …), o
// que é o único jeito de um desenho embutido acompanhar o tema em vez de brilhar no claro
// ou sumir no escuro. Nenhuma delas é decorativa: cada caixa corresponde a uma linha de
// código, e a legenda embaixo diz qual arquivo.
//
// Todas escalam por `width: 100%` no CSS e têm `viewBox` proporcional, então funcionam de
// um telefone a um monitor sem uma segunda versão.

const LABEL = "var(--muted)";
const TEXT = "var(--text)";
const ACCENT = "var(--accent)";
const LINE = "var(--line)";
const PANEL = "var(--panel-2)";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

/** Uma seta para baixo com um rótulo à direita: o que a etapa faz. */
function Down({ x, y, h, label }: { x: number; y: number; h: number; label: string }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y + h - 8} stroke={LINE} strokeWidth="2" />
      <path d={`M${x - 5} ${y + h - 10} L${x} ${y + h - 2} L${x + 5} ${y + h - 10} Z`} fill={LINE} />
      <text x={x + 14} y={y + h / 2 + 4} fontSize="13" fill={ACCENT} fontFamily={MONO}>
        {label}
      </text>
    </g>
  );
}

/** Uma barra rotulada: um tensor, com o nome à esquerda e a forma à direita. */
function Bar({
  x,
  y,
  w,
  name,
  shape,
  strong,
}: {
  x: number;
  y: number;
  w: number;
  name: string;
  shape: string;
  strong?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height="40"
        rx="10"
        fill={strong ? "var(--n3-soft)" : PANEL}
        stroke={strong ? "var(--n3-line)" : LINE}
        strokeWidth="1.5"
      />
      <text x={x + 16} y={y + 25} fontSize="15" fill={TEXT} fontWeight="700" fontFamily={MONO}>
        {name}
      </text>
      <text x={x + w - 16} y={y + 25} fontSize="12.5" fill={LABEL} textAnchor="end" fontFamily={MONO}>
        {shape}
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------ o MLP (nível 2) */

function MlpFigure() {
  const ids = ["o", " ", "m", "e", "n", "i", "n", "o"];
  return (
    <svg viewBox="0 0 520 430" role="img" aria-label="O caminho de ida do MLP, do id ao logit">
      <title>O caminho de ida do MLP: janela de 8 ids até a distribuição do próximo caractere</title>

      {/* a janela de 8 caracteres */}
      <text x="20" y="20" fontSize="12" fill={LABEL} fontFamily={MONO}>
        janela de T = 8 caracteres
      </text>
      {ids.map((ch, i) => (
        <g key={i}>
          <rect x={20 + i * 44} y={30} width="36" height="36" rx="8" fill={PANEL} stroke={LINE} strokeWidth="1.5" />
          <text
            x={20 + i * 44 + 18}
            y={53}
            fontSize="15"
            fill={TEXT}
            textAnchor="middle"
            fontWeight="700"
            fontFamily={MONO}
          >
            {ch === " " ? "␣" : ch}
          </text>
        </g>
      ))}
      <text x="380" y="53" fontSize="12.5" fill={LABEL} fontFamily={MONO}>
        ids
      </text>

      <Down x={196} y={70} h={44} label="C[id] — embedding aprendido" />
      <Bar x={20} y={114} w={480} name="Xcat" shape="(B × T·E) = (B × 192)" />

      <Down x={196} y={158} h={44} label="· W₁ + b₁, depois tanh" />
      <Bar x={20} y={202} w={480} name="a" shape="(B × H) = (B × 128)" />

      <Down x={196} y={246} h={44} label="· W₂ + b₂" />
      <Bar x={20} y={290} w={480} name="logits" shape="(B × V)" strong />

      <Down x={196} y={334} h={44} label="softmax" />
      <Bar x={20} y={378} w={480} name="p" shape="soma 1 em cada linha" />
    </svg>
  );
}

/* ------------------------------------------------------------------ uma cabeça de atenção */

function AtencaoFigure() {
  return (
    <svg viewBox="0 0 560 360" role="img" aria-label="Uma cabeça de self-attention causal">
      <title>Uma cabeça de atenção: as três projeções, os escores, a máscara e a mistura</title>

      <Bar x={180} y={10} w={200} name="x" shape="(T × E)" />

      {/* as três projeções saem do mesmo x */}
      <line x1="280" y1="50" x2="280" y2="66" stroke={LINE} strokeWidth="2" />
      <path d="M100 66 H460" stroke={LINE} strokeWidth="2" fill="none" />
      {[100, 280, 460].map((x) => (
        <g key={x}>
          <line x1={x} y1="66" x2={x} y2="82" stroke={LINE} strokeWidth="2" />
          <path d={`M${x - 5} 76 L${x} 84 L${x + 5} 76 Z`} fill={LINE} />
        </g>
      ))}

      {/* A fórmula de cada projeção fica sob a sua própria caixa. Uma linha só com as três,
          separadas por espaços, não funcionaria: o SVG colapsa espaços repetidos, e
          separá-las por pontos as confundiria com os pontos de multiplicação. */}
      {[
        { x: 40, name: "Q", sub: "o que procuro", eq: "Q = x·W_Q" },
        { x: 220, name: "K", sub: "o que ofereço", eq: "K = x·W_K" },
        { x: 400, name: "V", sub: "o que entrego", eq: "V = x·W_V" },
      ].map((p) => (
        <g key={p.name}>
          <rect x={p.x} y="88" width="120" height="52" rx="10" fill={PANEL} stroke="var(--n3-line)" strokeWidth="1.5" />
          <text x={p.x + 60} y="110" fontSize="16" fill={ACCENT} textAnchor="middle" fontWeight="700" fontFamily={MONO}>
            {p.name}
          </text>
          <text x={p.x + 60} y="128" fontSize="11.5" fill={LABEL} textAnchor="middle">
            {p.sub}
          </text>
          <text x={p.x + 60} y="158" fontSize="11.5" fill={LABEL} textAnchor="middle" fontFamily={MONO}>
            {p.eq}
          </text>
        </g>
      ))}

      {/* Q e K se encontram nos escores */}
      <path d="M100 140 V178 H280" stroke={LINE} strokeWidth="2" fill="none" />
      <path d="M280 140 V178" stroke={LINE} strokeWidth="2" fill="none" />
      <path d="M275 172 L280 180 L285 172 Z" fill={LINE} />

      <rect x="150" y="186" width="260" height="46" rx="10" fill={PANEL} stroke={LINE} strokeWidth="1.5" />
      <text x="280" y="215" fontSize="14.5" fill={TEXT} textAnchor="middle" fontWeight="700" fontFamily={MONO}>
        Q·Kᵀ / √d  +  máscara
      </text>
      <text x="420" y="215" fontSize="11.5" fill={LABEL} fontFamily={MONO}>
        (T × T)
      </text>

      <Down x={280} y={232} h={40} label="softmax por linha" />

      <rect x="150" y="272" width="260" height="46" rx="10" fill="var(--n3-soft)" stroke="var(--n3-line)" strokeWidth="1.5" />
      <text x="280" y="301" fontSize="14.5" fill={TEXT} textAnchor="middle" fontWeight="700" fontFamily={MONO}>
        pesos · V
      </text>

      {/* V entra na mistura pela direita */}
      <path d="M460 140 V295 H412" stroke={LINE} strokeWidth="2" fill="none" strokeDasharray="5 4" />
      <path d="M418 290 L410 295 L418 300 Z" fill={LINE} />

      <text x="280" y="342" fontSize="12.5" fill={LABEL} textAnchor="middle">
        a saída de cada posição é a média ponderada dos valores que ela escolheu olhar
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ um bloco do Transformer */

function BlocoFigure() {
  return (
    <svg viewBox="0 0 520 400" role="img" aria-label="Um bloco do Transformer, com LayerNorm e conexões residuais">
      <title>Um bloco: LayerNorm, atenção, residual, LayerNorm, feed-forward, residual</title>

      <Bar x={130} y={10} w={260} name="x" shape="(B·T × E)" />

      {/* sub-camada 1 */}
      <Down x={260} y={50} h={36} label="LayerNorm" />
      <rect x="130" y="86" width="260" height="46" rx="10" fill={PANEL} stroke="var(--n3-line)" strokeWidth="1.5" />
      <text x="260" y="115" fontSize="14.5" fill={TEXT} textAnchor="middle" fontWeight="700" fontFamily={MONO}>
        atenção causal multi-head
      </text>

      {/* o residual desvia por fora, à esquerda */}
      <path d="M130 30 H70 V160 H244" stroke="var(--n2)" strokeWidth="2" fill="none" />
      <path d="M238 155 L250 160 L238 165 Z" fill="var(--n2)" />
      <text x="14" y="100" fontSize="11.5" fill="var(--n2)" fontFamily={MONO}>
        residual
      </text>

      <line x1="260" y1="132" x2="260" y2="148" stroke={LINE} strokeWidth="2" />
      <circle cx="260" cy="160" r="12" fill={PANEL} stroke={LINE} strokeWidth="1.5" />
      <text x="260" y="165" fontSize="14" fill={TEXT} textAnchor="middle" fontWeight="700">
        +
      </text>

      {/* sub-camada 2 */}
      <Down x={260} y={172} h={36} label="LayerNorm" />
      <rect x="130" y="208" width="260" height="46" rx="10" fill={PANEL} stroke="var(--n3-line)" strokeWidth="1.5" />
      <text x="260" y="230" fontSize="14.5" fill={TEXT} textAnchor="middle" fontWeight="700" fontFamily={MONO}>
        feed-forward
      </text>
      <text x="260" y="246" fontSize="11.5" fill={LABEL} textAnchor="middle" fontFamily={MONO}>
        E → 4E → E, com tanh no meio
      </text>

      <path d="M248 160 H70 V282 H244" stroke="var(--n2)" strokeWidth="2" fill="none" />
      <path d="M238 277 L250 282 L238 287 Z" fill="var(--n2)" />

      <line x1="260" y1="254" x2="260" y2="270" stroke={LINE} strokeWidth="2" />
      <circle cx="260" cy="282" r="12" fill={PANEL} stroke={LINE} strokeWidth="1.5" />
      <text x="260" y="287" fontSize="14" fill={TEXT} textAnchor="middle" fontWeight="700">
        +
      </text>

      <Down x={260} y={294} h={36} label="para o bloco seguinte" />
      <Bar x={130} y={330} w={260} name="x'" shape="(B·T × E)" strong />

      <text x="260" y="392" fontSize="12" fill={LABEL} textAnchor="middle">
        a derivada de x + f(x) é 1 + f′(x): sempre existe um caminho por onde o gradiente passa inteiro
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ o pipeline completo */

function PipelineFigure() {
  const stages = [
    { label: "corpus", sub: ".txt" },
    { label: "ids", sub: "tokenizador" },
    { label: "janelas", sub: "(x, y)" },
    { label: "logits", sub: "modelo" },
    { label: "p", sub: "softmax" },
    { label: "texto", sub: "amostragem" },
  ];
  return (
    <svg viewBox="0 0 760 120" role="img" aria-label="O pipeline completo, do arquivo de texto ao texto gerado">
      <title>Do arquivo de texto ao texto gerado, em seis etapas</title>
      {stages.map((s, i) => {
        const x = 10 + i * 125;
        return (
          <g key={s.label}>
            <rect x={x} y="26" width="106" height="54" rx="12" fill={PANEL} stroke={LINE} strokeWidth="1.5" />
            <text x={x + 53} y="50" fontSize="15" fill={TEXT} textAnchor="middle" fontWeight="700" fontFamily={MONO}>
              {s.label}
            </text>
            <text x={x + 53} y="68" fontSize="11" fill={LABEL} textAnchor="middle">
              {s.sub}
            </text>
            {i < stages.length - 1 && (
              <g>
                <line x1={x + 108} y1="53" x2={x + 121} y2="53" stroke={LINE} strokeWidth="2" />
                <path d={`M${x + 119} 48 L${x + 127} 53 L${x + 119} 58 Z`} fill={LINE} />
              </g>
            )}
          </g>
        );
      })}
      <text x="380" y="108" fontSize="12" fill={LABEL} textAnchor="middle">
        e o texto gerado volta para o contexto: é isso que significa autoregressivo
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ o seletor */

export function Figure({ name }: { name: FigureName }) {
  switch (name) {
    case "mlp":
      return <MlpFigure />;
    case "atencao":
      return <AtencaoFigure />;
    case "bloco":
      return <BlocoFigure />;
    case "pipeline":
      return <PipelineFigure />;
  }
}
