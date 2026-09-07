"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CHECKOUT_URL = "https://buy.stripe.com/dRm6oAfmXcEE0tp6Y3bbG05";

export default function AssinarPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const next = useMemo(() => {
    const value = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
    return value && value.startsWith("/") ? value : "/";
  }, []);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      const userEmail = data.user?.email ?? null;
      setEmail(userEmail);
      setLoading(false);
      if (!userEmail) router.replace(`/login?next=${encodeURIComponent(`/assinar?next=${next}`)}`);
    });
  }, [next, router]);

  if (loading || !email) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-zinc-400">Preparando sua assinatura…</p>
      </main>
    );
  }

  const checkout = `${CHECKOUT_URL}?prefilled_email=${encodeURIComponent(email)}`;

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
        <p className="text-xs text-zinc-600">Assinatura vinculada à conta {email}</p>
        <a className="block text-sm text-zinc-500" href="/">Voltar</a>
      </div>
    </main>
  );
}
