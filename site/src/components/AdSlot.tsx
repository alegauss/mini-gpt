/**
 * O slot de anúncio da rede japode.
 *
 * Um `<div>` vazio e nada mais: o loader carregado no `index.html` o encontra pelo
 * atributo `data-japode-ads`, prende um shadow root nele e desenha lá dentro. Nada do
 * React entra nessa árvore, e nada dela sai — a folha de estilo deste site não alcança
 * o anúncio, nem o contrário.
 *
 * A hidratação não disputa o nó. `main.tsx` é um módulo, então hidrata antes do
 * DOMContentLoaded que dispara o loader; o React já terminou com este `<div>` quando o
 * shadow root aparece. E como nada aqui tem estado, ele nunca é re-renderizado depois.
 *
 * O marcador vai como `data-japode-ads=""` e não como atributo booleano do JSX, que o
 * React serializaria como `="true"`. O loader só olha a presença do atributo, então os
 * dois funcionam — mas assim a marcação servida é igual à do trecho publicado em
 * ads.japode.com, e quem comparar os dois não encontra uma diferença para explicar.
 *
 * Os atributos, um a um:
 *
 * - `lang=""` desliga o filtro de idioma. Vazio não é o mesmo que ausente: ausente
 *   herdaria o `pt-BR` da página, e no catálogo só cursarei e mini-gpt são pt-BR — e
 *   mini-gpt se exclui nesta origem, porque este é o site dele. Sobraria uma campanha
 *   só, a mesma para sempre. Aceitar qualquer idioma põe as sete no rodízio, entre elas
 *   roadkeep, FreeWilly e claude-tray, que são o que este leitor de código Java quer ver.
 *
 * - `theme` fica no padrão "auto", que pergunta ao sistema operacional do leitor. O
 *   loader não enxerga o `data-theme` que o botão de tema escreve, então quem inverteu o
 *   tema contra o próprio sistema vê um cartão da outra metade da paleta — legível, com
 *   borda própria, apenas mais claro ou mais escuro do que a página em volta. É o preço
 *   de o anúncio ser isolado, e o caso é a minoria que mexeu no botão.
 *
 * - `memory="off"` recusa a memória de recência, que o loader guardaria no localStorage
 *   desta origem. Ela serve para variar o sorteio entre visitas, e o site já guarda uma
 *   chave só sua (`mg-theme`); uma segunda, de terceiro, não vale a variedade.
 *
 * - `exclude="mini-gpt"` é cinto e suspensório: o catálogo já lista alegauss.github.io
 *   nos `excludeHosts` da campanha, mas essa lista é de lá e pode mudar sem passar por
 *   aqui. Um site não anuncia a si mesmo.
 */
export function AdSlot() {
  return (
    <section className="ad-seam">
      <div className="wrap">
        <div
          className="ad"
          data-japode-ads=""
          data-ad-slot="mini-gpt-home"
          data-ad-format="in-content"
          data-ad-lang=""
          data-ad-memory="off"
          data-ad-exclude="mini-gpt"
        />
      </div>
    </section>
  );
}
