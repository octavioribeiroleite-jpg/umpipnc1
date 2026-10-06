# Retorno à entrada pública após pausa longa

Entrega de 05/10/2026. A entrada pública é `/auth?home=1`; `/` continua sendo o dashboard autenticado.

## Comportamento

- Após **30 minutos ou mais** fechado ou em segundo plano, o aplicativo volta à seleção dos quatro acessos. Pausas mais curtas mantêm a tela atual.
- A primeira abertura de um PWA instalado após esta atualização também começa na entrada pública, pois versões anteriores não registravam o horário de fechamento.
- A navegação não apaga sessões, identidades, permissões ou dados. A opção explícita `home=1` evita somente o redirecionamento automático da entrada para uma sessão EBD salva.
- Diretoria, Secretaria, tesouraria e redefinição de senha oferecem **Voltar ao início**. O formulário fecha e os campos locais de senha/PIN são descartados. Os controles ficam desabilitados durante envio para preservar as operações existentes.
- Links recém-abertos de recuperação de senha, votação e apresentação eleitoral conservam seu destino na inicialização. Uma retomada longa de uma página já aberta retorna à entrada.

## Implementação

`app-resume-home.ts` registra `visibilitychange`, `pagehide` e `pageshow`, consumindo uma pausa somente uma vez. Um heartbeat de um minuto registra a última atividade em primeiro plano para cobrir encerramento do processo móvel sem evento final. Uso contínuo com a página visível não expira por inatividade de toque.

O PWA standalone, inclusive iOS, usa a chave exclusiva `ipnc_app_lifecycle_v1` em localStorage; abas comuns usam sessionStorage para não compartilhar o ciclo de navegação. Armazenamento indisponível mantém a contagem em memória enquanto a página existir. Horário inválido, relógio regressivo ou conteúdo corrompido não causam ciclos de redirecionamento.

`app-resume-navigation.ts` altera a rota antes da montagem no reinício. Na retomada de uma página suspensa, abre uma entrada nova com `location.replace`, descartando o estado local do formulário. A restauração de rota do service worker acontece antes desta decisão. O cache passa a `ump-cache-v13`, e a URL de registro recebe versão própria para distribuir o frontend atualizado.

Não houve alteração de Supabase, backend, PINs, RLS ou regras de negócio. Nenhuma operação financeira, voto ou mensagem real foi executada na validação.

## Verificações automatizadas

Com Node.js 24, todos aprovados:

- `npx tsc -p tsconfig.app.json --noEmit`
- `node --experimental-strip-types --test tests/*.mjs tests/*.ts`: **245 testes**, zero falhas.
- `npm run build`: aprovado. Permanecem avisos anteriores de Browserslist, chunks grandes e importação dinâmica/estática de Sonner.
- ESLint dos novos módulos, PinPad, PublicHomeButton, popup financeiro, ResetPassword e testes/fixture alterados: zero erros.
- Auth e Secretaria mantêm, respectivamente, 1 e 13 ocorrências anteriores de `no-explicit-any`; comparação com a base `7e663144` não encontrou novas ocorrências.
- `git diff --check`: aprovado.

Os testes novos exercitam o controlador real com relógio e eventos determinísticos: início frio, retomada, limite exato, pausas curtas, heartbeat, bfcache/eventos duplicados, entrada oculta, falha de armazenamento e parada. A integração usa os módulos reais em VM e verifica isolamento por aba, iOS/standalone, destinos de links e preservação das chaves de sessão. O teste de teclado transpila o PinPad real e verifica que Enter no botão Home não envia o PIN.

## Conferência visual e funcional

Capturas em `evidence/` usam somente as fixtures isoladas e identidades fictícias. A fixture da Diretoria bloqueia transporte remoto e escrita de rede; a da EBD substitui autenticação/dados. Não publicar os pontos de entrada das fixtures.

Conferidos no navegador:

- PIN da Diretoria em 320, 390, 768, 1024 e 1440 px: botão acessível e sem rolagem horizontal; medidas em `pin-home-geometry.json`.
- PIN em 320 px com fonte base de 200%: cabeçalho quebra em linhas e Home permanece dentro do card. É emulação CSS de fonte ampliada, não zoom nativo.
- Diretoria com PIN parcial e admin com senha fictícia: Home retorna à seleção e reabrir não conserva a senha digitada.
- Tesouraria: PIN de sociedade e senha administrativa retornam à seleção; popup fecha após sua transição.
- Secretaria: perfil Professor, PIN e Home retornam à entrada sem submeter autenticação.
- Redefinição de senha: Home disponível em viewport móvel.
- Entrada explícita com sessão EBD fictícia salva: permanece na seleção. A entrada sem `home=1` ainda retorna à Secretaria, comprovando que a sessão não foi apagada.

Não foi realizado um fechamento físico de 30 minutos de Android/iOS nesta entrega. Os cenários de suspensão e encerramento de processo foram verificados pelos testes determinísticos; as capturas comprovam a interface, não o comportamento do sistema operacional.

## Passos manuais no aparelho

1. Atualizar o aplicativo e abrir uma tela interna com dados de teste. Fechar por menos de 30 minutos e conferir que a tela é retomada.
2. Fechar ou deixar em segundo plano por pelo menos 30 minutos. Reabrir e conferir os quatro acessos da entrada, inclusive quando existir uma sessão EBD válida.
3. Abrir cada tela de senha/PIN, digitar parcialmente sem enviar e tocar **Voltar ao início**. Conferir a seleção e os campos vazios ao reabrir.
4. Abrir um link válido de recuperação ou eleição em uma nova abertura. Conferir o destino específico do link.
5. Repetir em Android e iOS instalados, e no navegador. Ampliar a fonte e conferir acesso ao botão com rolagem vertical quando necessária.
