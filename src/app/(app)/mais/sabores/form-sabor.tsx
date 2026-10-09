"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Ingrediente } from "@/lib/dados";
import { brl, parseNumero, pct } from "@/lib/formato";
import { custoReceita } from "@/lib/calculos";
import { salvarSabor, type Estado } from "../../actions";
import { Mensagem } from "@/components/mensagem";

type Sabor = {
  id: string;
  nome: string;
  preco_venda: number;
  estoque_minimo: number;
  rendimento_esperado: number;
  ativo: boolean;
  itens: { ingrediente_id: string; qtd_base: number }[];
};

const txt = (n: number | undefined) => (n == null ? "" : String(n).replace(".", ","));

export function FormSabor({ sabor, ingredientes }: { sabor?: Sabor; ingredientes: Ingrediente[] }) {
  const [nome, setNome] = useState(sabor?.nome ?? "");
  const [preco, setPreco] = useState(txt(sabor?.preco_venda));
  const [minimo, setMinimo] = useState(txt(sabor?.estoque_minimo ?? 10));
  const [rendimento, setRendimento] = useState(txt(sabor?.rendimento_esperado));
  const [ativo, setAtivo] = useState(sabor?.ativo ?? true);
  const [itens, setItens] = useState(
    (sabor?.itens ?? []).map((i) => ({ ingrediente_id: i.ingrediente_id, qtd: txt(i.qtd_base) })),
  );
  const [estado, setEstado] = useState<Estado>({});
  const [pendente, iniciar] = useTransition();

  const porId = new Map(ingredientes.map((i) => [i.id, i]));
  const receita = custoReceita(
    itens
      .filter((i) => porId.has(i.ingrediente_id) && parseNumero(i.qtd) > 0)
      .map((i) => ({ qtd_base: parseNumero(i.qtd), custo_unitario: porId.get(i.ingrediente_id)!.custo_unitario })),
  );
  const nRend = parseNumero(rendimento);
  const nPreco = parseNumero(preco);
  const custoSacole = nRend > 0 ? receita.total / nRend : null;
  const margem = custoSacole != null && nPreco > 0 ? (nPreco - custoSacole) / nPreco : null;

  function salvar() {
    iniciar(async () => {
      setEstado(
        await salvarSabor({
          id: sabor?.id ?? null,
          nome,
          preco_venda: preco,
          estoque_minimo: Number.isInteger(parseNumero(minimo)) ? parseNumero(minimo) : -1,
          rendimento_esperado: Number.isInteger(nRend) ? nRend : 0,
          ativo,
          itens: itens.map((i) => ({ ingrediente_id: i.ingrediente_id, qtd_base: parseNumero(i.qtd) })),
        }),
      );
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="rotulo" htmlFor="nome">Nome do sabor</label>
        <input id="nome" className="campo" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Morango com leite condensado" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo" htmlFor="preco">Preço de venda (R$)</label>
          <input id="preco" inputMode="decimal" className="campo" value={preco} onChange={(e) => setPreco(e.target.value)} />
        </div>
        <div>
          <label className="rotulo" htmlFor="minimo">Avisar quando tiver menos de</label>
          <input id="minimo" inputMode="numeric" className="campo" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
        </div>
      </div>

      <section className="cartao space-y-3">
        <h2 className="font-semibold">Receita</h2>
        <div>
          <label className="rotulo" htmlFor="rendimento">Uma receita rende quantos sacolés?</label>
          <input id="rendimento" inputMode="numeric" className="campo" value={rendimento} onChange={(e) => setRendimento(e.target.value)} />
        </div>
        {ingredientes.length === 0 ? (
          <p className="text-sm text-amber-800">
            Cadastre os ingredientes primeiro em <Link href="/mais/ingredientes" className="underline">Ingredientes</Link>.
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {itens.map((item, idx) => {
                const ing = porId.get(item.ingrediente_id);
                return (
                  <li key={idx} className="flex items-center gap-2">
                    <select
                      aria-label="Ingrediente"
                      className="campo flex-1 py-2"
                      value={item.ingrediente_id}
                      onChange={(e) => setItens(itens.map((x, j) => (j === idx ? { ...x, ingrediente_id: e.target.value } : x)))}
                    >
                      <option value="">Escolha…</option>
                      {ingredientes.map((i) => (
                        <option key={i.id} value={i.id}>{i.nome}</option>
                      ))}
                    </select>
                    <input
                      aria-label="Quantidade"
                      inputMode="decimal"
                      className="campo w-20 py-2 text-right"
                      value={item.qtd}
                      onChange={(e) => setItens(itens.map((x, j) => (j === idx ? { ...x, qtd: e.target.value } : x)))}
                    />
                    <span className="w-6 text-sm text-neutral-500">{ing?.unidade_base ?? ""}</span>
                    <button type="button" aria-label="Remover" className="h-10 w-8 text-xl text-neutral-400" onClick={() => setItens(itens.filter((_, j) => j !== idx))}>
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
            <button type="button" className="btn-secundario w-full" onClick={() => setItens([...itens, { ingrediente_id: "", qtd: "" }])}>
              + Ingrediente
            </button>
            <p className="text-xs text-neutral-500">Inclua o saquinho, com a quantidade igual ao rendimento.</p>
          </>
        )}
      </section>

      <section className="cartao space-y-1 bg-ceu">
        <p className="flex justify-between"><span>Custo da receita</span><strong>{brl(receita.total)}</strong></p>
        <p className="flex justify-between"><span>Custo por sacolé</span><strong>{custoSacole == null ? "—" : brl(custoSacole)}</strong></p>
        <p className="flex justify-between"><span>Margem</span><strong>{pct(margem)}</strong></p>
        {receita.incompleto && <p className="pt-1 text-sm text-amber-800">Algum ingrediente ainda não tem preço: registre uma compra dele.</p>}
      </section>

      <label className="flex items-center gap-3">
        <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="h-5 w-5 accent-rosa-forte" />
        Sabor ativo (aparece na tela de venda)
      </label>

      <Mensagem estado={estado} />
      <button type="button" disabled={pendente} onClick={salvar} className="btn-primario w-full">
        {pendente ? "Salvando…" : "Salvar sabor"}
      </button>
    </div>
  );
}
