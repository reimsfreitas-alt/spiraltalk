import { NextResponse } from "next/server";
import { runCanonicalEngine } from "@/lib/spiral/engine";
import { getAuthenticatedUser, hasActiveSpiralSubscription } from "@/lib/access";

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.email) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });

    const active = await hasActiveSpiralSubscription(user.email);
    if (!active) return NextResponse.json({ error: "Assinatura necessária para continuar." }, { status: 402 });

    const body = await req.json();
    const input = typeof body?.input === "string" ? body.input.trim() : "";
    if (!input) return NextResponse.json({ error: "Fala vazia." }, { status: 400 });
    if (input.length > 4000) return NextResponse.json({ error: "Fala muito longa." }, { status: 413 });

    const history = Array.isArray(body?.history)
      ? body.history
          .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
          .slice(-8)
          .map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content.slice(0, 4000) }))
      : [];

    const result = await runCanonicalEngine(history, input);
    return NextResponse.json({
      reply: result.reply,
      conversation_state: result.conversation_state,
      safety_state: result.safety_state,
    });
  } catch {
    return NextResponse.json({ error: "A conversa encontrou uma pausa. Tente novamente." }, { status: 500 });
  }
}
