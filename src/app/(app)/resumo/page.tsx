import Link from "next/link";
import { getSupabase } from "@/lib/supabase/server";
import { calcularResumo, type AjusteResumo, type VendaResumo } from "@/lib/calculos";
import { brl, dataBR, FORMAS, pct } from "@/lib/formato";
import { intervalo, type Periodo } from "@/lib/periodo";
import { Cabecalho } from "@/components/cabecalho";

const PERIODOS: { valor: Periodo; rotulo: string }[] = [
  { valor: "hoje", rotulo: "Hoje" },
  { valor: "7dias", rotulo: "7 dias" },
  { valor: "mes", rotulo: "Este mês" },
  { valor: "livre", rotulo: "Escolher" },
];

export default async function PaginaResumo({ searchParams }: PageProps<"/resumo">) {
  const sp = await searchParams;
  const periodo = (PERIODOS.some((p) => p.valor === sp.p) ? sp.p : "hoje") as Periodo;
  const i = intervalo(periodo, sp.de as string | undefined, sp.ate as string | undefined);
  const { supabase } = await getSupabase();

  const [vendas, ajustes, compras, sabores] = await Promise.all([
    supabase
      .from("vendas")
      .select("sabor_id, qtd, preco_unitario, custo_unitario, forma_pagamento")
      .gte("data_hora", i.inicioTs)
      .lt("data_hora", i.fimTs),
    supabase
      .from("ajustes_estoque")
      .select("delta, motivo, custo_unitario")
      .gte("data_hora", i.inicioTs)
      .lt("data_hora", i.fimTs),
    supabase.from("compras").select("total").gte("data", i.inicioData).lte("data", i.fimData),
    supabase.from("sabores").select("id, nome"),
  ]);
  for (const r of [vendas, ajustes, compras, sabores]) if (r.error) throw r.error;

  const r = calcularResumo(
    (vendas.data ?? []).map((v) => ({ ...v, preco_unitario: Number(v.preco_unitario), custo_unitario: Number(v.custo_unitario) })) as VendaResumo[],
    (ajustes.data ?? []).map((a) => ({ ...a, custo_unitario: Number(a.custo_unitario) })) as AjusteResumo[],
    (compras.data ?? []).map((c) => Number(c.total)),
  );
  const nomes = new Map((sabores.data ?? []).map((s) => [s.id, s.nome]));

  return (
    <>
      <Cabecalho titulo="Resumo" />
      <nav className="mb-3 grid grid-cols-4 gap-1 rounded-xl bg-neutral-100 p-1">
        {PERIODOS.map((p) => (
          <Link
            key={p.valor}
            href={`/resumo?p=${p.valor}`}
            className={`rounded-lg py-2 text-center text-sm font-medium ${periodo === p.valor ? "bg-white shadow-sm" : "text-neutral-600"}`}
          >
            {p.rotulo}
          </Link>
        ))}
      </nav>

      {periodo === "livre" && (
        <form className="mb-3 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <input type="hidden" name="p" value="livre" />
          <label className="text-sm">De<input type="date" name="de" defaultValue={i.inicioData} className="campo py-2" /></label>
          <label className="text-sm">Até<input type="date" name="ate" defaultValue={i.fimData} className="campo py-2" /></label>
          <button className="btn-secundario">Ver</button>
        </form>
      )}
      <p className="mb-4 text-sm text-neutral-500">
        {i.inicioData === i.fimData ? dataBR(i.inicioData) : `${dataBR(i.inicioData)} a ${dataBR(i.fimData)}`}
      </p>

      <section className="mb-4 grid grid-cols-2 gap-3">
        <Indicador rotulo="Faturamento" valor={brl(r.faturamento)} />
        <Indicador rotulo="Lucro" valor={brl(r.lucroAposPerdas)} destaque />
        <Indicador rotulo="Sacolés vendidos" valor={String(r.qtdVendida)} />
        <Indicador rotulo="Margem" valor={pct(r.margem)} />
      </section>

      <section className="cartao mb-4 space-y-1">
        <Linha rotulo="Faturamento" valor={brl(r.faturamento)} />
        <Linha rotulo="− Custo dos sacolés vendidos" valor={brl(r.custoVendidos)} />
        <Linha rotulo="= Lucro bruto" valor={brl(r.lucroBruto)} forte />
        <Linha rotulo="− Perdas e consumo" valor={brl(r.perdas)} />
        <Linha rotulo="= Lucro" valor={brl(r.lucroAposPerdas)} forte />
      </section>

      <section className="cartao mb-4 space-y-1">
        <h2 className="mb-1 font-semibold">Por forma de pagamento</h2>
        {FORMAS.map((f) => (
          <Linha key={f.valor} rotulo={f.rotulo} valor={brl(r.porForma[f.valor])} />
        ))}
      </section>

      <section className="cartao mb-4">
        <h2 className="mb-2 font-semibold">Por sabor</h2>
        {r.porSabor.length === 0 ? (
          <p className="text-neutral-500">Sem vendas no período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr><th className="font-normal">Sabor</th><th className="text-right font-normal">Qtd</th><th className="text-right font-normal">Vendas</th><th className="text-right font-normal">Lucro</th></tr>
            </thead>
            <tbody>
              {r.porSabor.map((s) => (
                <tr key={s.sabor_id} className="border-t border-neutral-100">
                  <td className="py-2">{nomes.get(s.sabor_id) ?? "?"}</td>
                  <td className="text-right tabular-nums">{s.qtd}</td>
                  <td className="text-right tabular-nums">{brl(s.faturamento)}</td>
                  <td className="text-right tabular-nums">{brl(s.lucro)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="cartao text-sm text-neutral-600">
        <p className="flex justify-between"><span>Gasto em compras no período</span><strong className="text-neutral-900">{brl(r.gastoCompras)}</strong></p>
        <p className="mt-2">
          Isso é dinheiro que saiu do caixa, mas só vira custo quando o sacolé é vendido. Por isso não entra no lucro acima.
        </p>
      </section>
    </>
  );
}

function Indicador({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`cartao ${destaque ? "border-pink-300 bg-pink-50" : ""}`}>
      <p className="text-sm text-neutral-600">{rotulo}</p>
      <p className="text-xl font-bold tabular-nums">{valor}</p>
    </div>
  );
}

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <p className={`flex justify-between ${forte ? "font-semibold" : ""}`}>
      <span>{rotulo}</span>
      <span className="tabular-nums">{valor}</span>
    </p>
  );
}
