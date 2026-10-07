# Revisão diária de runtime, dependências e PWA — 07/10/2026

## Escopo e origem

Fonte auditada: `41642b51e304cd7532bd281e6dd9dd3cc8830b97`, versão v49 confirmada pelo agente principal. Repositório principal: `/Users/octavioribeiroleite/Documents/ChatGPT/Aplicativo IPNC`. Bundle validado: `/Users/octavioribeiroleite/.codex/worktrees/ipnc-visual-completo/Aplicativo IPNC/dist/client`.

Leitura de `AGENTS.md`, `.security/audit-scope.yaml`, documentação de manutenção de 06/10, skill `auditor-seguranca-sites` e referências 09, 11, 12, 13, 16 e 19. A revisão começou somente leitura. Depois, o agente principal autorizou correções exclusivamente nos cinco workflows legados e documentação. Não houve instalação ou upgrade de dependências, chamadas de escrita ao backend, dados reais modificados ou publicação por este agente.

## Dependências e supply chain

`npm audit --json` foi executado com Node 24/npm já disponíveis, enviando apenas metadados do lockfile. Arquivo bruto em `/tmp/ipnc-daily-npm-audit-2026-10-07.json`; baseline `/tmp/ipnc-daily-npm-audit-final-2026-10-06.json`.

| Data | Críticos | Altos | Moderados | Baixos | Total |
|---|---:|---:|---:|---:|---:|
| 06/10 final | 0 | 10 | 7 | 1 | 18 |
| 07/10 | 0 | 10 | 8 | 1 | 19 |

A diferença é apenas a inclusão de `tailwindcss-animate` como pacote afetado por propagação do aviso já existente em `tailwindcss`. Nenhum GHSA novo apareceu no diff dos objetos de advisory; nenhum pacote foi removido do conjunto. Não interpretar 19 pacotes como 19 vulnerabilidades independentes ou o zero crítico como audit limpo.

Lockfile v3 com 546 entradas de pacote, todas provenientes de `registry.npmjs.org` e com integridade registrada. Nenhum resolved Git/file/registry alternativo. Existem seis pacotes com hook de instalação no lock: `@swc/core`, `core-js`, `esbuild`, `fsevents`, `sharp` e `workerd`; não foram executados nesta revisão. O pacote raiz não tem preinstall/postinstall. `npm ci` permanece no CI.

Continuam residuais os avisos da toolchain Cloudflare/Vite/Tailwind/PostCSS e do Router. Os avisos Windows de Vite/esbuild não demonstram exploração neste Mac ou no Site estático. A app é SPA com `BrowserRouter`/`createRoot`, sem hidratação SSR; a superfície SSR do Router não foi observada. A exploração do aviso de redirecionamento não foi confirmada no percurso de entrada lido. Migrações maiores ou atualização conjunta da toolchain exigem uma validação própria; não foi usado `npm audit fix --force`.

## CI/CD — correções autorizadas

Quatro `validate-responsive-*.yml` usavam Node 20, em divergência de `engines >=22.13.0` e `AGENTS.md`. Alterados para Node 22, preservando triggers, paths, permissões somente leitura, `npm ci` e build.

`fix-secretaria-navigation.yml` era uma reescrita de fonte com `contents: write` e `git push origin main`. As duas âncoras obrigatórias já não existem; a execução antiga falharia no primeiro `Home return anchor not found`, antes de escrever arquivos. Risco de escrita direta já registrado no relatório de agosto. O workflow foi aposentado no mesmo formato de `redesign-society-selector.yml`: somente `workflow_dispatch`, `contents: read`, job informativo, sem checkout, Python, patch, commit ou push. Nome e histórico do arquivo preservados.

O workflow geral `check-ebd-deployment.yml` já usa Node 22, tipos, testes e build, com `contents: read`. Não existem `pull_request_target` ou referências `secrets.*` nos sete YAML revisados. Actions permanecem por tags maiores `@v4`, sem pin por SHA: dívida residual de hardening, sem comprometimento confirmado. Branch protection, aprovação de deploy e execução efetiva desses workflows no GitHub não foram consultadas nesta etapa; publicação e remotes são centralizados pelo agente principal.

## Bundle público e segredos

Scan redigido no artefato validado da v49: 61 arquivos, 16 arquivos textuais. Nenhuma correspondência para PEM privado, PAT GitHub, chave secreta OpenAI/Supabase, access key AWS, chave Google ou token Slack. Nenhum JWT embutido identificado. Três ocorrências de chave Supabase `publishable` pública, esperadas; nenhum valor foi registrado no relatório. Não há sourcemaps ou `.env` no cliente. `.assetsignore` exclui `wrangler.json` e `.dev.vars`.

Este é um scan por padrões e contexto do artefato atual, não garantia absoluta ou varredura completa de histórico Git. Não foram lidos valores de credenciais ou dados de produção. O bundle principal tem 2.663.457 bytes, aproximadamente 720.058 bytes gzip: peso inicial continua como risco de desempenho já conhecido, sem benchmark físico novo.

O `dist/client` local do repositório principal era um artefato antigo. Foi excluído da evidência de produção; somente o bundle identificado pelo agente principal foi auditado.

## PWA: abertura, instalação, atualização, offline e retomada

Manifest e SW do bundle são byte a byte iguais aos arquivos fonte auditados. Manifest inicia em `/auth?home=1`, identidade `id: /`, `scope: /`, `standalone`, fallback de exibição `fullscreen/standalone`, `launch_handler: navigate-existing`. Os PNG referenciados existem em 192×192 e 512×512; ícone maskable 512×512 opaco. Apple icon, favicons e fundos de abertura existem.

SW na revisão v49: `ump-cache-v27`; registro versionado com `updateViaCache: none`, checagem periódica/foreground, promoção de worker em espera via `SKIP_WAITING`. A atualização explícita verifica conexão/HTTP antes de navegar, não unregister/remove caches, e mantém a página atual em erro offline. Nenhuma navegação HTML, API REST/Auth/Functions/Storage ou OAuth é interceptada/cacheada pelo SW; só ícones e assets públicos de mesmo domínio são cacheados. Não foi encontrada fonte de imagem privada de mesma origem nesse caminho de uso lido.

A política de abertura troca qualquer documento novo pela Home antes de montar uma rota privada, preservando recuperação e links públicos intencionais. PWA com processo retido retorna Home quando volta de background; browser normal conserva o prazo de 30 minutos. Isso usa visibilidade como aproximação de reabertura, pois iOS/Android não oferecem sinal portátil que distinga fechamento do app e troca entre apps. A exceção do seletor nativo de arquivo/câmera preserva o formulário. O código trata lançamentos tardios, BFCache, eventos repetidos e storage indisponível sem alterar credenciais.

A instalação só abre por ação explícita, consome o prompt nativo uma vez, e distingue aceitação de instalação concluída (`appinstalled`). A preferência escura do sistema é aplicada antes do CSS/React e atualizada ao mudar/retomar. O splash nativo do sistema ainda depende de manifest/ícone e comportamento do SO; a tela React não pode garantir a mesma animação ou atualização instantânea do ícone já instalado.

**Limites:** não foi feita nova instalação física em Android/iPhone, nem revalidação de atualização nativa, fechamento real por SO, câmera, storage quota ou interação de biometria/teclado. Não há shell HTML pré-cacheado: abrir o app inteiramente fechado sem conexão não é garantido; o SW deliberadamente mantém HTML e dados protegidos fora do cache. A app já aberta pode manter dados na memória, mas isso não prova uma inicialização offline completa. Não foram alteradas sessões, permissões ou PINs.

## Verificação e entrega desta etapa

O agente principal informou que tipos, build, 458 testes e matriz visual 400 já passaram para a v49; não foram repetidos nesta etapa. Foram revisadas as fontes e os contratos específicos de instalação, abertura, theme, refresh, PIN Back e retomada existentes. Não foi encontrado novo defeito reproduzível de app/PWA no escopo desta leitura. As correções de CI são pequenas e verificadas por parse YAML, assertions estruturais e diff, com os demais arquivos preservados. O agente principal valida a revisão final, faz commit/sincronização/deploy e confirma status.
