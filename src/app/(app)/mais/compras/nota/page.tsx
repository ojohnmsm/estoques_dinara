import { listarIngredientes } from "@/lib/dados";
import { hojeSP } from "@/lib/periodo";
import { Cabecalho } from "@/components/cabecalho";
import { LerNota } from "./ler-nota";

// a leitura pela IA pode levar alguns segundos
export const maxDuration = 60;

export default async function PaginaLerNota() {
  return (
    <>
      <Cabecalho titulo="Ler nota" voltar="/mais/compras" />
      <LerNota ingredientes={await listarIngredientes()} hoje={hojeSP()} />
    </>
  );
}
