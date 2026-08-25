import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { AdSlot } from "../components/AdSlot";
import { Hero } from "../components/sections/Hero";
import { Idea } from "../components/sections/Idea";
import { Levels } from "../components/sections/Levels";
import { Pipeline } from "../components/sections/Pipeline";
import { Demos } from "../components/sections/Demos";
import { Trust } from "../components/sections/Trust";
import { Roadmap } from "../components/sections/Roadmap";
import { Lineage } from "../components/sections/Lineage";
import { Rules } from "../components/sections/Rules";
import { Closing } from "../components/sections/Closing";

// A ordem das seções é o argumento, não um índice de funcionalidades:
//
//   o que é isto (herói, com um treino acontecendo)
//   → a única ideia que sustenta tudo (prever o próximo caractere, e como se mede)
//   → os três níveis, como uma escada
//   → o caminho completo, do arquivo ao texto
//   → as contas rodando no navegador, para o leitor tocar antes de ler
//   → por que acreditar nisto (os testes de gradiente)
//   → em que ordem estudar os arquivos
//   → o que o projeto se proíbe de fazer
//   → comece pelo degrau mais baixo.
//
// As demonstrações vêm depois dos níveis e antes dos testes de propósito: quem tocou o
// bigrama funcionando é quem faz a pergunta "mas como sei que o resto está certo?".
//
// O anúncio não entra nessa cadeia porque não é parte do argumento — ele fica na costura
// entre as demonstrações e os testes, que é a única pausa real da página: o leitor acabou
// de mexer nas demos e ainda não começou a pergunta seguinte. É o ponto em que interromper
// custa menos, e o único lugar da página em que nada está disputando um clique.
export function Landing() {
  return (
    <>
      <Nav />
      <Hero />
      <Idea />
      <Levels />
      <Pipeline />
      <Demos />
      <AdSlot />
      <Trust />
      <Roadmap />
      <Lineage />
      <Rules />
      <Closing />
      <Footer />
    </>
  );
}
