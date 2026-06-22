# Relatório Trimestral Detalhado da EBD

Criar um novo relatório PDF completo (últimos 3 meses) que detalha, para **cada sala**, frequência média, lista de alunos, visitantes (com nomes) e a presença domingo a domingo — além do resumo geral já existente.

## O que o relatório vai conter

1. **Cabeçalho** (igual ao atual): logo, título "Relatório Trimestral — EBD", período, igreja.
2. **Resumo geral do período**: domingos, média de presentes, total de visitantes, frequência média.
3. **Frequência por domingo** (geral): data, presentes, total, visitantes, %.
4. **Por sala (uma seção para cada turma):**
   - Cabeçalho da sala com frequência média e total de presenças no período.
   - **Frequência domingo a domingo da sala**: data, presentes/total, % e nº de visitantes.
   - **Lista de alunos** da sala: cada aluno com presenças/total de domingos e % (ordenado do menor para o maior, destacando faltosos).
   - **Visitantes da sala**: por domingo, quantidade + nomes registrados (quando houver). Salas sem visitantes mostram "Nenhum visitante no período".

## Como funciona (técnico)

### Coleta de dados — `src/components/secretaria/HistoricoTab.tsx`
- Adicionar uma nova ação "Relatório trimestral completo" ao lado do botão atual de período (ou substituir o atual quando o filtro for 3 meses).
- Ao gerar, buscar em paralelo, para o intervalo dos últimos 3 meses (filtrando apenas domingos):
  - `ebd_attendance` (já carregado) — presença por aluno/sala/domingo.
  - `ebd_class_visitor_entries` — visitantes nomeados por sala/domingo (campos `class_id`, `date`, `name`).
  - `ebd_class_visitors` — contagem de visitantes por sala/domingo (fallback quando não há nomes).
- Montar uma estrutura por sala contendo: domingos com presentes/total/%, alunos com presenças/total/%, e visitantes (contagem + nomes) por domingo.

### Geração do PDF — `src/utils/generateEbdPDF.ts`
- Criar `generateEbdQuarterlyPDF(params)` recebendo `periodLabel`, `days` (geral) e `classesDetail` (array por sala com domingos, alunos e visitantes).
- Reaproveitar o mesmo estilo visual (cor `#1E3A5F`, zebra, barras de %, faixas de seção) das funções existentes, com paginação via `checkPage`/`addFooter`/`putTotalPages`.
- Para cada sala: faixa de título → tabela de domingos → tabela de alunos → bloco de visitantes (nomes em lista; se só houver contagem, mostrar número).
- Salvar como `relatorio-trimestral-ebd.pdf`.

### Observações
- Mudança apenas de frontend/apresentação; nenhuma alteração de banco ou regras de acesso.
- Visitantes nomeados vêm de `ebd_class_visitor_entries`; quando uma sala só tiver contagem em `ebd_class_visitors`, exibimos o número sem nomes.
- Mantém o relatório de período atual funcionando; o novo é uma opção adicional mais completa.
