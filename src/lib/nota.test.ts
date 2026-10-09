import { describe, expect, it } from "vitest";
import { chaveValida, embalagemNaUnidade, limparNota, normalizarTexto, sugerirLinhas, type ItemLido } from "./nota";
import { custoUnitario, qtdBaseItem } from "./calculos";

// Itens transcritos dos cupons reais usados para validar a fase 2.
const item = (p: Partial<ItemLido> & Pick<ItemLido, "texto">): ItemLido => ({
  codigo: null,
  quantidade: 1,
  granel: false,
  valor_total: 0,
  embalagem_qtd: null,
  embalagem_unidade: null,
  ingrediente_sugerido: null,
  nao_e_ingrediente: false,
  ...p,
});

const bacon = item({ texto: "BACON FATIADO MANTA KG - LATICINIO", codigo: "1716", quantidade: 4.024, granel: true, valor_total: 136.78 });
const pao = item({
  texto: "PAO HAMB BRIOCHE TOP C/15 880G", codigo: "602883514300", quantidade: 10, valor_total: 149.9,
  embalagem_qtd: 15, embalagem_unidade: "un", ingrediente_sugerido: "Pão brioche",
});
const sacola = item({ texto: "SACOLA RECICLAVEL", codigo: "002176", quantidade: 3, valor_total: 0.6, nao_e_ingrediente: true });
const maracuja = item({
  texto: "MARACUJA PP 1KG GRACIOSA (CX.:20X1KG)", codigo: "005334", quantidade: 1, granel: true, valor_total: 28.49,
  ingrediente_sugerido: "polpa de maracujá",
});

const ingredientes = [
  { id: "i-bacon", nome: "Bacon", unidade_base: "g" as const },
  { id: "i-pao", nome: "Pão brioche", unidade_base: "un" as const },
  { id: "i-mara", nome: "Polpa de maracujá", unidade_base: "g" as const },
];

describe("normalizarTexto", () => {
  it("ignora acento, caixa e pontuação", () => {
    expect(normalizarTexto("Pão hamb. Brioche  (C/15)")).toBe("PAO HAMB BRIOCHE C 15");
    expect(normalizarTexto("MARACUJA PP 1KG GRACIOSA (CX.:20X1KG)")).toBe(normalizarTexto("maracujá pp 1kg graciosa cx 20x1kg"));
  });
});

describe("embalagem", () => {
  it("só aproveita a embalagem lida se a unidade bate com a do ingrediente", () => {
    expect(embalagemNaUnidade(15, "un", "un")).toBe(15);
    expect(embalagemNaUnidade(880, "g", "un")).toBeNull();
    expect(embalagemNaUnidade(null, "g", "g")).toBeNull();
  });
});

describe("sugerirLinhas", () => {
  it("item novo usa a sugestão da IA (comparando nomes sem acento/caixa)", () => {
    const [l] = sugerirLinhas([maracuja], [], ingredientes);
    expect(l).toMatchObject({ situacao: "novo", ingrediente_id: "i-mara", granel: true, qtd: 1, embalagem: null });
  });

  it("pão C/15 vira 10 pacotes de 15 un = R$ 1,00 por pão", () => {
    const [l] = sugerirLinhas([pao], [], ingredientes);
    expect(l).toMatchObject({ situacao: "novo", ingrediente_id: "i-pao", qtd: 10, embalagem: 15 });
    const base = qtdBaseItem({ granel: l.granel, qtd: l.qtd, embalagem: l.embalagem });
    expect(custoUnitario(l.valor, base)).toBeCloseTo(0.9993, 4);
  });

  it("bacon a granel: 4,024 kg por R$ 136,78 = R$ 33,99/kg", () => {
    const [l] = sugerirLinhas([bacon], [{ texto_normalizado: normalizarTexto(bacon.texto), codigo: null, ingrediente_id: "i-bacon", qtd_por_embalagem: null, ignorar: false }], ingredientes);
    expect(l.situacao).toBe("conhecido");
    expect(custoUnitario(l.valor, qtdBaseItem({ granel: true, qtd: l.qtd, embalagem: null })) * 1000).toBeCloseTo(33.99, 2);
  });

  it("memória por código vale mesmo se o texto mudar (outra impressão)", () => {
    const [l] = sugerirLinhas(
      [{ ...pao, texto: "PAO HAMB BRIOCHE TOP C/15", ingrediente_sugerido: null }],
      [{ texto_normalizado: "OUTRO TEXTO", codigo: "602883514300", ingrediente_id: "i-pao", qtd_por_embalagem: 15, ignorar: false }],
      ingredientes,
    );
    expect(l).toMatchObject({ situacao: "conhecido", ingrediente_id: "i-pao", embalagem: 15 });
  });

  it("memória ganha da sugestão da IA", () => {
    const [l] = sugerirLinhas(
      [{ ...maracuja, ingrediente_sugerido: "Bacon" }],
      [{ texto_normalizado: normalizarTexto(maracuja.texto), codigo: null, ingrediente_id: "i-mara", qtd_por_embalagem: null, ignorar: false }],
      ingredientes,
    );
    expect(l.ingrediente_id).toBe("i-mara");
  });

  it("sacola vem marcada para ignorar; item marcado como ignorar na memória também", () => {
    expect(sugerirLinhas([sacola], [], ingredientes)[0].situacao).toBe("ignorar");
    const [l] = sugerirLinhas([{ ...bacon, codigo: null }], [{ texto_normalizado: normalizarTexto(bacon.texto), codigo: null, ingrediente_id: null, qtd_por_embalagem: null, ignorar: true }], ingredientes);
    expect(l.situacao).toBe("ignorar");
  });

  it("guarda a embalagem lida para quando ela escolher o ingrediente à mão", () => {
    const batata = item({ texto: "BATATA PRE FRITA BEM BRASIL 2KG 7MM", quantidade: 6, valor_total: 188.94, embalagem_qtd: 2000, embalagem_unidade: "g" });
    const [l] = sugerirLinhas([batata], [], ingredientes);
    expect(l).toMatchObject({ ingrediente_id: "", embalagem: null, embalagem_lida: { qtd: 2000, unidade: "g" } });
    expect(sugerirLinhas([bacon], [], ingredientes)[0].embalagem_lida).toBeNull(); // granel não tem embalagem
  });

  it("sugestão com nome que não existe na lista fica sem vínculo", () => {
    const [l] = sugerirLinhas([{ ...maracuja, ingrediente_sugerido: "Morango" }], [], ingredientes);
    expect(l).toMatchObject({ situacao: "novo", ingrediente_id: "" });
  });

  it("memória apontando para ingrediente excluído cai para a sugestão", () => {
    const [l] = sugerirLinhas(
      [maracuja],
      [{ texto_normalizado: normalizarTexto(maracuja.texto), codigo: null, ingrediente_id: "apagado", qtd_por_embalagem: null, ignorar: false }],
      ingredientes,
    );
    expect(l).toMatchObject({ situacao: "novo", ingrediente_id: "i-mara" });
  });
});

describe("limparNota", () => {
  it("descarta lixo da resposta da IA", () => {
    const n = limparNota({
      data: "03/04/2026",
      local: "  L.GOUVEIA NETO  ",
      total: 480.61,
      itens: [
        { texto: "" },
        { texto: "SACO DE LIXO", quantidade: -1, valor_total: "4,99", embalagem_unidade: "kg" },
        null,
      ],
    });
    expect(n.data).toBeNull();
    expect(n.local).toBe("L.GOUVEIA NETO");
    expect(n.itens).toHaveLength(1);
    expect(n.itens[0]).toMatchObject({ quantidade: 0, valor_total: 0, embalagem_unidade: null, codigo: null });
  });

  it("resposta vazia vira nota sem itens", () => {
    expect(limparNota(null)).toEqual({ chave_acesso: null, data: null, local: null, total: null, itens: [] });
  });

  it("aceita a chave com espaços se o dígito conferir; descarta leitura errada", () => {
    expect(limparNota({ chave_acesso: "3326 0403 5370 0900 0124 6501 7000 2534 1411 0253 4145" }).chave_acesso).toBe(
      "33260403537009000124650170002534141102534145",
    );
    // um dígito trocado pela IA → dígito verificador não confere
    expect(limparNota({ chave_acesso: "33260403537009000124650170002534141102534745" }).chave_acesso).toBeNull();
  });
});

describe("chaveValida", () => {
  it("confere as chaves dos cupons reais", () => {
    expect(chaveValida("33260403537009000124650170002534141102534145")).toBe(true);
    expect(chaveValida("33260435662475000128652040001190101001212627")).toBe(true);
    expect(chaveValida("33260435662475000128652040001190101001212626")).toBe(false);
    expect(chaveValida("123")).toBe(false);
  });
});
