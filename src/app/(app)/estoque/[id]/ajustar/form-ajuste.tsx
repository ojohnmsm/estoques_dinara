"use client";

import { useActionState, useState } from "react";
import { MOTIVOS, parseNumero } from "@/lib/formato";
import { registrarAjuste, type Estado } from "../../../actions";
import { Mensagem } from "@/components/mensagem";

type Motivo = keyof typeof MOTIVOS;

export function FormAjuste({ saborId, estoque }: { saborId: string; estoque: number }) {
  const [estado, acao, pendente] = useActionState<Estado, FormData>(registrarAjuste, {});
  const [motivo, setMotivo] = useState<Motivo>("contagem");
  const [qtd, setQtd] = useState("");
  const n = parseNumero(qtd);

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="sabor_id" value={saborId} />
      <fieldset className="space-y-2">
        <legend className="rotulo">Motivo</legend>
        {(Object.keys(MOTIVOS) as Motivo[]).map((m) => (
          <label key={m} className="cartao flex items-center gap-3 py-3">
            <input type="radio" name="motivo" value={m} checked={motivo === m} onChange={() => setMotivo(m)} className="h-5 w-5 accent-pink-600" />
            {MOTIVOS[m]}
          </label>
        ))}
      </fieldset>

      {motivo === "outro" && (
        <div className="grid grid-cols-2 gap-2">
          <label className="cartao flex items-center gap-2 py-3">
            <input type="radio" name="direcao" value="saida" defaultChecked className="h-5 w-5 accent-pink-600" /> Tirar
          </label>
          <label className="cartao flex items-center gap-2 py-3">
            <input type="radio" name="direcao" value="entrada" className="h-5 w-5 accent-pink-600" /> Somar
          </label>
        </div>
      )}

      <div>
        <label className="rotulo" htmlFor="qtd">
          {motivo === "contagem" ? "Quantos você contou no freezer?" : "Quantidade"}
        </label>
        <input id="qtd" name="qtd" inputMode="numeric" required className="campo" value={qtd} onChange={(e) => setQtd(e.target.value)} />
        {motivo === "contagem" && Number.isInteger(n) && n >= 0 && (
          <p className="mt-1 text-sm text-neutral-600">
            O app mostra {estoque}.{" "}
            {n === estoque ? "Está certo, nada a ajustar." : `Ajuste de ${n - estoque > 0 ? "+" : ""}${n - estoque}.`}
          </p>
        )}
      </div>
      <div>
        <label className="rotulo" htmlFor="observacao">Observação (opcional)</label>
        <input id="observacao" name="observacao" className="campo" maxLength={200} />
      </div>
      <Mensagem estado={estado} />
      <button type="submit" disabled={pendente} className="btn-primario w-full">
        {pendente ? "Salvando…" : "Salvar ajuste"}
      </button>
    </form>
  );
}
