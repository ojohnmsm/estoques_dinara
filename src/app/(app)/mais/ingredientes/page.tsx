import Link from "next/link";
import { listarIngredientes } from "@/lib/dados";
import { custoLegivel, dataBR } from "@/lib/formato";
import { Cabecalho } from "@/components/cabecalho";
import { FormIngrediente } from "./form-ingrediente";

export default async function PaginaIngredientes() {
  const ingredientes = await listarIngredientes();
  return (
    <>
      <Cabecalho titulo="Ingredientes" voltar="/mais" ajuda="ingredientes" />
      <ul className="mb-6 space-y-2" data-tour="ingredientes-lista">
        {ingredientes.length === 0 && <p className="text-neutral-500">Nenhum ingrediente ainda. Inclua também a embalagem (saquinho).</p>}
        {ingredientes.map((i) => (
          <li key={i.id}>
            <Link href={`/mais/ingredientes/${i.id}`} className="cartao flex items-center gap-3 py-3">
              <div className="flex-1">
                <p className="font-medium">{i.nome}</p>
                <p className="text-sm text-neutral-500">
                  {i.custo_atualizado_em ? `atualizado em ${dataBR(i.custo_atualizado_em)}` : "registre uma compra para ter o preço"}
                </p>
              </div>
              <span className={`text-sm font-semibold ${i.custo_unitario == null ? "text-amber-700" : ""}`}>
                {custoLegivel(i.custo_unitario, i.unidade_base)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <section className="cartao" data-tour="ingredientes-novo">
        <h2 className="mb-3 text-lg font-semibold">Novo ingrediente</h2>
        <FormIngrediente />
      </section>
    </>
  );
}
