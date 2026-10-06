# Prévia isolada da aplicação IPNC

Esta fixture monta componentes reais com **autenticação e backend substituídos**. Não usa Supabase, não envia mensagens, não chama IA externa e não grava votos, pessoas ou valores reais. Não valida RLS, autenticação, autorização de APIs, permissões financeiras, concorrência remota ou validade de PIN. Não publicar este ponto de entrada.

## Iniciar

Na raiz do worktree, com Node >=22.13 e dependências do lockfile:

```sh
node node_modules/vite/bin/vite.js --config tests/vite.diretoria.config.ts --port 8083
```

Abrir `http://127.0.0.1:8083/__diretoria/`. `strictPort` evita mudar a porta silenciosamente. O servidor usa apenas loopback e separa o armazenamento local das outras prévias pelas portas. Não lê chaves `VITE_` para configurar clientes reais. As navegações HTML fora de `/__diretoria` redirecionam para a fixture; EBD e tesouraria mostram um aviso de prévia separada.

`bootstrap.ts` instala o bloqueio de transportes **antes** de importar as páginas. A configuração troca todos os três clientes Supabase por `backend.ts`, inclui CSP que bloqueia origens externas e responde 403 para REST/Auth/Functions/Storage e `sw.js`. O bootstrap recusa fetch/XHR externo, escritas de rede, WebSocket/EventSource externo e beacon. Só requisições GET/HEAD de assets locais e HMR da porta 8083 alcançam os transportes nativos. Imagens eleitorais são um SVG local explicitamente fictício.

## Papéis e cenários

Os parâmetros são capturados uma vez na inicialização; a navegação interna preserva o papel e cenário até um reload. O painel QA permite trocá-los com recarga. `controls=0` remove o painel da captura para não cobrir controles da aplicação; o título do documento continua identificando TESTE LOCAL.

| Parâmetro | Valores e efeito |
| --- | --- |
| `role` | `admin` (padrão), `pastor`, `diretoria`, `unauthorized` (visualizador sem gestão), `anonymous` (sem usuário). Apenas o contexto React é simulado. |
| `state` | `normal`, `empty`, `error`, `long`, `loading`. Empty conserva diretórios/identidade/settings/eleição, mas esvazia listas operacionais. Error retorna falha fictícia nas consultas/funções. Loading mantém consultas pendentes e o contexto em loading. Long amplia conteúdo e a lista/fotos eleitorais. |
| `delay` | Espera artificial de 0 a 10.000 ms por consulta/mutação simulada. Não representa medição de produção. |
| `processed=1` | Pré-preenche reunião processada, ata, WhatsApp, contribuição revelada e sete categorias de resumo. `state=long` também ativa esse estado com textos longos. Não executa IA. |
| `recovery=invalid` | `ResetPassword` recebe sessão nula. Com `role=anonymous`, sessão também é nula. |
| `auth=deny` | Falha deliberada nas funções de login. Sem a flag, qualquer PIN sintático é aceito pelo stub da diretoria: não é teste de PIN correto. |
| `identity=return` | Semeia nome/função fictícios para a confirmação da diretoria UMP no armazenamento desta origem local. |
| `portal=new` / `portal=return` | Limpa somente a identidade de visitante desta fixture ou semeia a confirmação de visitante fictício. O cadastro e `register_portal_visit` são simulados. |
| `election` | `open`, `draft`, `finished`, `missing`. VotePublic usa open por padrão; demais rotas usam draft. Finished libera o resultado fictício com oito votos de amostra em memória. |
| `result=hidden` | Mantém resultado fictício oculto mesmo em finished, permitindo inspecionar contador final 8 e falha de leitura sem mostrar apuração. |
| `kind=camisa` | Exibe modelos de camisa na eleição, em lugar de cargos. |
| `mode=urna&token=fixture-urna` | Simula dispositivo autorizado. Outro token mostra inválido; não há validação criptográfica real. |
| `voted=1` | Simula já ter votado. |
| `controls=0` | Oculta o painel QA para inspeção/captura sem sobreposição. Com controles visíveis, Leitura normal/Simular falha alteram só o mock; Disparar refetch local emite callbacks registrados na página, sem recarga. |
| `font=200` | Emulação por CSS de fonte base a 200%; não representa zoom nativo do browser. |
| `ebd-session=1` / `ebd-session=0` | Semeia ou remove somente a sessão EBD fictícia da origem local para conferir o redirecionamento de Auth. Nenhuma sessão real é emitida. |
| `home=1` | Solicita a entrada pública, mesmo com sessão EBD fictícia salva. O aplicativo normaliza a URL durante a navegação; as flags da fixture já foram capturadas na inicialização. |

Não informe credenciais reais. Toda identidade, chave PIX, token e imagem desta fixture é fictícia. As mutações existentes alteram somente objetos em memória, perdidos no reload. O stub de banco não aplica todas as operações de filtro/ordenação, joins, unicidade ou autorização. O endpoint de voto permite observar seleção/confirmação/sucesso; sua deduplicação em memória não comprova voto único no banco.

## URLs úteis

Todos os exemplos começam em `http://127.0.0.1:8083`:

- `/__diretoria/auth?role=anonymous` — entrada real, incluindo CSS e enhancers de identificação/sociedade.
- `/__diretoria/auth?role=anonymous&identity=return` — após PIN e sociedade, confirmação de identidade sintética.
- `/__diretoria/__identity?role=anonymous&controls=0` — componente de confirmação isolado; callbacks apenas mostram qual ação foi recebida, sem autenticar. `state=long&font=200` exercita nome muito extenso e fonte ampliada; `identity-role=member&identity-loading=1` mostra a espera com ações desabilitadas.
- `/__diretoria/reset-password?role=admin` e `&recovery=invalid` — formulário ou link inválido.
- `/__diretoria/pastor?role=pastor` — dashboard pastoral; `&state=error` ou `&state=long`.
- `/__diretoria/pastor/sociedade/ump?role=pastor` — detalhe e resumo IA estático, sem chamada paga.
- `/__diretoria/pastor/calendario?role=pastor` e `/__diretoria/pastor/comunicados?role=pastor`.
- `/__diretoria/pastor/sugestoes?role=pastor`, `/__diretoria/pastor-sugestoes?role=diretoria`, `/__diretoria/sugestoes?role=admin`.
- `/__diretoria/igreja?portal=new` ou `?portal=return` — identificação/retorno e Início, Programações, Avisos, Dízimos.
- `/__diretoria/vote/election?state=long` — 18 candidatos com oito imagens locais por candidato.
- `/__diretoria/vote/election?mode=urna&token=fixture-urna&kind=camisa` — urna/modelos.
- `/__diretoria/vote/election?election=finished`, `?election=missing`, `?voted=1` — encerrada, inexistente e já votou.
- `/__diretoria/eleicao/election/apresentar?election=finished` — apresentação/resultado fictício.
- `/__diretoria/membro` — mesmo aviso de indisponibilidade; funcionalidade não liberada.
- `/__diretoria/reunioes/meeting?state=long` — reunião processada com conteúdo extenso para Registro/Resumo/Ata/WhatsApp; `?processed=1` mantém textos curtos.
- `/__diretoria/rota-inexistente` — componente real 404.

Rotas anteriores continuam disponíveis sob `/__diretoria`: `/`, `/reunioes`, `/reunioes/nova`, `/reunioes/meeting`, `/tarefas`, `/calendario`, `/financas`, `/camisas`, `/arquivos`, `/configuracoes`, `/usuarios`, `/plenarias`, `/plenarias/plenary`, `/comunicados`, `/eleicoes`, `/eleicoes/election`, `/dizimos`, `/visitantes`, `/estudos`, `/aniversariantes`. A fixture ainda não monta o wrapper `FinancialRoute`, portanto não prova sua guarda de acesso.

## Limitações e verificações desta extensão

- A tesouraria completa permanece na fixture separada existente de `scripts/treasury-ui-preview.mjs`; ela não foi alterada. O popup acessível em Auth usa um diretório sintético, mas seu login financeiro está desabilitado nesta prévia.
- EBD usa suas próprias configurações/fixtures; não há sessão EBD emitida nesta aplicação de revisão.
- Realtime é substituído por assinaturas locais: somente o botão de QA emite os callbacks `postgres_changes` registrados. Isso não simula entrega, reconexão, autorização ou consistência remota. Respostas de APIs, upload e AI são simulados. PDFs/anexos reais, downloads assinados, integração OAuth, service worker e PWA ativo não são validados aqui.
- Datas de eventos/aniversários seguem o dia local da execução para aparecer no calendário. Nome longo e quantidade grande de fotos são cenários sintéticos, não dados reais.
- O cenário erro pode revelar loading sem fim ou fallback inadequado de uma página real. O stub não adiciona uma tela de erro inexistente no produto.
- Arquivos executa filtros `ilike` simples, insensíveis a maiúsculas, com `%`/`_`, e o OR de `ilike` usado para imagens. Isso permite conferir busca positiva/sem resultado e tipo PDF/imagem; não simula collation PostgreSQL, escape avançado, OR arbitrário ou ordenação real.
- SSR/build/HTTP não comprovam layout, clique, foco ou leitor de tela. A validação de navegador desta extensão permanece com a coordenação.
- Em 05/10, build específico desta fixture e checagem TypeScript com os arquivos da fixture + declarações Vite aprovados; lint dos arquivos TS/TSX/config: zero erros e dois avisos Fast Refresh. `tests/diretoria-fixture.test.mjs` executa os transportes do bootstrap com spies: chamadas rejeitadas não chegam ao transporte nativo, e assets/HMR locais continuam permitidos. Após a extensão de refetch, três testes aprovados: bloqueio de transportes, falha/recuperação com eventos locais e busca por ilike/OR. Conferência HTTP local: páginas e módulos 200 com CSP; REST e SW 403.

## Reprodução de erro após consulta confirmada

Abrir `/__diretoria/financas?controls=1`, aguardar dados e expandir TESTE LOCAL. Selecionar **Simular falha de leitura** e **Disparar refetch local**. A página deve conservar os dados confirmados e indicar desatualização. Selecionar **Leitura normal** e **Tentar novamente** para recuperar. O contador informa quantos callbacks locais foram disparados. Páginas sem assinatura Realtime não são atualizadas por esse botão. Os dados semeados não são apagados pelo controle de falha; recarregar restaura o cenário da URL.

A rota `/__diretoria/__boundary` monta o `StableRefreshBoundary` real com formulário fictício e atualização manual para inspecionar clone/inert/IDs/rascunho. Não é rota do produto.
