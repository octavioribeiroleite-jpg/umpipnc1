

# Historico Completo de Chamadas EBD

## Problema
O historico atual so mostra dias **fechados** (com registro em `ebd_day_closures`). Dias com chamada feita mas nao fechados nao aparecem como cards. Isso significa que a chamada de hoje so aparecera no historico se o admin clicar "Fechar Dia".

## Solucao
Refatorar o `HistoricoTab` para mostrar **todos os dias com registros de presenca**, independente de estarem fechados ou nao. Cada dia vira um card visual com:
- Data formatada
- Total presentes / total alunos + percentual
- Badge: "Fechado" (laranja/verde) ou "Aberto" (azul)
- Botao expandir para ver turmas
- Botao baixar PDF
- Para dias abertos, calcular stats direto do `ebd_attendance`

## Mudancas em `src/components/secretaria/HistoricoTab.tsx`

### Logica de dados
1. Agrupar `ebd_attendance` por data unica (`date`) para descobrir todos os dias com chamada
2. Para cada dia:
   - Se tem registro em `ebd_day_closures` → usar os dados do closure (ja calculados)
   - Se nao tem closure → calcular stats em tempo real a partir do attendance (presentes por turma, totais)
3. Ordenar por data desc
4. Mesclar ambas as fontes em uma lista unificada de "DayRecord"

### Interface unificada
```typescript
interface DayRecord {
  date: string;
  isClosed: boolean;
  closureId?: string;
  closedBy?: string;
  totalStudents: number;
  presentStudents: number;
  classSummary: ClassSummaryItem[];
}
```

### Cards visuais (substitui a secao atual "Dias fechados")
- Titulo: data formatada ("08 de marco")
- Badge: "Fechado" ou "Em aberto"
- Presentes/Total + percentual grande + barra de progresso
- Expandir: lista de turmas com presenca individual
- Botao PDF (funciona tanto para dias fechados quanto abertos)

### Graficos e metricas
- Permanecem iguais, ja funcionam com dados do `ebd_attendance` direto

## O que NAO muda
- Nenhuma tabela nova ou migracao
- ChamadaTab, Secretaria.tsx, fluxo de fechar/reabrir dia intactos
- Logica de PDF continua igual

