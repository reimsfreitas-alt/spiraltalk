import { NextResponse } from "next/server";
import { runCanonicalEngine } from "@/lib/spiral/engine";
export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (typeof b.input !== "string" || !b.input.trim()) return NextResponse.json({error:"Mensagem inválida"},{status:400});
    const history = Array.isArray(b.history) ? b.history.filter((m:any)=>m && (m.role==="user"||m.role==="assistant") && typeof m.content==="string").slice(-30) : [];
    const result = await runCanonicalEngine(history, b.input.trim());
    return NextResponse.json({reply:result.reply,structure:result.structure,safety_state:result.safety_state,conversation_state:result.conversation_state});
  } catch { return NextResponse.json({error:"Não foi possível processar a conversa agora."},{status:500}); }
}