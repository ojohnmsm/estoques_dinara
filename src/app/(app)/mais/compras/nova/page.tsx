import { listarIngredientes } from "@/lib/dados";
import { hojeSP } from "@/lib/periodo";
import { Cabecalho } from "@/components/cabecalho";
import { FormCompra } from "./form-compra";

export default async function PaginaNovaCompra() {
  return (
    <>
      <Cabecalho titulo="Nova compra" voltar="/mais/compras" />
      <FormCompra ingredientes={await listarIngredientes()} hoje={hojeSP()} />
    </>
  );
}
