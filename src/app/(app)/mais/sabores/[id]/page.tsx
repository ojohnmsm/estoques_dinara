import { notFound } from "next/navigation";
import { getSupabase } from "@/lib/supabase/server";
import { listarIngredientes } from "@/lib/dados";
import { Cabecalho } from "@/components/cabecalho";
import { FormSabor } from "../form-sabor";

export default async function PaginaSabor({ params }: PageProps<"/mais/sabores/[id]">) {
  const { id } = await params;
  const { supabase } = await getSupabase();
  const [sabor, itens, ingredientes] = await Promise.all([
    supabase.from("sabores").select("id, nome, preco_venda, estoque_minimo, rendimento_esperado, ativo").eq("id", id).maybeSingle(),
    supabase.from("itens_receita").select("ingrediente_id, qtd_base").eq("sabor_id", id).order("created_at"),
    listarIngredientes(),
  ]);
  if (!sabor.data) notFound();
  if (itens.error) throw itens.error;

  return (
    <>
      <Cabecalho titulo={sabor.data.nome} voltar="/mais/sabores" ajuda="sabor-form" />
      <FormSabor
        sabor={{
          ...sabor.data,
          preco_venda: Number(sabor.data.preco_venda),
          itens: itens.data.map((i) => ({ ingrediente_id: i.ingrediente_id, qtd_base: Number(i.qtd_base) })),
        }}
        ingredientes={ingredientes}
      />
      <p className="mt-6 text-sm text-neutral-500">
        Sabores com vendas não podem ser excluídos (o histórico depende deles). Desmarque &quot;ativo&quot; para tirar da venda.
      </p>
    </>
  );
}
