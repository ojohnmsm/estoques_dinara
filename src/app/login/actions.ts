"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type EstadoLogin = { erro?: string; aviso?: string };

export async function entrar(_: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? "").trim(),
    password: String(form.get("senha") ?? ""),
  });
  if (error) return { erro: "E-mail ou senha incorretos." };
  redirect("/");
}

export async function criarConta(_: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  if (process.env.NEXT_PUBLIC_PERMITIR_CADASTRO !== "true") {
    return { erro: "Cadastro desativado." };
  }
  const senha = String(form.get("senha") ?? "");
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };

  const origem = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(form.get("email") ?? "").trim(),
    password: senha,
    options: { emailRedirectTo: `${origem}/auth/callback` },
  });
  if (error) return { erro: error.message };
  if (!data.session) return { aviso: "Conta criada! Confirme pelo link enviado ao seu e-mail." };
  redirect("/");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
