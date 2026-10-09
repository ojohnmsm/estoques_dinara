import Link from "next/link";

export function Cabecalho({ titulo, voltar, acao }: { titulo: string; voltar?: string; acao?: React.ReactNode }) {
  return (
    <header className="mb-4 flex items-center gap-2">
      {voltar && (
        <Link href={voltar} aria-label="Voltar" className="-ml-2 flex h-11 w-11 items-center justify-center text-2xl text-neutral-600">
          ‹
        </Link>
      )}
      <h1 className="flex-1 text-2xl font-bold">{titulo}</h1>
      {acao}
    </header>
  );
}
