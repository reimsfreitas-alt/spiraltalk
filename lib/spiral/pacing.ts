import type { ConversationState } from "./types";

const GENERIC_OPENERS = /^(entendi|compreendo|sinto muito|parece que|vamos organizar|vamos entender|imagino como|é compreensível)[,.!?]?/i;

export interface PacingInput {
  history: { role: "user" | "assistant"; content: string }[];
  input: string;
}

export interface PacingDecision {
  state: ConversationState;
  shouldAskQuestion: boolean;
  maxSentences: number;
}

export function choosePacing({ history, input }: PacingInput): PacingDecision {
  const text = input.trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  const lastAssistant = [...history].reverse().find((m) => m.role === "assistant")?.content ?? "";
  const hasQuestion = /\?$/.test(text) || /\b(por que|como|o que|qual|será que|devo|deveria)\b/i.test(text);
  const hasLongNarrative = words >= 90;
  const hasContrast = /\b(mas|porém|só que|ao mesmo tempo|por outro lado|entretanto)\b/i.test(text);
  const hasRecall = /\b(lembrei|lembra|na infância|quando eu era|na escola|antigamente|anos atrás|sonhei|sonho)\b/i.test(text);
  const abruptPivot = Boolean(lastAssistant) && /\b(aliás|mudando de assunto|outra coisa|enfim|falando nisso|agora)\b/i.test(text);

  if (hasLongNarrative) return { state: "holding", shouldAskQuestion: false, maxSentences: 3 };
  if (abruptPivot) return { state: "pivoting", shouldAskQuestion: false, maxSentences: 2 };
  if (hasContrast) return { state: "juxtaposing", shouldAskQuestion: true, maxSentences: 3 };
  if (hasRecall) return { state: "deepening", shouldAskQuestion: true, maxSentences: 3 };
  if (hasQuestion) return { state: "mirroring", shouldAskQuestion: true, maxSentences: 4 };
  return { state: "deepening", shouldAskQuestion: true, maxSentences: 3 };
}

export function violatesConversationalRestraint(reply: string): boolean {
  const normalized = reply.trim().replace(/^["“”]+|["“”]+$/g, "");
  if (GENERIC_OPENERS.test(normalized)) return true;
  if (/\b(resumindo|em resumo|vamos organizar|ponto principal)\b/i.test(normalized)) return true;
  if ((normalized.match(/\?/g) || []).length > 1) return true;
  return false;
}
