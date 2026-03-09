

# Plano: Contador de Visitantes na Secretaria EBD

## Contexto
A Secretaria EBD atualmente registra chamada de alunos por turma, mas não contabiliza visitantes (pessoas que comparecem à EBD sem serem alunos matriculados). O usuário quer um campo simples para registrar quantos visitantes estiveram presentes no dia.

## Abordagem

A forma mais simples e eficaz: adicionar uma coluna `visitor_count` (integer, default 0) na tabela `ebd_day_closures` e um campo editável na tela de Chamada para o secretário informar o número de visitantes presentes.

### 1. Migração de banco de dados
- Adicionar coluna `visitor_count integer not null default 0` na tabela `ebd_day_closures`.

### 2. Estado local no Secretaria.tsx
- Novo estado `visitorCount` no componente `Secretaria`.
- Ao carregar dados, se já existe closure para o dia, preencher com o valor salvo.
- Passar `visitorCount` e `setVisitorCount` como props para `ChamadaTab`.
- Incluir `visitor_count` no INSERT de `handleCloseDay`.

### 3. UI no ChamadaTab
- No card de resumo (abaixo da presença geral), adicionar um campo com ícone de "Users" para informar a quantidade de visitantes.
- Input numérico compacto com label "Visitantes" ao lado dos stats totais.
- O total geral exibido passará a somar alunos presentes + visitantes.
- Campo editável quando o dia não está fechado; read-only quando fechado.

### 4. Inclusão no Histórico
- Atualizar `HistoricoTab` para exibir `visitor_count` nos cards de cada domingo quando disponível.
- Incluir no PDF de chamada, se aplicável.

### Arquivos a editar
- **Migração SQL**: `ALTER TABLE ebd_day_closures ADD COLUMN visitor_count integer not null default 0`
- **src/pages/Secretaria.tsx**: estado + passagem de props + inclusão no insert/close
- **src/components/secretaria/ChamadaTab.tsx**: novo input de visitantes no resumo
- **src/components/secretaria/HistoricoTab.tsx**: exibir visitantes nos cards do histórico

