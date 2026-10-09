-- Nota duplicada: a chave de acesso da NFC-e (44 dígitos) identifica a nota de forma única.
alter table compras add column chave_acesso text check (chave_acesso ~ '^[0-9]{44}$');
create unique index compras_chave_uq on compras (user_id, chave_acesso) where chave_acesso is not null;

-- Mesma assinatura de registrar_compra + chave, numa transação só:
-- se a chave já existir, o índice único desfaz a compra inteira.
create function registrar_compra_nota(
  p_data date,
  p_local text,
  p_itens jsonb,
  p_foto_path text,
  p_chave_acesso text
) returns uuid
language plpgsql set search_path = public as $$
declare
  v_id uuid;
begin
  v_id := registrar_compra(p_data, p_local, p_itens, 'foto', p_foto_path);
  update compras set chave_acesso = p_chave_acesso where id = v_id;
  return v_id;
end $$;

revoke execute on function registrar_compra_nota(date,text,jsonb,text,text) from public, anon;
grant execute on function registrar_compra_nota(date,text,jsonb,text,text) to authenticated;
