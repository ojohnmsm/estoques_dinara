# Estoques Dinara — Especificação

> Status: v1.1 (2026-10-09), fase 1 implementada. Documento vivo: toda decisão nova entra aqui antes de virar código.

## 1. Visão

App web mobile-first para uma vendedora de sacolé controlar:

1. **Custo**: quanto custa cada sacolé, a partir do preço pago nos ingredientes e da receita.
2. **Estoque de sacolés por sabor**: o que há no freezer, sem precisar contar.
3. **Vendas**: o que entrou, por sabor e forma de pagamento.
4. **Lucro**: faturamento − custo do que foi vendido.

Usuária única (19 anos), usando o navegador do celular. Marca: **Casal Gourmet AeM** (logo em `public/logo.png`; cores azul `#1179ae`, azul-claro `#60b8de` e rosa `#fb1166`).

## 2. Escopo

### Dentro
- Cadastro de ingredientes, sabores e receitas.
- Registro de compras (manual e, na fase 2, por foto da nota com IA).
- Registro de produção (lote de sacolés feitos).
- Registro de vendas (sabor, quantidade, forma de pagamento).
- Ajustes de estoque (perda, consumo próprio, correção de contagem).
- Resumo financeiro por período.

### Fora (decidido)
- Funcionamento offline / PWA instalável.
- Múltiplos usuários ou permissões.
- Venda fiado / contas a receber.
- Estoque de **ingredientes** (só o preço deles importa).
- Leitura de NFC-e por QR code / XML (acesso da Sefaz-RJ bloqueado).
- Custos indiretos (gás, energia, transporte). Pode entrar depois.

## 3. Stack

| Camada | Escolha |
|---|---|
| Front + back | Next.js (App Router) + TypeScript, hospedado na Vercel |
| UI | Tailwind CSS, mobile-first |
| Banco | Supabase Postgres |
| Autenticação | Supabase Auth (e-mail + senha) |
| Arquivos | Supabase Storage, bucket **privado** `notas` |
| Leitura de nota (fase 2) | API do Google Gemini, chamada **só no servidor** |
| Validação | Zod |
| Testes | Vitest para as regras de cálculo |

Variáveis de ambiente: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`.

Observação: o plano gratuito do Supabase pausa o projeto após ~7 dias sem uso. Reativar é manual pelo painel.

## 4. Conceitos e unidades

- **Unidade base**: todo ingrediente é medido em `g`, `ml` ou `un`. Receitas usam apenas a unidade base. Nada de "xícara" nesta versão.
- **Ingrediente**: conceito genérico usado na receita ("Leite condensado", em `g`). Embalagem (saquinho) também é ingrediente, em `un`.
- **Produto**: item específico como aparece numa compra ("LTE COND MOCA 395G"). Vários produtos apontam para o mesmo ingrediente. Cada produto sabe o tamanho da sua embalagem na unidade base.
- **Custo unitário do ingrediente**: R$ por unidade base, igual ao **último preço pago** (da compra mais recente com aquele ingrediente).
- **Sabor**: o que é vendido. Tem preço de venda próprio.
- **Receita**: composição de um sabor (ingredientes × quantidade base) e rendimento esperado.
- **Produção**: um lote efetivamente feito. Registra quantos sacolés saíram de fato e congela o custo daquele momento.

## 5. Modelo de dados

Todas as tabelas têm `id uuid pk`, `user_id uuid default auth.uid()` e `created_at timestamptz default now()`, com RLS `user_id = auth.uid()`. Esses campos foram omitidos abaixo.

Dinheiro: `numeric(12,2)`. Custos unitários: `numeric(14,6)`.

```
ingredientes
  nome                 text unique por usuário
  unidade_base         enum('g','ml','un')         -- não muda depois de usado (trigger)
  embalagem_padrao     numeric null             -- última embalagem comprada; pré-preenche a compra
  custo_unitario       numeric(14,6) null      -- R$ por unidade base; null = sem preço ainda
  custo_atualizado_em  timestamptz null

produtos                                        -- memória "texto da nota → ingrediente"
  texto_normalizado    text unique por usuário
  texto_exemplo        text                     -- como apareceu a 1ª vez
  codigo               text null                -- código/EAN se o cupom mostrar
  ingrediente_id       fk ingredientes null
  qtd_por_embalagem    numeric null             -- na unidade base do ingrediente (ex.: 395)
  ignorar              boolean default false    -- não é ingrediente (ex.: detergente)

compras
  data                 date
  local                text null
  origem               enum('manual','foto')
  foto_path            text null                -- caminho no bucket `notas`
  total                numeric(12,2)

itens_compra
  compra_id            fk compras on delete cascade
  ingrediente_id       fk ingredientes
  produto_id           fk produtos null
  texto_original       text null
  granel               boolean
  qtd_embalagens       numeric                  -- ou peso em kg/l para itens a granel
  embalagem_qtd        numeric null             -- tamanho da embalagem na unidade base
  qtd_base_total       numeric                  -- já convertido p/ unidade base
  valor_total          numeric(12,2)
  custo_unitario       numeric(14,6)            -- valor_total / qtd_base_total

sabores
  nome                 text unique por usuário
  preco_venda          numeric(12,2)
  estoque_minimo       int default 0            -- alerta "hora de produzir"
  rendimento_esperado  int                      -- quantos sacolés uma receita rende
  custo_medio          numeric(14,6) default 0  -- custo médio do estoque atual (ver §6.3)
  ativo                boolean default true

itens_receita                                   -- a receita do sabor (1 por sabor nesta versão)
  sabor_id             fk sabores on delete cascade
  ingrediente_id       fk ingredientes
  qtd_base             numeric

producoes
  sabor_id             fk sabores
  data                 date
  receitas_feitas      numeric default 1        -- pode ser 0,5 / 2 etc.
  qtd_produzida        int  check > 0
  custo_total          numeric(12,2)            -- snapshot
  custo_unitario       numeric(14,6)            -- custo_total / qtd_produzida
  custo_incompleto     boolean                  -- algum ingrediente estava sem preço

vendas
  grupo                uuid                     -- linhas registradas juntas (mesmo pagamento)
  sabor_id             fk sabores
  data_hora            timestamptz default now()
  qtd                  int check > 0
  preco_unitario       numeric(12,2)            -- snapshot do preço do sabor
  custo_unitario       numeric(14,6)            -- snapshot do custo médio
  forma_pagamento      enum('pix','dinheiro','cartao')

ajustes_estoque
  sabor_id             fk sabores
  data_hora            timestamptz default now()
  delta                int check <> 0           -- negativo = saída
  motivo               enum('perda','consumo','contagem','outro')
  observacao           text null
  custo_unitario       numeric(14,6)            -- snapshot do custo médio
```

**View `custo_sabores`**: custo da receita com os preços atuais e se está incompleto.

**View `estoque_sabores`**: `estoque = Σ producoes.qtd_produzida − Σ vendas.qtd + Σ ajustes.delta`, por sabor. O estoque **nunca** é digitado nem guardado solto.

## 6. Regras de negócio

### 6.1 Compra
- Para cada item: `custo_unitario = valor_total / qtd_base_total`.
- Ao salvar a compra, cada ingrediente envolvido recebe `custo_unitario` do item. Se a data da compra for anterior ao `custo_atualizado_em` atual, o custo **não** é sobrescrito (compra antiga lançada depois não deve "voltar" o preço).
- Se o mesmo ingrediente aparece duas vezes na compra, usar a soma (valor total / quantidade total).
- **Item a granel** (vendido por peso, ex.: "MORANGO KG 0,450 x 29,90"): `qtd_base_total = peso × 1000` (g ou ml), e não "embalagens".
- Compra manual sempre disponível, inclusive sem nota (feira, loja de bairro).

### 6.2 Custo da receita e produção
- `custo_receita = Σ itens_receita.qtd_base × ingrediente.custo_unitario`.
- Se algum ingrediente da receita não tem preço, o custo é marcado como **incompleto** na tela, e a produção avisa antes de salvar.
- Ao registrar produção: `custo_total = receitas_feitas × custo_receita` (valores do momento), `custo_unitario = custo_total / qtd_produzida`.
- `qtd_produzida` é o que saiu de fato, não o rendimento esperado. A tela sugere `receitas_feitas × rendimento_esperado` como valor inicial.

### 6.3 Custo médio do estoque
Usar **custo médio ponderado móvel** por sabor (simples e padrão contábil; evita controlar lote a lote):
- Na produção: `novo_medio = (estoque_atual × medio_atual + qtd × custo_unit_lote) / (estoque_atual + qtd)`. Se `estoque_atual ≤ 0`, `novo_medio = custo_unit_lote`.
- Venda e ajuste **não** mudam o médio; apenas gravam o médio vigente como `custo_unitario`.
- Produção, venda e ajuste são gravados por **funções Postgres (RPC)** numa transação, para estoque e custo médio nunca divergirem.
- Excluir uma produção exige recalcular o médio. Nesta versão, só a **última** produção do sabor pode ser excluída. Para as demais, corrige-se com ajuste.

### 6.4 Venda
- A venda grava `preco_unitario` = preço atual do sabor (editável na hora, para desconto) e `custo_unitario` = custo médio atual.
- Estoque insuficiente **não bloqueia** a venda (ela não pode travar na rua). Mostra aviso, e o estoque negativo fica destacado em vermelho até um ajuste de contagem.
- Vendas do dia podem ser **desfeitas** (exclusão) na lista do dia, para erro de toque.

### 6.5 Ajuste
- Saídas (`perda`, `consumo`) entram no resumo como **perdas** (qtd × custo), separadas do custo das vendas.
- `contagem`: a tela pede a quantidade contada no freezer e calcula o `delta` sozinha.

### 6.6 Resumo financeiro (por período)
- **Faturamento** = Σ vendas `qtd × preco_unitario` (total e por forma de pagamento).
- **Custo dos vendidos** = Σ vendas `qtd × custo_unitario`.
- **Lucro bruto** = faturamento − custo dos vendidos. **Margem** = lucro / faturamento.
- **Perdas** = Σ ajustes negativos (`perda`, `consumo`) `× custo_unitario`.
- **Lucro após perdas** = lucro bruto − perdas.
- Ranking por sabor: quantidade, faturamento, lucro.
- Períodos: hoje, semana, mês, intervalo livre. Fuso `America/Sao_Paulo`.
- Gasto em compras no período aparece como **informação de caixa**, separado do lucro (comprar ingrediente não é custo até virar sacolé vendido).

## 7. Leitura de nota por foto (fase 2)

Fluxo:
1. Ela tira a foto. O navegador **redimensiona** (lado maior ~1600px, JPEG) antes de enviar.
2. Upload para o bucket privado `notas`.
3. Rota de servidor `POST /api/notas/ler` chama o Gemini com:
   - a imagem;
   - a lista de ingredientes dela (nome + unidade);
   - um **schema JSON de saída** obrigatório:
     ```
     { data?, local?, total?, itens: [{
         texto, codigo?, quantidade, granel: boolean,
         valor_unitario?, valor_total,
         embalagem_qtd?, embalagem_unidade?,   // de "395G", "1KG", "2L"
         ingrediente_sugerido?, confianca: 'alta'|'media'|'baixa'
     }]}
     ```
   - instruções explícitas para: itens a granel (peso × preço/kg), descontos na linha, e não inventar campos ilegíveis.
4. O servidor normaliza `texto` (maiúsculas, sem acento, sem pontuação, espaços colapsados) e procura em `produtos` (primeiro por `codigo`, depois por `texto_normalizado`).
5. **Tela de revisão**, obrigatória:
   - 🟢 produto conhecido → já vinculado, só conferir;
   - 🟡 produto novo → sugestão da IA pré-selecionada; ela confirma ou troca o ingrediente e informa o tamanho da embalagem;
   - ⚪ produto marcado como ignorar → recolhido;
   - cada linha mostra o **R$ por unidade base** calculado, para erro grosseiro saltar aos olhos;
   - soma dos itens vs. total da nota: avisa se divergir.
6. Ao confirmar: cria/atualiza `produtos` (memória), grava `compras` + `itens_compra` e atualiza os custos (§6.1).

Nada é gravado sem passar pela revisão. Falha do Gemini cai para preenchimento manual com a foto visível.

## 8. Telas

Navegação inferior com 4 abas: **Vender · Estoque · Resumo · Mais**.

1. **Vender** (tela inicial)
   - Grade de botões grandes, um por sabor ativo, com preço e estoque atual.
   - Toque soma 1 ao carrinho; botões −/+ ajustam.
   - Escolha da forma de pagamento (Pix / Dinheiro / Cartão) e botão "Registrar".
   - Abaixo: vendas de hoje, com total e opção de desfazer.
   - Meta: registrar uma venda simples em ≤ 3 toques.
2. **Estoque**
   - Lista de sabores com quantidade, ordenada por urgência (abaixo do mínimo primeiro).
   - Ações por sabor: "Produzi" (produção) e "Ajustar" (ajuste/contagem).
3. **Resumo**: indicadores do §6.6 com seletor de período.
4. **Mais**
   - Compras: lista, "Nova compra manual", "Ler nota por foto" (fase 2).
   - Ingredientes: nome, unidade, custo atual, última atualização.
   - Sabores e receitas: preço, estoque mínimo, ingredientes, rendimento, **custo por sacolé** e **margem esperada**.
   - Produtos conhecidos (fase 2): editar ou desfazer vínculos.
   - Sair.

Diretrizes de UI: alvos de toque ≥ 44px, valores em R$ no formato brasileiro, teclado numérico em campos de quantidade e valor, confirmação apenas em ações destrutivas.

## 9. Fases e critérios de aceite

### Fase 1: núcleo
- [ ] Login e logout; dados isolados por RLS.
- [ ] CRUD de ingredientes, sabores e receitas, com custo por sacolé calculado.
- [ ] Compra manual atualiza o custo dos ingredientes conforme §6.1.
- [ ] Produção soma ao estoque e atualiza o custo médio (§6.3).
- [ ] Venda com forma de pagamento debita o estoque e grava os snapshots; desfazer funciona.
- [ ] Ajuste e contagem funcionam; perdas aparecem no resumo.
- [ ] Resumo por período bate com um cenário de teste calculado à mão.
- [ ] Testes Vitest cobrindo: custo de compra (inclusive granel), custo de receita, custo médio móvel, resumo.
- [ ] Deploy na Vercel funcionando no celular.

### Fase 2: nota por foto
- [x] Upload e leitura com Gemini, com schema JSON (`src/lib/gemini.ts`, modelo em `GEMINI_MODEL`, padrão `gemini-flash-latest`).
- [x] Tela de revisão com memória de produtos (verde/amarelo/ignorar), criação de ingrediente na própria tela.
- [ ] Testado com pelo menos 3 cupons reais de mercados diferentes, incluindo item a granel.

## 10. Questões em aberto
- Custos indiretos (gás, energia, transporte): incluir como "custo fixo por lote"?
- Conferir os termos de uso de dados do plano da API do Gemini que for usado.
