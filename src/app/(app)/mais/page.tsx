import Link from "next/link";
import { Cabecalho } from "@/components/cabecalho";
import { sair } from "@/app/login/actions";

const ITENS = [
  { href: "/mais/compras", titulo: "Compras", texto: "Registrar o que comprou e quanto pagou" },
  { href: "/mais/sabores", titulo: "Sabores e receitas", texto: "Preço de venda, receita e custo por sacolé" },
  { href: "/mais/ingredientes", titulo: "Ingredientes", texto: "Lista de ingredientes e preço atual" },
];

export default function PaginaMais() {
  return (
    <>
      <Cabecalho titulo="Mais" />
      <ul className="mb-8 space-y-2">
        {ITENS.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="cartao flex items-center gap-3">
              <div className="flex-1">
                <p className="font-semibold">{i.titulo}</p>
                <p className="text-sm text-neutral-500">{i.texto}</p>
              </div>
              <span aria-hidden className="text-2xl text-neutral-400">›</span>
            </Link>
          </li>
        ))}
      </ul>
      <form action={sair}>
        <button className="btn-secundario w-full">Sair</button>
      </form>
    </>
  );
}
