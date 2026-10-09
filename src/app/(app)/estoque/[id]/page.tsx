import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabase } from "@/lib/supabase/server";
import { listarSabores } from "@/lib/dados";
import { brl, dataBR, horaBR, MOTIVOS } from "@/lib/formato";
import { Cabecalho } from "@/components/cabecalho";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { excluirProducao } from "../../actions";

export default async function PaginaSaborEstoque({ params }: PageProps<"/estoque/[id]">) {
  const { id } = await params;
  const { supabase } = await getSupabase();
  const sabor = (await listarSabores()).find((s) => s.id === id);
  if (!sabor) notFound();

  const [producoes, ajustes] = await Promise.all([
    supabase
      .from("producoes")
      .select("id, data, receitas_feitas, qtd_produzida, custo_total, custo_unitario, custo_incompleto")
      .eq("sabor_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("ajustes_estoque")
      .select("id, data_hora, delta, motivo, observacao")
      .eq("sabor_id", id)
      .order("data_hora", { ascending: false })
      .limit(20),
  ]);
  if (producoes.error) throw producoes.error;
  if (ajustes.error) throw ajustes.error;

  return (
    <>
      <Cabecalho titulo={sabor.nome} voltar="/estoque" />
      <section className="cartao mb-4 text-center">
        <p className="text-sm text-neutral-600">No freezer</p>
        <p className={`text-5xl font-bold ${sabor.estoque < 0 ? "text-red-700" : ""}`}>{sabor.estoque}</p>
        <p className="mt-1 text-sm text-neutral-500">Custo médio: {brl(sabor.custo_medio)} por sacolé</p>
      </section>
      <div className="mb-6 grid grid-cols-2 gap-3">
        <Link href={`/estoque/${id}/produzir`} className="btn-primario">Produzi</Link>
        <Link href={`/estoque/${id}/ajustar`} className="btn-secundario">Ajustar</Link>
      </div>

      <h2 className="mb-2 text-lg font-semibold">Produções</h2>
      {producoes.data.length === 0 && <p className="mb-4 text-neutral-500">Nenhuma produção registrada.</p>}
      <ul className="mb-6 space-y-2">
        {producoes.data.map((p, i) => (
          <li key={p.id} className="cartao flex items-center gap-3 py-3">
            <div className="flex-1">
              <p className="font-medium">
                {dataBR(p.data)} · {p.qtd_produzida} sacolés
              </p>
              <p className="text-sm text-neutral-500">
                {String(p.receitas_feitas).replace(".", ",")} receita(s) · {brl(p.custo_total)} ({brl(p.custo_unitario)} cada)
                {p.custo_incompleto && " · custo incompleto"}
              </p>
            </div>
            {i === 0 && (
              <BotaoConfirmar
                acao={excluirProducao.bind(null, p.id, id)}
                pergunta="Excluir esta produção? Os sacolés saem do estoque."
                className="text-sm text-red-700 underline"
              >
                Excluir
              </BotaoConfirmar>
            )}
          </li>
        ))}
      </ul>

      <h2 className="mb-2 text-lg font-semibold">Ajustes</h2>
      {ajustes.data.length === 0 && <p className="text-neutral-500">Nenhum ajuste.</p>}
      <ul className="space-y-2">
        {ajustes.data.map((a) => (
          <li key={a.id} className="cartao py-3">
            <p className="font-medium">
              {a.delta > 0 ? `+${a.delta}` : a.delta} · {MOTIVOS[a.motivo as keyof typeof MOTIVOS]}
            </p>
            <p className="text-sm text-neutral-500">
              {dataBR(new Date(a.data_hora).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }))} {horaBR(a.data_hora)}
              {a.observacao && ` · ${a.observacao}`}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
