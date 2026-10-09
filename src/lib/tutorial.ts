// Conteúdo das dicas de cada tela. `alvo` é o valor do atributo data-tour do elemento
// destacado; sem alvo (ou se o elemento não estiver na tela) a dica aparece centralizada.

export type Passo = { alvo?: string; titulo: string; texto: string };

export const TOURS = {
  vender: [
    { titulo: "Tela de venda", texto: "É aqui que você registra cada venda. Esta é a tela que abre quando você entra no app." },
    { alvo: "vender-sabores", titulo: "Toque no sabor", texto: "Cada toque soma 1 sacolé. O cartão mostra o preço e quantos ainda tem no freezer. Amarelo é estoque baixo, vermelho é zerado." },
    { alvo: "vender-carrinho", titulo: "Confira antes de registrar", texto: "Use − e + para corrigir a quantidade. Para dar desconto, troque o preço no campo R$." },
    { alvo: "vender-pagamento", titulo: "Forma de pagamento", texto: "Escolha Pix, Dinheiro ou Cartão. O botão Registrar só libera depois disso." },
    { alvo: "vender-hoje", titulo: "Vendas de hoje", texto: "Tudo o que você vendeu hoje e o total do dia. Tocou errado? Use Desfazer: os sacolés voltam para o estoque." },
  ],
  estoque: [
    { alvo: "estoque-lista", titulo: "Seu freezer", texto: "Quantos sacolés tem de cada sabor. Os que estão acabando aparecem primeiro, em amarelo. Vermelho é negativo: faça uma contagem." },
    { titulo: "Detalhes do sabor", texto: "Toque num sabor para registrar uma produção (Produzi) ou corrigir o número (Ajustar)." },
  ],
  "estoque-sabor": [
    { alvo: "sabor-numero", titulo: "Quantos tem", texto: "O número é calculado sozinho: tudo que você produziu, menos o que vendeu, mais os ajustes. O custo médio é quanto cada sacolé do freezer custou." },
    { alvo: "sabor-acoes", titulo: "Produzi e Ajustar", texto: "Produzi: fez uma leva, soma ao estoque. Ajustar: derreteu, comeu, deu de brinde ou contou o freezer e o número estava diferente." },
    { alvo: "sabor-producoes", titulo: "Histórico", texto: "As produções com o custo de cada lote. Só a última pode ser excluída; para corrigir as outras, use Ajustar." },
  ],
  produzir: [
    { alvo: "produzir-receitas", titulo: "Quantas receitas", texto: "Fez a receita uma vez? Deixe 1. Meia receita é 0,5; dobrada é 2." },
    { alvo: "produzir-qtd", titulo: "Quantos saíram de verdade", texto: "O app sugere pelo rendimento da receita, mas conte e corrija: é esse número que entra no freezer." },
    { alvo: "produzir-custo", titulo: "Custo do lote", texto: "Calculado com o preço atual dos ingredientes. Se aparecer aviso, falta registrar a compra de algum ingrediente." },
  ],
  ajustar: [
    { alvo: "ajustar-motivo", titulo: "Por que ajustar?", texto: "Perda e consumo tiram do estoque e aparecem como perda no Resumo. Contagem: você diz quantos contou e o app acerta a diferença." },
    { alvo: "ajustar-qtd", titulo: "Quantidade", texto: "Na contagem, digite o total que está no freezer. Nos outros, quantos saíram ou entraram." },
  ],
  resumo: [
    { alvo: "resumo-periodo", titulo: "Período", texto: "Hoje, últimos 7 dias, este mês ou datas que você escolher." },
    { alvo: "resumo-indicadores", titulo: "Os números principais", texto: "Quanto entrou (faturamento), quanto sobrou (lucro), quantos vendeu e a margem: quanto de cada R$ 1 vendido é lucro." },
    { alvo: "resumo-conta", titulo: "A conta do lucro", texto: "Vendas menos o custo dos sacolés vendidos, menos perdas. O que você gastou no mercado só vira custo quando o sacolé é vendido." },
    { alvo: "resumo-sabores", titulo: "Por sabor", texto: "Qual sabor vende mais e qual dá mais lucro. Bom para decidir o que produzir." },
  ],
  mais: [
    { alvo: "mais-menu", titulo: "Cadastros", texto: "Compras (preço dos ingredientes), Sabores com receita, Ingredientes e Itens lembrados das notas." },
    { alvo: "mais-tutorial", titulo: "Ajuda", texto: "Refaça o treino guiado quando quiser. Em cada tela, o botão ? mostra estas dicas de novo." },
  ],
  compras: [
    { alvo: "compras-acoes", titulo: "Registrar compra", texto: "Ler nota: tire foto do cupom e a IA preenche. Digitar: para compra sem nota, como feira ou loja do bairro." },
    { alvo: "compras-lista", titulo: "Compras registradas", texto: "Toque numa compra para ver os itens ou excluir. Excluir faz o preço dos ingredientes voltar ao da compra anterior." },
    { titulo: "Por que registrar compras?", texto: "É a compra que dá o preço de cada ingrediente, e daí sai o custo de cada sacolé." },
  ],
  "ler-nota": [
    { alvo: "nota-foto", titulo: "Foto da nota", texto: "Foto da nota inteira, reta e com boa luz. A IA lê os itens em uns segundos." },
    { titulo: "Você confere tudo", texto: "Nada é salvo sem a sua revisão. Se a nota já tiver sido registrada antes, o app avisa." },
    { alvo: "nota-manual", titulo: "Sem nota?", texto: "Use Registrar à mão." },
  ],
  revisao: [
    { alvo: "revisao-item", titulo: "Cada item da nota", texto: "Verde: o app já conhece. Amarelo: confira e escolha o ingrediente, só desta vez; nas próximas notas ele lembra." },
    { alvo: "revisao-ingrediente", titulo: "Ingrediente", texto: "Escolha da lista ou crie um novo com + Novo ingrediente. Use nomes simples: “Leite condensado”, não a marca." },
    { alvo: "revisao-ignorar", titulo: "Ignorar", texto: "Sacola, produto de limpeza, coisas que não vão em receita: marque Ignorar. O app lembra disso também." },
    { alvo: "revisao-total", titulo: "Confira o total", texto: "Se a soma não bater com o total da nota, algum valor foi lido errado. Corrija antes de salvar." },
  ],
  "compra-nova": [
    { alvo: "compra-item", titulo: "Cada item", texto: "Escolha o ingrediente (ou crie um novo), quantas embalagens e quanto pagou no total do item." },
    { alvo: "compra-item", titulo: "Embalagem ou granel", texto: "Embalagem: informe o tamanho de cada uma (ex.: 395 g). Granel: fruta por peso; informe os quilos." },
    { alvo: "compra-item", titulo: "Preço calculado", texto: "O app mostra o preço por kg, litro ou unidade. Se parecer absurdo, algum número está errado." },
    { alvo: "compra-adicionar", titulo: "Mais itens", texto: "Adicione uma linha para cada ingrediente da compra." },
  ],
  ingredientes: [
    { alvo: "ingredientes-lista", titulo: "Ingredientes", texto: "Tudo que vai nas receitas, incluindo o saquinho. O preço vem da última compra registrada." },
    { alvo: "ingredientes-novo", titulo: "Novo ingrediente", texto: "Nome simples e como ele é medido: gramas (açúcar, fruta), ml (leite) ou unidades (saquinho)." },
  ],
  sabores: [
    { alvo: "sabores-lista", titulo: "Seus sabores", texto: "Cada sabor mostra o preço de venda, quanto custa fazer cada sacolé e a margem." },
    { alvo: "sabores-novo", titulo: "Novo sabor", texto: "Cadastre o sabor com o preço e a receita." },
  ],
  "sabor-form": [
    { alvo: "sabor-preco", titulo: "Preço e aviso", texto: "Preço de venda de cada sacolé e com quantos no freezer o app avisa que é hora de produzir." },
    { alvo: "sabor-receita", titulo: "Receita", texto: "Quanto rende uma receita e a quantidade de cada ingrediente, na unidade dele (g, ml ou un). Inclua o saquinho." },
    { alvo: "sabor-custo", titulo: "Custo e margem", texto: "Calculados na hora com o preço atual dos ingredientes. Margem baixa? Talvez seja hora de ajustar o preço." },
    { alvo: "sabor-ativo", titulo: "Ativo", texto: "Desmarque para tirar o sabor da tela de venda sem perder o histórico." },
  ],
  lembrados: [
    { alvo: "lembrados-lista", titulo: "Vínculos das notas", texto: "Cada texto de nota e o ingrediente ligado a ele. Troque se estiver errado, ou toque em Esquecer para ele voltar como novo." },
  ],
} satisfies Record<string, Passo[]>;

export type TourId = keyof typeof TOURS;

// Chaves no navegador (por aparelho). Não vão para o banco.
export const CHAVE_VISTO = (id: string) => `dicas:visto:${id}`;
export const CHAVE_DICAS_DESLIGADAS = "dicas:desligadas";
export const CHAVE_TREINO = "treino:concluido";

export function lerFlag(chave: string) {
  try {
    return localStorage.getItem(chave) === "1";
  } catch {
    return false;
  }
}

const EVENTO = "tutorial:mudou";

export function gravarFlag(chave: string, valor: boolean) {
  try {
    if (valor) localStorage.setItem(chave, "1");
    else localStorage.removeItem(chave);
  } catch {
    // modo privado ou armazenamento bloqueado: as dicas só voltam a aparecer
  }
  window.dispatchEvent(new Event(EVENTO));
}

/** Para useSyncExternalStore: avisa quando alguma flag do tutorial muda. */
export function assinarFlags(aviso: () => void) {
  window.addEventListener(EVENTO, aviso);
  window.addEventListener("storage", aviso);
  return () => {
    window.removeEventListener(EVENTO, aviso);
    window.removeEventListener("storage", aviso);
  };
}

/** Zera tudo para refazer o tutorial do zero. */
export function reiniciarTutorial() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("dicas:") || k.startsWith("treino:"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // idem
  }
  window.dispatchEvent(new Event(EVENTO));
}
