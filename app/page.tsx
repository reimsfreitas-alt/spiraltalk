import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";

const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "https://buy.stripe.com/aFa00c0s3eMM2BxeqvbbG03";

export default async function Page() {
  const s = await createServerSupabaseClient();
  const { data: { user } } = await s.auth.getUser();

  if (user) {
    const { data: continuity } = await s
      .from("continuity_states")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return (
      <main className="min-h-screen bg-[#080807] text-white">
        <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-12">
          <div className="mb-16 flex items-center justify-between">
            <span className="text-xs font-medium tracking-[0.35em] text-white/60">SPIRAL TALK</span>
            <Link href="/api/sessions" className="text-xs text-white/40 transition hover:text-white">
              Conversas
            </Link>
          </div>

          <div className="space-y-8">
            <p className="text-sm tracking-[0.2em] text-white/40">UM LUGAR PARA PENSAR</p>
            <h1 className="max-w-2xl text-5xl font-light leading-[1.02] tracking-[-0.04em] sm:text-7xl">
              Você não precisa resolver tudo hoje.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-white/60">
              Fale. A Spiral acompanha a conversa. Sem precisar organizar seus pensamentos antes.
            </p>

            {continuity ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <p className="mb-2 text-xs uppercase tracking-[0.18em] text-white/35">Da última conversa</p>
                <p className="text-lg leading-7 text-white/80">{continuity.central_question}</p>
                <Link
                  href={`/chat/new?topic=${encodeURIComponent(continuity.topic_key || "default")}`}
                  className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
                >
                  Continuar daqui
                </Link>
              </div>
            ) : (
              <Link
                href="/chat/new"
                className="inline-flex rounded-full bg-white px-7 py-4 text-sm font-medium text-black transition hover:bg-white/90"
              >
                Começar uma conversa
              </Link>
            )}

            <div className="grid gap-4 border-t border-white/10 pt-8 text-sm text-white/45 sm:grid-cols-3">
              <div><span className="text-white/75">Fale</span><br />Sem roteiro.</div>
              <div><span className="text-white/75">Pense</span><br />Sem pressa.</div>
              <div><span className="text-white/75">Continue</span><br />De onde parou.</div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#080807] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6 sm:px-10">
        <header className="flex items-center justify-between">
          <span className="text-xs font-medium tracking-[0.35em] text-white/65">SPIRAL TALK</span>
          <Link href="/login" className="text-sm text-white/45 transition hover:text-white">
            Entrar
          </Link>
        </header>

        <section className="flex flex-1 items-center py-20">
          <div className="w-full">
            <p className="mb-6 text-xs tracking-[0.28em] text-white/35">CONVERSA • REFLEXÃO • CONTINUIDADE</p>

            <h1 className="max-w-4xl text-5xl font-light leading-[0.98] tracking-[-0.055em] sm:text-7xl lg:text-8xl">
              Às vezes, você não precisa de uma resposta.
              <span className="block text-white/45">Precisa de espaço para pensar.</span>
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-white/55 sm:text-xl">
              Spiral Talk é uma experiência de conversa com inteligência artificial criada para acompanhar você
              quando colocar o que está acontecendo em palavras já é parte do caminho.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              {paymentLink ? (
                <a
                  href={paymentLink}
                  className="inline-flex min-h-14 items-center justify-center rounded-full bg-white px-8 text-sm font-medium text-black transition hover:bg-white/90"
                >
                  Começar por R$ 29,90/mês
                </a>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex min-h-14 items-center justify-center rounded-full bg-white px-8 text-sm font-medium text-black transition hover:bg-white/90"
                >
                  Começar agora
                </Link>
              )}
              <span className="text-sm text-white/35">Edição Fundadora • R$ 29,90/mês</span>
            </div>

            <p className="mt-5 max-w-lg text-xs leading-5 text-white/30">
              O Spiral Talk não é serviço de emergência e não substitui atendimento médico ou psicológico profissional.
            </p>
          </div>
        </section>

        <section className="grid gap-10 border-t border-white/10 py-12 sm:grid-cols-3">
          <div>
            <p className="mb-3 text-xs tracking-[0.2em] text-white/30">01</p>
            <h2 className="text-base font-medium">Sem roteiro</h2>
            <p className="mt-2 text-sm leading-6 text-white/45">Você pode chegar sem saber exatamente o que quer dizer.</p>
          </div>
          <div>
            <p className="mb-3 text-xs tracking-[0.2em] text-white/30">02</p>
            <h2 className="text-base font-medium">Sem julgamento</h2>
            <p className="mt-2 text-sm leading-6 text-white/45">A conversa não existe para apontar quem está certo ou errado.</p>
          </div>
          <div>
            <p className="mb-3 text-xs tracking-[0.2em] text-white/30">03</p>
            <h2 className="text-base font-medium">Sem pressa</h2>
            <p className="mt-2 text-sm leading-6 text-white/45">A experiência foi pensada para acompanhar o seu ritmo.</p>
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-white/10 py-6 text-xs text-white/25 sm:flex-row sm:items-center sm:justify-between">
          <span>SPIRAL CODES</span>
          <span>Uma tecnologia de conversa e reflexão.</span>
        </footer>
      </div>
    </main>
  );
}
