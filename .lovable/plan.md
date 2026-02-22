

# Melhorar Visual da Aba de Cobranças

## Problemas Atuais
- Cards com visual repetitivo e pouco diferenciado
- Resumo de pagos/pendentes/isentos aparece como texto simples, sem destaque
- Sem busca por nome para encontrar membros rapido
- Cards de membros pagos e pendentes tem a mesma aparencia visual
- Nao ha agrupamento visual por status

## Melhorias Propostas

### 1. Resumo com mini-cards coloridos (em vez de texto)
Substituir o texto "0 pagos / 36 pendentes / 0 isentos" por 3 mini-cards clicaveis com cores distintas:
- Verde para pagos (com icone de check)
- Vermelho para pendentes (com icone de relogio)
- Cinza para isentos
- Clicar em um mini-card filtra a lista por aquele status

### 2. Barra de progresso de adimplencia
Adicionar uma barra de progresso abaixo dos seletores de mes/ano mostrando visualmente a porcentagem de membros que ja pagaram naquele mes.

### 3. Busca por nome
Campo de busca acima da lista de cards para filtrar membros pelo nome rapidamente, util quando ha muitos membros.

### 4. Cards com visual diferenciado por status
- **Pendente**: borda esquerda vermelha + fundo levemente avermelhado
- **Pago**: borda esquerda verde + fundo levemente esverdeado, botao "Baixa" desaparece
- **Parcial**: borda esquerda amarela + fundo levemente amarelado
- **Isento**: borda esquerda cinza + estilo mais discreto

### 5. Layout do card mais compacto
Reorganizar o card mobile para ser mais limpo:
- Nome do membro com fonte maior e mais destaque
- Valor total (mensalidade + per capita) em destaque
- Badges de status menores e alinhados
- Botao de acao (Baixa/Ver) mais acessivel

## Arquivos a Modificar

### `src/components/financas/CobrancasTab.tsx`
- Adicionar estado de busca (`searchTerm`) e filtro por status (`statusFilter`)
- Adicionar campo de busca no topo
- Substituir texto de resumo por mini-cards clicaveis
- Adicionar barra de progresso (`Progress`) abaixo dos seletores
- Filtrar membros exibidos conforme busca e filtro de status
- Aplicar classes de borda/fundo por status nos cards mobile

### `src/components/financas/ChargeCard.tsx`
- Receber prop `variant` baseada no status geral do membro (pendente/pago/parcial/isento)
- Aplicar borda esquerda colorida e fundo sutil conforme variante
- Layout mais compacto: nome com fonte `text-base font-semibold`, valores alinhados a direita
- Badge de status mais discreto (menor, sem borda)
- Mostrar valor total combinado (mensalidade + per capita) em destaque

## Detalhes Tecnicos

### Mini-cards de resumo
- 3 cards lado a lado usando `grid grid-cols-3 gap-2`
- Cada card com `cursor-pointer` e `ring-2 ring-primary` quando ativo como filtro
- Clicar no filtro ativo remove o filtro (toggle)

### Busca
- `Input` com icone `Search` e `placeholder="Buscar membro..."`
- Filtragem local (sem chamada ao banco) por `member.name.toLowerCase().includes(searchTerm)`

### Barra de progresso
- Usar componente `Progress` ja existente no projeto (`@radix-ui/react-progress`)
- Valor: `(paidCharges / totalCharges) * 100`
- Cor verde quando acima de 70%, amarela entre 50-70%, vermelha abaixo

### Variantes do ChargeCard
```text
pendente -> border-l-4 border-l-destructive bg-destructive/5
pago     -> border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/20
parcial  -> border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20
isento   -> border-l-4 border-l-muted bg-muted/30 opacity-70
```

