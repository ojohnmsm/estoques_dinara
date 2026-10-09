import Link from "next/link";
import { listarSabores } from "@/lib/dados";
import { Cabecalho } from "@/components/cabecalho";

export default async function PaginaEstoque() {
  const sabores = await listarSabores({ somenteAtivos: true });
  // urgência: negativos e abaixo do mínimo primeiro
  const ordenados = [...sabores].sort((a, b) => {
    const urg = (s: typeof a) => (s.estoque < 0 ? 0 : s.estoque <= s.estoque_minimo ? 1 : 2);
    return urg(a) - urg(b) || a.estoque - b.estoque;
  });

  return (
    <>
      <Cabecalho titulo="Estoque" />
      {ordenados.length === 0 && <p className="text-neutral-500">Nenhum sabor ativo.</p>}
      <ul className="space-y-2">
        {ordenados.map((s) => {
          const cor =
            s.estoque < 0 ? "text-red-700" : s.estoque <= s.estoque_minimo ? "text-amber-700" : "text-neutral-900";
          return (
            <li key={s.id}>
              <Link href={`/estoque/${s.id}`} className="cartao flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-semibold">{s.nome}</p>
                  {s.estoque < 0 && <p className="text-sm text-red-700">Negativo: faça uma contagem</p>}
                  {s.estoque >= 0 && s.estoque <= s.estoque_minimo && (
                    <p className="text-sm text-amber-700">Hora de produzir (mínimo {s.estoque_minimo})</p>
                  )}
                </div>
                <span className={`text-3xl font-bold tabular-nums ${cor}`}>{s.estoque}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
