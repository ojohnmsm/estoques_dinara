// Leitura de nota por foto (SPEC §7): tipos e regras puras, sem rede.
// A IA só extrai e sugere; quem decide o vínculo é a usuária na tela de revisão.

import type { Unidade } from "@/lib/formato";

/** Item como a IA devolve (schema em ESQUEMA_NOTA). */
export type ItemLido = {
  texto: string;
  codigo: string | null;
  quantidade: number;
  granel: boolean; // vendido por peso/volume: quantidade é kg ou L
  valor_total: number; // valor líquido da linha (já com desconto)
  embalagem_qtd: number | null; // conteúdo de 1 embalagem (ex.: 395)
  embalagem_unidade: "g" | "ml" | "un" | null;
  ingrediente_sugerido: string | null; // nome exato da lista enviada, ou null
  nao_e_ingrediente: boolean; // sacola, frete, produto de limpeza…
};

export type NotaLida = {
  chave_acesso: string | null; // 44 dígitos da NFC-e, só se o dígito verificador conferir
  data: string | null; // AAAA-MM-DD
  local: string | null;
  total: number | null;
  itens: ItemLido[];
};

// O Gemini aceita só um subconjunto de JSON Schema: "pode ser nulo" vai como anyOf.
const ouNulo = (schema: object) => ({ anyOf: [schema, { type: "null" }] });

/** JSON Schema da resposta pedida ao Gemini. */
export const ESQUEMA_NOTA = {
  type: "object",
  properties: {
    chave_acesso: ouNulo({ type: "string", description: "Chave de acesso da NFC-e: 44 dígitos, sem espaços" }),
    data: ouNulo({ type: "string", description: "Data da compra no formato AAAA-MM-DD" }),
    local: ouNulo({ type: "string", description: "Nome curto do estabelecimento" }),
    total: ouNulo({ type: "number", description: "Valor total pago" }),
    itens: {
      type: "array",
      items: {
        type: "object",
        properties: {
          texto: { type: "string", description: "Descrição do item exatamente como impressa" },
          codigo: ouNulo({ type: "string", description: "Código do produto impresso na linha" }),
          quantidade: { type: "number" },
          granel: { type: "boolean" },
          valor_total: { type: "number" },
          embalagem_qtd: ouNulo({ type: "number" }),
          embalagem_unidade: ouNulo({ type: "string", enum: ["g", "ml", "un"] }),
          ingrediente_sugerido: ouNulo({ type: "string" }),
          nao_e_ingrediente: { type: "boolean" },
        },
        required: [
          "texto", "codigo", "quantidade", "granel", "valor_total",
          "embalagem_qtd", "embalagem_unidade", "ingrediente_sugerido", "nao_e_ingrediente",
        ],
      },
    },
  },
  required: ["chave_acesso", "data", "local", "total", "itens"],
};

export function promptNota(ingredientes: { nome: string; unidade_base: Unidade }[]) {
  const lista = ingredientes.length
    ? ingredientes.map((i) => `- ${i.nome} (${i.unidade_base})`).join("\n")
    : "(nenhum ingrediente cadastrado ainda)";
  return `Você lê cupons fiscais brasileiros (NFC-e) fotografados. Extraia TODOS os itens comprados.

Regras:
- "texto": a descrição exatamente como impressa, sem corrigir abreviações.
- "codigo": o código impresso no início da linha do item, ou null.
- "valor_total": o valor final da linha. Se houver coluna de desconto ou "VL. Líquido", use o líquido.
- Itens vendidos por peso ou volume (unidade KG, G, L na coluna de quantidade, ex.: "4,024 KG x 33,99"):
  granel = true e "quantidade" = o peso em kg (ou litros). Ex.: 4,024 KG → quantidade 4.024.
- Itens vendidos por unidade/pacote (UN, PC, CX…): granel = false e "quantidade" = número de unidades.
  Se a descrição indicar o conteúdo da embalagem (ex.: "395G", "2KG", "1L", "C/15"), preencha
  embalagem_qtd e embalagem_unidade convertendo para g, ml ou un (2KG → 2000 g; 1L → 1000 ml; C/15 → 15 un).
  Se não houver indicação, use null. Nunca invente.
- Linhas repetidas do mesmo produto são itens separados; não some.
- "ingrediente_sugerido": se o item corresponder a um ingrediente da lista abaixo, devolva o nome
  EXATAMENTE como está na lista; senão, null.
- "nao_e_ingrediente": true para sacola, frete, taxa, produtos de limpeza e qualquer coisa que
  não vá numa receita de comida.
- "data": data de emissão em AAAA-MM-DD. "total": valor total pago.
- "chave_acesso": os 44 dígitos impressos perto de "Consulte pela Chave de Acesso", só os números.
  Se algum dígito estiver ilegível, use null.
- Se um valor estiver ilegível, use null (ou 0 em quantidade/valor) em vez de chutar.

Ingredientes cadastrados:
${lista}`;
}

/** Confere o dígito verificador (módulo 11) da chave de acesso da NF-e/NFC-e. */
export function chaveValida(chave: string) {
  if (!/^\d{44}$/.test(chave)) return false;
  const pesos = [2, 3, 4, 5, 6, 7, 8, 9];
  let soma = 0;
  for (let i = 0; i < 43; i++) soma += Number(chave[42 - i]) * pesos[i % 8];
  const resto = 11 - (soma % 11);
  return (resto >= 10 ? 0 : resto) === Number(chave[43]);
}

/** Normaliza texto de nota para servir de chave da memória produto → ingrediente. */
export function normalizarTexto(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Converte a embalagem lida para a unidade base do ingrediente; null se incompatível. */
export function embalagemNaUnidade(
  qtd: number | null,
  unidadeLida: ItemLido["embalagem_unidade"],
  unidadeIngrediente: Unidade,
) {
  if (!qtd || qtd <= 0 || !unidadeLida) return null;
  return unidadeLida === unidadeIngrediente ? qtd : null;
}

export type ProdutoConhecido = {
  texto_normalizado: string;
  codigo: string | null;
  ingrediente_id: string | null;
  qtd_por_embalagem: number | null;
  ignorar: boolean;
};

export type Situacao = "conhecido" | "novo" | "ignorar";

export type LinhaSugerida = {
  texto: string;
  codigo: string | null;
  situacao: Situacao;
  ingrediente_id: string; // "" quando não há sugestão
  granel: boolean;
  qtd: number;
  embalagem: number | null;
  valor: number;
  // o que a IA leu da embalagem, para aplicar se a usuária escolher o ingrediente à mão
  embalagem_lida: { qtd: number; unidade: "g" | "ml" | "un" } | null;
};

/**
 * Cruza os itens lidos com a memória de produtos e com a sugestão da IA.
 * Ordem de confiança: memória por código > memória por texto > sugestão da IA.
 */
export function sugerirLinhas(
  itens: ItemLido[],
  produtos: ProdutoConhecido[],
  ingredientes: { id: string; nome: string; unidade_base: Unidade }[],
): LinhaSugerida[] {
  const porTexto = new Map(produtos.map((p) => [p.texto_normalizado, p]));
  const porCodigo = new Map(produtos.filter((p) => p.codigo).map((p) => [p.codigo!, p]));
  const ingPorNome = new Map(ingredientes.map((i) => [normalizarTexto(i.nome), i]));
  const ingPorId = new Map(ingredientes.map((i) => [i.id, i]));

  return itens.map((item) => {
    const memoria =
      (item.codigo && porCodigo.get(item.codigo)) || porTexto.get(normalizarTexto(item.texto));
    const base = {
      texto: item.texto,
      codigo: item.codigo,
      granel: item.granel,
      qtd: item.quantidade,
      valor: item.valor_total,
      embalagem_lida:
        !item.granel && item.embalagem_qtd && item.embalagem_unidade
          ? { qtd: item.embalagem_qtd, unidade: item.embalagem_unidade }
          : null,
    };

    if (memoria?.ignorar) {
      return { ...base, situacao: "ignorar" as const, ingrediente_id: "", embalagem: null };
    }
    if (memoria?.ingrediente_id && ingPorId.has(memoria.ingrediente_id)) {
      return {
        ...base,
        situacao: "conhecido" as const,
        ingrediente_id: memoria.ingrediente_id,
        embalagem: item.granel ? null : memoria.qtd_por_embalagem,
      };
    }

    const sugerido = item.ingrediente_sugerido ? ingPorNome.get(normalizarTexto(item.ingrediente_sugerido)) : undefined;
    return {
      ...base,
      situacao: item.nao_e_ingrediente && !sugerido ? ("ignorar" as const) : ("novo" as const),
      ingrediente_id: sugerido?.id ?? "",
      embalagem:
        sugerido && !item.granel
          ? embalagemNaUnidade(item.embalagem_qtd, item.embalagem_unidade, sugerido.unidade_base)
          : null,
    };
  });
}

/** Sanitiza a resposta da IA: descarta itens sem texto e números inválidos. */
export function limparNota(bruta: unknown): NotaLida {
  const n = (bruta ?? {}) as Partial<NotaLida>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
  const itens = Array.isArray(n.itens) ? n.itens : [];
  const chave = typeof n.chave_acesso === "string" ? n.chave_acesso.replace(/\D/g, "") : "";
  return {
    chave_acesso: chaveValida(chave) ? chave : null,
    data: typeof n.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(n.data) ? n.data : null,
    local: typeof n.local === "string" && n.local.trim() ? n.local.trim().slice(0, 100) : null,
    total: typeof n.total === "number" && Number.isFinite(n.total) ? n.total : null,
    itens: itens
      .filter((i) => i && typeof i.texto === "string" && i.texto.trim())
      .map((i) => ({
        texto: i.texto.trim(),
        codigo: typeof i.codigo === "string" && i.codigo.trim() ? i.codigo.trim() : null,
        quantidade: num(i.quantidade),
        granel: Boolean(i.granel),
        valor_total: num(i.valor_total),
        embalagem_qtd: typeof i.embalagem_qtd === "number" && i.embalagem_qtd > 0 ? i.embalagem_qtd : null,
        embalagem_unidade: ["g", "ml", "un"].includes(i.embalagem_unidade as string) ? i.embalagem_unidade : null,
        ingrediente_sugerido: typeof i.ingrediente_sugerido === "string" ? i.ingrediente_sugerido : null,
        nao_e_ingrediente: Boolean(i.nao_e_ingrediente),
      })),
  };
}
