import { FormLogin } from "./form-login";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-3xl font-bold text-pink-700">Sacolés</h1>
      <p className="mb-8 text-neutral-600">Estoque, custo e vendas.</p>
      <FormLogin permitirCadastro={process.env.NEXT_PUBLIC_PERMITIR_CADASTRO === "true"} />
    </main>
  );
}
