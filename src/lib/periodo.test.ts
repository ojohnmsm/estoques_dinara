import { describe, expect, it } from "vitest";
import { hojeSP, intervalo } from "./periodo";

// 2026-10-10 02:00 UTC ainda é dia 09 em São Paulo
const agora = new Date("2026-10-10T02:00:00Z");

describe("periodo", () => {
  it("usa o dia de São Paulo, não o UTC", () => {
    expect(hojeSP(agora)).toBe("2026-10-09");
  });

  it("hoje cobre o dia inteiro em -03:00", () => {
    expect(intervalo("hoje", undefined, undefined, agora)).toMatchObject({
      inicioTs: "2026-10-09T00:00:00-03:00",
      fimTs: "2026-10-10T00:00:00-03:00",
    });
  });

  it("7 dias inclui hoje e mês começa no dia 1", () => {
    expect(intervalo("7dias", undefined, undefined, agora).inicioData).toBe("2026-10-03");
    expect(intervalo("mes", undefined, undefined, agora).inicioData).toBe("2026-10-01");
  });

  it("período livre inverte datas trocadas e ignora valores inválidos", () => {
    expect(intervalo("livre", "2026-10-05", "2026-10-01", agora)).toMatchObject({
      inicioData: "2026-10-01",
      fimData: "2026-10-05",
    });
    expect(intervalo("livre", "xx", undefined, agora).inicioData).toBe("2026-10-09");
  });
});
