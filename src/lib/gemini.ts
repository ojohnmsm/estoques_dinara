import "server-only";
import { GoogleGenAI } from "@google/genai";
import { ESQUEMA_NOTA, limparNota, promptNota } from "@/lib/nota";
import type { Unidade } from "@/lib/formato";

// "gemini-flash-latest" acompanha o Flash mais novo; GEMINI_MODEL fixa uma versão se precisar.
const MODELO = process.env.GEMINI_MODEL || "gemini-flash-latest";

export async function lerNotaComGemini(
  imagem: { base64: string; mimeType: string },
  ingredientes: { nome: string; unidade_base: Unidade }[],
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada na Vercel.");

  const ai = new GoogleGenAI({ apiKey });
  const resposta = await ai.models.generateContent({
    model: MODELO,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: imagem.mimeType, data: imagem.base64 } },
          { text: promptNota(ingredientes) },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: ESQUEMA_NOTA,
      temperature: 0,
    },
  });

  const texto = resposta.text;
  if (!texto) throw new Error("A IA não devolveu resposta.");
  return limparNota(JSON.parse(texto));
}
