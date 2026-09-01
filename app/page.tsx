import Link from "next/link";

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
