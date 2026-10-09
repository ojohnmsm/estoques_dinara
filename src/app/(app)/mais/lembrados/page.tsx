import { getSupabase } from "@/lib/supabase/server";
import { listarIngredientes } from "@/lib/dados";
import { Cabecalho } from "@/components/cabecalho";
import { ListaLembrados } from "./lista-lembrados";

export default async function PaginaLembrados() {
  const { supabase } = await getSupabase();
  const [produtos, ingredientes] = await Promise.all([
    supabase.from("produtos").select("id, texto_exemplo, codigo, ingrediente_id, qtd_por_embalagem, ignorar").order("texto_exemplo"),
    listarIngredientes(),
  ]);
  if (produtos.error) throw produtos.error;

  return (
    <>
      <Cabecalho titulo="Itens lembrados" voltar="/mais" ajuda="lembrados" />
      <p className="mb-4 text-sm text-neutral-600">
        Cada item lido numa nota fica ligado a um ingrediente, e o app usa isso nas próximas notas.
        Se um vínculo estiver errado, troque aqui ou toque em &quot;Esquecer&quot; para ele voltar como novo na próxima nota.
        Compras já salvas não mudam.
      </p>
      <ListaLembrados produtos={produtos.data} ingredientes={ingredientes} />
    </>
  );
}
