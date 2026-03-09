

# Melhorias no Comparativo entre Turmas - EBD

## Problema identificado
O "Comparativo entre turmas" está como uma lista com barras de progresso. O usuário quer que cada turma seja um **card clicável** que, ao ser selecionado, mostre os alunos daquela turma com suas **porcentagens individuais de presença**.

## Solução técnica

### Arquivo: `src/components/secretaria/HistoricoTab.tsx`

**1. Adicionar state para controlar turma selecionada**
```typescript
const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
```

**2. Transformar o comparativo em grid de cards clicáveis**
Substituir a seção atual (linhas 575-602) por:
- Grid responsivo de cards (2 colunas em mobile, 3-4 em desktop)
- Cada card mostra: nome da turma, porcentagem média, ícone indicativo
- Cor dinâmica baseada na performance (verde ≥70%, amarelo ≥40%, vermelho <40%)
- Ao clicar, abre o dialog com os alunos

**3. Calcular estatísticas por aluno**
Criar um `useMemo` que, para cada turma selecionada, calcule:
```typescript
interface StudentStats {
  id: string;
  name: string;
  present: number;      // quantas vezes compareceu
  total: number;        // total de domingos registrados
  percentage: number;   // (present / total) * 100
}
```

**4. Dialog com lista de alunos**
- Usar `ResponsiveDialog` já existente
- Header: nome da turma + média geral da turma
- ScrollArea com cards de alunos:
  - Nome do aluno
  - "X/Y domingos" (presente/total)
  - Porcentagem destacada com cor semântica
  - Mini progress bar

**5. Ordenação dos alunos**
Dentro do dialog, ordenar por:
- Primeiro: alunos com menor frequência (para destacar quem precisa de atenção)
- Alternativa: botão toggle para alternar entre "menor frequência" e "alfabético"

## Benefícios
- ✅ Interface mais limpa e organizada
- ✅ Permite análise detalhada por turma
- ✅ Identifica rapidamente alunos com baixa frequência
- ✅ Mantém consistência com os outros cards interativos
- ✅ Responsivo (drawer em mobile, dialog em desktop)

