"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Ingrediente } from "@/lib/dados";
import type { LinhaSugerida, Situacao } from "@/lib/nota";
import { brl, custoLegivel, dataBR, parseNumero } from "@/lib/formato";
import { custoUnitario, qtdBaseItem } from "@/lib/calculos";
import { criarIngrediente, registrarCompra, type Duplicada, type Estado, type NotaParaRevisar } from "../../../actions";
import { Mensagem } from "@/components/mensagem";

type Linha = {
  ingrediente_id: string;
  granel: boolean;
  qtd: string;
  embalagem: string;
  valor: string;
  // só nas linhas que vieram da nota
  texto?: string;
  codigo?: string | null;
  situacao?: Situacao;
  embalagemLida?: LinhaSugerida["embalagem_lida"];
};

const vazia: Linha = { ingrediente_id: "", granel: false, qtd: "1", embalagem: "", valor: "" };
const txt = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));
const NOVO = "__novo__";

function daNota(l: LinhaSugerida): Linha {
  return {
    ingrediente_id: l.ingrediente_id,
    granel: l.granel,
    qtd: txt(l.qtd),
    embalagem: txt(l.embalagem),
    valor: txt(l.valor),
    texto: l.texto,
    codigo: l.codigo,
    situacao: l.situacao,
    embalagemLida: l.embalagem_lida,
  };
}

const ROTULO: Record<Situacao, { texto: string; cor: string }> = {
  conhecido: { texto: "Já conhecido", cor: "bg-green-100 text-green-800" },
  novo: { texto: "Confira", cor: "bg-amber-100 text-amber-800" },
  ignorar: { texto: "Ignorado", cor: "bg-neutral-200 text-neutral-600" },
};

export function FormCompra({
  ingredientes: iniciais,
  hoje,
  nota,
}: {
  ingredientes: Ingrediente[];
  hoje: string;
  nota?: NotaParaRevisar;
}) {
  const [ingredientes, setIngredientes] = useState(iniciais);
  const [data, setData] = useState(nota?.data && nota.data <= hoje ? nota.data : hoje);
  const [local, setLocal] = useState(nota?.local ?? "");
  const [linhas, setLinhas] = useState<Linha[]>(nota ? nota.linhas.map(daNota) : [{ ...vazia }]);
  const [criandoEm, setCriandoEm] = useState<number | null>(null);
  const [estado, setEstado] = useState<Estado>({});
  const [pendente, iniciar] = useTransition();
  const porId = new Map(ingredientes.map((i) => [i.id, i]));

  const mudar = (idx: number, parcial: Partial<Linha>) =>
    setLinhas((ls) => ls.map((l, j) => (j === idx ? { ...l, ...parcial } : l)));

  function escolherIngrediente(idx: number, id: string) {
    if (id === NOVO) return setCriandoEm(idx);
    const ing = porId.get(id);
    const l = linhas[idx];
    // na nota, usa a embalagem impressa se for da mesma unidade; senão, a última usada
    const lida = ing && l.embalagemLida?.unidade === ing.unidade_base ? l.embalagemLida.qtd : null;
    mudar(idx, {
      ingrediente_id: id,
      embalagem: txt(lida ?? ing?.embalagem_padrao),
      granel: ing?.unidade_base === "un" ? false : l.granel,
    });
  }

  const ativas = linhas.filter((l) => l.situacao !== "ignorar");
  const total = ativas.reduce((t, l) => t + (parseNumero(l.valor) || 0), 0);
  const totalNota = nota?.total ?? null;
  const totalTudo = linhas.reduce((t, l) => t + (parseNumero(l.valor) || 0), 0);
  const divergeDaNota = totalNota != null && Math.abs(totalTudo - totalNota) > 0.05;

  const notaRepetida = nota?.duplicada?.motivo === "chave";

  function salvar(confirmar_duplicada = false) {
    iniciar(async () => {
      const r = await registrarCompra({
        data,
        local: local || undefined,
        foto_path: nota?.foto_path ?? null,
        chave_acesso: nota?.chave_acesso ?? null,
        confirmar_duplicada,
        itens: ativas.map((l) => ({
          ingrediente_id: l.ingrediente_id,
          granel: l.granel,
          qtd_embalagens: parseNumero(l.qtd),
          embalagem_qtd: l.granel ? null : parseNumero(l.embalagem) || null,
          valor_total: parseNumero(l.valor),
          nota: l.texto ? { texto_original: l.texto, codigo: l.codigo ?? null } : undefined,
        })),
        ignorados: linhas
          .filter((l) => l.situacao === "ignorar" && l.texto)
          .map((l) => ({ texto_original: l.texto!, codigo: l.codigo ?? null })),
      });
      setEstado(r);
    });
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

      {nota?.duplicada && <AvisoDuplicada dup={nota.duplicada} />}

      {nota && !notaRepetida && (
        <p className="rounded-xl bg-ceu p-3 text-sm text-azul-escuro">
          Confira cada item. Os amarelos são novos: escolha o ingrediente certo uma vez e o app lembra nas próximas notas.
          Marque &quot;ignorar&quot; no que não vai em receita.
        </p>
      )}

      {linhas.map((l, idx) => {
        const ing = porId.get(l.ingrediente_id);
        const ignorada = l.situacao === "ignorar";
        const base = qtdBaseItem({ granel: l.granel, qtd: parseNumero(l.qtd) || 0, embalagem: parseNumero(l.embalagem) || null });
        const valor = parseNumero(l.valor);
        const podeGranel = ing && ing.unidade_base !== "un";
        return (
          <section
            key={idx}
            data-tour={idx === 0 ? (nota ? "revisao-item" : "compra-item") : undefined}
            className={`cartao space-y-3 ${ignorada ? "opacity-60" : ""}`}
          >
            {l.texto && (
              <div className="flex items-start gap-2">
                <p className="flex-1 font-mono text-xs text-neutral-600">{l.texto}</p>
                {l.situacao && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ROTULO[l.situacao].cor}`}>
                    {ROTULO[l.situacao].texto}
                  </span>
                )}
              </div>
            )}

            {l.texto && (
              <label className="flex items-center gap-2 text-sm" data-tour={idx === 0 ? "revisao-ignorar" : undefined}>
                <input
                  type="checkbox"
                  checked={ignorada}
                  onChange={(e) => mudar(idx, { situacao: e.target.checked ? "ignorar" : l.ingrediente_id ? "conhecido" : "novo" })}
                  className="h-5 w-5 accent-rosa-forte"
                />
                Ignorar (não é ingrediente)
              </label>
            )}

            {!ignorada && (
              <>
                <div className="flex gap-2" data-tour={idx === 0 && nota ? "revisao-ingrediente" : undefined}>
                  <select
                    aria-label="Ingrediente"
                    className="campo flex-1"
                    value={l.ingrediente_id}
                    onChange={(e) => escolherIngrediente(idx, e.target.value)}
                  >
                    <option value="">Escolha o ingrediente…</option>
                    {ingredientes.map((i) => (
                      <option key={i.id} value={i.id}>{i.nome}</option>
                    ))}
                    <option value={NOVO}>+ Novo ingrediente…</option>
                  </select>
                  {!l.texto && linhas.length > 1 && (
                    <button type="button" aria-label="Remover item" className="w-10 text-2xl text-neutral-400" onClick={() => setLinhas(linhas.filter((_, j) => j !== idx))}>
                      ×
                    </button>
                  )}
                </div>

                {criandoEm === idx && (
                  <NovoIngrediente
                    sugestao={l.texto ?? ""}
                    onCancelar={() => setCriandoEm(null)}
                    onCriado={(novo) => {
                      setIngredientes((is) => [...is, novo].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
                      setCriandoEm(null);
                      mudar(idx, {
                        ingrediente_id: novo.id,
                        granel: novo.unidade_base === "un" ? false : l.granel,
                        embalagem: l.embalagemLida?.unidade === novo.unidade_base ? txt(l.embalagemLida.qtd) : l.embalagem,
                      });
                    }}
                  />
                )}

                {ing && (
                  <>
                    {podeGranel && (
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={l.granel} onChange={(e) => mudar(idx, { granel: e.target.checked })} className="h-5 w-5 accent-rosa-forte" />
                        Comprado a granel / por peso
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
                          <input inputMode="decimal" className="campo px-2" value={l.embalagem} placeholder={ing.unidade_base === "un" ? "15" : "395"} onChange={(e) => mudar(idx, { embalagem: e.target.value })} />
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
              </>
            )}
            {ignorada && <p className="text-sm text-neutral-500">{brl(parseNumero(l.valor) || 0)} · não entra no custo</p>}
          </section>
        );
      })}

      {!nota && (
        <button type="button" data-tour="compra-adicionar" className="btn-secundario w-full" onClick={() => setLinhas([...linhas, { ...vazia }])}>
          + Item
        </button>
      )}

      <div className="space-y-1" data-tour="revisao-total">
        <p className="flex justify-between text-lg"><span>Total em ingredientes</span><strong>{brl(total)}</strong></p>
        {totalNota != null && (
          <p className={`flex justify-between text-sm ${divergeDaNota ? "text-amber-800" : "text-neutral-500"}`}>
            <span>Total da nota{divergeDaNota ? " (não bate com a soma dos itens: confira os valores)" : ""}</span>
            <span>{brl(totalNota)}</span>
          </p>
        )}
      </div>
      {estado.duplicada?.motivo === "parecida" && !estado.erro ? (
        <div className="space-y-3">
          <AvisoDuplicada dup={estado.duplicada} />
          <button type="button" disabled={pendente} onClick={() => salvar(true)} className="btn-secundario w-full">
            {pendente ? "Salvando…" : "É outra compra, salvar mesmo assim"}
          </button>
        </div>
      ) : (
        <>
          <Mensagem estado={estado} />
          <button type="button" disabled={pendente || ativas.length === 0 || notaRepetida} onClick={() => salvar()} className="btn-primario w-full">
            {pendente ? "Salvando…" : "Salvar compra"}
          </button>
        </>
      )}
    </div>
  );
}

function AvisoDuplicada({ dup }: { dup: Duplicada }) {
  const quando = `${dataBR(dup.data)}${dup.local ? ` (${dup.local})` : ""}, ${brl(dup.total)}`;
  return (
    <div role="alert" className={`rounded-xl p-3 text-sm ${dup.motivo === "chave" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}>
      <p className="font-semibold">{dup.motivo === "chave" ? "Esta nota já foi registrada" : "Parece uma compra repetida"}</p>
      <p className="mt-1">
        {dup.motivo === "chave"
          ? `É a mesma nota fiscal da compra de ${quando}. Salvar de novo contaria tudo duas vezes, então o app não deixa.`
          : `Já existe uma compra em ${quando}. Se for a mesma nota, não salve de novo.`}
      </p>
      <Link href={`/mais/compras/${dup.compra_id}`} className="mt-2 inline-block font-medium underline">
        Ver a compra registrada
      </Link>
    </div>
  );
}

function NovoIngrediente({
  sugestao,
  onCriado,
  onCancelar,
}: {
  sugestao: string;
  onCriado: (i: Ingrediente) => void;
  onCancelar: () => void;
}) {
  const [nome, setNome] = useState("");
  const [unidade, setUnidade] = useState<"g" | "ml" | "un" | "">("");
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();

  return (
    <div className="space-y-3 rounded-xl border border-azul-claro bg-ceu p-3">
      <p className="text-sm font-medium text-azul-escuro">Novo ingrediente</p>
      <input
        className="campo"
        placeholder={sugestao ? "Nome simples, ex.: Leite condensado" : "Ex.: Leite condensado"}
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        aria-label="Nome do ingrediente"
      />
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Medido em">
        {(["g", "ml", "un"] as const).map((u) => (
          <button
            key={u}
            type="button"
            role="radio"
            aria-checked={unidade === u}
            onClick={() => setUnidade(u)}
            className={`btn ${unidade === u ? "bg-azul text-white" : "border border-neutral-300 bg-white"}`}
          >
            {u === "g" ? "gramas" : u === "ml" ? "ml" : "unidades"}
          </button>
        ))}
      </div>
      {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-secundario" onClick={onCancelar}>Cancelar</button>
        <button
          type="button"
          className="btn-primario"
          disabled={pendente || !nome.trim() || !unidade}
          onClick={() =>
            iniciar(async () => {
              if (!unidade) return;
              const r = await criarIngrediente({ nome, unidade_base: unidade });
              if ("erro" in r) setErro(r.erro);
              else onCriado(r.ingrediente);
            })
          }
        >
          {pendente ? "Criando…" : "Criar"}
        </button>
      </div>
    </div>
  );
}
