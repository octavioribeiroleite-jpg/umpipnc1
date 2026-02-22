

# Corrigir Página de Usuários Vazia

## Problema

A tabela `user_roles` possui politicas RLS RESTRICTIVAS ("Permissive: No"). Quando existem multiplas politicas RESTRICTIVAS para SELECT, TODAS devem ser verdadeiras simultaneamente. As politicas atuais sao:

- "Admins can view all roles" - RESTRICTIVE - `has_role(auth.uid(), 'admin')`
- "Users can view their own roles" - RESTRICTIVE - `auth.uid() = user_id`

Para um admin ver roles de outros usuarios, AMBAS precisam passar. Mas a segunda falha porque o admin nao e o dono da row. Resultado: admin so ve a propria role, a query retorna vazio para os demais.

## Solucao

Recriar as politicas SELECT da tabela `user_roles` como PERMISSIVE (padrao), para que QUALQUER uma que passe libere o acesso.

### Migracao SQL

```text
-- Remover politicas antigas de SELECT
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Recriar como PERMISSIVE (padrao)
CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);
```

## Resultado esperado

- Admin ve todas as roles de todos os usuarios
- Usuarios comuns so veem a propria role
- A pagina de Usuarios volta a funcionar normalmente

## Sobre o ChargeCard

As mudanças visuais do ChargeCard ja estao aplicadas na preview. Para ver no app publicado, e necessario publicar o projeto.

