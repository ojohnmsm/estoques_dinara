import { listarIngredientes } from "@/lib/dados";
import { Cabecalho } from "@/components/cabecalho";
import { FormSabor } from "../form-sabor";

export default async function PaginaNovoSabor() {
  return (
    <>
      <Cabecalho titulo="Novo sabor" voltar="/mais/sabores" />
      <FormSabor ingredientes={await listarIngredientes()} />
    </>
  );
}
