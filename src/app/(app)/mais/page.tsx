import Link from "next/link";
import { Cabecalho } from "@/components/cabecalho";
import { sair } from "@/app/login/actions";
import { RefazerTutorial } from "./refazer-tutorial";

const ITENS = [
  { href: "/mais/compras", titulo: "Compras", texto: "Ler nota ou digitar o que comprou e quanto pagou" },
  { href: "/mais/sabores", titulo: "Sabores e receitas", texto: "Preço de venda, receita e custo por sacolé" },
  { href: "/mais/ingredientes", titulo: "Ingredientes", texto: "Lista de ingredientes e preço atual" },
  { href: "/mais/lembrados", titulo: "Itens lembrados das notas", texto: "Corrigir ou desfazer um vínculo errado" },
];

export default function PaginaMais() {
  return (
    <>
      <Cabecalho titulo="Mais" ajuda="mais" />
      <ul className="mb-6 space-y-2" data-tour="mais-menu">
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
      <section className="cartao mb-8 space-y-3" data-tour="mais-tutorial">
        <h2 className="font-semibold">Ajuda</h2>
        <Link href="/tutorial" className="btn-primario w-full">Fazer o treino guiado</Link>
        <RefazerTutorial />
      </section>
      <form action={sair}>
        <button className="btn-secundario w-full">Sair</button>
      </form>
    </>
  );
}
