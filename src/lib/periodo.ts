// Datas no fuso de São Paulo (UTC−3, sem horário de verão desde 2019).
const OFFSET = "-03:00";

export function hojeSP(agora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

function somarDias(data: string, dias: number) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export type Periodo = "hoje" | "7dias" | "mes" | "livre";

export function intervalo(periodo: Periodo, de?: string, ate?: string, agora = new Date()) {
  const hoje = hojeSP(agora);
  let inicio = hoje;
  let fim = hoje;
  if (periodo === "7dias") inicio = somarDias(hoje, -6);
  if (periodo === "mes") inicio = `${hoje.slice(0, 8)}01`;
  if (periodo === "livre") {
    const valido = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
    inicio = valido(de) ? de! : hoje;
    fim = valido(ate) ? ate! : hoje;
    if (fim < inicio) [inicio, fim] = [fim, inicio];
  }
  return {
    inicioData: inicio,
    fimData: fim,
    // limites em timestamp para colunas timestamptz: [início, fim)
    inicioTs: `${inicio}T00:00:00${OFFSET}`,
    fimTs: `${somarDias(fim, 1)}T00:00:00${OFFSET}`,
  };
}
