# Casal Gourmet — controle de sacolés

App web (mobile-first) para controlar custo, estoque e vendas de sacolé. A especificação completa, com as regras de negócio, está em [`SPEC.md`](SPEC.md).

**Stack:** Next.js 16 (App Router) na Vercel + Supabase (Postgres, Auth).

## Rodando localmente

```bash
cp .env.example .env.local   # preencha com os dados do projeto Supabase
npm install
npm run dev
```

## Banco de dados

O schema fica em `supabase/migrations/`. Toda alteração de estoque e custo passa por funções Postgres (RPC), em transação. Não grave direto nas tabelas `producoes`, `vendas`, `ajustes_estoque` e `itens_compra`.

Para testar a migração num Postgres local, sem Supabase:

```bash
createdb teste
psql -d teste -f supabase/tests/stub_supabase.sql
psql -d teste -f supabase/migrations/20261009000001_inicial.sql
psql -d teste -f supabase/tests/cenario.sql   # os valores "deve_ser" precisam bater
```

## Verificações

```bash
npm test          # regras de cálculo (Vitest)
npm run typecheck
npm run lint
npm run build
```

## Primeiro acesso

1. Na Vercel, publique com `NEXT_PUBLIC_PERMITIR_CADASTRO=true`.
2. A usuária cria a conta pela tela de login.
3. Volte para `false`, publique de novo e, no Supabase, desative novos cadastros: **Authentication → Sign In / Providers → Allow new users to sign up**.
4. No Supabase, em **Authentication → URL Configuration**, configure a *Site URL* com o endereço da Vercel. É para lá que o link de confirmação de e-mail aponta.
