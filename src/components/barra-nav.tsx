"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/", rotulo: "Vender", icone: "🛒" },
  { href: "/estoque", rotulo: "Estoque", icone: "🧊" },
  { href: "/resumo", rotulo: "Resumo", icone: "📊" },
  { href: "/mais", rotulo: "Mais", icone: "☰" },
] as const;

export function BarraNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {ABAS.map((aba) => {
          const ativa = aba.href === "/" ? pathname === "/" : pathname.startsWith(aba.href);
          return (
            <li key={aba.href}>
              <Link
                href={aba.href}
                className={`flex min-h-14 flex-col items-center justify-center text-xs font-medium ${
                  ativa ? "text-azul" : "text-neutral-500"
                }`}
              >
                <span aria-hidden className="text-xl leading-none">{aba.icone}</span>
                {aba.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
