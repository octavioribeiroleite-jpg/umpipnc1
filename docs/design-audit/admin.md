# Configurações e usuários — auditoria implementada

Data: 28/09/2026. Segunda etapa delegada da auditoria visual do IPNC; somente `src/pages/Configuracoes.tsx` e `src/pages/Usuarios.tsx`. Tokens, layouts e componentes compartilhados são tratados pela coordenação. `BulkLoginDialog` pertence ao conjunto financeiro e não foi editado por esta etapa.

## Achados e alterações

| Antes, evidenciado pela fonte | Implementação local |
|---|---|
| Tabelas em containers com `overflow-x-auto` sem nome de região/foco ou indicação da rolagem; nomes/e-mails sem proteção específica. | Região nomeada e focável com borda e foco visível; aviso para deslizar; largura mínima de tabela de 720px e nomes/e-mails com quebra, sem suprimir colunas. O scroll é do container externo, com o wrapper interno do Table liberado, evitando duas áreas concorrentes. |
| PINs da diretoria em linhas de ícone/nome/input, nome sem quebra e largura variável. | Grade com nome fluido, campo inteiro embaixo no celular e terceira coluna no desktop; rótulos associados aos PINs geral, pastor e de cada sociedade. |
| Cards móveis de usuários tinham nome e quatro ações de 28px na mesma linha. | Nome e login têm toda a largura; ações em linha própria com quebra e 44px, rótulos acessíveis; badges de 12px. |
| Formulários criar/editar usuário tinham labels sem associação; filtro de sociedade só com placeholder. | Labels com IDs para nome, login, senha, sociedade e cargo; filtros com rótulos persistentes; valores e eventos intactos. |
| Botão copiar todos perdia texto no celular; ação flutuante sem nome acessível; resultado de senha em linha rígida. | Texto de ação mantido no celular, FAB nomeado, senha com quebra e ação copiar identificada; modais com altura limitada e rolagem. |
| Configurações gerais e cabeçalhos sem reflow, badge pendente pulsando. | Linhas/cabeçalhos podem quebrar, switch associado ao label, valor com teclado decimal, pendência estática sem animação contínua. |

## Cobertura na fonte

| Página | Seções, estados e operações inspecionados |
|---|---|
| Configurações | Geral (organização/igreja), financeiro (valor/comprovante), Google Calendar, gestão admin (carregando/vazio/pendentes/aprovados/própria conta), aprovação/cargo/recusa/exclusão e confirmações; PINs Secretaria admin/professor; PIN geral/pastor/sociedades, carregamento/salvando/validação. |
| Usuários | Gate admin/autenticação carregando; diretoria agrupada por sociedade/Geral (tabs desktop/seletor mobile), cards/tabela/vazio; membros por sociedade (ativo/inativo/sem login), copiar/criar login/redefinir senha, bulk dialog existente; novo usuário, editar, remover e resultado de senha; loading e feedback existentes. |

Permissões, conteúdo de credenciais por papel e handlers não foram modificados. Não foi criada, editada, copiada, removida ou redefinida credencial real. Funcionalidades já incompletas na fonte de Configurações — campos gerais com `defaultValue` sem persistência explícita e botão Conectar sem handler — foram preservadas, não transformadas em novas integrações nesta auditoria visual.

## Verificações

- Typecheck completo após ambas as etapas: apenas os dois erros anteriores da cópia `Secretaria 2.tsx`; sem erros novos.
- ESLint em Configurações: **0 erros/avisos**, antes e depois. Usuários: **10 erros/1 aviso anteriores**, mesmos resultados depois; **zero achados novos**.
- AST comparado com cópia anterior: chamadas de API e handlers de ambos os arquivos preservados, incluídos na conferência dos 24 arquivos do conjunto.
- `git diff --check`: aprovado.
- Sem execução real de ações administrativas ou publicação; browser e build integrado centralizados na coordenação.

Inspeção estática concluída; renderização alterada em 375, 390, 768, 1024 e 1440px e teste de teclado/rolagem/foco com sessão autorizada permanecem a validar. Não confundir código implementado com versão publicada.
