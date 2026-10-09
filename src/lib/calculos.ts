// Regras de cálculo do SPEC.md §6, espelhadas do banco para pré-visualização na tela.
// O banco (funções RPC) é a fonte da verdade; estes cálculos precisam bater com ele.

export type FormaPagamento = "pix" | "dinheiro" | "cartao";

/** Quantidade comprada convertida para a unidade base (g, ml ou un). */
export function qtdBaseItem(item: { granel: boolean; qtd: number; embalagem: number | null }) {
  if (item.granel) return item.qtd * 1000; // kg → g, L → ml
  if (!item.embalagem) return 0;
  return item.qtd * item.embalagem;
}

/** R$ por unidade base. */
export function custoUnitario(valorTotal: number, qtdBase: number) {
  return qtdBase > 0 ? valorTotal / qtdBase : 0;
}

export function custoReceita(itens: { qtd_base: number; custo_unitario: number | null }[]) {
  let total = 0;
  let incompleto = false;
  for (const i of itens) {
    if (i.custo_unitario == null) incompleto = true;
    else total += i.qtd_base * i.custo_unitario;
  }
  return { total, incompleto };
}

/** Custo médio ponderado móvel após entrar um lote (SPEC §6.3). */
export function novoCustoMedio(estoque: number, medioAtual: number, qtdLote: number, custoUnitLote: number) {
  if (estoque <= 0) return custoUnitLote;
  return (estoque * medioAtual + qtdLote * custoUnitLote) / (estoque + qtdLote);
}

export type VendaResumo = {
  sabor_id: string;
  qtd: number;
  preco_unitario: number;
  custo_unitario: number;
  forma_pagamento: FormaPagamento;
};
export type AjusteResumo = { delta: number; motivo: string; custo_unitario: number };

export type Resumo = {
  faturamento: number;
  porForma: Record<FormaPagamento, number>;
  custoVendidos: number;
  lucroBruto: number;
  margem: number | null;
  perdas: number;
  lucroAposPerdas: number;
  qtdVendida: number;
  porSabor: { sabor_id: string; qtd: number; faturamento: number; lucro: number }[];
  gastoCompras: number;
};

/** Resumo financeiro de um período (SPEC §6.6). */
export function calcularResumo(
  vendas: VendaResumo[],
  ajustes: AjusteResumo[],
  totaisCompras: number[],
): Resumo {
  const porForma: Record<FormaPagamento, number> = { pix: 0, dinheiro: 0, cartao: 0 };
  const sabores = new Map<string, { sabor_id: string; qtd: number; faturamento: number; lucro: number }>();
  let faturamento = 0;
  let custoVendidos = 0;
  let qtdVendida = 0;

  for (const v of vendas) {
    const receita = v.qtd * v.preco_unitario;
    const custo = v.qtd * v.custo_unitario;
    faturamento += receita;
    custoVendidos += custo;
    qtdVendida += v.qtd;
    porForma[v.forma_pagamento] += receita;
    const s = sabores.get(v.sabor_id) ?? { sabor_id: v.sabor_id, qtd: 0, faturamento: 0, lucro: 0 };
    s.qtd += v.qtd;
    s.faturamento += receita;
    s.lucro += receita - custo;
    sabores.set(v.sabor_id, s);
  }

  const perdas = ajustes
    .filter((a) => a.delta < 0 && (a.motivo === "perda" || a.motivo === "consumo"))
    .reduce((t, a) => t + -a.delta * a.custo_unitario, 0);

  const lucroBruto = faturamento - custoVendidos;
  return {
    faturamento,
    porForma,
    custoVendidos,
    lucroBruto,
    margem: faturamento > 0 ? lucroBruto / faturamento : null,
    perdas,
    lucroAposPerdas: lucroBruto - perdas,
    qtdVendida,
    porSabor: [...sabores.values()].sort((a, b) => b.qtd - a.qtd),
    gastoCompras: totaisCompras.reduce((t, x) => t + x, 0),
  };
}
