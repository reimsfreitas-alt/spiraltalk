import Link from "next/link";

const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "https://buy.stripe.com/aFa00c0s3eMM2BxeqvbbG03";

export default function Page() {
  return (
    <main className="room-shell launch-room">
      <div className="room-grain" aria-hidden="true" />

      <section className="launch-stage" aria-labelledby="launch-title">
        <div className="launch-brand">SPIRAL TALK</div>

        <div className="launch-presence" aria-hidden="true">
          <span className="launch-dot" />
          <span>um lugar para pensar em voz alta</span>
        </div>

        <div className="launch-orb-wrap">
          <div className="launch-orb" aria-hidden="true">
            <span className="launch-orb-ring ring-one" />
            <span className="launch-orb-ring ring-two" />
            <span className="launch-orb-core" />
          </div>
        </div>

        <div className="launch-copy">
          <p className="launch-kicker">SEM ROTEIRO · SEM DIAGNÓSTICO · SEM RESPOSTAS PRONTAS</p>
          <h1 id="launch-title">Fale até conseguir<br />ouvir o que pensa.</h1>
          <p className="launch-description">
            Um espaço para colocar em voz alta aquilo que ainda está confuso, pesado ou sem nome.
            O Spiral acompanha a conversa sem tomar a decisão por você.
          </p>
        </div>

        <div className="launch-action">
          <a className="launch-cta" href={paymentLink} aria-label="Começar Spiral Talk por R$ 29,90 por mês">
            Começar por R$ 29,90/mês
          </a>
          <Link className="launch-login" href="/login">
            Já assina? Entrar
          </Link>
        </div>

        <p className="launch-note">
          Ferramenta de reflexão pessoal. Não substitui atendimento profissional.
        </p>
      </section>
    </main>
  );
}
