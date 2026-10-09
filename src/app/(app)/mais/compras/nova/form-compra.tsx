"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Ingrediente } from "@/lib/dados";
import { brl, custoLegivel, parseNumero } from "@/lib/formato";
import { custoUnitario, qtdBaseItem } from "@/lib/calculos";
import { registrarCompra, type Estado } from "../../../actions";
import { Mensagem } from "@/components/mensagem";

type Linha = { ingrediente_id: string; granel: boolean; qtd: string; embalagem: string; valor: string };
const vazia: Linha = { ingrediente_id: "", granel: false, qtd: "1", embalagem: "", valor: "" };
const txt = (n: number | null) => (n == null ? "" : String(n).replace(".", ","));

export function FormCompra({ ingredientes, hoje }: { ingredientes: Ingrediente[]; hoje: string }) {
  const [data, setData] = useState(hoje);
  const [local, setLocal] = useState("");
  const [linhas, setLinhas] = useState<Linha[]>([{ ...vazia }]);
  const [estado, setEstado] = useState<Estado>({});
  const [pendente, iniciar] = useTransition();
  const porId = new Map(ingredientes.map((i) => [i.id, i]));

  const mudar = (idx: number, parcial: Partial<Linha>) =>
    setLinhas((ls) => ls.map((l, j) => (j === idx ? { ...l, ...parcial } : l)));

  const total = linhas.reduce((t, l) => t + (parseNumero(l.valor) || 0), 0);

  function salvar() {
    iniciar(async () => {
      setEstado(
        await registrarCompra({
          data,
          local: local || undefined,
          itens: linhas.map((l) => ({
            ingrediente_id: l.ingrediente_id,
            granel: l.granel,
            qtd_embalagens: parseNumero(l.qtd),
            embalagem_qtd: l.granel ? null : parseNumero(l.embalagem) || null,
            valor_total: parseNumero(l.valor),
          })),
        }),
      );
    });
  }

  if (ingredientes.length === 0) {
    return (
      <div className="cartao space-y-3">
        <p>Cadastre os ingredientes antes de registrar uma compra.</p>
        <Link href="/mais/ingredientes" className="btn-primario w-full">Ir para ingredientes</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo" htmlFor="data">Data</label>
          <input id="data" type="date" max={hoje} className="campo" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div>
          <label className="rotulo" htmlFor="local">Onde (opcional)</label>
          <input id="local" className="campo" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Mercado, feira…" />
        </div>
      </div>

      {linhas.map((l, idx) => {
        const ing = porId.get(l.ingrediente_id);
        const base = qtdBaseItem({ granel: l.granel, qtd: parseNumero(l.qtd) || 0, embalagem: parseNumero(l.embalagem) || null });
        const valor = parseNumero(l.valor);
        const podeGranel = ing && ing.unidade_base !== "un";
        return (
          <section key={idx} className="cartao space-y-3">
            <div className="flex gap-2">
              <select
                aria-label="Ingrediente"
                className="campo flex-1"
                value={l.ingrediente_id}
                onChange={(e) => {
                  const novo = porId.get(e.target.value);
                  mudar(idx, {
                    ingrediente_id: e.target.value,
                    embalagem: txt(novo?.embalagem_padrao ?? null),
                    granel: novo?.unidade_base === "un" ? false : l.granel,
                  });
                }}
              >
                <option value="">Escolha o ingrediente…</option>
                {ingredientes.map((i) => (
                  <option key={i.id} value={i.id}>{i.nome}</option>
                ))}
              </select>
              {linhas.length > 1 && (
                <button type="button" aria-label="Remover item" className="w-10 text-2xl text-neutral-400" onClick={() => setLinhas(linhas.filter((_, j) => j !== idx))}>
                  ×
                </button>
              )}
            </div>

            {ing && (
              <>
                {podeGranel && (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={l.granel} onChange={(e) => mudar(idx, { granel: e.target.checked })} className="h-5 w-5 accent-rosa-forte" />
                    Comprado a granel / por peso (fruta, por exemplo)
                  </label>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="rotulo text-xs">{l.granel ? (ing.unidade_base === "ml" ? "Litros" : "Quilos") : "Quantas emb."}</label>
                    <input inputMode="decimal" className="campo px-2" value={l.qtd} onChange={(e) => mudar(idx, { qtd: e.target.value })} />
                  </div>
                  {!l.granel && (
                    <div>
                      <label className="rotulo text-xs">Cada uma com ({ing.unidade_base})</label>
                      <input inputMode="decimal" className="campo px-2" value={l.embalagem} placeholder="395" onChange={(e) => mudar(idx, { embalagem: e.target.value })} />
                    </div>
                  )}
                  <div className={l.granel ? "col-span-2" : ""}>
                    <label className="rotulo text-xs">Valor pago (R$)</label>
                    <input inputMode="decimal" className="campo px-2" value={l.valor} onChange={(e) => mudar(idx, { valor: e.target.value })} />
                  </div>
                </div>
                {base > 0 && valor >= 0 && (
                  <p className="text-sm text-neutral-600">
                    Total: {base.toLocaleString("pt-BR")} {ing.unidade_base} · <strong>{custoLegivel(custoUnitario(valor, base), ing.unidade_base)}</strong>
                    {ing.custo_unitario != null && <> (antes {custoLegivel(ing.custo_unitario, ing.unidade_base)})</>}
                  </p>
                )}
              </>
            )}
          </section>
        );
      })}

      <button type="button" className="btn-secundario w-full" onClick={() => setLinhas([...linhas, { ...vazia }])}>
        + Item
      </button>

      <p className="flex justify-between text-lg"><span>Total</span><strong>{brl(total)}</strong></p>
      <Mensagem estado={estado} />
      <button type="button" disabled={pendente} onClick={salvar} className="btn-primario w-full">
        {pendente ? "Salvando…" : "Salvar compra"}
      </button>
    </div>
  );
}
