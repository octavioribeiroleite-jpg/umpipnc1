# Secretaria EBD — acesso e retorno à Home

Validação em 06/10/2026. Referências fornecidas pelo proprietário: “Tela de Acesso da Secretaria EBD.png” e “Tela de Acesso da Secretaria EBD (1).png”.

## Entrega

Seleção de perfil com logo institucional centralizada, fundo claro com curvas e folhas decorativas, cadeado, cards brancos alinhados e rodapé com livro/lema. Dois cards lado a lado no computador e empilhados no celular/tablet. O CSS é exclusivo de `.ebd-access`; nenhum handler de autenticação, sessão, PIN, backend ou permissão mudou. A logo `src/assets/logo-ipnc.png` foi preservada.

A nova instrução do proprietário foi atendida no componente compartilhado `PublicHomeButton`: texto explícito **“Voltar para a Home”**. Todos os PINs de acesso o utilizam: Diretoria (inclusive acesso posterior a sociedades/Pastor), Secretaria administrador/professor e renovação de acesso, Tesouraria sociedade/administrador. Senha administrativa e redefinição também utilizam o componente. As telas de configuração de novos PINs permanecem como estavam. Rotas/callbacks e bloqueio durante envio foram preservados.

PWA: worker versionado `/sw.js?v=2026-10-06-ebd-access-v7`, cache `ump-cache-v15`; limpeza dos caches antigos coberta pelo teste existente. Identidade e ícones do PWA preservados.

## Validação visual e interação

Fixture existente da EBD, com dados fictícios e transporte substituído: `http://127.0.0.1:4175/tests/fixtures/ebd-back.html?entry=1`. Esse HTML de teste não é entrada de produção. As capturas de página inteira podem incluir os controles de teste abaixo da aplicação.

- 320, 390, 768, 1024 e 1440 px: sem rolagem horizontal; cards alinhados. Medidas registradas em `measurements.json` (a barra de rolagem ocupa 15 px neste navegador).
- 320 px com fonte de 200%: cards refluem e todo conteúdo continua acessível pela rolagem vertical; ausência de overflow horizontal conferida após os ajustes.
- Tab/Enter: foco visível; Administrador abre seu PIN; retorno à seleção funciona.
- Professor abre PIN da sala; nenhum PIN foi digitado nem validado.
- Ambos os PINs exibem “Voltar para a Home” e retornam a `/auth?home=1`.
- Revisão independente confirmou todas as utilizações do botão e isolamento dos estilos.
- Contraste do texto principal: 12,49:1; descrições: 5,45:1 sobre branco. Rodapé: 6,42:1 no fundo principal. Ícones/linhas decorativos ocultos de leitores de tela; animações desativadas em preferência por movimento reduzido.
- Console da fixture: avisos já existentes do React Router v7; nenhum erro da nova tela.

## Verificações de código

Tipos, lint pertinente, 245 testes e build de produção passaram. O build mantém os avisos existentes de tamanho dos chunks e import dinâmico/estático de `sonner`. `git diff --check` passou. A publicação usa o build final do helper Sites, e seu resultado/status e a conferência da página pública são registrados na entrega da conversa.

Não foi realizado login real ou alteração de dados para validar esta entrega.
