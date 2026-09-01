"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "https://buy.stripe.com/aFa00c0s3eMM2BxeqvbbG03";

export default function Page() {
  const router = useRouter();
  const [opening, setOpening] = useState(false);

  function enterRoom() {
    if (opening) return;
    setOpening(true);
    router.push("/chat/new");
  }

  return (
    <main className="room-shell landing-room">
      <div className="room-grain" aria-hidden="true" />
      <section className="room-stage">
        <button className={`room-orb ${opening ? "room-orb-opening" : ""}`} type="button" onClick={enterRoom} disabled={opening} aria-label="Entrar na sala">
          <span className="room-orb-ring ring-one" />
          <span className="room-orb-ring ring-two" />
          <span className="room-orb-core" />
        </button>
        <div className="room-copy"><p className="room-whisper">Pode falar. Estou aqui.</p></div>
        <div className="room-lower">
          <button type="button" className="room-enter-ghost" onClick={enterRoom} disabled={opening}>{opening ? "Abrindo…" : "Entrar na sala"}</button>
          <a className="room-price-link" href={paymentLink}>Continuar por R$ 29,90/mês</a>
        </div>
      </section>
    </main>
  );
}
