

# Wizard passo a passo para registro de gastos

## Mudança

Substituir o dialog de formulário único por um wizard de 5 passos com animações de transição suave:

### Passos do wizard (dentro do mesmo Dialog)
1. **Descrição** — campo textarea, botão "Próximo"
2. **Valor (R$)** — campo numérico, botões "Voltar" e "Próximo"
3. **Data** — campo de data, botões "Voltar" e "Próximo"
4. **Comprovante** — upload de imagem/PDF, botões "Voltar" e "Próximo"
5. **Resumo** — mostra todos os dados preenchidos para conferência, botões "Voltar" e "Confirmar"

### UI/UX
- Indicador de progresso no topo (barra ou steps numerados 1-5)
- Cada passo valida o campo antes de avançar (descrição não vazia, valor > 0, comprovante obrigatório para novo gasto)
- Animação de slide horizontal entre passos (slide-in da direita ao avançar, slide-in da esquerda ao voltar) usando CSS transitions
- No resumo: card com descrição, valor formatado, data formatada e thumbnail do comprovante
- Botão "Confirmar" submete tudo de uma vez (mesma lógica atual do `handleSubmit`)

### Edição
- Ao editar, o wizard abre direto no passo 1 com dados preenchidos, comprovante é opcional
- Resumo mostra "(manter atual)" se comprovante não foi alterado

### Arquivo modificado
- `src/components/financas/GastosTab.tsx` — refatorar o Dialog para usar estado `step` (1-5), renderizar conteúdo condicional por passo, adicionar animações CSS inline com `transition` e `transform`

