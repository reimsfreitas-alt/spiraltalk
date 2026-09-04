export const PRICE_LABEL = "R$ 169,00";
export type CommercialCta = { kind: "buy"; href: string; label: string } | { kind: "pending"; label: string };
export function resolveCommercialCta(url: string | undefined): CommercialCta {
  if (url && /^https:\/\//i.test(url)) return { kind: "buy", href: url, label: "Quero entrar" };
  return { kind: "pending", label: "Acesso comercial em preparação" };
}
