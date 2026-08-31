"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function NewChatContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [topic] = useState(() => params.get("topic") || `topic-${Date.now()}`);
  useEffect(() => {
    fetch("/api/session/create", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({topicKey:topic}) })
      .then(r=>r.json()).then(d=>{ if(d.sessionId) router.replace(`/chat/${d.sessionId}`); });
  }, [router, topic]);
  return <main className="min-h-screen flex items-center justify-center p-6"><p className="text-zinc-400">Abrindo conversa…</p></main>;
}
export default function NewChat() {
  return <Suspense fallback={<main className="min-h-screen flex items-center justify-center p-6"><p className="text-zinc-400">Abrindo conversa…</p></main>}><NewChatContent /></Suspense>;
}
