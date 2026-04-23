
Vou reformular a tela da urna que aparece antes do voto, onde hoje fica apenas o ícone e o botão **“Iniciar Votação”**, e também revisar a sensação dos cliques para ficar mais natural no celular.

## Foco da alteração

Não vou mexer na tela administrativa de criação da eleição nem na segunda tela de votação. A mudança principal será na **urna pública** em:

```text
/vote/:id?mode=urna&token=...
```

Especialmente neste estado:

```text
Urna ativada
Votação aberta
Aguardando clicar em "Iniciar Votação"
```

## Nova tela “Urna pronta”

Vou substituir a tela simples atual por uma tela mais bonita e mais visual, com:

1. Fundo claro e limpo.
2. Card central com melhor acabamento.
3. Título da eleição em destaque.
4. Nome do cargo ou tipo de votação.
5. Status claro de que a urna está pronta.
6. Fotos dos candidatos/modelos em cima, lado a lado.
7. Botão grande **“Iniciar votação”** embaixo.

A ideia visual será algo assim:

```text
┌─────────────────────────────┐
│        Urna pronta          │
│   Eleição: Presidente UMP   │
│        Cargo: Presidente    │
│                             │
│   [foto]  [foto]  [foto]    │
│   João    Maria   Pedro     │
│                             │
│     Iniciar votação         │
└─────────────────────────────┘
```

## Fotos dos candidatos na tela inicial

Vou usar as fotos já cadastradas dos candidatos/modelos.

Comportamento planejado:

- Se tiver 2 candidatos: aparecem lado a lado.
- Se tiver 3 ou mais: aparecem em uma grade responsiva.
- No celular pequeno, as fotos ficam compactas para não estourar a tela.
- Se não houver foto, aparece um placeholder com ícone.
- Para votação de camisa/modelo, mantém a lógica de imagens do modelo.

## Melhor responsividade dos cliques

Vou revisar os botões e cards clicáveis da urna para ficarem mais naturais no toque:

- Botão **Iniciar votação** com área maior de clique.
- Estados visuais de toque: `active:scale`, sombra e transição suave.
- Evitar sensação de atraso no clique.
- Usar `touch-manipulation` nos botões principais.
- Melhorar feedback visual ao tocar em candidato/modelo.
- Manter o áudio sendo preparado no clique de iniciar votação, sem prejudicar o som do voto confirmado.
- Evitar botões pequenos demais em telas de 384px de largura.

## Tela principal de escolha do candidato

Também vou ajustar levemente a tela onde aparecem os candidatos para votar:

- Cards com melhor contraste.
- Área clicável maior.
- Fotos mais bem alinhadas.
- Botão **VOTAR** com feedback visual mais forte.
- Espaçamento mais confortável em celular.
- Manter o fluxo atual:
  1. Iniciar votação
  2. Escolher candidato
  3. Confirmar
  4. Voto confirmado
  5. Voltar automaticamente para a tela inicial da urna

## Arquivo principal que será alterado

### `src/pages/VotePublic.tsx`

Alterações planejadas:

- Criar uma apresentação melhor para a tela pré-voto da urna.
- Adicionar preview dos candidatos/modelos antes de clicar em **Iniciar votação**.
- Melhorar classes responsivas dos botões e cards.
- Preservar a lógica atual de segurança:
  - candidatos ficam visíveis só depois de iniciar;
  - urna volta para tela inicial após o voto;
  - áudio continua sendo preparado no clique;
  - não exibir cronômetro de retorno.

## Validação depois da implementação

Depois de aplicar, vou verificar especialmente:

- Visual em tela mobile estreita, como 384px.
- Se os botões respondem naturalmente ao toque.
- Se a tela de “Iniciar votação” ficou mais bonita.
- Se as fotos dos candidatos não quebram o layout.
- Se o fluxo da urna continua funcionando sem mexer na tela de votação administrativa.
