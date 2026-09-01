import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "./prompt";
import { choosePacing, violatesConversationalRestraint, type PacingDecision } from "./pacing";
import type { SpiralEngineOutput, SpiralStructure } from "./types";

type HistoryMessage = { role: "user" | "assistant"; content: string };
const MAX_HISTORY = 10;
const RECENT = 3;

function emptyStructure(input: string): SpiralStructure {
  return { central_question: input.slice(0, 180), declared_factors: [], constraints: [], alternatives: [], decision_state: "none", declared_decision: null, open_questions: [], declared_changes: [], memory_candidates: [], confidence: 0.05 };
}

function fallback(history: HistoryMessage[], input: string, pacing: PacingDecision): SpiralEngineOutput {
  const text = input.trim();
  let reply: string;
  if (!text) reply = "Pode começar pelo ponto que estiver mais vivo agora.";
  else if (pacing.act === "CLOSE") reply = "Tudo bem deixar isso por aqui.";
  else if (pacing.act === "CONTRADICT") reply = "Então eu fui para um lugar que não era esse.";
  else if (pacing.act === "ADVICE_SEEK") reply = "Antes de decidir o que fazer, vale separar o problema que você quer resolver daquilo que está tornando essa decisão difícil.";
  else if (pacing.act === "SHIFT") reply = "Vamos acompanhar essa mudança de direção sem puxar o assunto anterior de volta.";
  else if (pacing.act === "QUESTION") reply = "A pergunta que você trouxe merece ser olhada pelo que a fez aparecer agora.";
  else if (pacing.act === "ELABORATE") reply = "Tem mais coisa se formando aí. Pode continuar a partir do que mudou agora.";
  else reply = "Você pode continuar a partir daí, sem precisar organizar isso antes.";
  return { reply, structure: emptyStructure(text), safety_state: "normal", conversation_state: pacing.state };
}

function promptFor(pacing: PacingDecision, history: HistoryMessage[]): string {
  const previous = history.filter(m => m.role === "assistant").slice(-RECENT);
  const prior = previous.length ? `\nÚLTIMAS INTERVENÇÕES (NÃO REPITA A MESMA FUNÇÃO):\n${previous.map((m,i)=>`${i+1}. ${m.content}`).join("\n")}` : "";
  const state = ({
    holding: "Dê espaço. Uma observação curta pode ser melhor que uma pergunta.",
    mirroring: "Responda ao conteúdo concreto. Não faça pergunta apenas para manter o turno.",
    deepening: "Aprofunde somente um fio que já apareceu; prefira intervenção mínima.",
    juxtaposing: "Coloque elementos declarados pelo usuário lado a lado; não diagnostique.",
    pivoting: "Acompanhe a nova direção sem puxar o assunto anterior de volta.",
    closing: "Encerre com sobriedade e não reabra o tema."
  } as Record<string,string>)[pacing.state];
  return `${SYSTEM_PROMPT}\n\nATO ATUAL: ${pacing.act}\nESTADO: ${pacing.state}\n${state}\n\nREGRAS: responda ao conteúdo novo; não use abertura genérica; não repita intervenção anterior; no máximo uma pergunta e somente se houver ganho real; pedido de conselho não autoriza prescrição; correção do usuário invalida a hipótese anterior; não invente fatos, memória ou causalidade; prefira 1–3 frases; seja específico.${prior}`;
}

function tooSimilar(candidate: string, recent: string[]): boolean {
  const n = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  const words = (s: string) => new Set(n(s).split(" ").filter(Boolean));
  const a = words(candidate);
  for (const r of recent.slice(-RECENT)) {
    const b = words(r);
    if (n(candidate) === n(r)) return true;
    const union = new Set([...a, ...b]).size;
    const common = [...a].filter(x => b.has(x)).length;
    if (union && common / union >= 0.72) return true;
    if ([...a].slice(0,4).join(" ") === [...b].slice(0,4).join(" ") && a.size < 20 && b.size < 20) return true;
  }
  return false;
}

function validate(reply: string, pacing: PacingDecision, history: HistoryMessage[]): boolean {
  if (!reply || violatesConversationalRestraint(reply)) return false;
  if (!pacing.shouldAskQuestion && reply.includes("?")) return false;
  if ((reply.match(/\?/g) || []).length > 1) return false;
  if (tooSimilar(reply, history.filter(m => m.role === "assistant").map(m => m.content))) return false;
  return true;
}

export async function runCanonicalEngine(history: HistoryMessage[], input: string): Promise<SpiralEngineOutput> {
  const pacing = choosePacing({ history, input });
  if (!process.env.GEMINI_API_KEY) return fallback(history, input, pacing);
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const contents = [...history.slice(-MAX_HISTORY), { role: "user" as const, content: input }].map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const suffix = attempt ? "\nA resposta anterior foi rejeitada. Gere outra com estrutura diferente e mais específica ao turno atual." : "";
      const r = await ai.models.generateContent({ model: "gemini-2.5-flash", config: { systemInstruction: promptFor(pacing, history) + suffix, responseMimeType: "application/json" }, contents });
      const parsed = JSON.parse(r.text || "{}");
      const reply = String(parsed?.reply || "").trim();
      if (validate(reply, pacing, history)) {
        const structure = parsed.structure && typeof parsed.structure === "object" ? parsed.structure : emptyStructure(input);
        if (structure.decision_state !== "decision") structure.declared_decision = null;
        return { reply, structure, safety_state: parsed.safety_state === "risk_detected" ? "risk_detected" : "normal", conversation_state: ["holding","mirroring","deepening","juxtaposing","pivoting","closing"].includes(parsed.conversation_state) ? parsed.conversation_state : pacing.state };
      }
    }
  } catch {
    // Use an explicit non-deceptive fallback below.
  }
  return fallback(history, input, pacing);
}
