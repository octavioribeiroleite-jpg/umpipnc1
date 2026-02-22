
# Layout Compacto para Eleicoes (Mobile)

O problema atual e que os 3 cards (Chamada, Candidatos, Votacao) ocupam muito espaco vertical no celular, com padding e titulos grandes. A solucao e compactar tudo.

## Mudancas Planejadas

### 1. EleicaoDetalhe.tsx - Layout compacto com Accordion
- Substituir os 3 cards empilhados por um **Accordion** (colapsavel) onde cada secao pode ser expandida/recolhida
- A secao ativa (baseada no status) abre por padrao:
  - Status `draft`: "Chamada de Presenca" e "Candidatos" abertos
  - Status `open`: "Votacao" aberto
  - Status `finished`: "Resultado" aberto
- Reduzir espaco entre secoes (`space-y-3` em vez de `space-y-6`)
- Compactar o cabecalho: nome da eleicao + badge em uma unica linha, cargo como texto menor

### 2. AttendanceList.tsx - Compactar
- Reduzir padding do CardHeader e CardContent (`p-3 pt-0` e `p-3`)
- Titulo menor (`text-base` em vez de padrao)
- Input e botao "Importar" na mesma linha
- Lista de nomes mais compacta (`py-1` em vez de `py-2`)
- Footer com contagem e botao em layout mais apertado

### 3. CandidateForm.tsx - Compactar
- Reduzir padding do card
- Grid de candidatos: `grid-cols-3` no mobile (fotos menores `w-16 h-16` em vez de `w-24 h-24`)
- Botoes de acao (Foto/Excluir) como icones menores sem texto
- Titulo menor

### 4. VotingPanel.tsx - Compactar
- Reduzir padding
- Contadores em layout mais compacto (texto menor)
- QR Code menor no mobile (`size={120}` em vez de `160`)
- Progress bar mais fina (`h-2` em vez de `h-4`)

### 5. Eleicoes.tsx (Lista) - FAB
- Substituir botao "Nova Eleicao" no header por um FAB (botao flutuante) no mobile, seguindo o padrao ja usado em outras paginas
- Card de estado vazio mais compacto

### 6. ElectionCard.tsx - Compactar
- Reduzir padding (`p-3` em vez de `p-4`)
- Informacoes em uma ou duas linhas compactas

## Detalhes Tecnicos

### Accordion na pagina de detalhe
Usar o componente Accordion ja existente do projeto (Radix UI) para colapsar as secoes:

```
<Accordion type="multiple" defaultValue={defaultOpen}>
  <AccordionItem value="chamada">
    <AccordionTrigger>Chamada de Presenca</AccordionTrigger>
    <AccordionContent>
      <AttendanceList ... />
    </AccordionContent>
  </AccordionItem>
  ...
</Accordion>
```

Isso elimina a necessidade de scroll extenso -- o usuario expande apenas o que precisa.

### Reducao de tamanhos
- CardHeader padding: `p-4` em vez de `p-6`
- CardContent padding: `p-4 pt-0` em vez de `p-6 pt-0`
- Titulos: `text-base font-semibold` em vez de `text-2xl`
- Espacamento geral: `space-y-3` em vez de `space-y-4` ou `space-y-6`

### FAB na lista de eleicoes
Reutilizar o componente `Fab` ja existente no projeto para o botao "Nova Eleicao" no mobile.

## Resultado Esperado
- Pagina de detalhe cabe em uma tela sem precisar rolar tanto
- Secoes colapsaveis permitem foco na etapa atual
- Cards mais compactos e adequados para telas de celular
- Lista de eleicoes com FAB seguindo padrao do resto do app
