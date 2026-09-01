import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "./prompt";
import { choosePacing, violatesConversationalRestraint, type PacingDecision } from "./pacing";
import type { SpiralEngineOutput, SpiralStructure } from "./types";

type HistoryMessage = { role: "user" | "assistant"; content: string };

function fallback(input: string): SpiralStructure {
  return { central_question: input.slice(0, 180), declared_factors: [], constraints: [], alternatives: [], decision_state: "none", declared_decision: null, open_questions: [], declared_changes: [], memory_candidates: [], confidence: 0.05 };
}

function contextualFallback(input: string, pacing: PacingDecision): string {
  const text = input.trim().replace(/\s+/g, " ");
  if (!text) return "Pode falar. Estou aqui.";
  if (pacing.state === "holding") return "Pode continuar. Estou acompanhando.";
  if (pacing.state === "pivoting") return "Pode seguir por aí.";
  if (pacing.state === "closing") return "Pode deixar isso decantar por enquanto.";
  return "Pode continuar por onde isso estiver pedindo para ir.";
}

function buildFallback(history: HistoryMessage[], input: string): SpiralEngineOutput {
  const pacing = choosePacing({ history, input });
  return {
    reply: contextualFallback(input, pacing),
    structure: fallback(input),
    safety_state: "normal",
    conversation_state: pacing.state,
  };
}

function pacingInstruction(pacing: PacingDecision): string {
  switch (pacing.state) {
    case "holding":
      return "ESTADO HOLDING: o usuário pode ainda estar elaborando. Não pressione por conclusão. Pode responder brevemente ou sustentar espaço. Não é obrigatório fazer pergunta.";
    case "pivoting":
      return "ESTADO PIVOTING: acompanhe a nova direção. Não force o assunto anterior de volta.";
    case "juxtaposing":
      return "ESTADO JUXTAPOSING: coloque elementos declarados lado a lado com delicadeza. Não acuse contradição e não cobre explicação.";
    case "mirroring":
      return "ESTADO MIRRORING: responda primeiro ao conteúdo concreto trazido. Uma pergunta aberta pode ser usada se realmente ajudar.";
    case "closing":
      return "ESTADO CLOSING: favoreça decantação. Não transforme o fim em relatório nem em lista de tarefas.";
    default:
      return "ESTADO DEEPENING: procure a próxima intervenção mínima que ajude a pessoa a continuar pensando por conta própria.";
  }
}

function hardenSystemPrompt(pacing: PacingDecision): string {
  return `${SYSTEM_PROMPT}\n\nDIRETRIZ DE RITMO PARA ESTA RODADA:\n${pacingInstruction(pacing)}\n\nRESTRIÇÕES OPERACIONAIS:\n- Não use abertura genérica só porque uma nova mensagem chegou.\n- Não repita estruturas usadas nas últimas respostas quando houver alternativa natural.\n- Não faça mais de uma pergunta nesta rodada.\n- Não invente memória, causalidade ou emoção.\n- Se o usuário estiver apenas continuando a narrativa, não interrompa o fluxo com interrogatório.\n`;
}

function normalizeResult(parsed: any, pacing: PacingDecision): SpiralEngineOutput {
  if (!["holding", "mirroring", "deepening", "juxtaposing", "pivoting", "closing"].includes(parsed?.conversation_state)) parsed.conversation_state = pacing.state;
  if (parsed?.structure?.decision_state !== "decision") parsed.structure.declared_decision = null;
  return parsed as SpiralEngineOutput;
}

export async function runCanonicalEngine(history: HistoryMessage[], input: string): Promise<SpiralEngineOutput> {
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
        systemInstruction: hardenSystemPrompt(pacing),
        responseMimeType: "application/json",
      },
      contents,
    });

    const parsed = JSON.parse(r.text || "{}");
    if (!parsed || typeof parsed.reply !== "string" || !parsed.structure || typeof parsed.structure !== "object") throw new Error("Invalid Gemini response");
    const normalized = normalizeResult(parsed, pacing);

    if (violatesConversationalRestraint(normalized.reply)) {
      const retry = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: `${hardenSystemPrompt(pacing)}\n\nA resposta anterior falhou no teste de contenção conversacional. Reescreva a resposta sem clichês de atendimento, sem resumo mecânico, sem abertura automática e sem transformar a fala do usuário em formulário. Preserve a especificidade do que foi dito.`,
          responseMimeType: "application/json",
        },
        contents,
      });
      const repaired = JSON.parse(retry.text || "{}");
      if (repaired && typeof repaired.reply === "string" && repaired.structure) return normalizeResult(repaired, pacing);
    }

    return normalized;
  } catch {
    return buildFallback(history, input);
  }
}
