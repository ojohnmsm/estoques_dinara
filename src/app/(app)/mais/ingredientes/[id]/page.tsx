import { notFound } from "next/navigation";
import { getSupabase } from "@/lib/supabase/server";
import { Cabecalho } from "@/components/cabecalho";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { FormIngrediente } from "../form-ingrediente";
import { excluirIngrediente } from "../../../actions";

export default async function PaginaIngrediente({ params }: PageProps<"/mais/ingredientes/[id]">) {
  const { id } = await params;
  const { supabase } = await getSupabase();
  const [ing, compras, receitas] = await Promise.all([
    supabase.from("ingredientes").select("id, nome, unidade_base").eq("id", id).maybeSingle(),
    supabase.from("itens_compra").select("id", { count: "exact", head: true }).eq("ingrediente_id", id),
    supabase.from("itens_receita").select("id", { count: "exact", head: true }).eq("ingrediente_id", id),
  ]);
  if (!ing.data) notFound();
  const emUso = (compras.count ?? 0) + (receitas.count ?? 0) > 0;

  return (
    <>
      <Cabecalho titulo="Editar ingrediente" voltar="/mais/ingredientes" />
      <FormIngrediente ingrediente={{ ...ing.data, emUso }} />
      {!emUso && (
        <div className="mt-6">
          <BotaoConfirmar acao={excluirIngrediente.bind(null, id)} pergunta={`Excluir "${ing.data.nome}"?`} className="btn-perigo w-full">
            Excluir ingrediente
          </BotaoConfirmar>
        </div>
      )}
    </>
  );
}
