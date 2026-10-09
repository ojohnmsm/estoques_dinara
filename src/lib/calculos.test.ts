import { describe, expect, it } from "vitest";
import { calcularResumo, custoReceita, custoUnitario, novoCustoMedio, qtdBaseItem } from "./calculos";

// Mesmo cenário usado para validar as funções do banco (calculado à mão).
describe("compra", () => {
  it("converte embalagens para a unidade base", () => {
    expect(qtdBaseItem({ granel: false, qtd: 2, embalagem: 395 })).toBe(790);
    expect(custoUnitario(17, 790)).toBeCloseTo(0.021519, 6);
  });

  it("item a granel usa o peso em kg × 1000", () => {
    const base = qtdBaseItem({ granel: true, qtd: 0.45, embalagem: null });
    expect(base).toBe(450);
    expect(custoUnitario(13.46, base)).toBeCloseTo(0.029911, 6);
  });

  it("sem embalagem informada não inventa quantidade", () => {
    expect(qtdBaseItem({ granel: false, qtd: 3, embalagem: null })).toBe(0);
    expect(custoUnitario(10, 0)).toBe(0);
  });
});

describe("receita", () => {
  it("soma o custo dos ingredientes", () => {
    const r = custoReceita([
      { qtd_base: 395, custo_unitario: 17 / 790 },
      { qtd_base: 500, custo_unitario: 0.005 },
      { qtd_base: 250, custo_unitario: 0.03 },
      { qtd_base: 20, custo_unitario: 0.08 },
    ]);
    expect(r.total).toBeCloseTo(20.1, 6);
    expect(r.incompleto).toBe(false);
  });

  it("marca incompleto quando falta preço", () => {
    const r = custoReceita([
      { qtd_base: 100, custo_unitario: 0.01 },
      { qtd_base: 5, custo_unitario: null },
    ]);
    expect(r.total).toBeCloseTo(1, 6);
    expect(r.incompleto).toBe(true);
  });
});

describe("custo médio", () => {
  it("pondera o estoque atual com o lote novo", () => {
    expect(novoCustoMedio(15, 1.005, 18, 22.6 / 18)).toBeCloseTo(1.141667, 6);
  });

  it("estoque zerado ou negativo assume o custo do lote", () => {
    expect(novoCustoMedio(0, 1.5, 20, 1.2)).toBe(1.2);
    expect(novoCustoMedio(-3, 1.5, 20, 1.2)).toBe(1.2);
  });
});

describe("resumo", () => {
  const r = calcularResumo(
    [
      { sabor_id: "m", qtd: 5, preco_unitario: 5, custo_unitario: 1.005, forma_pagamento: "pix" },
      { sabor_id: "m", qtd: 3, preco_unitario: 4.5, custo_unitario: 1.141667, forma_pagamento: "dinheiro" },
      { sabor_id: "c", qtd: 2, preco_unitario: 6, custo_unitario: 2, forma_pagamento: "cartao" },
    ],
    [
      { delta: -5, motivo: "contagem", custo_unitario: 1.141667 },
      { delta: -2, motivo: "perda", custo_unitario: 1 },
      { delta: -1, motivo: "consumo", custo_unitario: 1.5 },
      { delta: 3, motivo: "outro", custo_unitario: 1 },
    ],
    [40, 20],
  );

  it("faturamento, custo e lucro", () => {
    expect(r.faturamento).toBeCloseTo(25 + 13.5 + 12, 6);
    expect(r.porForma).toEqual({ pix: 25, dinheiro: 13.5, cartao: 12 });
    expect(r.custoVendidos).toBeCloseTo(5.025 + 3.425001 + 4, 5);
    expect(r.lucroBruto).toBeCloseTo(50.5 - 12.450001, 5);
    expect(r.margem).toBeCloseTo((50.5 - 12.450001) / 50.5, 5);
    expect(r.qtdVendida).toBe(10);
  });

  it("perdas contam só perda e consumo (contagem é correção, não perda)", () => {
    expect(r.perdas).toBeCloseTo(3.5, 6);
    expect(r.lucroAposPerdas).toBeCloseTo(r.lucroBruto - 3.5, 6);
  });

  it("ranking por sabor e gasto em compras", () => {
    expect(r.porSabor.map((s) => s.sabor_id)).toEqual(["m", "c"]);
    expect(r.porSabor[0].lucro).toBeCloseTo(38.5 - 8.450001, 5);
    expect(r.gastoCompras).toBe(60);
  });

  it("sem vendas não tem margem", () => {
    expect(calcularResumo([], [], []).margem).toBeNull();
  });
});
