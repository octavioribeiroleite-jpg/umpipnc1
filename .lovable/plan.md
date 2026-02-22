

# Reformular Navegacao das Abas de Financas no Mobile

## Problema
No mobile, as 7 abas (Cobrancas, Comprovantes, Receitas, Gastos, Camisas, Relatorios, Configuracoes) ficam numa lista horizontal com scroll, dificultando o acesso -- as abas ficam cortadas e o usuario precisa arrastar para encontrar a que precisa.

## Solucao
Substituir as abas horizontais por um **Select dropdown** no mobile (seguindo o padrao ja usado em outras paginas do sistema), mantendo as abas normais no desktop.

## Como ficara

**Mobile**: Um dropdown Select no topo mostrando a aba ativa, ao tocar abre a lista completa com todas as opcoes visiveis de uma vez.

**Desktop**: Mantem as TabsList horizontais como estao hoje.

## Alteracoes

### `src/pages/Financas.tsx`

- Substituir o bloco de `TabsList` por:
  - **Mobile** (`md:hidden`): Um componente `Select` com todas as 7 opcoes, controlado pelo estado `activeTab`
  - **Desktop** (`hidden md:block`): A `TabsList` atual, sem mudancas
- O `Select` usa as mesmas labels e values das abas atuais
- Ao mudar o valor no Select, chama `handleTabChange` normalmente

### Estrutura visual no mobile

```text
[v Cobrancas          ]   <-- dropdown fechado

Ao tocar:
  Cobrancas
  Comprovantes
  Receitas
  Gastos
  Camisas
  Relatorios
  Configuracoes
```

## Detalhes Tecnicos

- Reutiliza o componente `Select` ja importado no arquivo
- Nenhum arquivo novo necessario
- Nenhuma alteracao no banco de dados
- Apenas alteracao visual/layout no bloco das abas (linhas 237-247 do arquivo)

