

# PDF Detalhado da Chamada EBD

## Objetivo
Criar uma função `generateEbdAttendancePDF` que gera um PDF profissional e detalhado com os dados da chamada da EBD, seguindo o mesmo estilo visual dos PDFs existentes (header azul escuro, logo IPNC, barra decorativa, zebra striping).

## Arquivo a criar

### `src/utils/generateEbdPDF.ts`

**Estrutura do PDF:**

1. **Header** — Barra azul escura com logo IPNC + "Relatório de Chamada — EBD" + data formatada
2. **Resumo Geral** — Box com estatísticas: Total de alunos, Presentes, Ausentes, % geral, barra de progresso visual
3. **Ranking de Turmas** — Tabela ordenada por % presença:
   - Nome da turma | Presentes/Total | % | Barra visual
   - Troféu na turma com maior presença
   - Cores: verde (>70%), amarelo (40-70%), vermelho (<40%)
4. **Detalhamento por Turma** — Para cada turma:
   - Header com nome e stats
   - Lista de presentes (bolinha verde + nome)
   - Lista de ausentes (bolinha vermelha + nome)
   - Zebra striping alternado
5. **Rodapé** — "Gerado em dd/MM/yyyy às HH:mm" + "Página X de Y"

**Parâmetros:**
```typescript
interface GenerateEbdPDFParams {
  classes: { id: string; name: string; order_index: number }[];
  students: { id: string; class_id: string; name: string }[];
  attendance: { student_id: string; class_id: string; date: string; present: boolean }[];
  date: string;        // yyyy-MM-dd
  formattedDate: string; // "08 de março de 2026"
  professorName?: string;
}
```

## Arquivo a modificar

### `src/components/secretaria/ChamadaTab.tsx`
- Adicionar botão "Baixar PDF" (ícone Download) ao lado do card de resumo geral
- Chamar `generateEbdAttendancePDF()` com os dados atuais (classes, students, attendance, date)
- Botão só aparece quando há dados de presença

## Estilo visual
Reutiliza o mesmo padrão dos PDFs existentes (`generateCalendarPDF.ts` e `PlenariaDetalhe.tsx`):
- Header: `fillColor(30, 58, 95)` com texto branco
- Logo: `logoBase64` do asset IPNC
- Barra decorativa: `drawColor(52, 152, 219)`
- Seções: headers coloridos (verde presentes, vermelho ausentes)
- Zebra striping nas listas
- Font: helvetica, tamanhos 7-18
- Paginação automática com `checkPage()`

