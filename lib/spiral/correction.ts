/**
 * TAXONOMIA DE CORREÇÃO — cinco coisas diferentes que o projeto proíbe
 * tratar como uma só.
 */
import { negationScope } from "./hypothesis";
import { readIntent, NEGATED_HELP } from "./intent";
export type CorrectionKind = "INTERVENTION_REJECTION"|"FACTUAL_CORRECTION"|"HYPOTHESIS_REJECTION"|"TOPIC_CHANGE"|"RETRACTION"|"NONE";
export type CorrectionReading = { kind: CorrectionKind; negated: string[]; asserted: string[]; confidence: number };
const FACTUAL = /\b(n(ã|a)o (foi|era|(é|e)) \w*\s*(\d|segunda|ter(ç|c)a|quarta|quinta|sexta|s(á|a)bado|domingo|janeiro|fevereiro|mar(ç|c)o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|ontem|hoje|amanh(ã|a))|na verdade (foi|s(ã|a)o|era|eram) )/i;
const TOPIC_SHIFT = /\b(na verdade (o|a|meu|minha|eu)|mudando de assunto|deixa (isso|esse assunto)|outra coisa|esquece isso|falando (de )?outra)\b/i;
const MINIMAL = /^(t(á|a)|ok|uhum|(é|e)|sei l(á|a)|talvez|pode ser|hum+|blz|beleza|certo|entendi|sim|n(ã|a)o sei)[.!]?$/i;
function assertedAfterNegation(text: string): string[] { const out: string[] = []; const re = /n(ã|a)o\s+(?:é|e|foi|era)\s+(?:o|a|os|as)?\s*([\wÀ-ÿ]+)[^.!?]*?[,;]?\s*(?:é|e|mas sim|mas)\s+(?:o|a|os|as)?\s*([\wÀ-ÿ]{4,})/gi; let m: RegExpExecArray | null; while ((m = re.exec(text))) if (m[3]) out.push(m[3].toLowerCase()); return out; }
export function readCorrection(input: string, prevAssistantLength: number): CorrectionReading {
  const text = input.trim(); const intent = readIntent(text); const negated = Array.from(negationScope(text)); const asserted = assertedAfterNegation(text); const words = text.split(/\s+/).filter(Boolean).length;
  const PRONOUNS = new Set(["isso","isto","aquilo","nada","tudo","coisa","assim","mesmo","bem"]);
  const substantive = negated.filter((t) => !PRONOUNS.has(t));
  const addressesAssistant = /(?<![\wÀ-ÿ])voc(ê|e)(?![\wÀ-ÿ])|eu (j(á|a) )?pedi/i.test(text) || NEGATED_HELP.test(text);
  if (intent.distribution.POLICY_FAILURE >= 1.2) { if (!addressesAssistant && substantive.length > 0) return { kind:"HYPOTHESIS_REJECTION", negated, asserted, confidence:0.7 }; return { kind:"INTERVENTION_REJECTION", negated, asserted, confidence:0.8 }; }
  if (FACTUAL.test(text)) return { kind:"FACTUAL_CORRECTION", negated, asserted, confidence:0.6 };
  if (negated.length > 0) return { kind:"HYPOTHESIS_REJECTION", negated, asserted, confidence: asserted.length ? 0.75 : 0.6 };
  if (TOPIC_SHIFT.test(text)) return { kind:"TOPIC_CHANGE", negated, asserted, confidence:0.65 };
  if (MINIMAL.test(text) && words <= 3 && prevAssistantLength >= 12) return { kind:"RETRACTION", negated, asserted, confidence:0.4 };
  return { kind:"NONE", negated, asserted, confidence:0.2 };
}
