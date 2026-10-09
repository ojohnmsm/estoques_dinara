const brlFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function brl(valor: number | null | undefined) {
  return brlFmt.format(Number(valor ?? 0));
}

export function num(valor: number, casas = 2) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: casas }).format(valor);
}

export function pct(valor: number | null) {
  return valor == null ? "—" : `${num(valor * 100, 0)}%`;
}

export type Unidade = "g" | "ml" | "un";

/** Custo por unidade base mostrado numa escala legível: R$/kg, R$/L ou R$/un. */
export function custoLegivel(custoPorBase: number | null | undefined, unidade: Unidade) {
  if (custoPorBase == null) return "sem preço";
  if (unidade === "g") return `${brl(custoPorBase * 1000)}/kg`;
  if (unidade === "ml") return `${brl(custoPorBase * 1000)}/L`;
  return `${brl(custoPorBase)}/un`;
}

/** Aceita "1,50" ou "1.50". Retorna NaN se inválido. */
export function parseNumero(valor: FormDataEntryValue | string | null | undefined) {
  if (valor == null) return NaN;
  const s = String(valor).trim().replace(/\s/g, "");
  if (!s) return NaN;
  const normalizado = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  return Number(normalizado);
}

export function dataBR(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

const horaFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
});

export function horaBR(iso: string) {
  return horaFmt.format(new Date(iso));
}

export const FORMAS = [
  { valor: "pix", rotulo: "Pix" },
  { valor: "dinheiro", rotulo: "Dinheiro" },
  { valor: "cartao", rotulo: "Cartão" },
] as const;

export const MOTIVOS = {
  perda: "Perda (derreteu, estragou)",
  consumo: "Consumo próprio / brinde",
  contagem: "Contagem do freezer",
  outro: "Outro",
} as const;
