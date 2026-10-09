"use client";

import { useState } from "react";
import { reiniciarTutorial } from "@/lib/tutorial";

export function RefazerTutorial() {
  const [feito, setFeito] = useState(false);
  return (
    <button
      type="button"
      className="btn-secundario w-full"
      onClick={() => {
        reiniciarTutorial();
        setFeito(true);
      }}
    >
      {feito ? "Pronto! As dicas voltam a aparecer em cada tela" : "Mostrar as dicas de novo em todas as telas"}
    </button>
  );
}
