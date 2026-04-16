
-- Criar bucket público para fotos de candidatos/modelos de eleições
INSERT INTO storage.buckets (id, name, public)
VALUES ('election-photos', 'election-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Política: leitura pública (necessário para a página de votação anônima)
CREATE POLICY "Election photos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'election-photos');

-- Política: usuários com permissão de gerenciar eleições podem fazer upload
CREATE POLICY "Election managers can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'election-photos' AND public.can_manage_elections(auth.uid()));

-- Política: usuários com permissão de gerenciar eleições podem atualizar
CREATE POLICY "Election managers can update photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'election-photos' AND public.can_manage_elections(auth.uid()));

-- Política: usuários com permissão de gerenciar eleições podem deletar
CREATE POLICY "Election managers can delete photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'election-photos' AND public.can_manage_elections(auth.uid()));
