"use client";

import { useState, useTransition } from "react";
import type { Ingrediente } from "@/lib/dados";
import { esquecerProduto, trocarVinculo } from "../../actions";

type Produto = {
  id: string;
  texto_exemplo: string;
  codigo: string | null;
  ingrediente_id: string | null;
  ignorar: boolean;
};

const IGNORAR = "__ignorar__";

export function ListaLembrados({ produtos, ingredientes }: { produtos: Produto[]; ingredientes: Ingrediente[] }) {
  if (produtos.length === 0) {
    return <p className="text-neutral-500">Nenhum item lembrado ainda. Eles aparecem aqui depois da primeira nota lida.</p>;
  }
  return (
    <ul className="space-y-2" data-tour="lembrados-lista">
      {produtos.map((p) => (
        <Item key={p.id} produto={p} ingredientes={ingredientes} />
      ))}
    </ul>
  );
}

function Item({ produto, ingredientes }: { produto: Produto; ingredientes: Ingrediente[] }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();
  const valor = produto.ignorar ? IGNORAR : (produto.ingrediente_id ?? "");

  return (
    <li className="cartao space-y-2 py-3">
      <p className="font-mono text-xs text-neutral-600">{produto.texto_exemplo}</p>
      <div className="flex gap-2">
        <select
          aria-label="Ingrediente"
          className="campo flex-1 py-2"
          value={valor}
          disabled={pendente}
          onChange={(e) =>
            iniciar(async () => {
              const r = await trocarVinculo(produto.id, e.target.value === IGNORAR ? null : e.target.value);
              setErro(r.erro);
            })
          }
        >
          {!valor && <option value="">Sem vínculo</option>}
          {ingredientes.map((i) => (
            <option key={i.id} value={i.id}>{i.nome}</option>
          ))}
          <option value={IGNORAR}>Ignorar (não é ingrediente)</option>
        </select>
        <button
          type="button"
          disabled={pendente}
          className="btn-secundario min-h-10 px-3 text-sm"
          onClick={() => {
            if (!confirm("Esquecer este item? Na próxima nota ele aparece como novo.")) return;
            iniciar(async () => {
              const r = await esquecerProduto(produto.id);
              setErro(r.erro);
            });
          }}
        >
          Esquecer
        </button>
      </div>
      {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
    </li>
  );
}
