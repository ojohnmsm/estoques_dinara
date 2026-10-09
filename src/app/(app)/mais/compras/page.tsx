import Link from "next/link";
import { getSupabase } from "@/lib/supabase/server";
import { brl, dataBR } from "@/lib/formato";
import { Cabecalho } from "@/components/cabecalho";

export default async function PaginaCompras() {
  const { supabase } = await getSupabase();
  const { data, error } = await supabase
    .from("compras")
    .select("id, data, local, total, itens_compra(count)")
    .order("data", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  return (
    <>
      <Cabecalho titulo="Compras" voltar="/mais" />
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Link href="/mais/compras/nota" className="btn-primario">📷 Ler nota</Link>
        <Link href="/mais/compras/nova" className="btn-secundario">Digitar compra</Link>
      </div>
      {data.length === 0 && <p className="text-neutral-500">Nenhuma compra registrada. A compra é o que dá o preço dos ingredientes.</p>}
      <ul className="space-y-2">
        {data.map((c) => {
          const qtd = (c.itens_compra as unknown as { count: number }[])[0]?.count ?? 0;
          return (
            <li key={c.id}>
              <Link href={`/mais/compras/${c.id}`} className="cartao flex items-center gap-3 py-3">
                <div className="flex-1">
                  <p className="font-medium">{dataBR(c.data)}{c.local && ` · ${c.local}`}</p>
                  <p className="text-sm text-neutral-500">{qtd} {qtd === 1 ? "item" : "itens"}</p>
                </div>
                <strong>{brl(c.total)}</strong>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
