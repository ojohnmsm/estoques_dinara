"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import type { SaborComEstoque } from "@/lib/dados";
import { brl, FORMAS, horaBR, parseNumero } from "@/lib/formato";
import { desfazerVenda, registrarVenda, type Estado } from "./actions";
import { Mensagem } from "@/components/mensagem";
import { BotaoConfirmar } from "@/components/botao-confirmar";

type Forma = (typeof FORMAS)[number]["valor"];
type VendaHoje = { grupo: string; data_hora: string; forma: string; total: number; itens: string[] };

export function Vender({ sabores, vendasHoje }: { sabores: SaborComEstoque[]; vendasHoje: VendaHoje[] }) {
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [precos, setPrecos] = useState<Record<string, string>>({});
  const [forma, setForma] = useState<Forma | null>(null);
  const [estado, setEstado] = useState<Estado>({});
  const [pendente, iniciar] = useTransition();

  const porId = new Map(sabores.map((s) => [s.id, s]));
  const linhas = Object.entries(carrinho).filter(([, q]) => q > 0);
  const precoDe = (id: string) => {
    const p = parseNumero(precos[id]);
    return Number.isFinite(p) && p >= 0 ? p : porId.get(id)!.preco_venda;
  };
  const total = linhas.reduce((t, [id, q]) => t + q * precoDe(id), 0);
  const totalHoje = vendasHoje.reduce((t, v) => t + v.total, 0);

  function mudar(id: string, delta: number) {
    setEstado({});
    setCarrinho((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + delta) }));
  }

  function registrar() {
    iniciar(async () => {
      const r = await registrarVenda({
        forma: forma!,
        itens: linhas.map(([sabor_id, qtd]) => ({ sabor_id, qtd, preco_unitario: precoDe(sabor_id) })),
      });
      setEstado(r);
      if (!r.erro) {
        setCarrinho({});
        setPrecos({});
        setForma(null);
      }
    });
  }

  const semEstoque = linhas.filter(([id, q]) => q > porId.get(id)!.estoque);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Image src="/logo.png" alt="Casal Gourmet" width={44} height={44} />
        <h1 className="text-2xl font-bold text-azul-escuro">Vender</h1>
      </header>

      <ul className="grid grid-cols-2 gap-3">
        {sabores.map((s) => {
          const q = carrinho[s.id] ?? 0;
          return (
            <li key={s.id} className={`cartao relative p-0 ${q > 0 ? "border-rosa ring-2 ring-rosa/25" : ""}`}>
              <button type="button" onClick={() => mudar(s.id, 1)} className="w-full p-3 text-left">
                <span className="block font-semibold leading-tight">{s.nome}</span>
                <span className="block text-sm text-neutral-600">{brl(s.preco_venda)}</span>
                <span className={`block text-xs ${s.estoque <= 0 ? "text-red-700" : s.estoque <= s.estoque_minimo ? "text-amber-700" : "text-neutral-500"}`}>
                  {s.estoque} no freezer
                </span>
              </button>
              {q > 0 && (
                <div className="flex items-center justify-between border-t border-neutral-200 px-2 py-1">
                  <button type="button" aria-label={`Tirar um ${s.nome}`} onClick={() => mudar(s.id, -1)} className="h-11 w-11 text-2xl">−</button>
                  <span className="text-lg font-bold">{q}</span>
                  <button type="button" aria-label={`Mais um ${s.nome}`} onClick={() => mudar(s.id, 1)} className="h-11 w-11 text-2xl">+</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {linhas.length > 0 && (
        <section className="cartao space-y-4">
          <ul className="space-y-2">
            {linhas.map(([id, q]) => (
              <li key={id} className="flex items-center gap-2">
                <span className="flex-1">{q}× {porId.get(id)!.nome}</span>
                <label className="flex items-center gap-1 text-sm text-neutral-600">
                  R$
                  <input
                    inputMode="decimal"
                    aria-label={`Preço de ${porId.get(id)!.nome}`}
                    className="campo w-20 py-2 text-right"
                    placeholder={String(porId.get(id)!.preco_venda).replace(".", ",")}
                    value={precos[id] ?? ""}
                    onChange={(e) => setPrecos((p) => ({ ...p, [id]: e.target.value }))}
                  />
                </label>
              </li>
            ))}
          </ul>
          {semEstoque.length > 0 && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              O app mostra menos {semEstoque.map(([id]) => porId.get(id)!.nome).join(", ")} do que você está vendendo.
              A venda será registrada mesmo assim; depois faça uma contagem do freezer.
            </p>
          )}
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Forma de pagamento">
            {FORMAS.map((f) => (
              <button
                key={f.valor}
                type="button"
                role="radio"
                aria-checked={forma === f.valor}
                onClick={() => setForma(f.valor)}
                className={`btn ${forma === f.valor ? "bg-rosa-forte text-white" : "border border-neutral-300 bg-white"}`}
              >
                {f.rotulo}
              </button>
            ))}
          </div>
          <button type="button" disabled={pendente || !forma} onClick={registrar} className="btn-primario w-full text-lg">
            {pendente ? "Registrando…" : `Registrar ${brl(total)}`}
          </button>
        </section>
      )}

      <Mensagem estado={estado} />

      <section>
        <h2 className="mb-2 flex justify-between text-lg font-semibold">
          <span>Vendas de hoje</span>
          <span>{brl(totalHoje)}</span>
        </h2>
        {vendasHoje.length === 0 ? (
          <p className="text-neutral-500">Nenhuma venda hoje ainda.</p>
        ) : (
          <ul className="space-y-2">
            {vendasHoje.map((v) => (
              <li key={v.grupo} className="cartao flex items-center gap-3 py-3">
                <div className="flex-1">
                  <p className="font-medium">{v.itens.join(", ")}</p>
                  <p className="text-sm text-neutral-500">
                    {horaBR(v.data_hora)} · {FORMAS.find((f) => f.valor === v.forma)?.rotulo} · {brl(v.total)}
                  </p>
                </div>
                <BotaoConfirmar
                  acao={() => desfazerVenda(v.grupo)}
                  pergunta="Desfazer esta venda? Os sacolés voltam para o estoque."
                  className="text-sm text-red-700 underline"
                >
                  Desfazer
                </BotaoConfirmar>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
