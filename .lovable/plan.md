

# Correção da Data na Secretaria EBD

## Problemas identificados

1. **Data errada**: A função `getSundayDate()` sempre pega o domingo **passado**. Hoje (sábado 28/02) mostra 22/02 ao invés de 01/03. Para uma secretaria de EBD, quando estamos entre segunda e sábado, faz mais sentido mostrar o **próximo domingo** (para preparar a chamada).
2. **Formatação**: A classe CSS `capitalize` transforma "de fevereiro de" em "De Fevereiro De", ficando visualmente estranho.

## Correções

### 1. Lógica da data (`src/pages/Secretaria.tsx`)
- Alterar `getSundayDate()` para retornar o **domingo mais próximo**:
  - Se hoje é domingo → hoje
  - Se é outro dia → próximo domingo (avançar)
- Isso permite a secretária preparar a chamada durante a semana para o domingo que vem

### 2. Formatação da data (`src/pages/Secretaria.tsx`)
- Remover a classe `capitalize` do elemento `<p>` que exibe a data
- Usar formatação manual: capitalizar apenas a primeira letra ("22 de fevereiro de 2026" → "Domingo, 01 de março de 2026")
- Adicionar o dia da semana "Domingo" no início para deixar claro

### Arquivos modificados
- `src/pages/Secretaria.tsx` (função `getSundayDate` + formatação da data no header)

