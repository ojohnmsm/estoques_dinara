"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { CHAVE_TREINO, assinarFlags, gravarFlag, lerFlag } from "@/lib/tutorial";

/** Convite para o treino guiado até ele ser feito ou dispensado. `sempre`: mostra mesmo assim (app vazio). */
export function ConviteTreino({ sempre = false }: { sempre?: boolean }) {
  const feito = useSyncExternalStore(assinarFlags, () => lerFlag(CHAVE_TREINO), () => true);
  if (feito && !sempre) return null;

  return (
    <div className="rounded-2xl border border-azul-claro bg-ceu p-4">
      <p className="font-semibold text-azul-escuro">Primeira vez por aqui?</p>
      <p className="mt-1 text-sm text-neutral-700">
        Faça o treino guiado: em 2 minutos você registra uma nota, cria uma receita, produz e vende, tudo de mentirinha.
        Nada fica salvo.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <Link href="/tutorial" className="btn-primario min-h-10 px-4">Começar o treino</Link>
        {!sempre && (
          <button type="button" className="text-sm text-neutral-500 underline" onClick={() => gravarFlag(CHAVE_TREINO, true)}>
            Agora não
          </button>
        )}
      </div>
    </div>
  );
}
