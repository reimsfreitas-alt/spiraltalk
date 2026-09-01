import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "./prompt";
import { choosePacing, violatesConversationalRestraint } from "./pacing";
import type { SpiralEngineOutput, SpiralStructure } from "./types";

function fallback(input: string): SpiralStructure {
  return { central_question: input.slice(0, 180), declared_factors: [], constraints: [], alternatives: [], decision_state: "none", declared_decision: null, open_questions: [], declared_changes: [], memory_candidates: [], confidence: 0.05 };
}

function contextualFallback(input: string): string {
  const text = input.trim().replace(/\s+/g, " ");
  if (!text) return "Pode falar. Estou aqui.";
  const excerpt = text.length > 180 ? text.slice(0, 177) + "…" : text;
  return `Você está trazendo “${excerpt}”. Pode continuar por onde isso estiver pedindo para ir.`;
}

function buildFallback(history: { role: "user" | "assistant"; content: string }[], input: string): SpiralEngineOutput {
  const pacing = choosePacing({ history, input });
  const structure = fallback(input);
  return {
    reply: pacing.state === "holding" ? "Estou ouvindo. Pode continuar." : contextualFallback(input),
    structure,
    safety_state: "normal",
    conversation_state: pacing.state,
  };
}

export async function runCanonicalEngine(history: { role: "user" | "assistant"; content: string }[], input: string): Promise<SpiralEngineOutput> {
  const pacing = choosePacing({ history, input });
  if (!process.env.GEMINI_API_KEY) return buildFallback(history, input);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const contents = [...history.slice(-12), { role: "user" as const, content: input }].map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  try {
    const r = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
      },
      contents,
    });

    const parsed = JSON.parse(r.text || "{}");
    if (!parsed || typeof parsed.reply !== "string" || !parsed.structure || typeof parsed.structure !== "object") throw new Error("Invalid Gemini response");
    if (!["holding", "mirroring", "deepening", "juxtaposing", "pivoting", "closing"].includes(parsed.conversation_state)) parsed.conversation_state = pacing.state;
    if (parsed.structure.decision_state !== "decision") parsed.structure.declared_decision = null;

    if (violatesConversationalRestraint(parsed.reply)) {
      const retry = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: `${SYSTEM_PROMPT}\n\nCORREÇÃO DE QUALIDADE:\nA primeira resposta falhou no teste de naturalidade. Gere outra resposta para a mesma mensagem. Não use abertura automática, não faça resumo mecânico, não diga “Entendi”, “Vamos organizar”, “Qual é o ponto principal?” ou equivalentes. Responda ao detalhe mais significativo do usuário. Uma única pergunta no máximo. Estado desejado: ${pacing.state}.`,
          responseMimeType: "application/json",
        },
        contents,
      });
      const repaired = JSON.parse(retry.text || "{}");
      if (repaired && typeof repaired.reply === "string" && repaired.structure) {
        if (!["holding", "mirroring", "deepening", "juxtaposing", "pivoting", "closing"].includes(repaired.conversation_state)) repaired.conversation_state = pacing.state;
        if (repaired.structure.decision_state !== "decision") repaired.structure.declared_decision = null;
        return repaired;
      }
    }

    return parsed;
  } catch {
    return buildFallback(history, input);
  }
}
