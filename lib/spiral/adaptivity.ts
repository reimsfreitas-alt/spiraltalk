/**
 * TRÊS ESCALAS DE ADAPTAÇÃO (seção 21). Separadas de propósito: elas
 * respondem a perguntas diferentes e não devem se misturar num só número.
 *
 *  MICRO — dentro do turno: "a resposta que acabei de gerar não presta."
 *          Fonte: Quality Gate. Vida útil: uma tentativa.
 *  MESO  — dentro da sessão: "esta estratégia não funciona NESTA conversa."
 *          Fonte: reações do usuário nesta sessão. Vida útil: a sessão.
 *  MACRO — entre sessões: "este padrão funciona mal neste contexto."
 *          Fonte: agregado pseudonimizado. Vida útil: permanente.
 *
 * As três produzem AJUSTE NUMÉRICO sobre a mesma escala de política, e o
 * traço registra quanto cada uma contribuiu — para que a origem de uma
 * decisão possa ser auditada depois.
 */

import type { PolicyAction } from "./policy";

export type Scale = "micro" | "meso" | "macro";
export type AdaptivityBreakdown = Partial<Record<PolicyAction, Record<Scale, number>>>;

/** Contadores por sessão. Não saem da sessão nem viram agregado. */
export type SessionEffectiveness = Partial<Record<PolicyAction, { tried: number; rejected: number; accepted: number }>>;

export const MESO_MAX = 6;

export function recordSessionOutcome(
  eff: SessionEffectiveness, action: PolicyAction, outcome: "accepted" | "rejected" | "neutral",
): SessionEffectiveness {
  const cur = eff[action] || { tried: 0, rejected: 0, accepted: 0 };
  const next = { tried: cur.tried + 1, rejected: cur.rejected + (outcome === "rejected" ? 1 : 0), accepted: cur.accepted + (outcome === "accepted" ? 1 : 0) };
  return { ...eff, [action]: next };
}

export function mesoPenalty(eff: SessionEffectiveness, action: PolicyAction): number {
  const c = eff[action];
  if (!c || c.tried === 0) return 0;
  const net = c.rejected - c.accepted;
  if (net <= 0) return 0;
  return Math.min(MESO_MAX, 3 + (net - 1) * 1.5);
}

export function combineScales(args: {
  micro: Partial<Record<PolicyAction, number>>;
  meso: Partial<Record<PolicyAction, number>>;
  macro: Record<string, number>;
}): { penalties: Partial<Record<PolicyAction, number>>; breakdown: AdaptivityBreakdown } {
  const penalties: Partial<Record<PolicyAction, number>> = {};
  const breakdown: AdaptivityBreakdown = {};
  const bump = (a: PolicyAction, s: Scale, v: number) => {
    if (!v) return;
    penalties[a] = (penalties[a] || 0) + v;
    breakdown[a] = { micro: 0, meso: 0, macro: 0, ...(breakdown[a] || {}) };
    breakdown[a]![s] += v;
  };
  (Object.keys(args.micro) as PolicyAction[]).forEach((a) => bump(a, "micro", args.micro[a] || 0));
  (Object.keys(args.meso) as PolicyAction[]).forEach((a) => bump(a, "meso", args.meso[a] || 0));
  Object.keys(args.macro).forEach((a) => bump(a as PolicyAction, "macro", -(args.macro[a] || 0)));
  return { penalties, breakdown };
}
