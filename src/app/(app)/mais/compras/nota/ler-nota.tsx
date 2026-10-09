"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Ingrediente } from "@/lib/dados";
import { lerNota, type NotaParaRevisar } from "../../../actions";
import { FormCompra } from "../nova/form-compra";

/** Reduz a foto no próprio celular (lado maior 1600px, JPEG) antes de enviar. */
async function reduzir(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((ok, falha) =>
    canvas.toBlob((b) => (b ? ok(b) : falha(new Error("Não consegui processar a foto"))), "image/jpeg", 0.85),
  );
}

export function LerNota({ ingredientes, hoje }: { ingredientes: Ingrediente[]; hoje: string }) {
  const [nota, setNota] = useState<NotaParaRevisar>();
  const [erro, setErro] = useState<string>();
  const [previa, setPrevia] = useState<string>();
  const [pendente, iniciar] = useTransition();

  if (nota) {
    return (
      <div className="space-y-4">
        {previa && (
          <details className="cartao">
            <summary className="cursor-pointer text-sm font-medium">Ver foto da nota</summary>
            {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) */}
            <img src={previa} alt="Foto da nota" className="mt-3 w-full rounded-lg" />
          </details>
        )}
        <FormCompra ingredientes={ingredientes} hoje={hoje} nota={nota} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-neutral-600">
        Tire uma foto da nota inteira, reta e com boa luz. A IA lê os itens e você confere antes de salvar.
      </p>
      <label className={`btn-primario w-full ${pendente ? "pointer-events-none opacity-50" : ""}`}>
        {pendente ? "Lendo a nota…" : "📷 Tirar foto ou escolher da galeria"}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={pendente}
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            e.target.value = "";
            if (!arquivo) return;
            setErro(undefined);
            iniciar(async () => {
              try {
                const blob = await reduzir(arquivo);
                setPrevia(URL.createObjectURL(blob));
                const form = new FormData();
                form.append("foto", new File([blob], "nota.jpg", { type: "image/jpeg" }));
                const r = await lerNota(form);
                if ("erro" in r) setErro(r.erro);
                else setNota(r.nota);
              } catch {
                setErro("Não consegui enviar a foto. Verifique a internet e tente de novo.");
              }
            });
          }}
        />
      </label>
      {pendente && <p className="text-center text-sm text-neutral-500">Isso pode levar uns 10 a 20 segundos.</p>}
      {erro && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{erro}</p>}
      <Link href="/mais/compras/nova" className="btn-secundario w-full">Registrar à mão</Link>
    </div>
  );
}
