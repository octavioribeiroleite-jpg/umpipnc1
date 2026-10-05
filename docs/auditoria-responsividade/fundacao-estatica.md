# Fundação, áreas não EBD e PWA — revisão de fonte

Revisão de 05/10/2026, iniciada em `1ca403eb1739d411a8de4e6d5b4d83219fc83f99`. Este documento registra leitura estática e verificações locais. Não representa cobertura completa dos módulos nem inspeção de viewports no navegador.

Foram lidos AGENTS, prompt integral, README, configurações de build/TypeScript/Tailwind/ESLint, auditoria histórica, workflow financeiro atual, roteamento, estilos base, layouts, navegação, componentes de sobreposição/formulário/tabela e implementação PWA. Houve inspeção focal de Tarefas, Arquivos, Reuniões, Visitantes e Portal da Igreja, além dos layouts Pastor/Diretoria. As demais superfícies permanecem na matriz geral; busca textual de classes não equivale a revisão funcional de todas elas.

## Correções implementadas neste conjunto

### Navegação pastoral em 768–1023 CSS px

**Causa comprovada na fonte:** `PastorLayout.tsx` mostra a sidebar somente em `lg` (1024 px), mas o `BottomNav` utilizado por `PastorMobileNav` era escondido em `md` (768 px). Além disso, sua altura usava `--bottom-nav-height`, que passa a zero em `md`. Assim, a combinação dos breakpoints removia ambos os menus nessa faixa. O cabeçalho pastoral não contém um menu alternativo.

**Correção:** `BottomNav.tsx` aceita `desktopBreakpoint` (`md` por padrão); `PastorMobileNav.tsx` escolhe `lg`. O conteúdo do menu usa `h-14` (3,5 rem), preservando a altura anterior do menu móvel e evitando o token global que zera em tablets. A Diretoria continua usando o comportamento padrão em `md`. A reserva inferior do conteúdo pastoral já era de 6 rem mais safe area até `lg` e foi preservada. Não foram alteradas rotas, sessões, filtros ou regras de acesso.

**Verificação local:** render isolado do componente pastoral real confirmou cinco botões, um item atual, `lg:hidden` e altura `h-14`; o componente geral conserva `md:hidden`. Os HTMLs e resumo estão em `fundacao-checks/`. A suíte existente `pastor-layout-render.test.mjs` passou (quatro testes), incluindo conteúdo único e guardas; ela usa doubles para a navegação e por isso não comprova a correção dos breakpoints. Tipos e lint dos arquivos alterados passaram.

**Validação de navegador necessária:** 320, 390, 767, 768, 820, 1023, 1024 e 1440 px; abrir Mais, navegar e verificar foco; confirmar ausência de menu duplicado em desktop e conteúdo final acima da barra. Verificar também zoom/texto ampliado e nomes extensos. Medir a altura real, não apenas a presença de classes.

### Debounce da busca de Arquivos

**Causa comprovada na fonte:** `Arquivos.tsx` criava `setTimeout` em `useMemo` e retornava `clearTimeout`. O retorno do `useMemo` não é limpeza de efeito; cada mudança da busca mantinha o timer anterior. Isso podia aplicar pesquisas intermediárias desnecessárias e executar um callback após desmontagem.

**Correção:** somente esse callback foi transferido para `useEffect`, mantendo os 300 ms, o estado da busca e o `useMemo` de `queryFilters`. O efeito cancela o timer anterior ao receber novo termo e na desmontagem. Nenhuma consulta, ordenação, regra de acesso ou operação de arquivo foi alterada.

**Validação:** tipos e lint passaram. Ainda é necessário digitar rapidamente em uma fixture, conferir uma atualização após a pausa e sair da página antes de 300 ms. Não foi alegada medição de requisições ou interação para essa correção.

## Achados que exigem continuidade

| Prioridade | Local | Evidência e impacto | Próximo passo |
|---|---|---|---|
| Média | `src/pages/Tarefas.tsx:234` e `:241` | Quadro desktop e lista móvel montam simultaneamente `TaskCard`, ocultando uma árvore por CSS. Cada card tem mutation hook e, na variante compacta, estado próprio de modal. Isso duplica a estrutura; um modal em portal aberto antes do resize pode sobreviver à árvore agora escondida. | Reproduzir modal aberto ao cruzar 768 px. Planejar uma estrutura de cards única, mantendo aba/filtro/rascunho; não trocar ingenuamente de árvore e perder estado. |
| Corrigida nesta rodada | `src/pages/Tarefas.tsx`, `Arquivos.tsx`, `Calendario.tsx`, `Reunioes.tsx` | A consulta falha era apresentada como lista vazia. A coordenação reproduziu no navegador. | Implementado `QueryErrorState` persistente com retry, suprimindo vazio em erro e preservando snapshot anterior. Calendário separa suas duas queries; reunião rejeita também falha em detalhes/contagens. A coordenação executa a revalidação visual. |
| Média | `src/components/ui/select.tsx:69` | Conteúdo usa `max-h-96` e nenhuma largura máxima; os itens não têm quebra explícita para identificadores/nomes sem espaços. Diferente do popover e dropdown, não limita a altura pelo espaço disponibilizado pelo Radix. | Reproduzir em 320 px e viewport baixa com opções longas; considerar `max-h-[var(--radix-select-content-available-height)]`, limite de largura disponível e quebra de texto dos itens. Não há evidência visual nesta revisão. |
| Média | `src/components/layout/AppLayout.tsx:65`, `AppSidebar.tsx:32`, `TabletNavigationRail.tsx:23` | Shell da Diretoria usa `h-screen` (100vh), enquanto Pastor já usa `dvh`. Barras móveis, safe areas e teclado podem alterar a área útil em tablets. | Medir altura e acesso ao rodapé em tablet/zoom/teclado; ajustar unidade/área segura somente após reprodução. |
| Média | `public/manifest.json:9` | Orientação instalada solicita `portrait-primary`. Isso restringe o teste de mudança para paisagem em plataformas que obedecem ao manifesto. | Validar PWA instalado; considerar `any` se o objetivo é permitir uso em ambas as orientações. Não foi alterado neste conjunto. |
| Baixa | `src/components/pastor/PastorSidebar.tsx` e `PastorMobileNav.tsx` | Ambos consultam sociedades em `useEffect` próprio e ambos são montados pelo layout, apesar de um estar oculto por CSS. | Contar requisições em fixture e compartilhar consulta/dados se demonstrada redundância. Não reescrever sessão/cache. |
| Baixa | `src/components/layout/AppSidebar.tsx` | Botão Sair perde seu texto quando o menu é recolhido e não declara `aria-label`; ícone não fornece nome acessível. | Acrescentar nome explícito e conferir árvore de acessibilidade/foco. Demais itens usam `title` quando recolhidos; revisar sem depender só de tooltip. |

Exceto a linha marcada como corrigida, os ajustes sugeridos na tabela não foram implementados por este conjunto. Problemas de escrita/rollback fora da EBD não foram modificados por analogia com a chamada.

## PWA e desempenho: evidência e limites

`public/sw.js` atende somente GET da mesma origem; evita rotas de API, autenticação, storage, funções, OAuth e navegação. O cache contém assets/fontes/imagens. Isso preserva a separação de respostas do Supabase nesta implementação; não houve inspeção do cache efetivo em navegador nem teste de logout/troca de sessão.

`refresh-site.ts` preserva rota, busca e fragmento e não limpa sessões/rascunhos; os testes existentes de atualização passaram na linha de base. `registerSW.ts` possui verificação periódica e por retorno de visibilidade. O script e o cache atuais usam a identificação v9; imagens públicas sem hash continuam com política cache-first. Se uma imagem no mesmo caminho for substituída, a estratégia de versionamento deverá considerar o cache existente. Nenhum asset foi substituído neste conjunto.

O bundle inicial é grande e as páginas são importadas estaticamente em `App.tsx`. O build fornece os tamanhos em `baseline/build.log`; isso sustenta investigação de carregamento, mas não demonstra que o bundle causou o atraso de marcação de presença. Não foram feitas mudanças amplas de dependências, split de rotas ou memoização indiscriminada.

## Comandos e artefatos

Linha de base completa: `baseline/README.md` e `baseline/results.json`. Verificação deste conjunto: `fundacao-checks/results.json`, logs de tipos, render pastoral, lint direcionado e `git diff --check`. A comparação global de lint e a suíte integrada final cabem à revisão consolidada após integrar todas as mudanças.

Nenhuma alteração de backend remoto, dado real, publicação, push ou commit foi executada por este conjunto. Depois desta revisão inicial, o preflight EBD autorizado consultou somente metadados remotos; escopo e evidência estão em `propostas/preflight-confirmado.json`.
