"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const CHECKOUT_URL = "https://buy.stripe.com/dRm6oAfmXcEE0tp6Y3bbG05";

export default function AssinarPage() {
  const [email, setEmail] = useState<string | null>(null);
  const next = useMemo(() => {
    const value = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
    return value && value.startsWith("/") ? value : "/";
  }, []);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const checkout = email
    ? `${CHECKOUT_URL}?prefilled_email=${encodeURIComponent(email)}`
    : CHECKOUT_URL;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg text-center space-y-6">
        <div className="text-sm tracking-[0.24em] text-zinc-400">SPIRAL TALK</div>
        <h1 className="text-3xl tracking-tight">O Spiral fica atrás da assinatura.</h1>
        <p className="text-zinc-400 leading-relaxed">A conversa é privada e o acesso é liberado somente para assinantes ativos.</p>
        <div className="rounded-2xl border border-white/10 p-6 space-y-2">
          <div className="text-2xl">R$ 29,90/mês</div>
          <div className="text-sm text-zinc-500">Assinatura recorrente · cobrança protegida pelo Stripe</div>
        </div>
        <a className="inline-flex w-full items-center justify-center rounded-xl bg-white text-black py-3 font-medium" href={checkout}>
          Assinar Spiral Talk
        </a>
        {!email && <a className="block text-sm text-zinc-500 underline" href={`/login?next=${encodeURIComponent(next)}`}>Entrar com Google antes de assinar</a>}
        <a className="block text-sm text-zinc-500" href="/">Voltar</a>
      </div>
    </main>
  );
}
