"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSupabase } from "@/lib/supabase/server";
import { parseNumero } from "@/lib/formato";
import { hojeSP } from "@/lib/periodo";
import { normalizarTexto, sugerirLinhas, type LinhaSugerida } from "@/lib/nota";
import { lerNotaComGemini } from "@/lib/gemini";
import type { Ingrediente } from "@/lib/dados";

export type Estado = { erro?: string; ok?: string };

function mensagem(error: { code?: string; message: string }) {
  if (error.code === "23505") return "Já existe um cadastro com esse nome.";
  if (error.code === "23503") return "Não dá para excluir: este item já está em uso em receitas ou compras.";
  return error.message;
}

function atualizar() {
  revalidatePath("/", "layout");
}

const numero = z.preprocess((v) => parseNumero(v as string), z.number().finite());
const positivo = numero.pipe(z.number().positive("Informe um valor maior que zero"));
const naoNegativo = numero.pipe(z.number().min(0, "O valor não pode ser negativo"));
const inteiroPositivo = positivo.pipe(z.number().int("Use um número inteiro"));
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

function primeiroErro(e: z.ZodError) {
  return e.issues[0]?.message ?? "Dados inválidos";
}

// ---------------------------------------------------------------- Vendas

const vendaSchema = z.object({
  forma: z.enum(["pix", "dinheiro", "cartao"], { message: "Escolha a forma de pagamento" }),
  itens: z
    .array(z.object({ sabor_id: z.uuid(), qtd: z.number().int().positive(), preco_unitario: z.number().min(0) }))
    .min(1, "Escolha pelo menos um sabor"),
});

export async function registrarVenda(entrada: z.input<typeof vendaSchema>): Promise<Estado> {
  const p = vendaSchema.safeParse(entrada);
  if (!p.success) return { erro: primeiroErro(p.error) };
  const { supabase } = await getSupabase();
  const { error } = await supabase.rpc("registrar_venda", { p_itens: p.data.itens, p_forma: p.data.forma });
  if (error) return { erro: mensagem(error) };
  atualizar();
  return { ok: "Venda registrada!" };
}

export async function desfazerVenda(grupo: string): Promise<Estado> {
  const { supabase } = await getSupabase();
  const { error } = await supabase.rpc("desfazer_venda", { p_grupo: grupo });
  if (error) return { erro: mensagem(error) };
  atualizar();
  return { ok: "Venda desfeita." };
}

// ---------------------------------------------------------------- Ingredientes

const ingredienteSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome"),
  unidade_base: z.enum(["g", "ml", "un"], { message: "Escolha a unidade" }),
});

export async function salvarIngrediente(_: Estado, form: FormData): Promise<Estado> {
  const p = ingredienteSchema.safeParse({ nome: form.get("nome"), unidade_base: form.get("unidade_base") });
  if (!p.success) return { erro: primeiroErro(p.error) };
  const { supabase } = await getSupabase();
  const id = form.get("id") as string | null;
  const { error } = id
    ? await supabase.from("ingredientes").update(p.data).eq("id", id)
    : await supabase.from("ingredientes").insert(p.data);
  if (error) return { erro: mensagem(error) };
  atualizar();
  if (id) redirect("/mais/ingredientes");
  return { ok: `"${p.data.nome}" cadastrado.` };
}

/** Cria ingrediente sem sair da tela de compra. */
export async function criarIngrediente(
  entrada: z.input<typeof ingredienteSchema>,
): Promise<{ erro: string } | { ingrediente: Ingrediente }> {
  const p = ingredienteSchema.safeParse(entrada);
  if (!p.success) return { erro: primeiroErro(p.error) };
  const { supabase } = await getSupabase();
  const { data, error } = await supabase
    .from("ingredientes")
    .insert(p.data)
    .select("id, nome, unidade_base, embalagem_padrao, custo_unitario, custo_atualizado_em")
    .single();
  if (error) return { erro: mensagem(error) };
  atualizar();
  return { ingrediente: data as Ingrediente };
}

export async function excluirIngrediente(id: string): Promise<Estado> {
  const { supabase } = await getSupabase();
  const { error } = await supabase.from("ingredientes").delete().eq("id", id);
  if (error) return { erro: mensagem(error) };
  atualizar();
  redirect("/mais/ingredientes");
}

// ---------------------------------------------------------------- Sabores

const saborSchema = z.object({
  id: z.uuid().nullable(),
  nome: z.string().trim().min(1, "Informe o nome do sabor"),
  preco_venda: naoNegativo,
  estoque_minimo: z.number().int().min(0),
  rendimento_esperado: z.number().int().positive("O rendimento precisa ser maior que zero"),
  ativo: z.boolean(),
  itens: z.array(z.object({ ingrediente_id: z.uuid(), qtd_base: z.number().positive("Quantidade inválida na receita") })),
});

export async function salvarSabor(entrada: z.input<typeof saborSchema>): Promise<Estado> {
  const p = saborSchema.safeParse(entrada);
  if (!p.success) return { erro: primeiroErro(p.error) };
  const ids = p.data.itens.map((i) => i.ingrediente_id);
  if (new Set(ids).size !== ids.length) return { erro: "Um ingrediente aparece duas vezes na receita." };

  const { supabase } = await getSupabase();
  const { error } = await supabase.rpc("salvar_sabor", {
    p_id: p.data.id,
    p_nome: p.data.nome,
    p_preco_venda: p.data.preco_venda,
    p_estoque_minimo: p.data.estoque_minimo,
    p_rendimento_esperado: p.data.rendimento_esperado,
    p_ativo: p.data.ativo,
    p_itens: p.data.itens,
  });
  if (error) return { erro: mensagem(error) };
  atualizar();
  redirect("/mais/sabores");
}

// ---------------------------------------------------------------- Compras

const itemNota = z.object({ texto_original: z.string().trim().min(1).max(200), codigo: z.string().max(50).nullable() });

const compraSchema = z.object({
  data,
  local: z.string().trim().max(100).optional(),
  foto_path: z.string().max(200).nullable().optional(),
  itens: z
    .array(
      z.object({
        ingrediente_id: z.uuid({ message: "Escolha o ingrediente de cada linha (ou marque para ignorar)" }),
        granel: z.boolean(),
        qtd_embalagens: z.number().positive("Informe a quantidade de cada item"),
        embalagem_qtd: z.number().positive().nullable(),
        valor_total: z.number().min(0, "Informe o valor de cada item"),
        nota: itemNota.optional(), // presente quando o item veio da leitura da nota
      }),
    )
    .min(1, "Adicione pelo menos um item"),
  ignorados: z.array(itemNota).default([]), // itens da nota que não são ingrediente
});

export async function registrarCompra(entrada: z.input<typeof compraSchema>): Promise<Estado> {
  const p = compraSchema.safeParse(entrada);
  if (!p.success) return { erro: primeiroErro(p.error) };
  if (p.data.itens.some((i) => !i.granel && !i.embalagem_qtd)) {
    return { erro: "Informe o tamanho da embalagem de cada item (ou marque como granel)." };
  }
  const { supabase, user } = await getSupabase();
  if (p.data.foto_path && !p.data.foto_path.startsWith(`${user.id}/`)) return { erro: "Foto inválida." };

  const { error } = await supabase.rpc("registrar_compra", {
    p_data: p.data.data,
    p_local: p.data.local ?? null,
    p_origem: p.data.foto_path ? "foto" : "manual",
    p_foto_path: p.data.foto_path ?? null,
    p_itens: p.data.itens.map(({ nota, ...i }) => ({ ...i, texto_original: nota?.texto_original ?? null })),
  });
  if (error) return { erro: mensagem(error) };

  await lembrarProdutos(supabase, p.data.itens, p.data.ignorados);
  atualizar();
  redirect("/mais/compras");
}

/** Grava a memória "texto da nota → ingrediente" para a próxima leitura (SPEC §7). */
async function lembrarProdutos(
  supabase: Awaited<ReturnType<typeof getSupabase>>["supabase"],
  itens: z.output<typeof compraSchema>["itens"],
  ignorados: z.output<typeof itemNota>[],
) {
  const linhas = new Map<string, Record<string, unknown>>();
  for (const i of itens) {
    if (!i.nota) continue;
    const chave = normalizarTexto(i.nota.texto_original);
    linhas.set(chave, {
      texto_normalizado: chave,
      texto_exemplo: i.nota.texto_original,
      codigo: i.nota.codigo,
      ingrediente_id: i.ingrediente_id,
      qtd_por_embalagem: i.granel ? null : i.embalagem_qtd,
      ignorar: false,
    });
  }
  for (const n of ignorados) {
    const chave = normalizarTexto(n.texto_original);
    if (!linhas.has(chave)) {
      linhas.set(chave, { texto_normalizado: chave, texto_exemplo: n.texto_original, codigo: n.codigo, ingrediente_id: null, qtd_por_embalagem: null, ignorar: true });
    }
  }
  if (linhas.size === 0) return;
  // a compra já foi salva; falha aqui só faz o app "esquecer" o vínculo
  const { error } = await supabase.from("produtos").upsert([...linhas.values()], { onConflict: "user_id,texto_normalizado" });
  if (error) console.error("Falha ao gravar memória de produtos", error);
}

export type NotaParaRevisar = {
  data: string | null;
  local: string | null;
  total: number | null;
  foto_path: string;
  linhas: LinhaSugerida[];
};

const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];

/** Recebe a foto da nota, guarda no Storage e devolve os itens lidos pela IA já cruzados com a memória. */
export async function lerNota(form: FormData): Promise<{ erro: string } | { nota: NotaParaRevisar }> {
  const foto = form.get("foto");
  if (!(foto instanceof File) || foto.size === 0) return { erro: "Envie a foto da nota." };
  if (!TIPOS_FOTO.includes(foto.type)) return { erro: "Formato de imagem não suportado." };
  if (foto.size > 4 * 1024 * 1024) return { erro: "Foto muito grande." };

  const { supabase, user } = await getSupabase();
  const bytes = Buffer.from(await foto.arrayBuffer());
  const caminho = `${user.id}/${crypto.randomUUID()}.${foto.type.split("/")[1]}`;

  const [upload, ingredientes, produtos] = await Promise.all([
    supabase.storage.from("notas").upload(caminho, bytes, { contentType: foto.type }),
    supabase.from("ingredientes").select("id, nome, unidade_base"),
    supabase.from("produtos").select("texto_normalizado, codigo, ingrediente_id, qtd_por_embalagem, ignorar"),
  ]);
  if (upload.error) return { erro: `Não consegui guardar a foto: ${upload.error.message}` };
  if (ingredientes.error) return { erro: mensagem(ingredientes.error) };
  if (produtos.error) return { erro: mensagem(produtos.error) };

  let lida;
  try {
    lida = await lerNotaComGemini({ base64: bytes.toString("base64"), mimeType: foto.type }, ingredientes.data);
  } catch (e) {
    console.error("Falha na leitura da nota", e);
    return { erro: "A IA não conseguiu ler a nota agora. Tente de novo ou registre a compra à mão." };
  }
  if (lida.itens.length === 0) return { erro: "Não encontrei itens nessa foto. Tente uma foto mais nítida e reta." };

  return {
    nota: {
      data: lida.data,
      local: lida.local,
      total: lida.total,
      foto_path: caminho,
      linhas: sugerirLinhas(lida.itens, produtos.data, ingredientes.data),
    },
  };
}

export async function excluirCompra(id: string): Promise<Estado> {
  const { supabase } = await getSupabase();
  const { error } = await supabase.rpc("excluir_compra", { p_compra_id: id });
  if (error) return { erro: mensagem(error) };
  atualizar();
  redirect("/mais/compras");
}

// ---------------------------------------------------------------- Produção e ajustes

export async function registrarProducao(_: Estado, form: FormData): Promise<Estado> {
  const p = z
    .object({ sabor_id: z.uuid(), data, receitas_feitas: positivo, qtd_produzida: inteiroPositivo })
    .safeParse(Object.fromEntries(form));
  if (!p.success) return { erro: primeiroErro(p.error) };
  if (p.data.data > hojeSP()) return { erro: "A data não pode ser no futuro." };
  const { supabase } = await getSupabase();
  const { error } = await supabase.rpc("registrar_producao", {
    p_sabor_id: p.data.sabor_id,
    p_data: p.data.data,
    p_receitas_feitas: p.data.receitas_feitas,
    p_qtd_produzida: p.data.qtd_produzida,
  });
  if (error) return { erro: mensagem(error) };
  atualizar();
  redirect(`/estoque/${p.data.sabor_id}`);
}

export async function excluirProducao(id: string, saborId: string): Promise<Estado> {
  const { supabase } = await getSupabase();
  const { error } = await supabase.rpc("excluir_producao", { p_id: id });
  if (error) return { erro: mensagem(error) };
  atualizar();
  redirect(`/estoque/${saborId}`);
}

export async function registrarAjuste(_: Estado, form: FormData): Promise<Estado> {
  const motivo = z.enum(["perda", "consumo", "contagem", "outro"]).safeParse(form.get("motivo"));
  const saborId = z.uuid().safeParse(form.get("sabor_id"));
  if (!motivo.success || !saborId.success) return { erro: "Escolha o motivo do ajuste." };

  const qtd = parseNumero(form.get("qtd"));
  if (!Number.isInteger(qtd) || qtd < 0) return { erro: "Informe uma quantidade inteira." };
  if (motivo.data !== "contagem" && qtd === 0) return { erro: "Informe uma quantidade maior que zero." };

  // perda e consumo sempre tiram do estoque; "outro" pode somar ou tirar
  let delta: number | null = null;
  if (motivo.data === "perda" || motivo.data === "consumo") delta = -qtd;
  if (motivo.data === "outro") delta = form.get("direcao") === "entrada" ? qtd : -qtd;

  const { supabase } = await getSupabase();
  const { error } = await supabase.rpc("registrar_ajuste", {
    p_sabor_id: saborId.data,
    p_motivo: motivo.data,
    p_delta: delta,
    p_qtd_contada: motivo.data === "contagem" ? qtd : null,
    p_observacao: (form.get("observacao") as string) || null,
  });
  if (error) return { erro: mensagem(error) };
  atualizar();
  redirect(`/estoque/${saborId.data}`);
}
