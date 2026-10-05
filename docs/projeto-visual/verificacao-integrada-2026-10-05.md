# Verificação integrada — 05/10/2026

Executada nas fixtures locais isoladas da diretoria, EBD e tesouraria. Autenticação, RPCs e documentos são fictícios; nenhum voto, presença, PIN real, mensagem ou lançamento financeiro foi gravado em produção.

## Verificação automatizada

- Node.js 24, npm e `package-lock.json` existentes.
- `npx tsc -p tsconfig.app.json --noEmit`: aprovado.
- `node --experimental-strip-types --test tests/*.mjs tests/*.ts`: **223 testes aprovados**, zero falhas, cancelamentos ou testes ignorados.
- `npm run build`: aprovado. Avisos existentes de tamanho de bundles não impedem a geração.
- `git diff --check`: aprovado.
- ESLint completo: dívida existente, **278 erros e 55 avisos**, contra 308 erros e 66 avisos da base. Comparação por arquivo/regra/mensagem/severidade encontrou **zero diagnósticos adicionados**. Não corresponde a aprovação global do lint.

## Conferência no navegador

As medidas atuais estão em [2026-10-05-geometria-final.json](2026-10-05-geometria-final.json). Registros de defeitos anteriores à correção estão explicitamente marcados e relacionados ao novo resultado. Viewports de 320, 390, 700, 768, 1024, 1100 e 1440 px foram usados em telas representativas; fonte de 200% foi simulada pela fixture. A largura útil pode ser menor em 15 px por causa da barra de rolagem.

- Reunião: Registro A enviado, texto B digitado durante a resposta, alternância para Pauta e retorno preservam B. Rascunhos de pauta/ata permanecem ao alternar seções e redimensionar; cancelar ata restaura o texto confirmado.
- Plenária: anotações preservadas ao alternar chamada e mudar largura; quórum mostra o cálculo existente. Sem gravação de presença real.
- EBD: nova turma mantém seus campos ao redimensionar o diálogo; cancelamento não cria turma. Histórico por turma usa dados do fechamento e mantém aluno transferido/inativo no relatório.
- Secretaria com falha na leitura da conta principal: sessão EBD válida continua abrindo o painel do professor. Sessão EBD expirada exige novamente o PIN; o bloqueio da área principal permanece.
- Tesouraria: formulário de sociedade mantém valor, data, pessoa, descrição e Pix/dinheiro. Pendência fictícia de R$ 200 não entra no saldo de R$ 0. Administrador possui navegação para ferramentas e conferência mostra Total R$ 200, Vinculado R$ 0 e Disponível R$ 200.
- PIN fictício: confirmação diferente mostra erro; confirmação igual retorna acesso ativo e ações Trocar/Desativar. Desativação abre confirmação; cancelamento preserva acesso. Sidebar desktop conserva 232 px; cards mobile continuam em duas colunas, com sigla e saldo.
- Comprovante: rejeição fictícia mostra o motivo; documento privado fictício abre com proporção 4:3, metadados e link. Nenhum documento real foi acessado.
- Votação pública: falha retornada mantém seleção e confirmação; repetição fictícia confirma o voto. O controle do identificador de tentativa é coberto pelos testes automatizados.
- Portal público: confirmação de identidade fictícia, navegação mobile e sidebar desktop de 224 px. Não concede acesso administrativo.
- Recuperação de senha: sessão fictícia válida mostra os campos; link inválido mostra retorno à entrada. Rota inexistente usa retorno adequado ao perfil; portal de membros continua fechado.
- Calendário pastoral com nome extenso, viewport de 320 px e fonte de 200%: overflow corrigido e nova medição confirma largura útil/rolagem de 305/305 px.

## Roteiro manual após publicação

1. Abrir o site e usar “Atualizar para última versão” se o PWA avisar. Conferir entrada e Secretaria com um acesso autorizado, sem registrar presenças.
2. No celular, visitar diretoria, reunião, finanças e tesouraria; conferir nomes completos, rolagem de tabelas localizada e navegação inferior.
3. Digitar um rascunho em reunião, alternar seções e largura e conferir sua preservação; cancelar sem enviar mensagens ou processar IA.
4. Conferir filtros de período/turma no histórico EBD e gerar PDF somente para um período autorizado. Confirmar que o relatório coincide com a consulta.
5. Na tesouraria, conferir extrato confirmado e pendências separados, permissões da sociedade e relatório PDF. Testes de gravação, voto e PIN devem continuar nas fixtures.

## Limites

Navegador emulado não comprova funcionamento em aparelhos físicos, Safari, teclado virtual ou zoom nativo. Cenários de escrita e falha foram isolados; a conferência de publicação não deve ser interpretada como teste de todas as contas reais. A rotina diária existente continua ativa às 9h de São Paulo. Este documento registra validação; a confirmação do deploy e da revisão está na resposta de entrega.
