# Tema automático — QA isolada em 06/10/2026

Conferência do App real em Chrome com dados fictícios, na fixture exclusiva `127.0.0.1:8086`. Nenhuma conta, PIN, API ou movimentação real foi usada. O tema do computador permaneceu intacto: claro/escuro e viewport foram emulados pelos comandos CDP documentados. A configuração original de 8083 permaneceu intacta.

## Evidências e resultado

88 pares JPG/JSON registram imagens, cores calculadas, meta `theme-color`, marca, amostras de contraste e largura do documento: 85 conferências e três estados anteriores à correção. O índice está em [summary.json](./summary.json), e a base `0fa8e98` mais a impressão digital final das fontes produtivas conferidas estão em [source-revision.json](./source-revision.json). A pasta `baseline` comprova que a preferência escura inicialmente não ativava `.dark` e mantinha Home e PIN claros.

| Superfície real | Dimensões e estados conferidos |
| --- | --- |
| Home/Auth | 375, 390, 768, 1024 e 1440; troca ao vivo e reload escuro |
| Sociedade e Diretoria PIN | 390; seleção, seis posições, erro fictício e retorno à Home |
| Conta administrativa | 390; campos, foco e usuário digitado preservado na troca |
| EBD administrador/professor | 390; perfis, PIN, nome e Home com 8 alunos/2 turmas ou 5 alunos/1 turma |
| EBD PIN normal preenchido | 375×740/390×844; administrador e Professor, seis dígitos, ambos os temas e safe areas 44/34 |
| EBD renovação de acesso | 375×740/390×844; vazio, seis dígitos, loading e PIN incorreto reais; erro sintético de três linhas com seis dígitos; ambos os temas e safe areas 44/34 |
| EBD dados/menu/modal | 390/1440; lista e tabela de alunos; menu; Nova turma em 768/1440 |
| Diretoria | 768/1440; dashboard, navegação e alerta de sugestão fictícia |
| Tesouraria | 390/768/1440; dashboard, extrato, pendência e banco; formulário de lançamento 390/1440; acesso PIN/conta em 390 |
| Pastor | 768/1440; calendário, cards e navegação ativa |
| Portal | 390/768/1440; confirmação de visitante fictício e conteúdo real em 390/1440 |
| Abertura web pendente | 390; boot real da rota `/` em claro e escuro, indicador ativo e raiz inert |

As capturas finais não apresentam overflow horizontal. As amostras de texto escuro sobre fundos sólidos, habilitadas e visíveis, ficaram acima de 4,5:1. O cálculo usa cores sRGB calculadas e composição de fundos dos ancestrais; não certifica toda a aplicação, imagens, gradientes ou todos os estados possíveis. A coleta aguarda 350 ms para terminar transições CSS, evitando medir cores intermediárias.

A troca preservou dois dígitos já preenchidos no PIN, o usuário fictício no formulário, a rota e os dados exibidos. O reload abriu a Home já escura. Logo oficial e imagens das sociedades mantiveram os assets e as cores, sem inversão. O boot escuro pendente apresentou `rgb(13,18,16)`, `data-opening-state=loading`, raiz inert e o marcador real de loading; em claro apresentou `#f7fbf8`.

Dois problemas encontrados foram corrigidos e reconferidos: o chrome do dashboard desktop usava a cor clara do bloco da logo (`#f9faf3`) e passou a representar a superfície central (`#0d211a`); a opção ativa do Pastor passou de 1,50:1 para 10,70:1. O estado anterior foi preservado em `findings`. No modal da Tesouraria, foco e rolagem mantiveram `theme-color=#060807`, e o fechamento restaurou `#161d1a`.

Há amostras claras preexistentes abaixo de 4,5:1 (cabeçalhos EBD 4,47:1, selo “Hoje!” da Diretoria 3,74:1 e carimbo da sidebar pastoral 2,48:1). Não são novos problemas do modo escuro nem foram apresentados como aprovação integral WCAG do modo claro.

## Ajuste final do PIN EBD

A entrada normal com seis dígitos tinha documento de 926 px e botão Confirmar terminando em 848 px, ultrapassando as áreas seguras de 375×740 e 390×844. As capturas `ebd-entry-before-filled-*` preservam esse achado. Após a escala restrita à EBD, o documento mede exatamente 740/844 px nos dois tamanhos, sem rolagem; logo, seis posições, 12 teclas e Confirmar permanecem visíveis. Os títulos são “Secretaria EBD” e “Secretaria EBD · Professor”. A escala padrão da Diretoria permanece intacta; o novo seletor de entrada exige `.ebd-theme`.

| Renovação real — claro e escuro | Altura em 375×740 | Altura em 390×844 |
| --- | --- | --- |
| Vazio | 516,58 px | 573,18 px |
| Seis dígitos ou Verificando | 566,58 px | 625,18 px |
| PIN incorreto e seis dígitos | 592,77 px | 651,38 px |
| Erro sintético com três linhas e seis dígitos, título Professor | 629,16 px | 687,77 px |

As 28 medições finais de geometria não encontraram controles fora dos insets sintéticos de 44 px no topo e 34 px na base. A renovação manteve `scrollHeight=clientHeight` em todos os estados; as teclas e Confirmar medem pelo menos 44 px. O erro de PIN real é transitório: foi capturado imediatamente antes do reset de 500 ms. O stress usa `errorMessage` fictício persistente no PinPad e Dialog produtivos, com texto medido em três linhas (54,59 px / 18,2 px); não altera nem simula o resultado do handler produtivo. “Voltar para a Home” aparece completo e seu clique abriu a Home real, tanto na renovação quanto no Professor.

Evidências principais de 375×740: [entrada preenchida](./ebd-entry-filled-dark-375x740-safe.jpg), [Professor preenchido](./ebd-professor-entry-filled-dark-375x740-safe.jpg), [renovação preenchida](./ebd-reauth-filled-dark-375x740-safe.jpg), [stress de três linhas](./ebd-reauth-stress-three-lines-filled-dark-375x740-safe.jpg). Os JSON `*-geometry` registram posições e limites, incluindo as versões claras.

## Reprodução e isolamento

Execute Vite com `tests/vite.system-theme.config.ts`, porta exclusiva 8086. Essa configuração lê o `index.html` produtivo a cada requisição e substitui apenas o ponto de entrada, conservando CSS crítico, preload da logo e script precoce. O controller real `startSystemTheme()` roda antes do render. A fixture monta o App real inteiro e substitui somente identidades/transportes por mocks.

Rotas úteis: `/auth?role=anonymous&home=1`, `/?role=admin`, `/secretaria?role=anonymous&edge=20&auth=20&read=20&realtime=20`, `/tesouraria?role=admin`, `/tesouraria?role=anonymous&treasury=locked`, `/pastor?role=pastor`, `/igreja?role=anonymous&portal=return`, `/?role=anonymous&state=loading`. Para renovação natural, use `/secretaria?role=anonymous&mode=stored-admin&reauth=1&edge=3000&auth=20&read=20&realtime=20&safe=1`; o bootstrap expira apenas a metadata da sessão fictícia e o timer produtivo abre o modal. Para stress, use `/secretaria?role=anonymous&pinStress=1&safe=1`. PIN EBD/Tesouraria: `123456`, exclusivamente fictício; `000000` produz erro EBD. PIN Diretoria vem da fixture anterior, igualmente fictício. Não usar dados reais.

Clientes de Supabase, inclusive imports relativos, são substituídos pelo resolver. CSP e bootstrap bloqueiam origem externa, escritas de rede e caminhos reais de backend; Service Worker fica bloqueado. A fixture Tesouraria rejeita todas as mutações financeiras e uploads; seus dados passam pelos decodificadores produtivos. Novo teste `tests/system-theme-fixture.test.mjs` passou; lint da fixture e build isolado em `dist/fixtures/system-theme` passaram. O build produtivo não foi sobrescrito por esta QA; checks completos pertencem à entrega coordenada pelo agente principal.

## Limites

Emulação de Chrome e insets CSS fictícios não representam instalação/reabertura física ou notch real no iOS/Android. Splash nativo Android e barra do sistema operacional não foram fisicamente conferidos. As cores estáticas do manifest continuam distintas do tema HTML dinâmico; `theme-color` do documento não prova mudança do splash nativo. Não houve alteração de preferência do OS, dados, permissões, rotas ou autenticação nesta fixture.
