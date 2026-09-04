import Link from "next/link";
import NightSky from "@/components/NightSky";
import AmbientSound from "@/components/AmbientSound";
import HorizonFigure from "@/components/HorizonFigure";
import { resolveCommercialCta, PRICE_LABEL } from "@/lib/commerce/cta";
export default function Page() {
  const cta = resolveCommercialCta(process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_URL);
  return (
    <main className="room-shell launch-room">
      <NightSky />
      <AmbientSound />
      <section className="launch-content">
        <HorizonFigure />
        <div className="launch-copy">
          <p className="eyebrow">SPIRAL TALK</p>
          <h1>Coloque em palavras.<br />Encontre o que importa.</h1>
          <p className="launch-description">Um espaço para colocar em voz alta aquilo que ainda está confuso, pesado ou sem nome. O Spiral acompanha a conversa sem tomar a decisão por você.</p>
        </div>
        <Link className="launch-cta" href="/chat/founder">Entrar e testar</Link>
        <div className="launch-commercial"><span className="launch-price">{PRICE_LABEL}</span>{cta.kind === "buy" ? <a className="launch-buy" href={cta.href} target="_blank" rel="noopener noreferrer">{cta.label}</a> : <span className="launch-buy launch-buy-pending">{cta.label}</span>}</div>
        <p className="launch-note">Ferramenta de reflexão pessoal. Não substitui atendimento profissional.</p>
      </section>
    </main>
  );
}
