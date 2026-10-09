"use client";

import { useActionState } from "react";
import { salvarIngrediente, type Estado } from "../../actions";
import { Mensagem } from "@/components/mensagem";

const UNIDADES = [
  { valor: "g", rotulo: "Gramas (g)", dica: "açúcar, leite condensado, fruta, leite em pó" },
  { valor: "ml", rotulo: "Mililitros (ml)", dica: "leite, creme de leite, suco" },
  { valor: "un", rotulo: "Unidades (un)", dica: "saquinho, ovo, etiqueta" },
];

export function FormIngrediente({
  ingrediente,
}: {
  ingrediente?: { id: string; nome: string; unidade_base: string; emUso: boolean };
}) {
  const [estado, acao, pendente] = useActionState<Estado, FormData>(salvarIngrediente, {});
  return (
    <form action={acao} className="space-y-4" key={estado.ok}>
      {ingrediente && <input type="hidden" name="id" value={ingrediente.id} />}
      <div>
        <label className="rotulo" htmlFor="nome">Nome</label>
        <input id="nome" name="nome" required defaultValue={ingrediente?.nome} className="campo" placeholder="Ex.: Leite condensado" />
      </div>
      <fieldset>
        <legend className="rotulo">Medido em</legend>
        <div className="space-y-2">
          {UNIDADES.map((u) => (
            <label key={u.valor} className="cartao flex items-center gap-3 py-3">
              <input
                type="radio"
                name="unidade_base"
                value={u.valor}
                required
                defaultChecked={ingrediente?.unidade_base === u.valor}
                disabled={ingrediente?.emUso && ingrediente.unidade_base !== u.valor}
                className="h-5 w-5 accent-rosa-forte"
              />
              <span>
                <span className="block font-medium">{u.rotulo}</span>
                <span className="block text-sm text-neutral-500">{u.dica}</span>
              </span>
            </label>
          ))}
        </div>
        {ingrediente?.emUso && (
          <p className="mt-1 text-sm text-neutral-500">A unidade não pode mudar porque o ingrediente já tem compras ou receitas.</p>
        )}
      </fieldset>
      <Mensagem estado={estado} />
      <button type="submit" disabled={pendente} className="btn-primario w-full">
        {pendente ? "Salvando…" : ingrediente ? "Salvar" : "Adicionar ingrediente"}
      </button>
    </form>
  );
}
