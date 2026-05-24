## Problema
A barra superior da Secretaria está desproporcional no mobile (384px): título grande em duas linhas, badge "Administrador" largo, vários botões competindo por espaço e o ícone de **atualizar versão** acaba ficando escondido/cortado.

## Mudanças no header da Secretaria (`src/pages/Secretaria.tsx`)

**Layout mais compacto e equilibrado:**

1. **Reduzir altura e padding**: `py-3` → `py-2`, alinhar tudo em uma única linha de 48px.
2. **Esquerda** (apenas o essencial):
   - Botão `←` voltar (compacto)
   - Título `text-base` (não `text-lg`) + data em `text-[10px]` na linha de baixo, com `truncate` e `min-w-0` para não empurrar os ícones.
3. **Direita** (cluster de ações fixas, sempre visível):
   - Ícone **Atualizar versão** (RefreshCw) — destacado em verde/primary, sempre visível
   - Ícone **Instalar PWA** (quando aplicável)
   - Ícone **Home** (voltar ao menu da secretaria)
   - Ícone **Sair** (LogOut) com `ExitConfirmDialog`
   - Badge "Administrador" movido para **abaixo do título** como chip pequeno (`text-[10px] px-1.5 py-0`), ou ocultado em telas <400px (já que o ícone de sair já indica sessão ativa)

4. **Tamanho uniforme dos ícones**: todos `h-9 w-9` com `p-2`, gap `gap-0.5` para caber 4 ícones em 384px sem cortar.

5. **Glassmorphism consistente** com o resto do app: manter `bg-card/90 backdrop-blur-md`.

## Resultado visual esperado

```text
┌──────────────────────────────────────────────────┐
│ ←  Secretaria EBD              [↻][⬇][⌂][⎋]      │
│    24 de maio · Administrador                    │
└──────────────────────────────────────────────────┘
```

- `[↻]` Atualizar versão (verde)
- `[⬇]` Instalar PWA
- `[⌂]` Voltar ao menu
- `[⎋]` Sair

## Ajustes complementares

- Aumentar `pt-20` → `pt-16` no conteúdo (header agora é mais baixo).
- Garantir que o `HeaderActions` mostra o ícone Refresh independente do breakpoint `xs` (remover dependência de `xs:` que pode não existir no Tailwind config).

## Fora de escopo

- Não vou mexer no conteúdo abaixo do header (cards de presença, aniversariantes, grid 2x3).
- Não vou alterar outras páginas — apenas o header da Secretaria.
