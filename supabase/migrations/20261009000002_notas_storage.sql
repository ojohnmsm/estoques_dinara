-- Fotos das notas: bucket privado, cada usuária só acessa a própria pasta (<user_id>/arquivo.jpg)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('notas', 'notas', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy notas_inserir on storage.objects for insert to authenticated
  with check (bucket_id = 'notas' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy notas_ler on storage.objects for select to authenticated
  using (bucket_id = 'notas' and (storage.foldername(name))[1] = (select auth.uid())::text);
