import { DEMO_CORPUS } from "../../lib/minigpt";

// O rio de caracteres.
//
// A marca deste projeto é a máscara causal, e o material dele é texto cru — então o herói
// fecha num corpus correndo e o rodapé abre de dentro dele. Três faixas, cada uma com sua
// velocidade e seu sentido: a de trás mais pálida e mais lenta, a da frente mais nítida e
// mais rápida. Os sentidos opostos são o que impede três linhas paralelas de lerem como
// uma só.
//
// A costura é aritmética, não sorte: cada faixa contém o MESMO trecho duas vezes e desliza
// exatamente 50% da própria largura — ou seja, um repeat inteiro — então o quadro seguinte
// ao último é idêntico ao primeiro e o laço não tem emenda. É por isso que `width` é
// `max-content` no CSS: 50% precisa ser metade do conteúdo, não metade da tela.
//
// É decoração: não carrega texto que alguém precise ler, então sai da árvore de
// acessibilidade e para de se mover sob prefers-reduced-motion.

/** Uma linha de caracteres do corpus, sem quebras, começando em `from`. */
function lane(from: number, length: number): string {
  const flat = DEMO_CORPUS.replace(/\s+/g, " ");
  // O trecho é lido em círculo, para que qualquer `from` produza uma linha cheia.
  const doubled = flat + flat;
  const start = from % flat.length;
  return doubled.slice(start, start + length);
}

const LANES = [
  { key: "lane-1", text: lane(0, 150) },
  { key: "lane-2", text: lane(420, 190) },
  { key: "lane-3", text: lane(980, 230) },
] as const;

export function TokenStream({ className }: { className?: string }) {
  return (
    <div className={className ? `stream ${className}` : "stream"} aria-hidden="true">
      {LANES.map((l) => (
        <div className={`stream-lane ${l.key}`} key={l.key}>
          {/* duas cópias idênticas: o deslize de 50% cai exatamente na emenda */}
          <span>{l.text}</span>
          <span>{l.text}</span>
        </div>
      ))}
    </div>
  );
}
