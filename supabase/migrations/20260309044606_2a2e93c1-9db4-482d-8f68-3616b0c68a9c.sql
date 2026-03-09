
DELETE FROM public.aniversariantes a
USING public.aniversariantes b
WHERE a.id > b.id
  AND a.nome = b.nome
  AND a.dia = b.dia
  AND a.mes = b.mes;
