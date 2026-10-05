# Inventário read-only da identidade IPNC — 05/10/2026

Repositório inspecionado: `/Users/octavioribeiroleite/.codex/worktrees/ipnc-visual-completo/Aplicativo IPNC`.
Revisão: `90acc677bd222c0d47582e668e473293621109ea` (`90acc67`). AGENTS.md lido; nenhum arquivo do repositório, teste, backend, regra, sessão ou credencial foi alterado. `git status --porcelain=v1` estava vazio na conclusão da coleta.

Fonte oficial indicada pela raiz: `https://www.canva.com/d/cLSR_4p0xFc86Oi`; marca aprovada descrita como símbolo + IPNC, sem o nome da igreja por extenso dentro da logo. O Canva não foi aberto por este agente; os bytes/proporção/variantes da arte nova não foram presumidos. Não houve geração de imagens ou uso de Sites/browser.

## Resultado principal

- Há **16 arquivos fonte que importam diretamente o mesmo master** (15 com consumidores nas rotas atuais e 1 no layout legado do membro) `src/assets/logo-ipnc.png`. Sua substituição alcança as áreas de acesso, diretoria, pastor, portal, instalação e quatro cabeçalhos PDF; os consumidores devem ser conferidos porque há dimensões quadradas fixas e palavras “Renovo” fora da imagem.
- O master contém **broto de duas folhas + RENOVO + ipnc**, com transparência e pixels residuais de alpha baixo. Os três ícones PNG de instalação contêm a mesma identidade antiga; os dois de 512 px são idênticos byte a byte.
- **`public/favicon.ico` contém o antigo símbolo Lovable (coração com gradiente laranja/rosa/roxo)**. O HTML usa o PNG 512 como favicon explícito, mas o `.ico` permanece acessível em seu endereço convencional e no build.
- A tesouraria **não importa o master**: usa o ícone Lucide `Church` como marca no sidebar e no cabeçalho móvel. Trocar apenas o PNG não uniformiza esses dois pontos.
- O cache atual usa `ump-cache-v9`, imagens em URLs fixas e estratégia cache-first. Trocar ícones sem revisar a versão do worker/cache pode deixar aparelhos já usados com a imagem antiga. A função de atualização manual preserva os caches por intenção.

## Arquivos de imagem e formatos

SHA256 do conteúdo integral; dimensões PNG obtidas do IHDR e conferidas com Pillow. “BBox” abaixo é o retângulo dos pixels com alpha > 127 (coordenadas exclusivas à direita/baixo); não confundir a caixa total do PNG com a área visível da marca.

| Arquivo | Formato / dimensões / bytes | Características e papel | SHA256 |
|---|---|---|---|
| `src/assets/logo-ipnc.png` | PNG RGBA, 1024×1024; 1.480.718 | Broto + RENOVO + ipnc; alpha 0–255, bbox principal `(243,181,758,740)`. Em alpha >0 existem resíduos até `(241,178,844,966)`. Muito espaço transparente para usos pequenos; master único dos 16 imports. | `3250d58fbdabb7d5f8e4b772a28825c11ae981c76de5aa41332a97e73ae0c22d` |
| `public/icons/icon-192x192.png` | PNG RGBA, 192×192; 13.024 | Identidade antiga, alpha 0–255; bbox `(47,34,142,139)`; instalação purpose any. | `00ad50f65895ecf7ffaf45697f01da3016b4c903e5dfe8727249faa114922b69` |
| `public/icons/icon-512x512.png` | PNG RGBA, 512×512; 63.660 | Identidade antiga, alpha 0–255; bbox `(122,91,379,370)`; instalação any, favicon PNG, Apple touch, OG/Twitter. | `981a90e248de5847bf80e936785bea7e1341e321092343b39b80510639410f36` |
| `public/icons/icon-maskable-512x512.png` | PNG RGBA, 512×512; 63.660 | **Cópia exata do PNG any**; mesma transparência/bbox. Não constitui uma composição própria com fundo opaco para maskable; revisar com a arte oficial e sua zona de segurança. | `981a90e248de5847bf80e936785bea7e1341e321092343b39b80510639410f36` |
| `public/favicon.ico` | ICO, 1 frame RGBA 256×256; 20.373 | **Marca Lovable**; alpha 0–255, bbox `(58,40,214,198)`; não referenciado explicitamente no head, mas servido. Inspeção visual feita após leitura/conversão determinística para `/tmp/ipnc-old-favicon-inventory.png`. | `dd821076a9b03adc2173c93956226aea3d92482d7578fc4339c5d3a2e9c24586` |
| `public/images/bg-app.png` | PNG RGB, 1088×1920; 2.241.583 | Foto de broto verde no solo, sem escrita/logo. Ainda usado no loading pastoral e carregado por preload global. Não é o arquivo de logo e sua remoção requer decidir o fundo separadamente. | `590274ed29509342b75398290d937f41556d505adbb77dd4c0102a70549b82a3` |
| `public/videos/bg-home.mp4` | MP4; 7.238.681 | Nenhuma referência runtime em `src`/`index.html` na revisão atual. Arte/vídeo histórico servido como estático. Não foi reproduzido para afirmar que não contenha qualquer marca. | `21e987029354bcdf199aaaf65ba0a6b473564589b04f4ea2d1f5747352f17c07` |
| `public/placeholder.svg` | SVG; 3.253 | Placeholder genérico, sem referência encontrada em runtime e sem texto IPNC/Renovo. Não é variante oficial. | `64badf7aabda0b9630b87020ffb6095cb858ccbcf66b355c2aa08b1063954d3b` |

Nenhuma outra imagem de logo foi encontrada em `src/assets`, `public` ou arquivos rastreados. `tests/fixtures/diretoria/portrait.svg` é retrato fictício de teste, não identidade. Os SVG inline de `components/auth/SocietyScreenEnhancer.tsx` são ícones próprios de sociedades, não a logo global; os demais ícones Lucide de ações/navegação não devem ser substituídos indiscriminadamente.

## Consumidores diretos do master (16 arquivos)

| Arquivo e linhas atuais | Local de exibição / tamanho | Observações para a troca |
|---|---|---|
| `src/pages/Auth.tsx:14,741` | `/auth`; imagem na marca lateral/entrada | `auth-readability.css:5` fixa 72×72, `object-fit:contain`, fundo branco e padding4. Texto adjacente IPNC/Nova Carapina e heading institucional na linha742; alt “Renovo IPNC”. |
| `src/pages/ResetPassword.tsx:10,54` | `/reset-password`; 96×96 contain | Alt antigo. Manter funcionamento de redefinição; nenhum ajuste de auth é necessário para a identidade. |
| `src/components/layout/AppSidebar.tsx:7,40` | Diretoria desktop ≥1100; 36×36 contain em fundo branco | Há **“Renovo” escrito separadamente na linha43**, seguido de IPNC na44; troca de bitmap não atualiza esses rótulos. Colapso esconde o bloco de marca. |
| `src/components/layout/TabletNavigationRail.tsx:5,31` | Diretoria 700–1099; 36×36 contain | Alt antigo. Marca abre início; preservar destino. |
| `src/components/layout/MobileHeader.tsx:4,73` | Diretoria <700, somente início; 28×28 contain dentro de 36×36 arredondado | Espaço real pequeno; a nova arte horizontal/longa pode ficar ilegível se apenas encaixada no quadrado. Alt antigo. |
| `src/components/pastor/PastorLayout.tsx:7,30` | Loading pastoral; 128/176/224 px conforme breakpoint | Contain, animação `animate-logo-pulse`, sobre foto `/images/bg-app.png` + overlay escuro. Alt antigo; texto institucional separado abaixo da logo. |
| `src/components/pastor/PastorSidebar.tsx:23,79` | Pastor rail/sidebar; 36×36 contain em fundo branco | Título adjacente Painel do Pastor; fundo/contraste da arte deve funcionar nessa caixa. |
| `src/components/pastor/PastorMobileHeader.tsx:5,44` | Pastor mobile, somente início; 36×36 contain | Marca ao lado do primeiro nome do usuário; preservar título/destino. |
| `src/pages/PastorSociedade.tsx:27,147` | Loading da sociedade no pastor; 64×64 | **Sem object-contain** na classe atual; imagem oficial com proporção diferente do quadrado poderá ser esticada. Animação ativa. |
| `src/components/secretaria/SecretariaNavigation.tsx:4,26` | EBD rail/sidebar ≥700 | `secretaria-navigation.css:13` fixa 44×44 com padding3/fundo branco, **sem object-fit**; nova logo não quadrada poderá ser esticada. Texto IPNC/Secretaria EBD aparece ≥1100. Alt antigo. Professor/admin compartilham a marca sem alterar filtros de permissão. |
| `src/pages/PortalIgreja.tsx:21,76,159,324,434` | Portal: boas-vindas/retorno/identificação 96/96/80 px e sidebar44px | Os quatro usos têm contain. Sidebar com fundo branco/padding4. Portal é rota pública `/igreja`; preservar identificação e privacidade. |
| `src/pages/EleicaoApresentar.tsx:10,96` | Apresentação da eleição; altura40/56 e largura automática | Alt antigo. Arte larga pode disputar espaço com o título40–56 px; contêiner pai flex-wrap mas bloco marca+título interno é flex sem wrap. Não alterar resultados/anônimos/votos. |
| `src/components/membro/MembroLayout.tsx:7,67` | Layout do membro; 32×32 contain | Import ativo nesse arquivo, mas `/membro` atualmente monta `MemberAccessUnavailable`, **não MembroHome**; consumidor potencial/legado. Não reabrir acesso ao mudar logo. |
| `src/components/PWAInstallPrompt.tsx:6,33` | Modal global de instalação; 64×64 contain dentro de80×80 verde escuro | Alt antigo; título **“Tenha o Renovo na sua tela inicial”** na36 e instrução “no Renovo” na11. Modal montado globalmente em `src/App.tsx:88`, incluindo EBD/tesouraria. |
| `src/utils/generateCalendarPDF.ts:4,126` | PDF cronograma pastoral; 22×22 mm no cabeçalho | `addImage(...,'PNG',margin,5,22,22)` fixa quadrado. Nome institucional é texto separado em141. Tema anual RENOVO aparece em159. PDF via `PastorCalendario.tsx:206`. Import chamado logoBase64 é URL resolvida pelo Vite, não base64 inline. |
| `src/utils/generateEbdPDF.ts:5,120,449,699` | PDF diário/período/trimestre EBD; 20×20 mm | **Três cabeçalhos**; `addImage` fixa quadrado e os catch silenciam falha da logo. Texto institucional em140/460/710. Chamado em ChamadaTab e HistoricoTab. Conferir arte/aspect ratio/incorporação nos três relatórios. |

O scan de URLs/imagens, `data:image`, SVG e CSS não encontrou outra logo base64 embutida ou background-image de logo. `src/index.css:217,227` contém apenas a animação de pulse aplicada aos consumidores acima; não contém arte. `src/index.css:139` define `background-image:none`. CSSs de tema/fundação não trazem logo em `url(...)`.

## Consumidores indiretos / marcas não baseadas no master

| Arquivo / linha | Uso atual | Alcance / cuidado |
|---|---|---|
| `src/components/treasury/TreasuryDashboard.tsx:75` | Sidebar: `Church size25` dentro de `.tr-brand-icon` + IPNC / TESOURARIA | Marca da tesouraria montada com ícone genérico; `.tr-brand-icon`44×48 em CSS25. Rail700–1099 esconde texto pela regra CSS253. Troca do master não afeta esse elemento. |
| `src/components/treasury/TreasuryDashboard.tsx:85` | Mobile: `Church size23` + IPNC / Tesouraria | CSS191 mostra esse bloco em mobile; texto “Tesouraria” oculto em telas menores pela regra199. Nome institucional separado em `.tr-church-name` e oculto em mobile. |
| `src/pages/Tesouraria.tsx:22` | Acesso bloqueado: título Tesouraria IPNC, sem logo | Se incluir marca, preservar a montagem do dialog/PIN e acesso atual; não é cópia antiga de bitmap. |
| `src/lib/treasury-report.ts:26,49,91` | Relatório tesouraria: IPNC no cabeçalho/rodapé; nome institucional na capa | **Não incorpora imagem de logo**; apenas texto e formas/cores. Não há imagem antiga escondida para substituir; inclusão da logo seria uma escolha visual adicional, com teste PDF isolado. |
| `src/pages/AguardandoPermissao.tsx:34–38` | Comentado “Logo”: ícone Church + IPNC + nome institucional | Arquivo existente **sem import/rota encontrado** em App/src; não demonstrado como tela atual. Não confundir com permissão/autorização a alterar. |
| `src/pages/Index.tsx:335,347` | IPNC decorativo no hero; UMP IPNC no resumo da diretoria | Texto/identificação da sociedade; não há logo bitmap ou desenho antigo. Não transformar referência UMP em outra sociedade. |
| `src/components/UpdateAvailableBanner.tsx:65` | Texto “Uma atualização do Renovo está pronta...” | Atualizar identidade textual junto ao modal/manifest se o nome do produto deixar de ser Renovo. |
| `src/components/auth/SocietySelector.tsx:169`, `src/pages/Auth.tsx:587,640` | Church como ícone semântico do portal/acesso do pastor | Ícone de opção de acesso, **não marca principal**. Não exige troca universal de ícones. |

`Secretaria.tsx` usa o shell `SecretariaNavigation` tanto no contexto professor (727–800) quanto admin (806–881); não tem outro import/img de logo. `SecretariaWorkspace`, `ProfileSelect` e `TreasuryAccessDialog` não possuem imagem de marca duplicada. `Igreja.tsx`, `Urna.tsx` e `Secretaria2.tsx` não existem na revisão; a rota pública é PortalIgreja e a votação pública é VotePublic. VotePublic não importa/logo global diretamente; fotos de candidatos são dados próprios e não identidade.

## Head, manifest e instalação

| Arquivo / linhas | Identidade atual | Observação |
|---|---|---|
| `index.html:9,16,22` | title, apple-mobile-web-app-title e og:title: Renovo IPNC | Nomes visíveis em aba/instalação/prévia de compartilhamento. |
| `index.html:17–19,25,28` | Apple touch, favicon PNG, manifest, OG/Twitter apontam a URLs estáveis | Favicon `.ico` permanece fallback independente; testar ambos, além de eventual cache próprio de metadados/launcher. |
| `index.html:20` | Preload global `/images/bg-app.png` com fetchpriority high | Na revisão atual Auth não usa o background; ainda existe no loading pastoral. Preload não é logo. |
| `public/manifest.json:2–4` | name Renovo IPNC, short_name IPNC, description institucional | Troca de nome/logo deve preservar a identidade instalada `id:'/'`, `start_url:'/'`, `scope:'/'` e display standalone. Não criar uma segunda aplicação por trocar id/scope. |
| `public/manifest.json:11–28` | Ícones192/512 any e512 maskable | Dimensões declaradas batem com arquivos atuais. As três imagens precisam derivar da mesma arte oficial; o maskable atual é transparente e idêntico ao any. |
| `public/manifest.json:7–8`, `index.html:12` | background_color/theme_color pretos | Cores do splash/browser não se atualizam automaticamente ao substituir bitmap; decidir com a nova identidade, mantendo contrato PWA. |
| `src/lib/pwaInstall.ts`, `src/hooks/usePWAInstall.ts`, `src/components/layout/InstallButton.tsx`, `HeaderActions.tsx` | Controlador/entradas de instalação compartilhados; sem arquivo próprio de logo | O modal global já centraliza a imagem. Preservar prompt nativo, cancelamento, instruções manuais e standalone. |

## Cache, service worker e builds

1. **`public/sw.js:1` e `src/lib/registerSW.ts:4` duplicam a versão** `ump-cache-v9`; registro na linha3 usa `/sw.js?v=2026-09-26-v9`. Para uma mudança efetiva de identidade estática, versões/cache precisam ser coerentes. `__BUILD_TIME__` do Vite atualiza carimbo, mas **não** modifica automaticamente essas constantes.
2. **`public/sw.js:2–5` precacheia os três ícones por endereços fixos.** `fetch` em65–75 retorna primeiro `caches.match(request)` sem revalidar. `/favicon.ico` e `/images/bg-app.png` também entram na classificação de imagem, embora não no precache. Um novo build com os mesmos nomes/cache não garante que clientes antigos recebam bytes novos.
3. Alterar só os PNGs não muda o script SW: a atualização periódica poderá não detectar worker diferente. Alterar apenas nome do cache no worker sem ajustar `CURRENT_CACHE` em registerSW cria limpeza incoerente.
4. O registro usa `updateViaCache:'none'` e verifica o worker ao iniciar, a cada 5 min e ao voltar à aba (`registerSW.ts:138–151`). Worker novo fica esperando; `SKIP_WAITING` é ativado pelo fluxo de atualização. Não apagar caches alheios ou interceptar auth/API/navegação durante a troca.
5. **`src/lib/refresh-site.ts:8–9` preserva cache e registro por intenção.** Atualização manual obtém HTML no-store e ativa waiting worker quando há um. Com worker/cache inalterado, clicar Atualizar não invalida todos os ícones antigos.
6. Em localhost/127.0.0.1/iframe o registro é removido/cache limpo (`registerSW.ts:118–131`); por isso validação exclusivamente local não prova atualização de ícone em instalação existente. O inventário não operou ambiente publicado.
7. `index.html:5–7` tem metatags no-cache, mas não são headers HTTP dos PNGs/manifest. `worker/index.ts:7` delega a `env.ASSETS.fetch`; `wrangler.jsonc` define assets SPA sem cabeçalhos personalizados. Nenhum arquivo `_headers` ou regra de Cache-Control runtime foi encontrado. Não afirmar a política real da CDN sem conferir resposta publicada.
8. O master importado ganha URL de conteúdo no build: `dist/client/assets/logo-ipnc-D_n7CSNm.png` tem hash SHA256 igual ao source. Após substituir o master e rebuild, o Vite produzirá outro nome; imagens públicas continuam com nome estável. `dist/client/favicon.ico`, três `dist/client/icons/*.png` e `dist/client/images/bg-app.png` são **cópias byte a byte** dos arquivos antigos inventariados acima. Rebuild deve gerar o pacote validado; não editar dist à mão nem publicar esse build antigo.
9. Cache de launcher/favicons/social previews pode existir fora do SW. Conferir instalação nova e aplicativo já instalado, preservando id/start_url/scope; não presumir atualização de ícones de todos os sistemas pela simples troca de manifest.

## Histórico, documentação e arquivos fora do runtime

- `README.md:1` ainda diz “Renovo IPNC”; `.github/workflows/check-ebd-deployment.yml:1` também. São nomes de documentação/CI, não cópias de bitmap. `docs/treasury/README.md` identifica o projeto externo; não renomear identificadores de serviço como parte da arte.
- `docs/desempenho-pwa.md:53–55` é registro histórico e já não corresponde integralmente ao Auth atual (documenta vídeo/background que Auth não monta mais). Não usar o texto antigo como evidência runtime atual.
- `Relatorio_Financeiro_2026.pdf` é PDF histórico rastreado de 5 páginas, 16.011 bytes, SHA256 `66afa5a8685f0c2dbe911b6bed6e10e4fa6042430089ca5dd42180770791d63c`; **0 imagens incorporadas** conforme pypdf. Não é master nem consumidor da geração atual; conteúdo histórico não precisa ser reescrito.
- `docs/design/secretaria-ebd-v1/mockup.png` (1.198.398bytes, SHA256 `9269f1518ac5a46bd2a7a278fe0c97628e9b1e41196c1088a0c3c7a2d936186c`) é prancha histórica, não importada no app.
- Oito capturas em `docs/auditoria-responsividade/evidencias/` são evidência datada, não assets runtime: chamada-antes-390, chamada-pendente-390, chamada-incerta-final-390, chamada-confirmada-final-390, ebd-modal-paisagem, eleicao-candidatos-390, eleicao-resultado-final-390, tesouraria-formulario-final-390. Não modificar evidência antiga para simular marca nova.
- “Tema 2026: RENOVO — Isaías40.31” em `PastorCalendario.tsx:389` e `generateCalendarPDF.ts:159` é **tema anual**; decisão de retirar “Renovo” do nome do aplicativo não autoriza apagar automaticamente o tema do calendário.
- Nome institucional aparece como conteúdo legítimo fora da logo (títulos do acesso, descrição do manifest, PDF, sociedade/configuração). A orientação símbolo+IPNC sem nome por extenso caracteriza a **arte**, não exige remover o nome da igreja de todo conteúdo.

## Verificações executadas e contrato de testes

Executado com Node24.19.0 do runtime configurado, sem gravações reais:

```sh
/Users/octavioribeiroleite/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --experimental-strip-types --test tests/pwa-install.test.mjs
```

**11 testes passaram, 0 falhas.** Cobrem convite manual sem abertura automática, cancelamento/aceitação/appinstalled, falha de prompt, doubleclick, standalone/iOS, iPad/webview, teardown, identidade do manifest e dimensões PNG, isolamento do SW de auth/API/navigation e remoção somente de caches da aplicação.

Também executado `tests/refresh-site.test.mjs`: **5 testes passaram, 0 falhas**. Cobrem offline/erro HTTP sem navegação, preservação de rota/parâmetros/fragmento, ativação de waiting worker sem apagar cache e falha de worker com navegação online.

**Atenção ao contrato existente antes de bump de versão:** `tests/pwa-install.test.mjs:112` fornece explicitamente caches `['ump-cache-v8','ump-cache-v9','another-app']` e a assertiva em115 espera excluir apenas v8. Se o cache mudar para v10, o fixture/expectativa de versão deve ser ajustado para representar versão corrente e antigas, mantendo a garantia de não apagar `another-app`. Este inventário não alterou o teste.

Os testes atuais **não validam visualmente a arte nem que PDFs incorporem a logo**. `tests/ebd-pdf-snapshot.test.mjs:20` injeta `logoBase64:''` e os catch permitem PDF sem imagem; protege snapshot/conteúdo confirmado, não marca. `tests/treasury-report.test.mjs` testa totais/paginação/anexos, não possui logo atual a trocar. Para a implementação: usar arte oficial em geração isolada, conferir 3 PDFs EBD + cronograma, aspect ratio/contraste em headers28–72 px, sidebar/rail, favicon e máscara da instalação; não usar movimentos/votos/dados reais.

## Lista mínima de acompanhamento para a raiz

1. Obter/exportar os bytes oficiais do Canva antes de modificar qualquer master; manter a arte fiel, sem desenhos aproximados/generativos.
2. Substituir master e derivar ícones 192/512/maskable/favicon da mesma fonte aprovada; variantes apenas com recorte/escala/fundo autorizado, respeitando alpha/área segura.
3. Conferir os 16 consumidores e textos Renovo fora do bitmap; inserir a marca oficial nos dois brand slots da tesouraria se a uniformização fizer parte da mudança.
4. Ajustar contain/aspect ratio em SecretariaNavigation, PastorSociedade e 4 cabeçalhos PDF, além de largura máxima na apresentação caso a nova arte seja horizontal.
5. Revisar versão/cache/register/testfixture de PWA de modo coerente; preservar id/scope/start_url, política de não interceptar dados/auth e fluxo de instalação.
6. Rebuild/validar o pacote gerado e testar ícones no publicado após deploy, incluindo cliente já instalado; o build dist antigo não serve como resultado da mudança.

Fim do inventário. Nenhuma mudança de aplicação, commit, push, operação de Canva/Sites/browser ou deploy foi realizada por este agente.
