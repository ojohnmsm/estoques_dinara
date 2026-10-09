-- Cenário calculado à mão (ver src/lib/calculos.test.ts). Rodar após stub + migração.
\set ON_ERROR_STOP 1
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into ingredientes (nome, unidade_base) values ('Leite condensado','g'),('Leite','ml'),('Morango','g'),('Saquinho','un');
create temp table ids as select nome, id from ingredientes;
select registrar_compra('2026-10-01','Mercado', jsonb_build_array(
  jsonb_build_object('ingrediente_id',(select id from ids where nome='Leite condensado'),'qtd_embalagens',2,'embalagem_qtd',395,'valor_total',17),
  jsonb_build_object('ingrediente_id',(select id from ids where nome='Leite'),'qtd_embalagens',1,'embalagem_qtd',1000,'valor_total',5),
  jsonb_build_object('ingrediente_id',(select id from ids where nome='Morango'),'granel',true,'qtd_embalagens',0.5,'valor_total',15),
  jsonb_build_object('ingrediente_id',(select id from ids where nome='Saquinho'),'qtd_embalagens',1,'embalagem_qtd',100,'valor_total',8)
)) is not null as compra1;
select nome, round(custo_unitario,6) custo, embalagem_padrao from ingredientes order by nome;
select salvar_sabor(null,'Morango',5,10,20,true, jsonb_build_array(
  jsonb_build_object('ingrediente_id',(select id from ids where nome='Leite condensado'),'qtd_base',395),
  jsonb_build_object('ingrediente_id',(select id from ids where nome='Leite'),'qtd_base',500),
  jsonb_build_object('ingrediente_id',(select id from ids where nome='Morango'),'qtd_base',250),
  jsonb_build_object('ingrediente_id',(select id from ids where nome='Saquinho'),'qtd_base',20))) as sid \gset
select round(custo_receita,2) as custo_receita_esperado_20_10, custo_incompleto from custo_sabores;
select registrar_producao(:'sid','2026-10-02',1,20) is not null;
select registrar_venda(jsonb_build_array(jsonb_build_object('sabor_id',:'sid','qtd',5)),'pix') as g1 \gset
select registrar_compra('2026-09-01',null, jsonb_build_array(jsonb_build_object('ingrediente_id',(select id from ids where nome='Morango'),'granel',true,'qtd_embalagens',1,'valor_total',10))) is not null as compra_antiga;
select round(custo_unitario,4) as morango_deve_ser_0_03 from ingredientes where nome='Morango';
select registrar_compra('2026-10-05',null, jsonb_build_array(jsonb_build_object('ingrediente_id',(select id from ids where nome='Morango'),'granel',true,'qtd_embalagens',0.5,'valor_total',20))) as c3 \gset
select round(custo_receita,2) as receita_deve_ser_22_60 from custo_sabores;
select pg_sleep(0.01);
select registrar_producao(:'sid','2026-10-06',1,18) as p2 \gset
select round(custo_medio,6) as medio_deve_ser_1_141667 from sabores;
select registrar_venda(jsonb_build_array(jsonb_build_object('sabor_id',:'sid','qtd',3,'preco_unitario',4.5)),'dinheiro') is not null;
select estoque as estoque_deve_ser_30 from estoque_sabores;
select registrar_ajuste(:'sid','contagem',null,25) is not null;
select delta as delta_deve_ser_menos5 from ajustes_estoque;
select qtd, preco_unitario, round(custo_unitario,6), forma_pagamento from vendas order by created_at;
\set ON_ERROR_STOP 0
select excluir_producao((select id from producoes order by created_at limit 1));
\set ON_ERROR_STOP 1
select excluir_producao(:'p2');
select round(custo_medio,6) as medio_deve_voltar_1_005, (select estoque from estoque_sabores) as estoque_deve_ser_7 from sabores;
select excluir_compra(:'c3');
select round(custo_unitario,4) as morango_volta_0_03, custo_atualizado_em from ingredientes where nome='Morango';
select desfazer_venda(:'g1');
select estoque as estoque_deve_ser_12 from estoque_sabores;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select (select count(*) from ingredientes) ing, (select count(*) from vendas) v, (select count(*) from estoque_sabores) e;
\set ON_ERROR_STOP 0
select registrar_producao(:'sid','2026-10-06',1,18);
