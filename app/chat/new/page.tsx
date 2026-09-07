"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewChat(){
  const router=useRouter();
  useEffect(()=>{
    const sessionId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    router.replace(`/chat/${sessionId}`);
  },[router]);
  return <main className="min-h-screen flex items-center justify-center p-6"><p>Abrindo conversa…</p></main>;
}
