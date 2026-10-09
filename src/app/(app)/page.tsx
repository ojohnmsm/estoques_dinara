import Link from "next/link";
import { listarSabores } from "@/lib/dados";
import { getSupabase } from "@/lib/supabase/server";
import { intervalo } from "@/lib/periodo";
import { Vender } from "./vender";

export default async function PaginaVender() {
  const { supabase } = await getSupabase();
  const hoje = intervalo("hoje");
  const [sabores, vendas] = await Promise.all([
    listarSabores({ somenteAtivos: true }),
    supabase
      .from("vendas")
      .select("grupo, qtd, preco_unitario, forma_pagamento, data_hora, sabores(nome)")
      .gte("data_hora", hoje.inicioTs)
      .lt("data_hora", hoje.fimTs)
      .order("data_hora", { ascending: false }),
  ]);
  if (vendas.error) throw vendas.error;

  if (sabores.length === 0) {
    return (
      <div className="cartao mt-8 space-y-3 text-center">
        <p className="text-lg font-semibold">Nenhum sabor cadastrado ainda</p>
        <p className="text-neutral-600">Comece cadastrando os ingredientes e depois os sabores com a receita.</p>
        <Link href="/mais" className="btn-primario w-full">Ir para cadastros</Link>
      </div>
    );
  }

  // agrupa as linhas de venda por "grupo" (uma venda pode ter vários sabores)
  const grupos = new Map<
    string,
    { grupo: string; data_hora: string; forma: string; total: number; itens: string[] }
  >();
  for (const v of vendas.data) {
    const g = grupos.get(v.grupo) ?? { grupo: v.grupo, data_hora: v.data_hora, forma: v.forma_pagamento, total: 0, itens: [] as string[] };
    g.total += v.qtd * Number(v.preco_unitario);
    const sabor = v.sabores as unknown as { nome: string } | null;
    g.itens.push(`${v.qtd}× ${sabor?.nome ?? "?"}`);
    grupos.set(v.grupo, g);
  }

  return <Vender sabores={sabores} vendasHoje={[...grupos.values()]} />;
}
