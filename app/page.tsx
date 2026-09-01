import Link from "next/link";

const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "https://buy.stripe.com/aFa00c0s3eMM2BxeqvbbG03";

export default function Page() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#070706] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/[0.08] pb-5">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.32em] text-white/65">SPIRAL TALK</div>
            <div className="mt-1 text-[11px] text-white/25">um lugar para pensar em voz alta</div>
          </div>
          <Link href="/login" className="rounded-full px-3 py-2 text-xs text-white/45 transition hover:bg-white/[0.05] hover:text-white">
            Entrar
          </Link>
        </header>

        <section className="flex flex-1 items-center py-12 sm:py-20">
          <div className="grid w-full gap-14 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
            <div>
              <div className="mb-8 flex items-center gap-3 text-[10px] uppercase tracking-[0.28em] text-white/30">
                <span className="h-px w-10 bg-white/15" />
                conversa · reflexão · continuidade
              </div>

              <h1 className="max-w-4xl text-[clamp(3rem,8vw,6.6rem)] font-light leading-[0.95] tracking-[-0.06em]">
                Fale até conseguir
                <span className="block text-white/45">ouvir o que pensa.</span>
              </h1>

              <p className="mt-8 max-w-2xl text-base leading-7 text-white/55 sm:text-lg sm:leading-8">
                Você não precisa chegar com uma resposta. Abra o Spiral, fale o que está vivo agora e deixe a conversa encontrar o próximo fio.
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href={paymentLink}
                  className="inline-flex min-h-14 items-center justify-center rounded-full bg-white px-8 text-sm font-medium text-black shadow-[0_20px_60px_rgba(255,255,255,0.08)] transition hover:bg-white/90"
                >
                  Começar por R$ 29,90/mês
                </a>
                <Link
                  href="/chat/new"
                  className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/10 px-7 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
                >
                  Conhecer a experiência
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-white/30">
                <span>sem roteiro</span>
                <span>sem diagnóstico</span>
                <span>sem respostas prontas</span>
              </div>
            </div>

            <div className="relative flex justify-center lg:justify-end">
              <div className="absolute h-72 w-72 rounded-full bg-white/[0.035] blur-3xl" />
              <div className="relative flex aspect-square w-[min(72vw,22rem)] items-center justify-center rounded-full border border-white/10 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.08),rgba(255,255,255,0.015)_45%,transparent_70%)] shadow-[0_0_100px_rgba(255,255,255,0.05)]">
                <div className="absolute inset-8 rounded-full border border-white/[0.06]" />
                <div className="absolute inset-16 rounded-full border border-white/[0.05]" />
                <div className="h-5 w-5 rounded-full bg-white/85 shadow-[0_0_35px_rgba(255,255,255,0.35)]" />
                <div className="absolute bottom-7 left-1/2 -translate-x-1/2 text-center text-[10px] uppercase tracking-[0.25em] text-white/25">
                  fale · continue · pense
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 border-t border-white/[0.08] py-10 sm:grid-cols-3 sm:gap-8">
          <div>
            <div className="text-[10px] tracking-[0.25em] text-white/25">01</div>
            <h2 className="mt-3 text-sm font-medium">Comece como estiver.</h2>
            <p className="mt-2 text-sm leading-6 text-white/40">Você pode chegar confuso, cansado ou sem saber por onde começar.</p>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.25em] text-white/25">02</div>
            <h2 className="mt-3 text-sm font-medium">A conversa acompanha.</h2>
            <p className="mt-2 text-sm leading-6 text-white/40">Sem transformar cada fala em checklist, conselho ou interrogatório.</p>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.25em] text-white/25">03</div>
            <h2 className="mt-3 text-sm font-medium">Você continua pensando.</h2>
            <p className="mt-2 text-sm leading-6 text-white/40">A Spiral não decide por você. A ideia é devolver espaço para a sua própria elaboração.</p>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-white/[0.08] py-5 text-[10px] text-white/20 sm:flex-row sm:items-center sm:justify-between">
          <span>SPIRAL CODES</span>
          <span>Ferramenta de reflexão. Não substitui atendimento profissional.</span>
        </footer>
      </div>
    </main>
  );
}
