# Secretaria: falha do acesso principal bloqueava a EBD

## Diagnóstico

A mensagem enviada pelo proprietário pertence ao `AuthProvider`, não à validação do PIN da EBD. O provider substituía todos os filhos ao falhar a consulta da conta principal. Como envolve o roteador inteiro, impedia também a montagem da Secretaria, embora ela use outro cliente, armazenamento e autorização.

O gatilho da consulta principal naquele telefone não foi identificado pela imagem. Consultas de logs entre 18:00 e 18:27 UTC não retornaram mensagem de erro de Postgres/PostgREST que o estabelecesse. Não é correto atribuí-lo exclusivamente à conexão ou à migração que protege chamadas finalizadas.

## Correção

- Falhas da conta principal continuam impedindo a montagem das páginas protegidas da Diretoria/Pastor, inclusive seus leitores de dados.
- Secretaria e Tesouraria mantêm suas próprias validações de sessão; entrada, recuperação e rotas públicas explicitamente enumeradas podem montar sem autorização da conta principal. Correspondência limitada à rota completa, sem liberação genérica por prefixo.
- A recuperação permite voltar à seleção de acesso, sem exigir apagar a sessão independente da EBD.
- Consultas principais mantêm o limite de cinco segundos com `AbortController` e limpeza do timer. Não dependem de `AbortSignal.timeout`, indisponível em navegadores móveis antigos.
- PINs, papéis, RLS, livros financeiros e guarda de chamada finalizada não foram alterados. Nenhuma migração ou operação de banco foi necessária.

## Verificação

Tipos e build de produção aprovados. Suíte completa: 201 testes aprovados, incluindo seis novos testes de isolamento de acesso e limite de consulta. Novos arquivos de produção sem erros de lint; o contexto mantém seus dois avisos anteriores.

No navegador, usando exclusivamente a fixture local e identidades fictícias:

1. Falha da consulta principal + EBD de professor válida: Secretaria montou, validou sua sessão e exibiu somente a turma autorizada. Sem a mensagem global de falha nem overflow horizontal no viewport móvel medido de 420 px.
2. Mesma falha + rota principal: conteúdo protegido não montou; apareceu o bloqueio da Diretoria. “Voltar à entrada” abriu a entrada da fixture.
3. EBD expirada + falha principal: a Secretaria exigiu novamente o PIN em “Confirmar acesso”. Nenhuma presença, visitante, credencial ou outro dado real foi escrito.

Reprodução isolada: iniciar Vite com `tests/vite.ebd.config.ts`, porta 8092, e abrir `/tests/fixtures/ebd-back.html?principal=failed&role=professor`. Acrescentar `principalRoute=protected` para conferir o bloqueio principal; acrescentar `ebd=expired` para conferir a renovação da EBD. A fixture nunca é a configuração publicada.

No aparelho do usuário, atualizar o aplicativo e abrir `/secretaria`. Um PIN expirado ou desativado continua exigindo nova confirmação. Essa validação em aparelho físico não é substituída pelo navegador de teste.

O restante do projeto visual continua acompanhado no README desta pasta; este incidente não representa conclusão das 61 pranchas.
