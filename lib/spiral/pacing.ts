import type { ConversationState } from "./types";

const GENERIC_OPENERS = /^(entendi|compreendo|sinto muito|parece que|vamos organizar|vamos entender|imagino como|é compreensível)[,.!?]?/i;

export type ConversationalAct =
  | "DISCLOSE"
  | "ELABORATE"
  | "QUESTION"
  | "ADVICE_SEEK"
  | "SHIFT"
  | "CONTRADICT"
  | "CLOSE";

export interface PacingInput {
  history: { role: "user" | "assistant"; content: string }[];
  input: string;
}

export interface PacingDecision {
  state: ConversationState;
  shouldAskQuestion: boolean;
  maxSentences: number;
  act: ConversationalAct;
}

function classifyAct(input: string, history: PacingInput["history"]): ConversationalAct {
  const text = input.trim().toLowerCase();
  if (/^(você não entendeu|não é isso|não foi isso|você está errado|não foi bem isso)/i.test(text)) return "CONTRADICT";
  if (/^(chega|tchau|obrigad[oa]|por hoje (é|foi) só|vou dormir|deixa pra lá|quero parar|é isso)$/i.test(text)) return "CLOSE";
  if (/(o que faço|o que devo fazer|como resolvo|como resolver|qual caminho|me ajuda a decidir|o que você faria|devo fazer)/i.test(text)) return "ADVICE_SEEK";
  if (/^(mas\b|porém\b|na verdade\b|esquece\b|aliás\b|outra coisa\b|mudando de assunto\b|por outro lado\b)/i.test(text)) return "SHIFT";
  if (/[?]$/.test(text) || /^(como|por que|porque|qual|quando|onde|será que)\b/i.test(text)) return "QUESTION";
  return history.some((m) => m.role === "user") ? "ELABORATE" : "DISCLOSE";
}

export function choosePacing({ history, input }: PacingInput): PacingDecision {
  const text = input.trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  const act = classifyAct(input, history);
  const lastAssistant = [...history].reverse().find((m) => m.role === "assistant")?.content ?? "";
  const hasContrast = /\b(mas|porém|só que|ao mesmo tempo|por outro lado|entretanto)\b/i.test(text);
  const hasRecall = /\b(lembrei|lembra|na infância|quando eu era|na escola|antigamente|anos atrás|sonhei|sonho)\b/i.test(text);
  const abruptPivot = Boolean(lastAssistant) && /^(aliás|mudando de assunto|outra coisa|enfim|falando nisso|agora)\b/i.test(text);
  const dense = words >= 80;

  if (act === "CLOSE") return { state: "closing", shouldAskQuestion: false, maxSentences: 1, act };
  if (act === "CONTRADICT") return { state: "mirroring", shouldAskQuestion: false, maxSentences: 1, act };
  if (abruptPivot || act === "SHIFT") return { state: "pivoting", shouldAskQuestion: false, maxSentences: 2, act };
  if (dense) return { state: "holding", shouldAskQuestion: false, maxSentences: 2, act };
  if (act === "ADVICE_SEEK") return { state: "mirroring", shouldAskQuestion: false, maxSentences: 2, act };
  if (hasContrast || (act === "ELABORATE" && words >= 12)) return { state: "juxtaposing", shouldAskQuestion: false, maxSentences: 2, act };
  if (hasRecall) return { state: "deepening", shouldAskQuestion: true, maxSentences: 2, act };
  if (act === "QUESTION") return { state: "mirroring", shouldAskQuestion: false, maxSentences: 2, act };
  return { state: "deepening", shouldAskQuestion: words >= 8, maxSentences: 2, act };
}

export function violatesConversationalRestraint(reply: string): boolean {
  const normalized = reply.trim().replace(/^["“”]+|["“”]+$/g, "");
  if (!normalized) return true;
  if (GENERIC_OPENERS.test(normalized)) return true;
  if (/\b(resumindo|em resumo|vamos organizar|ponto principal|como uma inteligência artificial|é normal sentir)\b/i.test(normalized)) return true;
  if ((normalized.match(/\?/g) || []).length > 1) return true;
  return false;
}
