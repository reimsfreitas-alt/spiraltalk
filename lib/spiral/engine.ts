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
  if (/\b(ganhar dinheiro|faturar|dinheiro|caixa|receita|vender|vendas)\b/i.test(text)) {
    return "Tem uma urgência muito concreta aí: fazer o que você está criando acontecer. O que está pesando mais nessa urgência agora?";
  }
  if (/\b(cansad[oa]|exaust[oa]|esgotad[oa]|sem energia)\b/i.test(text)) {
    return "Tem um cansaço importante aparecendo no que você trouxe. O que está consumindo mais de você neste momento?";
  }
  if (/\b(medo|receio|apreens[aã]o|ansiedade|ansios[oa])\b/i.test(text)) {
    return "Tem alguma coisa aí que está ganhando peso enquanto você fala. Onde isso aperta mais agora?";
  }
  if (/\b(sonh[eiou]|sonho|inf[aâ]ncia|crian[cç]a|escola|quando eu era)\b/i.test(text)) {
    return "Essa lembrança abriu uma porta para outra parte da sua história. O que aparece primeiro quando você fica mais perto dela?";
  }
  if (pacing.state === "holding") return "Pode continuar. Estou acompanhando sem pressa.";
  if (pacing.state === "pivoting") return "Pode seguir por aí. Não precisamos puxar o assunto anterior de volta.";
  if (pacing.state === "closing") return "Pode deixar isso repousar um pouco. Não precisamos fechar agora.";
  return "Tem algo importante nessa fala. Pode continuar por onde isso estiver pedindo para ir.";
}

function buildFallback(history: HistoryMessage[], input: string): SpiralEngineOutput {
  const pacing = choosePacing({ history, input });
  return { reply: contextualFallback(input, pacing), structure: fallback(input), safety_state: "normal", conversation_state: pacing.state };
}

function pacingInstruction(pacing: PacingDecision): string {
  switch (pacing.state) {
    case "holding": return "ESTADO HOLDING: a pessoa pode ainda estar elaborando. Não pressione por conclusão. Não é obrigatório fazer pergunta.";
    case "pivoting": return "ESTADO PIVOTING: acompanhe a nova direção. Não force o assunto anterior de volta.";
    case "juxtaposing": return "ESTADO JUXTAPOSING: coloque elementos que a própria pessoa declarou lado a lado, com delicadeza. Não acuse contradição e não cobre explicação.";
    case "mirroring": return "ESTADO MIRRORING: responda primeiro ao conteúdo concreto. Pergunte só se houver ganho real de elaboração.";
    case "closing": return "ESTADO CLOSING: favoreça decantação. Não transforme o fim em relatório, tarefa ou checklist.";
    default: return "ESTADO DEEPENING: procure a intervenção mínima que aumente a capacidade da própria pessoa de continuar pensando.";
  }
}

function hardenSystemPrompt(pacing: PacingDecision, recentAssistant: string): string {
  return `${SYSTEM_PROMPT}\n\nDIRETRIZ DE RITMO:\n${pacingInstruction(pacing)}\n\nRESTRIÇÕES OPERACIONAIS:\n- Responda ao conteúdo concreto desta mensagem.\n- Não use abertura genérica só porque uma nova mensagem chegou.\n- Não use perguntas automáticas.\n- Não repita a mesma estrutura das últimas respostas.\n- Não faça mais de uma pergunta nesta rodada.\n- Não invente memória, causalidade, trauma, emoção ou intenção.\n- Se a pessoa estiver continuando uma narrativa, não a interrompa com interrogatório.\n- A melhor resposta pode ser curta, pode conter uma pergunta ou pode não conter nenhuma.\n- Não transforme a conversa em formulário.\n\nRESPOSTA ANTERIOR DA SPIRAL (somente para evitar repetição):\n${recentAssistant || "(nenhuma)"}`;
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
  const recentAssistant = [...history].reverse().find((m) => m.role === "assistant")?.content ?? "";

  try {
    const r = await ai.models.generateContent({ model: "gemini-2.5-flash", config: { systemInstruction: hardenSystemPrompt(pacing, recentAssistant), responseMimeType: "application/json" }, contents });
    const parsed = JSON.parse(r.text || "{}");
    if (!parsed || typeof parsed.reply !== "string" || !parsed.structure || typeof parsed.structure !== "object") throw new Error("Invalid Gemini response");
    const normalized = normalizeResult(parsed, pacing);
    if (violatesConversationalRestraint(normalized.reply)) {
      const retry = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: { systemInstruction: `${hardenSystemPrompt(pacing, recentAssistant)}\n\nA resposta anterior falhou no teste de naturalidade. Gere outra. Ela precisa soar específica para esta fala, sem clichês, sem resumo mecânico e sem pergunta automática.`, responseMimeType: "application/json" },
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
