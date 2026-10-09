"use client";

import { useState, useTransition } from "react";
import type { Estado } from "@/app/(app)/actions";

/** Botão para ações destrutivas: pede confirmação e mostra o erro, se houver. */
export function BotaoConfirmar({
  acao,
  pergunta,
  children,
  className = "btn-perigo",
}: {
  acao: () => Promise<Estado>;
  pergunta: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();
  return (
    <div>
      <button
        type="button"
        disabled={pendente}
        className={className}
        onClick={() => {
          if (!confirm(pergunta)) return;
          setErro(undefined);
          iniciar(async () => {
            const r = await acao();
            if (r?.erro) setErro(r.erro);
          });
        }}
      >
        {pendente ? "Aguarde…" : children}
      </button>
      {erro && <p role="alert" className="mt-2 text-sm text-red-700">{erro}</p>}
    </div>
  );
}
