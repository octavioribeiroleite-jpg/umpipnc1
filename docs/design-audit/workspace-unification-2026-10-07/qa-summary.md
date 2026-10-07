QA visual final — IPNC — 07/10/2026

Validado no Chrome em ambiente fictício bloqueado a backend real (preview8086). 400 combinações de tela/largura/tema, larguras375/390/768/1024/1440 e modos claro/escuro. Nenhum overflow horizontal de documento, nem erro de render final. Contagens: {"ebd-admin":80,"diretoria":160,"ebd-professor":30,"pastor":50,"tesouraria":20,"portal":40,"diretoria-header-final":20}.

Achados corrigidos e revalidados: alvos Planilha44px (checkbox desenho16); conclusão Tarefas44px (desenho20); cabeçalho móvel único Diretoria/Pastor; cancelar nascimento com nome acessível; rodapé Treasury com ícone e texto na mesma linha flex. Um TypeError transitório do sidebar durante implementação foi corrigido, e as15rotas internas da Diretoria passaram depois. Os casos anteriores continuam no matrix.json para rastreabilidade e não indicam defeito final.

Menus conta e Mais Diretoria/EBD/Pastor abertos/fechados; ações sair/atualizar/instalar não executadas. Atualização EBD móvel está no Popover de notificações. Recolher/expandir sidebar EBD preserva navegação. PIN EBD fullscreen em390x844 com teclas48px, sem rolagem de documento e sem modal aninhado, em ambos temas; Back nativo após1dígito volta à seleção pública.

Formulários: editar tarefa, editar turma e nascimento inline em390/1440 e ambos temas, sem salvar, sem overflow horizontal/controle pequeno. Modal tarefa móvel tem scroll interno24px adequado à ficha; turma fica inteira. Cancelar modal e cancelar inline restauram conteúdo. Seleção local de aluno testada (checked e limpeza) sem atualização de backend.

Limites: protegidos reais/RLS/backend e escrita não testados; Android/iOS físico e PWA instalado/SW não testados. Foram verificados estados/geometria em400casos e visualmente screenshots representativas. Capturas finais selecionadas aguardaram transiçõesCSS, capturas antigas podem conter frame transitório. Dados/UI preservados sem operações financeiras, votos ou mensagens.

Captura recomendada desktop: /tmp/ipnc-global-visual-qa/ebd-admin-home-1440-light.png
Captura recomendada mobile: /tmp/ipnc-global-visual-qa/ebd-admin-home-390-light.png
Relatório estruturado e arquivos: qa-summary.json, matrix.json, modal-matrix.json, target-retests.json, task-target-retests.json, pin-smoke.json.
