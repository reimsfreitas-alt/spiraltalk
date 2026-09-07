"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => router.replace("/chat/new"), 2200);
    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <div className="text-sm tracking-[0.24em] text-zinc-400">SPIRAL TALK</div>
        <h1 className="text-3xl">Pagamento concluído.</h1>
        <p className="text-zinc-400">Agora vamos abrir sua conversa.</p>
      </div>
    </main>
  );
}
