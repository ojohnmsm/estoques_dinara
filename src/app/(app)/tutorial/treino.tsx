"use client";

// Treino guiado: simula o ciclo completo com dados fictícios que vivem só nesta tela.
// Nada é enviado ao servidor; ao sair ou concluir, tudo some.

import Link from "next/link";
import { useEffect, useState } from "react";
import { calcularResumo, custoReceita, custoUnitario, qtdBaseItem } from "@/lib/calculos";
import { brl, custoLegivel, num, parseNumero, pct, type Unidade } from "@/lib/formato";
import { CHAVE_TREINO, gravarFlag } from "@/lib/tutorial";

type ItemNota = {
  texto: string;
  ingrediente: string;
  unidade: Unidade;
  granel: boolean;
  qtd: number;
  embalagem: number | null;
  valor: number;
  ignorar?: boolean;
};

const NOTA: ItemNota[] = [
  { texto: "LTE COND MOCA 395G", ingrediente: "Leite condensado", unidade: "g", granel: false, qtd: 2, embalagem: 395, valor: 17 },
  { texto: "LEITE INTEG 1L", ingrediente: "Leite", unidade: "ml", granel: false, qtd: 1, embalagem: 1000, valor: 5 },
  { texto: "MORANGO KG 0,500 x 30,00", ingrediente: "Morango", unidade: "g", granel: true, qtd: 0.5, embalagem: null, valor: 15 },
  { texto: "SAQ SACOLE 6X24 C/100", ingrediente: "Saquinho", unidade: "un", granel: false, qtd: 1, embalagem: 100, valor: 8 },
  { texto: "SACOLA PLASTICA", ingrediente: "", unidade: "un", granel: false, qtd: 1, embalagem: null, valor: 0.2, ignorar: true },
];

const ETAPAS = ["Início", "Nota", "Ingredientes", "Receita", "Produzir", "Vender", "Resumo"] as const;

function Dica({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-ceu p-3 text-sm text-azul-escuro">{children}</div>;
}

export function Treino() {
  const [etapa, setEtapa] = useState(0);
  // estado fictício
  const [confirmados, setConfirmados] = useState<Set<number>>(new Set());
  const [lendo, setLendo] = useState(false);
  const [notaLida, setNotaLida] = useState(false);
  const [preco, setPreco] = useState("5,00");
  const [rendimento, setRendimento] = useState("20");
  const [receita, setReceita] = useState<Record<string, string>>({ "Leite condensado": "395", Leite: "500", Morango: "250", Saquinho: "20" });
  const [saidos, setSaidos] = useState("");
  const [carrinho, setCarrinho] = useState(0);
  const [forma, setForma] = useState<"pix" | "dinheiro" | "cartao" | null>(null);
  const [vendidos, setVendidos] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (etapa === ETAPAS.length) gravarFlag(CHAVE_TREINO, true);
  }, [etapa]);

  // contas reais do app, com os dados de mentira
  const ingredientes = NOTA.filter((i) => !i.ignorar).map((i) => ({
    nome: i.ingrediente,
    unidade: i.unidade,
    custo: custoUnitario(i.valor, qtdBaseItem({ granel: i.granel, qtd: i.qtd, embalagem: i.embalagem })),
  }));
  const custoDe = new Map(ingredientes.map((i) => [i.nome, i.custo]));
  const custoRec = custoReceita(
    Object.entries(receita).map(([nome, q]) => ({ qtd_base: parseNumero(q) || 0, custo_unitario: custoDe.get(nome) ?? null })),
  ).total;
  const nRend = parseNumero(rendimento) || 0;
  const nPreco = parseNumero(preco) || 0;
  const custoSacole = nRend > 0 ? custoRec / nRend : 0;
  const nSaidos = parseNumero(saidos);
  const produzidos = Number.isInteger(nSaidos) && nSaidos > 0 ? nSaidos : 0;
  const custoLote = produzidos > 0 ? custoRec / produzidos : 0;
  const estoque = produzidos - vendidos;
  const resumo = calcularResumo(
    vendidos ? [{ sabor_id: "m", qtd: vendidos, preco_unitario: nPreco, custo_unitario: custoLote, forma_pagamento: forma ?? "pix" }] : [],
    [],
    [NOTA.reduce((t, i) => t + i.valor, 0)],
  );

  const aConfirmar = NOTA.map((_, i) => i).filter((i) => !NOTA[i].ignorar);
  const notaPronta = aConfirmar.every((i) => confirmados.has(i));

  function proximo() {
    setEtapa((e) => e + 1);
  }

  function reiniciar() {
    setEtapa(0);
    setConfirmados(new Set());
    setNotaLida(false);
    setPreco("5,00");
    setRendimento("20");
    setReceita({ "Leite condensado": "395", Leite: "500", Morango: "250", Saquinho: "20" });
    setSaidos("");
    setCarrinho(0);
    setForma(null);
    setVendidos(0);
  }

  if (etapa === ETAPAS.length) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-5xl">🎉</p>
        <h1 className="text-2xl font-bold text-azul-escuro">Treino concluído!</h1>
        <p className="text-neutral-700">
          Você fez o ciclo inteiro: <strong>compra → ingredientes → receita → produção → venda → lucro</strong>.
          Tudo foi de mentirinha e nada ficou salvo.
        </p>
        <Dica>
          Para começar de verdade: registre a primeira compra (ou digite os ingredientes que já tem em casa),
          depois cadastre os sabores com a receita. Em cada tela, o botão <strong>?</strong> explica tudo de novo.
        </Dica>
        <Link href="/mais/compras" className="btn-primario w-full">Começar de verdade</Link>
        <button type="button" onClick={reiniciar} className="btn-secundario w-full">Refazer o treino</button>
        <Link href="/" className="block text-sm text-neutral-500 underline">Voltar para o início</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-azul-escuro">Treino · {ETAPAS[etapa]}</h1>
          <Link href="/" className="text-sm text-neutral-500 underline">Sair</Link>
        </div>
        <div className="flex gap-1" aria-label={`Etapa ${etapa + 1} de ${ETAPAS.length}`}>
          {ETAPAS.map((n, i) => (
            <span key={n} className={`h-1.5 flex-1 rounded-full ${i <= etapa ? "bg-rosa" : "bg-neutral-200"}`} />
          ))}
        </div>
        <p className="text-xs text-neutral-500">Modo treino: nada aqui é salvo.</p>
      </header>

      {etapa === 0 && (
        <>
          <p className="text-neutral-700">
            Vamos simular o dia a dia em 6 passos rápidos, com uma receita de <strong>sacolé de morango</strong>:
          </p>
          <ol className="cartao list-decimal space-y-1 pl-8 text-sm">
            <li>Ler a nota do mercado</li>
            <li>Ver o preço dos ingredientes</li>
            <li>Cadastrar a receita</li>
            <li>Registrar a produção</li>
            <li>Vender</li>
            <li>Ver o lucro</li>
          </ol>
          <Dica>O app gira em torno de uma ideia: <strong>a compra dá o preço, a receita dá o custo, a venda dá o lucro.</strong></Dica>
          <button type="button" onClick={proximo} className="btn-primario w-full">Começar</button>
        </>
      )}

      {etapa === 1 && (
        <>
          <Dica>
            Em <strong>Mais → Compras → Ler nota</strong> você tira foto do cupom. A IA lê cada item e você só confere.
          </Dica>
          {!notaLida ? (
            <>
              <div className="cartao mx-auto max-w-xs rotate-[-1deg] font-mono text-xs leading-relaxed">
                <p className="text-center font-bold">MERCADO EXEMPLO</p>
                <p className="text-center">NFC-e</p>
                <hr className="my-2 border-dashed" />
                {NOTA.map((i) => (
                  <p key={i.texto} className="flex justify-between gap-2">
                    <span>{i.texto}</span>
                    <span>{num(i.valor)}</span>
                  </p>
                ))}
                <hr className="my-2 border-dashed" />
                <p className="flex justify-between font-bold"><span>TOTAL R$</span><span>{num(NOTA.reduce((t, i) => t + i.valor, 0))}</span></p>
              </div>
              <button
                type="button"
                disabled={lendo}
                className="btn-primario w-full"
                onClick={() => {
                  setLendo(true);
                  setTimeout(() => {
                    setLendo(false);
                    setNotaLida(true);
                  }, 1200);
                }}
              >
                {lendo ? "Lendo a nota…" : "📷 Tirar foto da nota (simulado)"}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-neutral-700">
                A IA leu 5 itens. <strong>Toque em Confirmar</strong> nos amarelos. No app de verdade você também pode trocar o
                ingrediente ou criar um novo.
              </p>
              <ul className="space-y-2">
                {NOTA.map((item, idx) => {
                  const ok = confirmados.has(idx);
                  const base = qtdBaseItem({ granel: item.granel, qtd: item.qtd, embalagem: item.embalagem });
                  return (
                    <li key={item.texto} className={`cartao space-y-2 py-3 ${item.ignorar ? "opacity-60" : ""}`}>
                      <div className="flex items-start gap-2">
                        <p className="flex-1 font-mono text-xs text-neutral-600">{item.texto}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.ignorar ? "bg-neutral-200 text-neutral-600" : ok ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.ignorar ? "Ignorado" : ok ? "Confirmado" : "Confira"}
                        </span>
                      </div>
                      {item.ignorar ? (
                        <p className="text-sm text-neutral-500">Sacola não vai em receita: a IA já marcou para ignorar.</p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="flex-1 text-sm">
                            → <strong>{item.ingrediente}</strong>
                            <span className="text-neutral-500">
                              {" "}· {item.granel ? `${num(item.qtd, 3)} kg a granel` : `${item.qtd} × ${item.embalagem} ${item.unidade}`} ·{" "}
                              {custoLegivel(custoUnitario(item.valor, base), item.unidade)}
                            </span>
                          </p>
                          {!ok && (
                            <button
                              type="button"
                              className="btn-primario min-h-10 px-3 text-sm"
                              onClick={() => setConfirmados((c) => new Set(c).add(idx))}
                            >
                              Confirmar
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              {notaPronta && (
                <Dica>
                  Pronto! Da próxima vez que &quot;LTE COND MOCA 395G&quot; aparecer numa nota, o app já sabe que é Leite condensado
                  e o item vem verde. Se você tentar salvar a mesma nota duas vezes, o app avisa.
                </Dica>
              )}
              <button type="button" disabled={!notaPronta} onClick={proximo} className="btn-primario w-full">
                {notaPronta ? "Salvar compra" : `Confirme os itens (${confirmados.size}/${aConfirmar.length})`}
              </button>
            </>
          )}
        </>
      )}

      {etapa === 2 && (
        <>
          <Dica>
            Ao salvar a compra, cada ingrediente ganhou um <strong>preço</strong>. Você vê isso em <strong>Mais → Ingredientes</strong>.
            Quando comprar de novo, o preço atualiza sozinho.
          </Dica>
          <ul className="space-y-2">
            {ingredientes.map((i) => (
              <li key={i.nome} className="cartao flex justify-between py-3">
                <span className="font-medium">{i.nome}</span>
                <span className="text-sm font-semibold">{custoLegivel(i.custo, i.unidade)}</span>
              </li>
            ))}
          </ul>
          <Dica>
            O saquinho também é ingrediente: sem ele, o custo do sacolé sairia menor que o real.
          </Dica>
          <button type="button" onClick={proximo} className="btn-primario w-full">Próximo: a receita</button>
        </>
      )}

      {etapa === 3 && (
        <>
          <Dica>
            Em <strong>Mais → Sabores</strong> você cadastra cada sabor com o preço de venda e a receita. Mude os números abaixo e
            veja o custo mudar.
          </Dica>
          <div className="cartao space-y-3">
            <p className="font-semibold">Morango com leite condensado</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                Preço de venda (R$)
                <input inputMode="decimal" className="campo mt-1" value={preco} onChange={(e) => setPreco(e.target.value)} />
              </label>
              <label className="text-sm">
                Rende quantos?
                <input inputMode="numeric" className="campo mt-1" value={rendimento} onChange={(e) => setRendimento(e.target.value)} />
              </label>
            </div>
            <p className="text-sm font-medium">Receita</p>
            {ingredientes.map((i) => (
              <label key={i.nome} className="flex items-center gap-2 text-sm">
                <span className="flex-1">{i.nome}</span>
                <input
                  inputMode="decimal"
                  className="campo w-20 py-2 text-right"
                  value={receita[i.nome]}
                  onChange={(e) => setReceita((r) => ({ ...r, [i.nome]: e.target.value }))}
                />
                <span className="w-6 text-neutral-500">{i.unidade}</span>
              </label>
            ))}
          </div>
          <div className="cartao space-y-1 bg-ceu">
            <p className="flex justify-between"><span>Custo da receita</span><strong>{brl(custoRec)}</strong></p>
            <p className="flex justify-between"><span>Custo por sacolé</span><strong>{brl(custoSacole)}</strong></p>
            <p className="flex justify-between">
              <span>Margem</span>
              <strong>{pct(nPreco > 0 ? (nPreco - custoSacole) / nPreco : null)}</strong>
            </p>
          </div>
          <Dica>Margem é quanto de cada R$ 1 vendido sobra de lucro.</Dica>
          <button type="button" disabled={nRend <= 0 || nPreco <= 0} onClick={proximo} className="btn-primario w-full">
            Salvar sabor
          </button>
        </>
      )}

      {etapa === 4 && (
        <>
          <Dica>
            Fez uma leva? Em <strong>Estoque</strong>, toque no sabor e em <strong>Produzi</strong>. É isso que enche o freezer no app.
          </Dica>
          <div className="cartao space-y-3">
            <p className="text-sm">Você fez <strong>1 receita</strong>. A receita diz que rende {nRend}, mas você contou os saquinhos.</p>
            <label className="block text-sm">
              Quantos sacolés saíram de verdade? <span className="text-neutral-500">(digite 18, por exemplo)</span>
              <input
                inputMode="numeric"
                className="campo mt-1"
                value={saidos}
                placeholder={String(nRend)}
                onChange={(e) => setSaidos(e.target.value)}
              />
            </label>
            {produzidos > 0 && (
              <p className="text-sm text-neutral-700">
                Custo do lote {brl(custoRec)} ÷ {produzidos} = <strong>{brl(custoLote)} por sacolé</strong>
                {produzidos < nRend && " (saíram menos, então cada um ficou um pouco mais caro)"}.
              </p>
            )}
          </div>
          <button type="button" disabled={!produzidos} onClick={proximo} className="btn-primario w-full">Salvar produção</button>
        </>
      )}

      {etapa === 5 && (
        <>
          <Dica>
            A tela <strong>Vender</strong> é a primeira do app. Toque no sabor para cada sacolé vendido, escolha como pagaram e
            registre. <strong>Venda 2 sacolés agora.</strong>
          </Dica>
          <button
            type="button"
            onClick={() => setCarrinho((c) => c + 1)}
            className={`cartao w-full text-left ${carrinho ? "border-rosa ring-2 ring-rosa/25" : ""}`}
          >
            <span className="block font-semibold">Morango com leite condensado</span>
            <span className="block text-sm text-neutral-600">{brl(nPreco)}</span>
            <span className="block text-xs text-neutral-500">{estoque} no freezer</span>
            {carrinho > 0 && <span className="mt-1 block text-lg font-bold text-rosa-forte">{carrinho} no carrinho</span>}
          </button>
          {carrinho > 0 && (
            <div className="cartao space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {(["pix", "dinheiro", "cartao"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setForma(f)}
                    className={`btn ${forma === f ? "bg-rosa-forte text-white" : "border border-neutral-300 bg-white"}`}
                  >
                    {f === "pix" ? "Pix" : f === "dinheiro" ? "Dinheiro" : "Cartão"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={!forma}
                className="btn-primario w-full"
                onClick={() => {
                  setVendidos((v) => v + carrinho);
                  setCarrinho(0);
                }}
              >
                Registrar {brl(carrinho * nPreco)}
              </button>
              <button type="button" onClick={() => setCarrinho(0)} className="text-sm text-neutral-500 underline">Limpar</button>
            </div>
          )}
          {vendidos > 0 && (
            <>
              <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">
                Venda registrada! O freezer foi de {produzidos} para {estoque}. Errou? No app tem o botão Desfazer na lista de
                vendas do dia.
              </p>
              <button type="button" onClick={proximo} className="btn-primario w-full">Ver o resumo</button>
            </>
          )}
        </>
      )}

      {etapa === 6 && (
        <>
          <Dica>
            Em <strong>Resumo</strong> você vê quanto entrou e quanto sobrou, por dia, semana ou mês.
          </Dica>
          <div className="grid grid-cols-2 gap-3">
            <div className="cartao"><p className="text-sm text-neutral-600">Faturamento</p><p className="text-xl font-bold">{brl(resumo.faturamento)}</p></div>
            <div className="cartao border-azul-claro bg-ceu"><p className="text-sm text-neutral-600">Lucro</p><p className="text-xl font-bold">{brl(resumo.lucroAposPerdas)}</p></div>
          </div>
          <div className="cartao space-y-1 text-sm">
            <p className="flex justify-between"><span>Vendas ({vendidos} sacolés)</span><span>{brl(resumo.faturamento)}</span></p>
            <p className="flex justify-between"><span>− Custo desses {vendidos} sacolés</span><span>{brl(resumo.custoVendidos)}</span></p>
            <p className="flex justify-between font-semibold"><span>= Lucro</span><span>{brl(resumo.lucroBruto)}</span></p>
          </div>
          <Dica>
            E os {brl(resumo.gastoCompras)} da compra? Não entram de uma vez no lucro: cada sacolé carrega o custo dele e só conta
            quando é vendido. Os {estoque} que sobraram no freezer ainda vão gerar venda.
          </Dica>
          <button type="button" onClick={proximo} className="btn-primario w-full">Concluir treino</button>
        </>
      )}

      {etapa > 0 && (
        <button type="button" onClick={() => setEtapa((e) => e - 1)} className="block w-full text-center text-sm text-neutral-500 underline">
          Voltar uma etapa
        </button>
      )}
    </div>
  );
}
