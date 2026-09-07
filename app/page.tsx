import Link from "next/link";
import NightSky from "@/components/NightSky";
import AmbientSound from "@/components/AmbientSound";
import HorizonFigure from "@/components/HorizonFigure";

const CHECKOUT_URL = "https://buy.stripe.com/dRm6oAfmXcEE0tp6Y3bbG05";

export default function Page() {
  return (
    <main className="room-shell launch-room">
      <NightSky />
      <div className="room-grain" aria-hidden="true" />
      <AmbientSound />
      <HorizonFigure className="launch-figure" />
      <section className="launch-stage" aria-labelledby="launch-title">
        <div className="launch-brand">SPIRAL TALK</div>
        <div className="launch-presence"><span className="launch-dot" /> um lugar para pensar em voz alta</div>
        <div className="launch-orb"><span className="launch-orb-ring ring-one"/><span className="launch-orb-ring ring-two"/><span className="launch-orb-core"/></div>
        <div className="launch-copy">
          <p className="launch-kicker">SEM ROTEIRO · SEM DIAGNÓSTICO · SEM RESPOSTAS PRONTAS</p>
          <h1 id="launch-title">Você não está confuso.<br/>Está com coisas diferentes misturadas.</h1>
          <p className="launch-description">Fale do jeito que vier. O Spiral acompanha, separa os fios e ajuda você a enxergar o que está acontecendo — sem tomar a decisão por você.</p>
        </div>
        <Link className="launch-cta" href="/chat/new">Falar agora</Link>
        <div className="launch-price">Depois do teste · <strong>R$ 29,90/mês</strong></div>
        <a className="launch-secondary-cta" href={CHECKOUT_URL}>Assinar Spiral Talk · R$ 29,90/mês</a>
        <p className="launch-note">Ferramenta de reflexão pessoal. Não substitui atendimento profissional.</p>
      </section>
    </main>
  );
}
