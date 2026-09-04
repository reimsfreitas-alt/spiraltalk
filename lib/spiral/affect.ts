/**
 * MODELO AFETIVO — sinais, não diagnóstico.
 *
 * O que este módulo AFIRMA: que certas marcas linguísticas coocorrem com
 * certas experiências relatadas, com confiança limitada e evidência citável.
 *
 * O que este módulo NÃO afirma, por projeto: estado clínico, bioquímica,
 * fisiologia, transtorno, ou qualquer certeza sobre o interior da pessoa.
 */

export type AffectDimension =
  | "valencia" | "intensidade" | "tensao" | "urgencia" | "carga"
  | "ambivalencia" | "frustracao" | "esperanca" | "medo" | "irritacao"
  | "culpa" | "vergonha" | "alivio" | "confusao" | "impotencia"
  | "necessidade_controle" | "necessidade_escuta" | "necessidade_solucao" | "conflito_objetivos";

export type AffectSignal = { value: number; confidence: number; evidence: string[] };
export type AffectState = { dimensions: Partial<Record<AffectDimension, AffectSignal>>; ambivalent: boolean; overallConfidence: number; statement: string };
type Marker = { dim: AffectDimension; re: RegExp; w: number };
const MARKERS: Marker[] = [
  { dim: "valencia", re: /\b(bom|boa|melhor|aliviad|feliz|content|animad|consegui|deu certo|orgulh)\w*/i, w: 1 },
  { dim: "valencia", re: /\b(ruim|p(é|e)ssim|horr(í|i)vel|pior|triste|desanimad|fracass|deu errado|perdi)\w*/i, w: -1 },
  { dim: "intensidade", re: /\b(muito|demais|extremamente|absurdamente|profundamente|totalmente|completamente|d(e|é) mais)\b/i, w: 1 },
  { dim: "intensidade", re: /!{2,}|\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{5,}\b/, w: 1 },
  { dim: "tensao", re: /\b(tens|press(ã|a)o|apert|sufoc|travad|preso|no limite|n(ã|a)o aguento|peso)\w*/i, w: 1 },
  { dim: "urgencia", re: /\b(urgente|agora|hoje|amanh(ã|a)|prazo|atrasad|correndo|n(ã|a)o d(á|a) (mais )?tempo|(é|e) j(á|a))\w*/i, w: 1 },
  { dim: "carga", re: /\b(cansad|exaust|esgotad|sobrecarreg|acumul|tudo ao mesmo tempo|muita coisa|n(ã|a)o paro)\w*/i, w: 1 },
  { dim: "frustracao", re: /\b(frustr|de novo|sempre a mesma|n(ã|a)o adianta|em v(ã|a)o|perdi tempo|nada muda|cansei de)\w*/i, w: 1 },
  { dim: "esperanca", re: /\b(espero|talvez d(ê|e) certo|quero tentar|vou tentar|acredito que|pode melhorar|tem jeito|vale tentar)\b/i, w: 1 },
  { dim: "medo", re: /\b(medo|receio|assust|apavor|preocupad|(e|é) se|ansios|p(â|a)nico|inseguran(ç|c)a)\w*/i, w: 1 },
  { dim: "irritacao", re: /\b(irrit|raiva|(ó|o)dio|puto|saco|absurdo|inaceit(á|a)vel|palha(ç|c)ada|revolt)\w*/i, w: 1 },
  { dim: "culpa", re: /\b(culpa|minha culpa|errei|deveria ter|n(ã|a)o devia|me arrependo|falhei)\b/i, w: 1 },
  { dim: "vergonha", re: /\b(vergonha|humilh|constrang|ridic|envergonhad|feio da minha parte)\w*/i, w: 1 },
  { dim: "alivio", re: /\b(aliv|respirei|saiu um peso|finalmente|ainda bem|passou)\w*/i, w: 1 },
  { dim: "confusao", re: /\b(confus|perdid|n(ã|a)o sei|embolad|sem sentido|n(ã|a)o entendo|misturad)\w*/i, w: 1 },
  { dim: "impotencia", re: /\b(n(ã|a)o consigo|n(ã|a)o depende de mim|sem sa(í|i)da|imposs(í|i)vel|nada que eu fa(ç|c)a|de m(ã|a)os atadas)\b/i, w: 1 },
  { dim: "necessidade_controle", re: /\b(preciso (organizar|controlar|entender)|quero clareza|quero saber onde|sem controle|no escuro)\b/i, w: 1 },
  { dim: "necessidade_escuta", re: /\b(s(ó|o) queria falar|desabafar|botar pra fora|ningu(é|e)m escuta|preciso falar)\b/i, w: 1 },
  { dim: "necessidade_solucao", re: /\b(preciso resolver|tem que sair do lugar|quero uma sa(í|i)da|preciso decidir|quero agir)\b/i, w: 1 },
];
const CONFLICT = /\b(quero .{2,40} mas .{2,40}|por um lado .{2,60} por outro|ao mesmo tempo que|dividido entre|n(ã|a)o sei se .{2,30} ou)\b/i;
const CONTRAST = /\b(mas|por(é|e)m|s(ó|o) que|ao mesmo tempo|por outro lado|embora)\b/i;
function excerpt(text: string, re: RegExp): string { const m = text.match(re); if (!m) return ""; const i = Math.max(0, (m.index ?? 0) - 12); return text.slice(i, i + 46).trim(); }
function conf(hits: number, words: number): number { const base = 1 - Math.pow(0.55, hits); const shortPenalty = words < 6 ? 0.6 : words < 12 ? 0.82 : 1; return Math.min(0.8, base * shortPenalty); }
export function readAffect(input: string, history: string[] = []): AffectState {
  const text = input.trim(), words = text.split(/\s+/).filter(Boolean).length, context = [...history.slice(-2), text].join(" ");
  const acc = new Map<AffectDimension, { sum: number; hits: number; ev: string[] }>();
  for (const m of MARKERS) { if (!m.re.test(text)) continue; const cur = acc.get(m.dim) || { sum: 0, hits: 0, ev: [] }; cur.sum += m.w; cur.hits += 1; const ex = excerpt(text, m.re); if (ex) cur.ev.push(ex); acc.set(m.dim, cur); }
  const dimensions: Partial<Record<AffectDimension, AffectSignal>> = {};
  acc.forEach((v, dim) => { dimensions[dim] = { value: Math.max(-1, Math.min(1, v.sum / Math.max(1, v.hits))) * Math.min(1, 0.5 + v.hits * 0.25), confidence: conf(v.hits, words), evidence: v.ev.slice(0, 3) }; });
  const positive = ["esperanca", "alivio"].filter((d) => dimensions[d as AffectDimension]);
  const negative = ["frustracao", "medo", "irritacao", "impotencia", "culpa", "vergonha"].filter((d) => dimensions[d as AffectDimension]);
  const declaredConflict = CONFLICT.test(context), ambivalent = (positive.length > 0 && negative.length > 0) || declaredConflict || CONTRAST.test(text);
  if (ambivalent) dimensions.ambivalencia = { value: declaredConflict ? 0.85 : 0.6, confidence: declaredConflict ? 0.7 : 0.45, evidence: [declaredConflict ? excerpt(context, CONFLICT) : excerpt(text, CONTRAST)].filter(Boolean) };
  if (declaredConflict) dimensions.conflito_objetivos = { value: 0.8, confidence: 0.65, evidence: [excerpt(context, CONFLICT)].filter(Boolean) };
  const values = Object.values(dimensions), overallConfidence = values.length ? values.reduce((s, v) => s + v.confidence, 0) / values.length : 0.1;
  const named = (Object.keys(dimensions) as AffectDimension[]).filter((d) => (dimensions[d]?.confidence ?? 0) >= 0.35 && d !== "valencia" && d !== "intensidade").slice(0, 3);
  const statement = !named.length ? "evidência insuficiente para qualquer leitura afetiva; tratar como desconhecido" : "há sinais compatíveis com " + named.join(" e ") + (ambivalent ? ", coexistindo em tensão" : "") + " (hipótese, confiança " + overallConfidence.toFixed(2) + ")";
  return { dimensions, ambivalent, overallConfidence, statement };
}
export function probableNeed(a: AffectState): "escuta" | "solucao" | "organizacao" | "indefinido" {
  const v = (d: AffectDimension) => a.dimensions[d]?.value ?? 0;
  const escuta = v("necessidade_escuta") + v("carga") * 0.5 + v("vergonha") * 0.4;
  const solucao = v("necessidade_solucao") + v("urgencia") * 0.6 + v("impotencia") * 0.3;
  const organizacao = v("confusao") + v("ambivalencia") * 0.7 + v("necessidade_controle") * 0.8;
  const best = Math.max(escuta, solucao, organizacao); if (best < 0.4) return "indefinido"; return best === solucao ? "solucao" : best === organizacao ? "organizacao" : "escuta";
}
