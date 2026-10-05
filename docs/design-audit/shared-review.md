# Revisão independente dos componentes compartilhados

Data: 28/09/2026. Revisão estática, somente leitura do código de aplicação, realizada por agente independente das alterações compartilhadas. Este relatório é o único arquivo criado por essa etapa. A auditoria segue a skill `auditar-design-app-completo` e seu checklist visual.

## Resultado

Não foi identificada regressão nova concreta de prioridade P0, P1 ou P2 no escopo revisado. Um conflito de especificidade de prioridade P3 foi comunicado à coordenação e corrigido antes do encerramento desta revisão.

Isso não equivale a aprovação visual em navegador. Não foram executados servidor, navegação, operações de autenticação, publicação ou chamadas de dados nesta etapa. Os testes e a comparação de lint centralizados pela coordenação não foram repetidos.

## Achado comunicado e correção conferida

| Prioridade | Local | Evidência | Situação |
| --- | --- | --- | --- |
| P3 | `src/society-selector.css:39`, `:46`; `src/pages/Auth.tsx:719` | O botão de voltar recebeu `h-11 w-11`, mas a regra preexistente `.society-selector-header > button` impunha `width/height: 40px !important`. O grid também tinha coluna de 42px. Essa regra neutralizava o alvo de toque de 44px declarado no JSX. | Comunicado durante a revisão. O checkout final contém coluna de 44px e `width/height: 44px !important`; correção conferida por leitura. Não era regressão funcional introduzida nesta alteração. |

## Verificações com evidência no código

- **Árvore de conteúdo e remount:** `src/components/layout/AppLayout.tsx` mantém uma única ocorrência de `{children}`, sob `main > PullToRefresh`. A adaptação de navegação continua por wrappers CSS. A adição do link de pular para o conteúdo e o posicionamento do aviso offline não duplicam nem condicionam a montagem do conteúdo principal por largura.
- **Barra lateral recolhida:** `src/components/layout/AppSidebar.tsx:33` usa `w-16` (64px), e cabeçalho/rodapé usam `p-2` (16px totais). Restam 48px para o botão de ícone de 44px. A navegação usa `px-2` e botões de largura completa. Não permanece a combinação de 64px com `p-4` que impediria acomodar o novo controle.
- **Cascata tipográfica:** `src/main.tsx` importa `responsive-foundation.css` após `index.css`. A regra dos controles em `responsive-foundation.css` passa a definir somente `font-family: inherit`, evitando que o shorthand `font: inherit` neutralize tamanho e peso das classes de cada controle.
- **Indicadores numéricos:** `src/components/ui/summary-card.tsx` mantém os dados e o tratamento de moeda. A contenção de largura está no próprio `.summary-card`; os valores admitem quebra, sem reticências ou ocultação global de conteúdo. A revisão não encontrou uma dependência de largura de viewport introduzida para os números.
- **Diálogos, sheets e drawers:** a regra de centralização/tamanho de `src/responsive-foundation.css:165` está restrita a `.app-dialog-content`, presente em Dialog e AlertDialog. Sheet e Drawer mantêm suas geometrias de borda. Os consumidores revisados usam limites de largura e rolagem vertical; o título dos diálogos recebe espaço para o botão de fechar ampliado.
- **Autenticação e enhancers:** `Auth.tsx` conserva `h2` com texto `Você é`, cards com `shadow-2xl`, estrutura de conteúdo e grupos de dois botões esperados por `components/auth/IdentityConfirmationEnhancer.tsx`. Também conserva `.animate-fade-up`, `.grid`, badges com cor inline e o título de sociedade esperado por `SocietyScreenEnhancer.tsx`. A nova classe `auth-page` não remove `.min-h-screen.relative`. Não foi encontrada quebra nova dos seletores existentes nem mudança de estado de autenticação nesta revisão.
- **Recorte e rolagem:** a retirada de `overflow-x: hidden` do documento deixa de mascarar estouros. As tabelas mantêm wrapper de rolagem; mídias que precisam de recorte, como `components/arquivos/FileCard.tsx`, o declaram localmente. Não foi identificada largura fixa nova superior à viewport nos consumidores deste escopo.
- **Arquivos:** FileCard mantém `onView`, `onDownload` e `onDelete`; o botão do nome reaproveita `onView` com `stopPropagation`. Os controles de filtro têm rótulos persistentes; a área de upload preserva seus handlers. Arquivos com nome longo passam a quebrar texto.
- **PWA e atualização:** os avisos mantêm os callbacks e passam a acomodar texto e ações com quebra; o aviso de instalação considera a área segura e a navegação inferior.
- **Conferência adicional dos três últimos primitivos:** `ui/calendar.tsx` agora usa células/dias de 44px de altura, caption de altura mínima de 44px e navegação de 44px. `--calendar-day-size` é limitado a 44px e diminui abaixo de 364px de viewport: em 375px, as sete colunas somam 308px, mais 24px de padding do calendário, cabendo no limite de 351px do popover (também há 2px de borda). Os dois consumidores efetivos de `ui/calendar` (`Visitantes` e `TaskDialog`) usam `PopoverContent` com `w-auto p-0`; não há container fixo de 288px nesses usos. `ui/dropdown-menu.tsx` preserva callbacks/refs e usa itens de altura mínima de 44px, limite de altura disponível do Radix e rolagem vertical no conteúdo e subconteúdo. `ui/popover.tsx` limita largura à viewport menos 24px e altura ao espaço disponível do Radix. Não foi encontrada regressão concreta nesses deltas por leitura; colisão/posicionamento de popup ainda requer validação no navegador.

## Cobertura

| Área | Arquivos/estados examinados |
| --- | --- |
| Fundação e autenticação visual | `index.css`, `responsive-foundation.css`, `auth-readability.css`, `identity-confirmation.css`; conferência adicional de `society-selector.css`, ordem de imports e seletores dos dois enhancers |
| Primitivos | `button`, `card`, `app-card`, `summary-card`, `dialog`, `alert-dialog`, `sheet`, `drawer`, `input`, `textarea`, `select`, `tabs`, `table`, `app-button`, `fab`; conferência adicional de `calendar`, `dropdown-menu` e `popover` |
| Navegação e layout | `AppLayout`, `PageHeader`, `SectionHeader`, `AppSidebar` expandida/recolhida, `MobileHeader`, `BottomNav` e menu de opções |
| Autenticação | `Auth`: opções de acesso, identificação, confirmação de identidade, seleção de sociedade/diretoria e campos/formulários; `ResetPassword`; `NotFound` |
| Página inicial e documentos | `Index`; `Arquivos`; componentes de filtro, card, upload e detalhes de arquivos, inclusive diálogo/drawer; nomes longos e estado de ações |
| Conteúdo e comunicação | `Estudos`: listagem, filtros, detalhes e relatório; `DiretoriaComunicados`: formulário, lista, conteúdo expandido e controles |
| Avisos globais | `PWAInstallPrompt`, `UpdateAvailableBanner` |

## Limites e validação pendente

Esta etapa analisou diferenças e implementação atual, sem alterar código de aplicação. Não repetiu o lint comparativo já realizado pela coordenação e não apresenta novas contagens de teste como se fossem execução própria. A integridade de regras, dados e permissões continua coberta pelas verificações centralizadas e pelas auditorias de cada módulo.

A URL publicada informada pela coordenação, `https://renovo-ipnc.octavioribeiroleite.chatgpt.site` (versão 21), não demonstra o resultado deste checkout sem uma publicação posterior confirmada. Permanecem pendentes evidências renderizadas das alterações nas larguras 375, 390, 768, 1024 e 1440px, com teclado virtual, nomes extensos, selects abertos e diálogos com conteúdo longo. Nenhuma aprovação visual dessas condições é alegada aqui.
