# Acesso por PIN — 06/10/2026

Implementação da referência enviada para desktop e celular, preservando a logo oficial `src/assets/logo-ipnc.png` (1254 × 1254, sem modificação). Fundo creme com folhas decorativas, card branco, cadeado circular, título serifado, seis posições e teclado numérico. Não foi utilizada a marca diferente presente nos mockups.

O componente compartilhado atende Diretoria, administrador EBD e professor EBD. A confirmação de acesso dentro do diálogo EBD usa apresentação compacta. Todos mantêm o botão escrito **Voltar para a Home**, além de **Voltar** para a etapa anterior. O acesso administrativo principal e o administrativo da tesouraria continuam por usuário/senha; não foram convertidos para PIN.

## Preservação de comportamento

Os handlers de dígitos, Backspace, apagar, limpar, Enter, confirmação, limite de seis dígitos, carregamento e erro foram preservados. Nenhuma mudança em autenticação, permissões, sessões, banco ou regras de negócio. O Enter sobre um botão continua acionando somente esse botão, sem confirmar o PIN simultaneamente.

Cache PWA atualizado para `ump-cache-v16`, registro `/sw.js?v=2026-10-06-pin-access-v8`. O teste existente confirma que caches antigos são removidos, o atual é mantido e navegação/APIs/autenticação não são interceptadas.

## Inspeção visual e interações

Verificação em navegador com fixtures isoladas e dados fictícios. Nenhum PIN real foi digitado e nenhum dado de produção foi alterado. A fixture da Diretoria simula recusa de autenticação; não comprova credenciais corretas. A fixture EBD injeta uma sessão sintética para conferir o diálogo de confirmação; não comprova um login real.

| Superfície | Larguras verificadas | Resultado |
| --- | --- | --- |
| Diretoria | 390, 1024, 1440 | Logo original, teclado e navegação legíveis |
| Administrador EBD | 320, 390, 768, 1024, 1440 | Sem overflow horizontal; botões do teclado com no mínimo 52 px no mobile |
| Professor EBD | 320 | Título e marca corretos; Home retorna ao destino esperado |
| Administrador EBD, fonte raiz 200% | 320, 768 | Texto quebra e página permite rolagem vertical; nenhum conteúdo perdido horizontalmente |
| Confirmação EBD compacta | 320, 1024 | Conteúdo cabe no diálogo; cancelar mantém a tela subjacente |

Interações conferidas: digitação por teclado, Backspace, apagar último dígito, limpar, limite de seis dígitos, confirmação manual, estado de carregamento com controles desabilitados e recusa simulada com limpeza dos dígitos. Enter no botão Home com seis dígitos preenchidos retornou à Home sem confirmar o PIN.

Contraste revisado: texto principal 12,56:1, secundário 5,74:1, verde dos controles 5,54:1, Limpar 5,52:1. Contagem de dígitos é anunciada sem revelar o PIN; erro usa alerta. Foco visível e preferência por movimento reduzido contemplados.

Evidências nesta pasta:

- `diretoria-desktop-1440.png`, `diretoria-mobile-390.png`
- `ebd-admin-desktop-1440.png`, `ebd-admin-mobile-390.png`, `ebd-admin-mobile-320.png`
- `ebd-admin-tablet-768.png`, `ebd-admin-tablet-1024.png`
- `ebd-admin-320-font-200.png`, `ebd-professor-mobile-320.png`
- `ebd-reauth-compact-1024.png`, `ebd-reauth-compact-320.png`

Os controles de simulação presentes em algumas imagens pertencem apenas à fixture local. Durante a abertura simultânea das duas fixtures, o cache compartilhado de dependências Vite impediu o carregamento inicial da EBD. A inspeção foi refeita com cache temporário separado, sem modificar a configuração permanente; a configuração temporária foi removida. Nenhum novo erro de execução apareceu após a recuperação.

## Verificações

- TypeScript: passou.
- Suite Node: 245 testes passaram, incluindo PWA e teclado/Home.
- Build de produção: passou. Avisos existentes de chunks acima de 500 kB e base Browserslist antiga permanecem.
- Lint do componente PIN, registro do PWA e testes alterados: passou.
- Lint de `Auth.tsx` e `Secretaria.tsx`: 14 erros preexistentes de `no-explicit-any` (1 + 13), confirmados também nos arquivos da revisão base `eacda4bd8c9495f6dda3dc57cbccffa59ab26788`. As linhas apontadas não foram modificadas nesta entrega. Não foi reportado lint global limpo.
- `git diff --check`: passou.

Revisão independente do diff: nenhuma alteração dos handlers ou backend; apresentação compacta isolada corretamente; nenhum bloqueador encontrado.
