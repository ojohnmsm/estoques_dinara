import "server-only";
import { getSupabase } from "@/lib/supabase/server";
import type { Unidade } from "@/lib/formato";

export type Ingrediente = {
  id: string;
  nome: string;
  unidade_base: Unidade;
  embalagem_padrao: number | null;
  custo_unitario: number | null;
  custo_atualizado_em: string | null;
};

export type SaborComEstoque = {
  id: string;
  nome: string;
  preco_venda: number;
  estoque_minimo: number;
  rendimento_esperado: number;
  custo_medio: number;
  ativo: boolean;
  estoque: number;
  custo_receita: number;
  custo_incompleto: boolean;
  qtd_ingredientes: number;
};

export async function listarIngredientes() {
  const { supabase } = await getSupabase();
  const { data, error } = await supabase
    .from("ingredientes")
    .select("id, nome, unidade_base, embalagem_padrao, custo_unitario, custo_atualizado_em")
    .order("nome");
  if (error) throw error;
  return data as Ingrediente[];
}

export async function listarSabores({ somenteAtivos = false } = {}) {
  const { supabase } = await getSupabase();
  let q = supabase
    .from("sabores")
    .select("id, nome, preco_venda, estoque_minimo, rendimento_esperado, custo_medio, ativo")
    .order("nome");
  if (somenteAtivos) q = q.eq("ativo", true);
  const [sabores, estoques, custos] = await Promise.all([
    q,
    supabase.from("estoque_sabores").select("sabor_id, estoque"),
    supabase.from("custo_sabores").select("sabor_id, custo_receita, custo_incompleto, qtd_ingredientes"),
  ]);
  if (sabores.error) throw sabores.error;
  if (estoques.error) throw estoques.error;
  if (custos.error) throw custos.error;

  const est = new Map(estoques.data.map((e) => [e.sabor_id, Number(e.estoque)]));
  const cus = new Map(custos.data.map((c) => [c.sabor_id, c]));
  return sabores.data.map((s) => ({
    ...s,
    estoque: est.get(s.id) ?? 0,
    custo_receita: Number(cus.get(s.id)?.custo_receita ?? 0),
    custo_incompleto: Boolean(cus.get(s.id)?.custo_incompleto),
    qtd_ingredientes: Number(cus.get(s.id)?.qtd_ingredientes ?? 0),
  })) as SaborComEstoque[];
}
