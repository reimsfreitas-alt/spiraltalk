import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function Page(){
 const s=await createServerSupabaseClient();
 const {data:{user}}=await s.auth.getUser();
 if(!user) redirect("/login");
 const {data:continuity}=await s.from("continuity_states").select("*").eq("user_id",user.id).order("updated_at",{ascending:false}).limit(1).maybeSingle();
 return <main className="min-h-screen flex flex-col items-center justify-center p-6"><div className="w-full max-w-2xl text-center space-y-6"><h1 className="text-3xl font-light tracking-tight">SPIRAL TALK</h1><p className="text-zinc-400">Fale. Organize. Continue.</p>{continuity?<><p className="text-lg">{continuity.central_question}</p><div className="flex gap-3 justify-center"><a href={`/chat/new?topic=${encodeURIComponent(continuity.topic_key||"default")}`} className="px-5 py-3 rounded-lg bg-white text-black">Continuar daqui</a><a href="/chat/new" className="px-5 py-3 rounded-lg border border-zinc-700">Começar outro assunto</a></div></>:<a href="/chat/new" className="inline-block px-5 py-3 rounded-lg bg-white text-black">Começar conversa</a>}<div><a href="/api/sessions" className="text-sm text-zinc-400">Conversas anteriores</a></div></div></main>
}
