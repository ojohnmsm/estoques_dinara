import { notFound } from "next/navigation";
import { listarSabores } from "@/lib/dados";
import { Cabecalho } from "@/components/cabecalho";
import { FormAjuste } from "./form-ajuste";

export default async function PaginaAjustar({ params }: PageProps<"/estoque/[id]/ajustar">) {
  const { id } = await params;
  const sabor = (await listarSabores()).find((s) => s.id === id);
  if (!sabor) notFound();
  return (
    <>
      <Cabecalho titulo={`Ajustar ${sabor.nome}`} voltar={`/estoque/${id}`} />
      <FormAjuste saborId={sabor.id} estoque={sabor.estoque} />
    </>
  );
}
