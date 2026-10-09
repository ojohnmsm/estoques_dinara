import { describe, expect, it } from "vitest";
import { custoLegivel, parseNumero } from "./formato";

describe("formato", () => {
  it("parseNumero aceita vírgula e ponto", () => {
    expect(parseNumero("1,50")).toBe(1.5);
    expect(parseNumero("1.50")).toBe(1.5);
    expect(parseNumero("1.234,5")).toBe(1234.5);
    expect(parseNumero("")).toBeNaN();
    expect(parseNumero("abc")).toBeNaN();
  });

  it("custo por unidade base vira R$/kg, R$/L ou R$/un", () => {
    expect(custoLegivel(0.03, "g")).toMatch(/30,00\/kg$/);
    expect(custoLegivel(0.005, "ml")).toMatch(/5,00\/L$/);
    expect(custoLegivel(0.08, "un")).toMatch(/0,08\/un$/);
    expect(custoLegivel(null, "g")).toBe("sem preço");
  });
});
