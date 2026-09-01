"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function NewChat(){const router=useRouter();useEffect(()=>{router.replace(`/chat/founder-${Date.now()}`)},[router]);return <main className="min-h-screen flex items-center justify-center p-6"><p className="text-zinc-400">Abrindo conversa…</p></main>}
