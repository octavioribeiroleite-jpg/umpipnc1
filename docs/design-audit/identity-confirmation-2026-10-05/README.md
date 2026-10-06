# Confirmação de identidade IPNC — 05/10/2026

A confirmação de nome salvo da diretoria e do membro agora segue a referência enviada “Confirmação de Identidade IPNC.png”: página clara com decoração sutil, card central, ícone de identidade, nome em destaque, cargo/sigla e duas ações alinhadas. Voltar fica fora do card. A logo é a nova arte enviada pelo proprietário, documentada em `docs/branding/2026-10-05/approved-v4/README.md`.

## Implementação e preservação

`src/components/auth/IdentityConfirmation.tsx` substitui os dois blocos visuais duplicados em Auth. Os mesmos callbacks continuam responsáveis por confirmar, trocar pessoa e voltar. O carregamento de membro mantém as duas ações desabilitadas e ganha anúncio de status. A classe `auth-page-identity` só se aplica à confirmação de nome salvo; PIN, identificação inicial, administrativo e entrada mantêm seus fluxos.

Nome e cargo vêm do estado existente, nunca do mockup. A região recebe um título acessível; o foco inicial anuncia a identidade sem rolar para o meio de nomes longos. A página começa no topo. Ícones são decorativos, botões têm foco visível, e o card cresce quando o texto precisa de espaço. Em celular estreito os botões podem empilhar; nas demais larguras mantêm colunas iguais.

O trecho completo de interfaces, estado, hooks, handlers, sessões e requests anterior a `renderContent` permanece byte idêntico ao baseline `de090a8`, conforme `evidence/handler-preservation.json`. Nenhuma mudança no backend, PIN, permissões, sessões ou dados.

## Validação

- Fluxo real montado com backend fictício: PIN sintático, escolha UMP, confirmação de nome salvo, Não sou eu e retorno à seleção.
- Larguras 320, 375, 390, 768, 1024 e 1440 px, nome extenso, sem rolagem horizontal. Card até 760 px, logo proporcional e transparente, ações de mesma largura quando lado a lado.
- Fonte 200% e nome muito extenso em 320/768 px; na abertura fresca a 320 px o foco permanece no título com `scrollY=0`, e Voltar continua visível.
- A fixture `__identity` verifica os três callbacks de apresentação e o estado de membro em espera; usa somente textos fictícios e não emite autenticação ou requests.
- Tipos, 224 testes existentes, build e diff check aprovados. Lint do componente e fixture sem erros; Auth mantém um `no-explicit-any` preexistente, fora da mudança.

As capturas/medidas ficam em `evidence/`. As fixtures bloqueiam transportes reais e não comprovam login real ou validade de PIN. Não houve acesso a contas reais para esta validação.

## Verificação manual

1. Em homologação, usar uma identidade de teste previamente salva, abrir Diretoria, validar PIN e escolher sua sociedade.
2. Conferir nome/cargo/sigla, Voltar fora do card e as duas ações. Não sou eu deve abrir identificação; Voltar deve retornar à seleção; Sim, sou eu deve executar a mesma entrada existente.
3. Conferir membro salvo no ambiente de homologação, incluindo espera e falha, sem alterar identidades reais.
4. Conferir celular 320/390, tablet 768 e desktop 1440, nomes extensos e fonte 200%; todas as ações devem continuar acessíveis com rolagem vertical quando necessária.
