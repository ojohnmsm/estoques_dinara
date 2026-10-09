import { notFound } from "next/navigation";
import { getSupabase } from "@/lib/supabase/server";
import { brl, custoLegivel, dataBR, num, type Unidade } from "@/lib/formato";
import { Cabecalho } from "@/components/cabecalho";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { excluirCompra } from "../../../actions";

export default async function PaginaCompra({ params }: PageProps<"/mais/compras/[id]">) {
  const { id } = await params;
  const { supabase } = await getSupabase();
  const { data: c } = await supabase
    .from("compras")
    .select("id, data, local, total, itens_compra(id, granel, qtd_embalagens, embalagem_qtd, qtd_base_total, valor_total, custo_unitario, ingredientes(nome, unidade_base))")
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();

  type Item = {
    id: string; granel: boolean; qtd_embalagens: number; embalagem_qtd: number | null; qtd_base_total: number;
    valor_total: number; custo_unitario: number; ingredientes: { nome: string; unidade_base: Unidade };
  };
  const itens = c.itens_compra as unknown as Item[];

  return (
    <>
      <Cabecalho titulo={`Compra de ${dataBR(c.data)}`} voltar="/mais/compras" />
      {c.local && <p className="mb-3 text-neutral-600">{c.local}</p>}
      <ul className="mb-4 space-y-2">
        {itens.map((i) => (
          <li key={i.id} className="cartao py-3">
            <p className="flex justify-between font-medium"><span>{i.ingredientes.nome}</span><span>{brl(i.valor_total)}</span></p>
            <p className="text-sm text-neutral-500">
              {i.granel
                ? `${num(i.qtd_embalagens, 3)} ${i.ingredientes.unidade_base === "ml" ? "L" : "kg"} a granel`
                : `${num(i.qtd_embalagens)} × ${num(Number(i.embalagem_qtd))} ${i.ingredientes.unidade_base}`}
              {" · "}{custoLegivel(i.custo_unitario, i.ingredientes.unidade_base)}
            </p>
          </li>
        ))}
      </ul>
      <p className="mb-6 flex justify-between text-lg"><span>Total</span><strong>{brl(c.total)}</strong></p>
      <BotaoConfirmar
        acao={excluirCompra.bind(null, id)}
        pergunta="Excluir esta compra? O preço dos ingredientes volta para o da compra anterior."
        className="btn-perigo w-full"
      >
        Excluir compra
      </BotaoConfirmar>
    </>
  );
}
