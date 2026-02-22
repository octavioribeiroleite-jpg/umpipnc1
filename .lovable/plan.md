# Melhorias no Portal do Membro e Sistema de Comunicados

## 1. Novo sistema de destinatarios para comunicados

### Regras de negocio

- **Pastor** pode enviar para: 1 sociedade especifica, todas as sociedades, ou toda a igreja
- **Diretoria** pode enviar comunicados apenas para os membros da sua propria sociedade
- **Membro** ve: comunicados da sua sociedade (enviados pelo pastor ou pela diretoria) + comunicados para "toda a igreja"
- Comunicados marcados como "todas as sociedades" NAO chegam para membros -- so para diretorias
- Comunicados marcados como "toda a igreja" chegam para TODOS (membros, diretoria, pastor)

### Mudanca no banco de dados (migration)

Adicionar coluna `scope` na tabela `pastor_announcements`:

```sql
ALTER TABLE pastor_announcements ADD COLUMN scope text NOT NULL DEFAULT 'societies';
-- Valores possiveis: 'church' (toda a igreja), 'societies' (sociedades especificas ou todas)
```

- `scope = 'church'` + `target_societies = null` -> Toda a igreja (visivel para membros)
- `scope = 'societies'` + `target_societies = null` -> Todas as sociedades (so diretoria)
- `scope = 'societies'` + `target_societies = [id1]` -> Sociedade especifica (diretoria + membros daquela sociedade)

Adicionar coluna `created_by_role` para distinguir se o comunicado foi criado pelo pastor ou pela diretoria:

```sql
ALTER TABLE pastor_announcements ADD COLUMN created_by_role text NOT NULL DEFAULT 'pastor';
-- Valores: 'pastor', 'diretoria'
```

Atualizar RLS para permitir que diretoria tambem insira comunicados:

```sql
-- Atualizar policy de INSERT para incluir diretoria
DROP POLICY IF EXISTS "Pastor can create announcements" ON pastor_announcements;
CREATE POLICY "Pastor and diretoria can create announcements"
ON pastor_announcements FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'pastor'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'diretoria'::app_role)
);
```

### Arquivos afetados

`**src/pages/PastorComunicados.tsx**`

- Adicionar opcao "Toda a igreja" nos destinatarios (alem de "Todas as sociedades" e sociedades individuais)
- Gravar campo `scope` e `created_by_role = 'pastor'`
- 3 opcoes de destinatario: Toda a igreja / Todas as sociedades / Sociedade especifica

**Nova pagina ou componente para comunicados da diretoria**

- Criar componente `DiretoriaComunicados` acessivel pelo dashboard da diretoria
- Diretoria so pode enviar para membros da SUA sociedade (sem opcao de escolher outras)
- Grava `target_societies = [society_id]`, `scope = 'societies'`, `created_by_role = 'diretoria'`

`**src/components/membro/MembroComunicados.tsx**`

- Filtrar comunicados: mostrar apenas onde:
  - `scope = 'church'` (toda a igreja), OU
  - `target_societies` contem o `society_id` do membro
- NAO mostrar comunicados onde `scope = 'societies'` e `target_societies = null` (esses sao so para diretorias)

`**src/components/membro/MembroInicio.tsx**`

- Aplicar mesmo filtro nos comunicados recentes da tela inicial

## 2. Eliminar flash da pagina admin ao logar como membro

`**src/pages/Index.tsx**`

- Adicionar retorno antecipado: se `!rolesLoaded`, mostrar skeleton/spinner em vez do conteudo do dashboard
- Isso impede que o membro veja brevemente a pagina do admin antes do redirecionamento

## 3. Eventos mais detalhados e organizados

`**src/components/membro/MembroEventos.tsx**`

- Agrupar eventos por mes com separadores visuais (ex: "Fevereiro 2026")
- Mostrar dia da semana (ex: "Sabado, 22 de fevereiro")
- Exibir horario de inicio e fim quando houver `end_date`
- Buscar e exibir badge com nome da sociedade responsavel
- Destaque visual para eventos da propria sociedade

## 4. Saudacao compacta

`**src/components/membro/MembroInicio.tsx**`

- Substituir card grande de saudacao por texto inline menor no topo
- Formato: "Ola, [Nome]! -- [Sociedade]" em uma linha, sem card separado

## 5. Pagamentos com detalhes completos

`**src/components/membro/MembroPagamentos.tsx**`

- Adicionar nos cards de cobranca: data de vencimento formatada, valor pago parcialmente, saldo restante
- Exibir metodo de pagamento e notas/observacoes quando disponiveis

## 6. Notificacoes pop-up para eventos proximos (7 dias)

`**src/pages/MembroHome.tsx**`

- Ao montar, buscar eventos dos proximos 7 dias
- Exibir ate 3 toasts (sonner) com titulo do evento e quantos dias faltam
- Usar `sessionStorage` para nao repetir na mesma sessao

## Resumo das alteracoes


| Arquivo                                                                                                                                                                                                                                                                              | Tipo           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| Migration SQL (scope, created_by_role, RLS)                                                                                                                                                                                                                                          | Banco de dados |
| `PastorComunicados.tsx`                                                                                                                                                                                                                                                              | Editar         |
| `MembroComunicados.tsx`                                                                                                                                                                                                                                                              | Editar         |
| `MembroInicio.tsx`                                                                                                                                                                                                                                                                   | Editar         |
| `MembroEventos.tsx`                                                                                                                                                                                                                                                                  | Editar         |
| `MembroPagamentos.tsx`                                                                                                                                                                                                                                                               | Editar         |
| `MembroHome.tsx`                                                                                                                                                                                                                                                                     | Editar         |
| `Index.tsx`                                                                                                                                                                                                                                                                          | Editar         |
| Novo componente comunicados diretoria (ou integrar na pagina existente)E lembrar que aparece brevemente a tela do admn quando inicia a area de membros lembrar de consolidar todos os dados antes de exibir, e isso precisa valer para todos os tipos de login do aplicativo&nbsp; | Criar/Editar   |
