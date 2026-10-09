"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { CHAVE_DICAS_DESLIGADAS, CHAVE_TREINO, CHAVE_VISTO, TOURS, gravarFlag, lerFlag, type TourId } from "@/lib/tutorial";

type Caixa = { top: number; left: number; width: number; height: number };
const MARGEM = 6;

/**
 * Dicas da tela: destaca o elemento real (atributo data-tour) e explica.
 * Abre sozinho na primeira visita; o botão "?" reabre quando quiser.
 */
export function Tour({ id, semBotao = false }: { id: TourId; semBotao?: boolean }) {
  const passos = TOURS[id];
  const [aberto, setAberto] = useState(false);
  const [i, setI] = useState(0);
  const [caixa, setCaixa] = useState<Caixa | null>(null);

  useEffect(() => {
    // primeiro o treino guiado; as dicas automáticas começam depois que ele foi feito ou dispensado
    if (!lerFlag(CHAVE_TREINO) || lerFlag(CHAVE_VISTO(id)) || lerFlag(CHAVE_DICAS_DESLIGADAS)) return;
    const t = setTimeout(() => setAberto(true), 500);
    return () => clearTimeout(t);
  }, [id]);

  const passo = passos[i];

  const medir = useCallback(() => {
    const el = passo?.alvo ? document.querySelector<HTMLElement>(`[data-tour="${passo.alvo}"]`) : null;
    if (!el || el.offsetParent === null) return setCaixa(null);
    const r = el.getBoundingClientRect();
    setCaixa({ top: r.top - MARGEM, left: r.left - MARGEM, width: r.width + MARGEM * 2, height: r.height + MARGEM * 2 });
  }, [passo]);

  useLayoutEffect(() => {
    if (!aberto) return;
    const el = passo?.alvo ? document.querySelector<HTMLElement>(`[data-tour="${passo.alvo}"]`) : null;
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    // mede a cada quadro: acompanha a rolagem suave e mudanças de layout
    let quadro = 0;
    const loop = () => {
      medir();
      quadro = requestAnimationFrame(loop);
    };
    quadro = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(quadro);
  }, [aberto, passo, medir]);

  function fechar() {
    gravarFlag(CHAVE_VISTO(id), true);
    setAberto(false);
    setI(0);
  }

  function desligarTudo() {
    gravarFlag(CHAVE_DICAS_DESLIGADAS, true);
    fechar();
  }

  const ultimo = i === passos.length - 1;
  // cartão em cima quando o destaque está na metade de baixo da tela
  const cartaoEmCima = caixa ? caixa.top + caixa.height / 2 > window.innerHeight / 2 : false;

  return (
    <>
      {!semBotao && (
        <button
          type="button"
          onClick={() => {
            setI(0);
            setAberto(true);
          }}
          aria-label="Como usar esta tela"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-azul-claro bg-white text-lg font-bold text-azul"
        >
          ?
        </button>
      )}

      {aberto && passo && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Dica: ${passo.titulo}`}>
          {caixa ? (
            <div
              className="pointer-events-none absolute rounded-xl ring-4 ring-rosa transition-all duration-200"
              style={{ ...caixa, boxShadow: "0 0 0 9999px rgba(15, 35, 50, 0.6)" }}
            />
          ) : (
            <div className="absolute inset-0 bg-[rgba(15,35,50,0.6)]" />
          )}

          <div
            className={`absolute inset-x-3 mx-auto max-w-md rounded-2xl bg-white p-4 shadow-xl ${
              caixa ? (cartaoEmCima ? "top-3" : "bottom-24") : "top-1/2 -translate-y-1/2"
            }`}
          >
            <p className="text-xs font-medium text-neutral-500">
              {i + 1} de {passos.length}
            </p>
            <h2 className="mt-1 text-lg font-bold text-azul-escuro">{passo.titulo}</h2>
            <p className="mt-1 text-neutral-700">{passo.texto}</p>
            <div className="mt-4 flex items-center gap-2">
              <button type="button" onClick={fechar} className="text-sm text-neutral-500 underline">
                Pular
              </button>
              <span className="flex-1" />
              {i > 0 && (
                <button type="button" onClick={() => setI(i - 1)} className="btn-secundario min-h-10 px-4">
                  Voltar
                </button>
              )}
              <button type="button" onClick={() => (ultimo ? fechar() : setI(i + 1))} className="btn-primario min-h-10 px-4">
                {ultimo ? "Entendi" : "Próximo"}
              </button>
            </div>
            {i === 0 && (
              <button type="button" onClick={desligarTudo} className="mt-3 text-xs text-neutral-400 underline">
                Não mostrar dicas automaticamente
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
