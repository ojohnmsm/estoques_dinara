import { notFound } from "next/navigation";
import { listarSabores } from "@/lib/dados";
import { hojeSP } from "@/lib/periodo";
import { Cabecalho } from "@/components/cabecalho";
import { FormProducao } from "./form-producao";

export default async function PaginaProduzir({ params }: PageProps<"/estoque/[id]/produzir">) {
  const { id } = await params;
  const sabor = (await listarSabores()).find((s) => s.id === id);
  if (!sabor) notFound();
  return (
    <>
      <Cabecalho titulo={`Produzi ${sabor.nome}`} voltar={`/estoque/${id}`} />
      <FormProducao sabor={sabor} hoje={hojeSP()} />
    </>
  );
}
