-- Estoques Dinara — schema inicial (fase 1)
-- Regras de negócio: ver SPEC.md §6. Toda escrita que mexe em estoque/custo
-- passa por funções (RPC) para manter estoque e custo médio consistentes.

create type unidade_base as enum ('g', 'ml', 'un');
create type origem_compra as enum ('manual', 'foto');
create type forma_pagamento as enum ('pix', 'dinheiro', 'cartao');
create type motivo_ajuste as enum ('perda', 'consumo', 'contagem', 'outro');

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table ingredientes (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users on delete cascade,
  created_at          timestamptz not null default now(),
  nome                text not null check (length(trim(nome)) > 0),
  unidade_base        unidade_base not null,
  embalagem_padrao    numeric check (embalagem_padrao > 0), -- última embalagem usada, na unidade base
  custo_unitario      numeric(14,6) check (custo_unitario >= 0), -- R$ por unidade base; null = sem preço
  custo_atualizado_em date
);
create unique index ingredientes_nome_uq on ingredientes (user_id, lower(nome));

-- Memória "texto da nota → ingrediente" (usada na fase 2, leitura por foto).
create table produtos (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users on delete cascade,
  created_at        timestamptz not null default now(),
  texto_normalizado text not null,
  texto_exemplo     text not null,
  codigo            text,
  ingrediente_id    uuid references ingredientes on delete set null,
  qtd_por_embalagem numeric check (qtd_por_embalagem > 0),
  ignorar           boolean not null default false
);
create unique index produtos_texto_uq on produtos (user_id, texto_normalizado);

create table compras (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  data       date not null,
  local      text,
  origem     origem_compra not null default 'manual',
  foto_path  text,
  total      numeric(12,2) not null default 0
);
create index compras_data_idx on compras (user_id, data desc);

create table itens_compra (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  created_at     timestamptz not null default now(),
  compra_id      uuid not null references compras on delete cascade,
  ingrediente_id uuid not null references ingredientes on delete restrict,
  produto_id     uuid references produtos on delete set null,
  texto_original text,
  granel         boolean not null default false,
  qtd_embalagens numeric not null check (qtd_embalagens > 0), -- ou peso em kg/L se granel
  embalagem_qtd  numeric check (embalagem_qtd > 0),          -- tamanho da embalagem na unidade base
  qtd_base_total numeric not null check (qtd_base_total > 0),
  valor_total    numeric(12,2) not null check (valor_total >= 0),
  custo_unitario numeric(14,6) not null
);
create index itens_compra_compra_idx on itens_compra (compra_id);
create index itens_compra_ingrediente_idx on itens_compra (ingrediente_id);

create table sabores (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users on delete cascade,
  created_at          timestamptz not null default now(),
  nome                text not null check (length(trim(nome)) > 0),
  preco_venda         numeric(12,2) not null check (preco_venda >= 0),
  estoque_minimo      int not null default 0 check (estoque_minimo >= 0),
  rendimento_esperado int not null default 1 check (rendimento_esperado > 0),
  custo_medio         numeric(14,6) not null default 0,
  ativo               boolean not null default true
);
create unique index sabores_nome_uq on sabores (user_id, lower(nome));

-- Receita: 1 por sabor (SPEC §5), guardada direto nos itens.
create table itens_receita (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  created_at     timestamptz not null default now(),
  sabor_id       uuid not null references sabores on delete cascade,
  ingrediente_id uuid not null references ingredientes on delete restrict,
  qtd_base       numeric not null check (qtd_base > 0),
  unique (sabor_id, ingrediente_id)
);

create table producoes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users on delete cascade,
  created_at      timestamptz not null default now(),
  sabor_id        uuid not null references sabores on delete restrict,
  data            date not null,
  receitas_feitas numeric not null default 1 check (receitas_feitas > 0),
  qtd_produzida   int not null check (qtd_produzida > 0),
  custo_total     numeric(12,2) not null,
  custo_unitario  numeric(14,6) not null,
  custo_incompleto boolean not null default false
);
create index producoes_sabor_idx on producoes (sabor_id, created_at);

create table vendas (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users on delete cascade,
  created_at      timestamptz not null default now(),
  grupo           uuid not null, -- vendas registradas juntas (mesmo pagamento)
  sabor_id        uuid not null references sabores on delete restrict,
  data_hora       timestamptz not null default now(),
  qtd             int not null check (qtd > 0),
  preco_unitario  numeric(12,2) not null check (preco_unitario >= 0),
  custo_unitario  numeric(14,6) not null,
  forma_pagamento forma_pagamento not null
);
create index vendas_data_idx on vendas (user_id, data_hora desc);
create index vendas_sabor_idx on vendas (sabor_id);
create index vendas_grupo_idx on vendas (grupo);

create table ajustes_estoque (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  created_at     timestamptz not null default now(),
  sabor_id       uuid not null references sabores on delete restrict,
  data_hora      timestamptz not null default now(),
  delta          int not null check (delta <> 0),
  motivo         motivo_ajuste not null,
  observacao     text,
  custo_unitario numeric(14,6) not null
);
create index ajustes_sabor_idx on ajustes_estoque (sabor_id);
create index ajustes_data_idx on ajustes_estoque (user_id, data_hora desc);

-- Mudar a unidade de um ingrediente já usado invalidaria custos e receitas.
create function bloquear_troca_unidade() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.unidade_base <> old.unidade_base and (
    exists (select 1 from itens_compra where ingrediente_id = old.id) or
    exists (select 1 from itens_receita where ingrediente_id = old.id)
  ) then
    raise exception 'A unidade de "%" não pode mudar porque ele já tem compras ou receitas', old.nome;
  end if;
  return new;
end $$;

create trigger ingredientes_unidade before update of unidade_base on ingredientes
for each row execute function bloquear_troca_unidade();

-- ---------------------------------------------------------------------------
-- RLS: cada usuária só vê e altera o que é dela
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'ingredientes','produtos','compras','itens_compra','sabores',
    'itens_receita','producoes','vendas','ajustes_estoque'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy dono on %I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Views (security_invoker: respeitam o RLS de quem consulta)
-- ---------------------------------------------------------------------------

create view estoque_sabores with (security_invoker = true) as
select
  s.id as sabor_id,
  coalesce((select sum(p.qtd_produzida) from producoes p where p.sabor_id = s.id), 0)
  - coalesce((select sum(v.qtd) from vendas v where v.sabor_id = s.id), 0)
  + coalesce((select sum(a.delta) from ajustes_estoque a where a.sabor_id = s.id), 0)
    as estoque
from sabores s;

create view custo_sabores with (security_invoker = true) as
select
  s.id as sabor_id,
  coalesce(sum(r.qtd_base * coalesce(i.custo_unitario, 0)), 0)::numeric(14,6) as custo_receita,
  coalesce(bool_or(i.custo_unitario is null), false) as custo_incompleto,
  count(r.id) as qtd_ingredientes
from sabores s
left join itens_receita r on r.sabor_id = s.id
left join ingredientes i on i.id = r.ingrediente_id
group by s.id;

-- ---------------------------------------------------------------------------
-- Funções auxiliares
-- ---------------------------------------------------------------------------

create function estoque_atual(p_sabor_id uuid) returns int
language sql stable set search_path = public as $$
  select estoque::int from estoque_sabores where sabor_id = p_sabor_id;
$$;

-- Recalcula o custo médio móvel de um sabor reprocessando todos os movimentos
-- em ordem cronológica (SPEC §6.3). Usado após exclusões.
create function recalcular_custo_medio(p_sabor_id uuid) returns numeric
language plpgsql set search_path = public as $$
declare
  ev record;
  v_estoque numeric := 0;
  v_medio numeric := 0;
begin
  for ev in
    select created_at, qtd_produzida as qtd, custo_unitario, true as entrada_producao
      from producoes where sabor_id = p_sabor_id
    union all
    select created_at, -qtd, null, false from vendas where sabor_id = p_sabor_id
    union all
    select created_at, delta, null, false from ajustes_estoque where sabor_id = p_sabor_id
    order by created_at
  loop
    if ev.entrada_producao then
      if v_estoque <= 0 then
        v_medio := ev.custo_unitario;
      else
        v_medio := (v_estoque * v_medio + ev.qtd * ev.custo_unitario) / (v_estoque + ev.qtd);
      end if;
    end if;
    v_estoque := v_estoque + ev.qtd;
  end loop;

  update sabores set custo_medio = v_medio where id = p_sabor_id;
  return v_medio;
end $$;

-- Atualiza o custo de cada ingrediente a partir da compra mais recente que o contém.
create function recalcular_custo_ingrediente(p_ingrediente_id uuid) returns void
language plpgsql set search_path = public as $$
declare
  v_data date;
  v_custo numeric;
begin
  select c.data, sum(ic.valor_total) / sum(ic.qtd_base_total)
    into v_data, v_custo
  from itens_compra ic
  join compras c on c.id = ic.compra_id
  where ic.ingrediente_id = p_ingrediente_id
  group by c.id, c.data, c.created_at
  order by c.data desc, c.created_at desc
  limit 1;

  update ingredientes
     set custo_unitario = v_custo, custo_atualizado_em = v_data
   where id = p_ingrediente_id;
end $$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- p_itens: [{ingrediente_id, granel, qtd_embalagens, embalagem_qtd, valor_total,
--            produto_id?, texto_original?}]
create function registrar_compra(
  p_data date,
  p_local text,
  p_itens jsonb,
  p_origem origem_compra default 'manual',
  p_foto_path text default null
) returns uuid
language plpgsql set search_path = public as $$
declare
  v_compra_id uuid;
  it jsonb;
  v_ing ingredientes%rowtype;
  v_granel boolean;
  v_qtd numeric;
  v_emb numeric;
  v_base numeric;
  v_valor numeric;
  v_ing_id uuid;
begin
  if jsonb_array_length(coalesce(p_itens, '[]'::jsonb)) = 0 then
    raise exception 'A compra precisa de pelo menos um item';
  end if;

  insert into compras (data, local, origem, foto_path)
  values (p_data, nullif(trim(p_local), ''), p_origem, p_foto_path)
  returning id into v_compra_id;

  for it in select * from jsonb_array_elements(p_itens) loop
    select * into v_ing from ingredientes where id = (it->>'ingrediente_id')::uuid;
    if not found then
      raise exception 'Ingrediente não encontrado';
    end if;

    v_granel := coalesce((it->>'granel')::boolean, false);
    v_qtd    := (it->>'qtd_embalagens')::numeric;
    v_emb    := nullif(it->>'embalagem_qtd', '')::numeric;
    v_valor  := (it->>'valor_total')::numeric;

    if v_granel then
      if v_ing.unidade_base = 'un' then
        raise exception '"%" é contado em unidades e não pode ser comprado a granel', v_ing.nome;
      end if;
      v_emb  := null;
      v_base := v_qtd * 1000; -- kg → g, L → ml
    else
      if v_emb is null then
        raise exception 'Informe o tamanho da embalagem de "%"', v_ing.nome;
      end if;
      v_base := v_qtd * v_emb;
    end if;

    insert into itens_compra (
      compra_id, ingrediente_id, produto_id, texto_original, granel,
      qtd_embalagens, embalagem_qtd, qtd_base_total, valor_total, custo_unitario
    ) values (
      v_compra_id, v_ing.id, nullif(it->>'produto_id', '')::uuid, it->>'texto_original', v_granel,
      v_qtd, v_emb, v_base, v_valor, v_valor / v_base
    );

    if v_emb is not null then
      update ingredientes set embalagem_padrao = v_emb where id = v_ing.id;
    end if;
  end loop;

  update compras
     set total = (select coalesce(sum(valor_total), 0) from itens_compra where compra_id = v_compra_id)
   where id = v_compra_id;

  -- Atualiza o custo só se esta compra não for mais antiga que a referência atual (SPEC §6.1).
  for v_ing_id in select distinct ingrediente_id from itens_compra where compra_id = v_compra_id loop
    update ingredientes i
       set custo_unitario = x.custo, custo_atualizado_em = p_data
      from (
        select sum(valor_total) / sum(qtd_base_total) as custo
        from itens_compra where compra_id = v_compra_id and ingrediente_id = v_ing_id
      ) x
     where i.id = v_ing_id
       and (i.custo_atualizado_em is null or i.custo_atualizado_em <= p_data);
  end loop;

  return v_compra_id;
end $$;

create function excluir_compra(p_compra_id uuid) returns void
language plpgsql set search_path = public as $$
declare
  v_ings uuid[];
  v_ing uuid;
begin
  select array_agg(distinct ingrediente_id) into v_ings
  from itens_compra where compra_id = p_compra_id;

  delete from compras where id = p_compra_id;
  if not found then
    raise exception 'Compra não encontrada';
  end if;

  foreach v_ing in array coalesce(v_ings, '{}') loop
    perform recalcular_custo_ingrediente(v_ing);
  end loop;
end $$;

-- p_itens: [{ingrediente_id, qtd_base}] — substitui a receita inteira.
create function salvar_sabor(
  p_id uuid,
  p_nome text,
  p_preco_venda numeric,
  p_estoque_minimo int,
  p_rendimento_esperado int,
  p_ativo boolean,
  p_itens jsonb
) returns uuid
language plpgsql set search_path = public as $$
declare
  v_id uuid;
begin
  if p_id is null then
    insert into sabores (nome, preco_venda, estoque_minimo, rendimento_esperado, ativo)
    values (trim(p_nome), p_preco_venda, p_estoque_minimo, p_rendimento_esperado, p_ativo)
    returning id into v_id;
  else
    update sabores
       set nome = trim(p_nome), preco_venda = p_preco_venda, estoque_minimo = p_estoque_minimo,
           rendimento_esperado = p_rendimento_esperado, ativo = p_ativo
     where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Sabor não encontrado';
    end if;
    delete from itens_receita where sabor_id = v_id;
  end if;

  insert into itens_receita (sabor_id, ingrediente_id, qtd_base)
  select v_id, (x->>'ingrediente_id')::uuid, (x->>'qtd_base')::numeric
  from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) x;

  return v_id;
end $$;

create function registrar_producao(
  p_sabor_id uuid,
  p_data date,
  p_receitas_feitas numeric,
  p_qtd_produzida int
) returns uuid
language plpgsql set search_path = public as $$
declare
  v_sabor sabores%rowtype;
  v_custo_receita numeric;
  v_incompleto boolean;
  v_custo_total numeric;
  v_custo_unit numeric;
  v_estoque int;
  v_id uuid;
begin
  -- trava o sabor para estoque e custo médio não correrem em paralelo
  select * into v_sabor from sabores where id = p_sabor_id for update;
  if not found then
    raise exception 'Sabor não encontrado';
  end if;

  select custo_receita, custo_incompleto into v_custo_receita, v_incompleto
  from custo_sabores where sabor_id = p_sabor_id;

  v_custo_total := round(p_receitas_feitas * v_custo_receita, 2);
  v_custo_unit  := v_custo_total / p_qtd_produzida;
  v_estoque     := estoque_atual(p_sabor_id);

  insert into producoes (sabor_id, data, receitas_feitas, qtd_produzida, custo_total, custo_unitario, custo_incompleto)
  values (p_sabor_id, p_data, p_receitas_feitas, p_qtd_produzida, v_custo_total, v_custo_unit, v_incompleto)
  returning id into v_id;

  update sabores
     set custo_medio = case
           when v_estoque <= 0 then v_custo_unit
           else (v_estoque * v_sabor.custo_medio + p_qtd_produzida * v_custo_unit) / (v_estoque + p_qtd_produzida)
         end
   where id = p_sabor_id;

  return v_id;
end $$;

-- Só a última produção do sabor pode ser excluída (SPEC §6.3).
create function excluir_producao(p_id uuid) returns void
language plpgsql set search_path = public as $$
declare
  v_prod producoes%rowtype;
begin
  select * into v_prod from producoes where id = p_id;
  if not found then
    raise exception 'Produção não encontrada';
  end if;
  perform 1 from sabores where id = v_prod.sabor_id for update;

  if exists (
    select 1 from producoes
    where sabor_id = v_prod.sabor_id and created_at > v_prod.created_at
  ) then
    raise exception 'Só a produção mais recente do sabor pode ser excluída. Para as outras, use um ajuste de estoque.';
  end if;

  delete from producoes where id = p_id;
  perform recalcular_custo_medio(v_prod.sabor_id);
end $$;

-- p_itens: [{sabor_id, qtd, preco_unitario}]
create function registrar_venda(p_itens jsonb, p_forma forma_pagamento) returns uuid
language plpgsql set search_path = public as $$
declare
  v_grupo uuid := gen_random_uuid();
  it jsonb;
  v_sabor sabores%rowtype;
begin
  if jsonb_array_length(coalesce(p_itens, '[]'::jsonb)) = 0 then
    raise exception 'Nenhum item na venda';
  end if;

  for it in select * from jsonb_array_elements(p_itens) loop
    select * into v_sabor from sabores where id = (it->>'sabor_id')::uuid;
    if not found then
      raise exception 'Sabor não encontrado';
    end if;
    insert into vendas (grupo, sabor_id, qtd, preco_unitario, custo_unitario, forma_pagamento)
    values (
      v_grupo, v_sabor.id, (it->>'qtd')::int,
      coalesce(nullif(it->>'preco_unitario', '')::numeric, v_sabor.preco_venda),
      v_sabor.custo_medio, p_forma
    );
  end loop;

  return v_grupo;
end $$;

create function desfazer_venda(p_grupo uuid) returns void
language plpgsql set search_path = public as $$
begin
  delete from vendas where grupo = p_grupo;
  if not found then
    raise exception 'Venda não encontrada';
  end if;
end $$;

-- Para motivo 'contagem', informe p_qtd_contada; o delta é calculado aqui.
create function registrar_ajuste(
  p_sabor_id uuid,
  p_motivo motivo_ajuste,
  p_delta int default null,
  p_qtd_contada int default null,
  p_observacao text default null
) returns uuid
language plpgsql set search_path = public as $$
declare
  v_sabor sabores%rowtype;
  v_delta int;
  v_id uuid;
begin
  select * into v_sabor from sabores where id = p_sabor_id for update;
  if not found then
    raise exception 'Sabor não encontrado';
  end if;

  if p_motivo = 'contagem' then
    if p_qtd_contada is null or p_qtd_contada < 0 then
      raise exception 'Informe a quantidade contada';
    end if;
    v_delta := p_qtd_contada - estoque_atual(p_sabor_id);
  else
    v_delta := p_delta;
  end if;

  if v_delta is null or v_delta = 0 then
    return null; -- nada a ajustar
  end if;

  insert into ajustes_estoque (sabor_id, delta, motivo, observacao, custo_unitario)
  values (p_sabor_id, v_delta, p_motivo, nullif(trim(p_observacao), ''), v_sabor.custo_medio)
  returning id into v_id;

  return v_id;
end $$;

-- Só authenticated executa as funções (RLS continua valendo: security invoker).
do $$
declare f text;
begin
  foreach f in array array[
    'estoque_atual(uuid)',
    'recalcular_custo_medio(uuid)',
    'recalcular_custo_ingrediente(uuid)',
    'registrar_compra(date,text,jsonb,origem_compra,text)',
    'excluir_compra(uuid)',
    'salvar_sabor(uuid,text,numeric,int,int,boolean,jsonb)',
    'registrar_producao(uuid,date,numeric,int)',
    'excluir_producao(uuid)',
    'registrar_venda(jsonb,forma_pagamento)',
    'desfazer_venda(uuid)',
    'registrar_ajuste(uuid,motivo_ajuste,int,int,text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
