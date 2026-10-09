import Link from "next/link";
import { listarSabores } from "@/lib/dados";
import { brl, pct } from "@/lib/formato";
import { Cabecalho } from "@/components/cabecalho";

export default async function PaginaSabores() {
  const sabores = await listarSabores();
  return (
    <>
      <Cabecalho titulo="Sabores" voltar="/mais" ajuda="sabores" acao={<Link href="/mais/sabores/novo" data-tour="sabores-novo" className="btn-primario min-h-10 px-3 text-sm">+ Novo</Link>} />
      {sabores.length === 0 && <p className="text-neutral-500">Nenhum sabor cadastrado.</p>}
      <ul className="space-y-2" data-tour="sabores-lista">
        {sabores.map((s) => {
          const custo = s.custo_receita / s.rendimento_esperado;
          const margem = s.preco_venda > 0 ? (s.preco_venda - custo) / s.preco_venda : null;
          return (
            <li key={s.id}>
              <Link href={`/mais/sabores/${s.id}`} className={`cartao block py-3 ${s.ativo ? "" : "opacity-60"}`}>
                <p className="flex justify-between font-semibold">
                  <span>{s.nome}{!s.ativo && " (inativo)"}</span>
                  <span>{brl(s.preco_venda)}</span>
                </p>
                <p className="text-sm text-neutral-500">
                  {s.qtd_ingredientes === 0
                    ? "sem receita"
                    : `custo ${brl(custo)} · margem ${pct(margem)}${s.custo_incompleto ? " · falta preço de ingrediente" : ""}`}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
