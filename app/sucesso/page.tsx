"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Verificando sua assinatura…");

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      const sessionId = searchParams.get("session_id");
      if (!sessionId) {
        router.replace("/chat/new");
        return;
      }

      const { data } = await createClient().auth.getUser();
      if (!data.user?.email) {
        router.replace(`/login?next=${encodeURIComponent(`/sucesso?session_id=${sessionId}`)}`);
        return;
      }

      const response = await fetch("/api/access", { cache: "no-store" });
      if (cancelled) return;

      if (response.ok) {
        const access = await response.json();
        if (access.active) {
          router.replace("/chat/new");
          return;
        }
      }

      setMessage("Pagamento recebido. Estamos confirmando o acesso…");
      window.setTimeout(async () => {
        const retry = await fetch("/api/access", { cache: "no-store" });
        const access = retry.ok ? await retry.json() : null;
        if (access?.active) router.replace("/chat/new");
        else if (!cancelled) setMessage("A assinatura ainda não apareceu. Aguarde alguns instantes e tente novamente.");
      }, 3000);
    }

    verify();
    return () => { cancelled = true; };
  }, [router, searchParams]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <div className="text-sm tracking-[0.24em] text-zinc-400">SPIRAL TALK</div>
        <h1 className="text-3xl">Pagamento concluído.</h1>
        <p className="text-zinc-400">{message}</p>
      </div>
    </main>
  );
}
