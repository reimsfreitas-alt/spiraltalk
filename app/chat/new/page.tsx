"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewChat() {
  const router = useRouter();
  const [status, setStatus] = useState("Abrindo conversa…");

  useEffect(() => {
    let cancelled = false;
    const topic = new URLSearchParams(window.location.search).get("topic") || `topic-${Date.now()}`;
    fetch("/api/session/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicKey: topic })
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Não foi possível criar a conversa.");
        if (data?.sessionId && !cancelled) router.replace(`/chat/${data.sessionId}`);
        else if (!cancelled) setStatus("Não foi possível abrir a conversa.");
      })
      .catch(() => { if (!cancelled) setStatus("Não foi possível abrir a conversa. Tente novamente."); });
    return () => { cancelled = true; };
  }, [router]);

  return <main className="min-h-screen flex items-center justify-center p-6"><p className="text-zinc-400">{status}</p></main>;
}
