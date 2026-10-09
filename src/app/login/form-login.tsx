"use client";

import { useActionState, useState } from "react";
import { criarConta, entrar, type EstadoLogin } from "./actions";

export function FormLogin({ permitirCadastro }: { permitirCadastro: boolean }) {
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [estado, acao, pendente] = useActionState<EstadoLogin, FormData>(
    modo === "entrar" ? entrar : criarConta,
    {},
  );

  return (
    <form action={acao} className="space-y-4">
      <div>
        <label className="rotulo" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="campo" />
      </div>
      <div>
        <label className="rotulo" htmlFor="senha">Senha</label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete={modo === "entrar" ? "current-password" : "new-password"}
          required
          className="campo"
        />
      </div>
      {estado.erro && <p className="text-sm text-red-700">{estado.erro}</p>}
      {estado.aviso && <p className="text-sm text-green-700">{estado.aviso}</p>}
      <button type="submit" disabled={pendente} className="btn-primario w-full">
        {pendente ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar conta"}
      </button>
      {permitirCadastro && (
        <button
          type="button"
          onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
          className="w-full text-sm text-pink-700 underline"
        >
          {modo === "entrar" ? "Primeiro acesso? Criar conta" : "Já tenho conta"}
        </button>
      )}
    </form>
  );
}
