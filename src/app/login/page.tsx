import Image from "next/image";
import { FormLogin } from "./form-login";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-8">
      <Image src="/logo.png" alt="Casal Gourmet AeM" width={200} height={200} priority className="mx-auto mb-4" />
      <p className="mb-8 text-center text-neutral-600">Estoque, custo e vendas.</p>
      <FormLogin permitirCadastro={process.env.NEXT_PUBLIC_PERMITIR_CADASTRO === "true"} />
    </main>
  );
}
