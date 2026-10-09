"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { SaborComEstoque } from "@/lib/dados";
import { brl, parseNumero } from "@/lib/formato";
import { registrarProducao, type Estado } from "../../../actions";
import { Mensagem } from "@/components/mensagem";

export function FormProducao({ sabor, hoje }: { sabor: SaborComEstoque; hoje: string }) {
  const [estado, acao, pendente] = useActionState<Estado, FormData>(registrarProducao, {});
  const [receitas, setReceitas] = useState("1");
  const [qtd, setQtd] = useState(String(sabor.rendimento_esperado));
  const [qtdEditada, setQtdEditada] = useState(false);

  const nReceitas = parseNumero(receitas);
  const nQtd = parseNumero(qtd);
  const custoTotal = Number.isFinite(nReceitas) ? nReceitas * sabor.custo_receita : 0;
  const custoUnit = nQtd > 0 ? custoTotal / nQtd : 0;

  if (sabor.qtd_ingredientes === 0) {
    return (
      <div className="cartao space-y-3">
        <p>Este sabor ainda não tem receita. Cadastre a receita para calcular o custo da produção.</p>
        <Link href={`/mais/sabores/${sabor.id}`} className="btn-primario w-full">Cadastrar receita</Link>
      </div>
    );
  }

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="sabor_id" value={sabor.id} />
      <div>
        <label className="rotulo" htmlFor="data">Data</label>
        <input id="data" name="data" type="date" max={hoje} defaultValue={hoje} required className="campo" />
      </div>
      <div>
        <label className="rotulo" htmlFor="receitas_feitas">Quantas receitas você fez?</label>
        <input
          id="receitas_feitas"
          name="receitas_feitas"
          inputMode="decimal"
          required
          className="campo"
          value={receitas}
          onChange={(e) => {
            setReceitas(e.target.value);
            const n = parseNumero(e.target.value);
            if (!qtdEditada && Number.isFinite(n)) setQtd(String(Math.round(n * sabor.rendimento_esperado)));
          }}
        />
        <p className="mt-1 text-sm text-neutral-500">Pode ser 0,5 (meia receita) ou 2 (receita dobrada).</p>
      </div>
      <div>
        <label className="rotulo" htmlFor="qtd_produzida">Quantos sacolés saíram de fato?</label>
        <input
          id="qtd_produzida"
          name="qtd_produzida"
          inputMode="numeric"
          required
          className="campo"
          value={qtd}
          onChange={(e) => {
            setQtd(e.target.value);
            setQtdEditada(true);
          }}
        />
      </div>

      <div className="cartao bg-pink-50">
        <p className="flex justify-between"><span>Custo do lote</span><strong>{brl(custoTotal)}</strong></p>
        <p className="flex justify-between"><span>Custo por sacolé</span><strong>{brl(custoUnit)}</strong></p>
        {sabor.custo_incompleto && (
          <p className="mt-2 text-sm text-amber-800">
            Atenção: algum ingrediente da receita ainda não tem preço (falta registrar a compra). O custo vai ficar menor que o real.
          </p>
        )}
      </div>

      <Mensagem estado={estado} />
      <button type="submit" disabled={pendente} className="btn-primario w-full">
        {pendente ? "Salvando…" : "Salvar produção"}
      </button>
    </form>
  );
}
