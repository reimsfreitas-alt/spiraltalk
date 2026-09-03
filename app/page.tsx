import Link from "next/link";
import NightSky from "@/components/NightSky";
import AmbientSound from "@/components/AmbientSound";
import HorizonFigure from "@/components/HorizonFigure";

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
          <h1 id="launch-title">Fale até conseguir<br/>ouvir o que pensa.</h1>
          <p className="launch-description">Um espaço para colocar em voz alta aquilo que ainda está confuso, pesado ou sem nome. O Spiral acompanha a conversa sem tomar a decisão por você.</p>
        </div>
        <Link className="launch-cta" href="/chat/founder">Entrar e testar</Link>
        <p className="launch-note">Ferramenta de reflexão pessoal. Não substitui atendimento profissional.</p>
      </section>
    </main>
  );
}
