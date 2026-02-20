
# Refatorar secao de Sociedades no Painel do Pastor

## Resumo

Substituir os cards detalhados de sociedades (que estao cortados e feios no mobile) por uma lista limpa e simples, mostrando apenas o nome e a cor de cada grupo. Ao clicar em uma sociedade, o pastor e redirecionado para a pagina de detalhes (`/pastor/sociedade/:slug`) que ja existe e contem todas as informacoes organizadas (financas, reunioes, tarefas, membros, resumo IA).

## Detalhes tecnicos

### 1. `src/components/pastor/SocietyOverviewCard.tsx` -- Simplificar

Redesenhar o card para ser minimalista:
- Mostrar apenas: icone colorido com sigla + nome da sociedade + seta de navegacao (ChevronRight)
- Remover as informacoes de membros, pendentes, saldo e barra de progresso
- Usar layout de lista vertical (`grid-cols-1`) em vez de grade 2x2
- Manter o `onClick` para navegar ate `/pastor/sociedade/:slug`
- Estilo: card com borda sutil, altura compacta, hover suave

### 2. `src/pages/PainelPastor.tsx` -- Ajustar grade

- Trocar `grid grid-cols-2 gap-3` por `space-y-2` (lista vertical)
- Remover a prop `stats` do `SocietyOverviewCard` (nao sera mais necessaria)
- O titulo "Sociedades" permanece como esta

### Resultado visual esperado

Cada sociedade aparecera como uma linha limpa:

```text
+--------------------------------------------+
| [SAF]  SAF                              >  |
+--------------------------------------------+
| [UCP]  UCP                              >  |
+--------------------------------------------+
| [UMP]  UMP                              >  |
+--------------------------------------------+
| [UPA]  UPA                              >  |
+--------------------------------------------+
| [UPH]  UPH                              >  |
+--------------------------------------------+
```

Ao clicar, abre a pagina `/pastor/sociedade/:slug` com todas as informacoes detalhadas (financas, reunioes, tarefas, membros, resumo IA) -- essa pagina ja existe e esta funcional.
