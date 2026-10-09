import type { Estado } from "@/app/(app)/actions";

export function Mensagem({ estado }: { estado: Estado }) {
  if (estado.erro) return <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{estado.erro}</p>;
  if (estado.ok) return <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{estado.ok}</p>;
  return null;
}
