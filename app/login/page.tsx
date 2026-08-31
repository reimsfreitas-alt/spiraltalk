"use client";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const login = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };
  return <main className="min-h-screen flex items-center justify-center p-6"><div className="w-full max-w-md text-center space-y-5"><h1 className="text-2xl tracking-tight">SPIRAL TALK</h1><p className="text-zinc-400">Fale. Organize. Continue.</p><button onClick={login} className="w-full rounded-lg bg-white text-black py-3">Entrar com Google</button></div></main>;
}
