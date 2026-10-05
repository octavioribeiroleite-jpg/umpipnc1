# Tesouraria: recebimento, confirmação e prestação de contas

Implementação de 05/10/2026. As migrations de confirmação/conferência e leitura pública foram aplicadas no Supabase em 05/10. A interface integra a entrega na `main`; a publicação só está concluída quando o Sites confirma `succeeded` para a revisão enviada. A configuração descrita no README de 28/09 é histórica, com lançamentos diretos de administrador.

## Regras implementadas

- A conta de um tesoureiro é vinculada explicitamente pelo administrador a uma ou mais sociedades em **Acesso dos tesoureiros**. Informar “tesoureiro” como cargo no PIN da diretoria não concede permissão. A conta precisa existir e ter perfil ativo.
- O tesoureiro envia apenas entradas da sociedade vinculada. Elas entram como **Aguardando confirmação**. Não pode alterar, confirmar, rejeitar, lançar saída, anexar arquivos ou conceder acesso.
- O administrador vê todas as pendências. Em **Conferir / ajustar**, corrige os dados e confirma ou devolve, informando o motivo. Registra também saídas. Toda criação e alteração deixa trilha de auditoria com ator e registros anterior/novo. Não há exclusão financeira.
- Somente confirmados entram em cards, gráficos, extrato, saldo acumulado e PDFs. Pendentes/devolvidos aparecem em lista separada, acessível ao administrador e ao responsável da sociedade.
- Preservada a decisão anterior: a consulta pública mostra os movimentos confirmados de todas as sociedades. A observação da conferência também é pública depois de confirmar; o formulário informa isso. Referências bancárias, comprovantes, auditoria e permissões são privados.
- Uma tentativa de gravação mantém o UUID, e edição compara a revisão. Reenvio de uma operação confirmada não produz uma segunda movimentação; uma tentativa com dados diferentes não é silenciosamente aceita.

## Pix dividido e reserva

Informe o valor total recebido uma única vez. Exemplo exclusivamente ilustrativo: Pix de R$ 100,00 = camisa R$ 60,00 + mensalidade **sem per capita** R$ 30,00 + per capita R$ 10,00. A soma deve ser menor ou igual ao total; o restante é “outros”. As partes não são novas receitas.

Após confirmação: saldo R$ 100,00, reserva R$ 10,00, disponível R$ 90,00. A reserva só diminui quando uma saída confirmada informa a parcela utilizada de per capita. A soma da reserva não pode ficar negativa. Não foi inventado percentual de per capita nem taxa por sociedade.

Em **Conferência bancária**, o administrador cadastra um crédito/débito com referência única (E2E do Pix ou identificação da transação), data, direção e valor. A referência é normalizada em maiúsculas e sem espaços. A mesma referência não pode ser duplicada. Movimentos de igual data/valor também geram aviso de possível repetição, sem bloquear pagamentos legítimos diferentes.

O administrador pode corrigir a conferência, com revisão e auditoria. O valor não pode ficar abaixo do total já confirmado; referência e direção só podem mudar depois de desvincular os lançamentos. Correções concorrentes não sobrescrevem uma revisão mais recente.

Pix e transferência só podem ser confirmados com vínculo bancário. A soma confirmada vinculada a um crédito/débito nunca pode superar seu valor. Isso também permite repartir um crédito entre sociedades. Locks no banco serializam a conferência; conferência parcial mostra quanto falta vincular. Dinheiro e saldo inicial exigem justificativa; saldo inicial só pode ser entrada.

Não há importação automática da conta bancária, nem baixa automática das tabelas antigas de camisas/mensalidades. O novo livro não soma os registros antigos novamente. A conferência depende de usar a referência real do banco; valores coincidentes, sozinhos, não comprovam duplicidade.

## PDFs e comprovantes

O modelo visual segue `Relatorio_Financeiro_2026.pdf` do repositório: capa verde/dourada, resumo, detalhamento e espaço para conferência. Os indicadores foram adaptados ao livro confirmado, sem inventar adimplência ou cobranças.

- **Relatório PDF:** ano e sociedade, saldo anterior, entradas/saídas confirmadas, fechamento, reserva, disponível, resumo mensal e extrato completo.
- **Prestação anual com anexos:** acrescenta índice, identificação do lançamento e cópias integrais dos comprovantes. PDFs com várias páginas e imagens PNG/JPG são incorporados ao documento; não depende de URLs que expiram.
- Um anexo faltante, corrompido ou protegido por senha impede finalizar a prestação. O erro é apresentado; nenhum PDF incompleto é baixado silenciosamente.
- Dados do relatório vêm de uma única consulta/snapshot, incluindo saldo anterior ao ano. Não dependem da página atual do extrato nem do limite de mil linhas do cliente.
- Arquivos ficam no bucket privado `treasury-receipts`, com limite de 10 MB e tipos PDF/PNG/JPG. Administrador anexa após salvar o lançamento, reabrindo sua conferência. Tesoureiro acessa somente anexos de movimentos confirmados da própria sociedade.
- Um comprovante incorreto pode ser arquivado pelo administrador e reativado depois. O arquivo e o histórico são preservados; enquanto arquivado, fica fora da prestação anual e do acesso do tesoureiro.

## Ativação

1. No projeto IPNC `xhhfgnkpgtnzlvpvqjpl`, já foram aplicadas `20261005140755_treasury_approval_reconciliation.sql` e `20261005140907_treasury_public_read_policy.sql`. Os nomes locais correspondem ao histórico remoto. Requerem a migration pública de 28/09 e os helpers administrativos existentes. Não reaplicar migrations nem o histórico inteiro em banco vazio.
2. A migration preserva registros anteriores como confirmados. Novos registros passam a pendentes por padrão. Não cria credenciais, tesoureiros, lançamentos de exemplo ou vínculos presumidos. O bucket é novo e privado; buckets existentes não mudam.
3. Publicar a interface atualizada pelo fluxo existente, entrar com administrador e vincular as contas reais em **Acesso dos tesoureiros**.
4. Executar os roteiros abaixo em ambiente de homologação antes de usar lançamentos reais. A versão antiga do teste SQL de 28/09 é histórica e não representa o fluxo novo.

## Testes automatizados

Node >=22.13, dependências instaladas pelo `package-lock.json`:

```sh
npm ci
npx tsc -p tsconfig.app.json --noEmit
node --experimental-strip-types --test tests/*.mjs tests/*.ts
npx eslint src/hooks/useTreasury.ts src/hooks/useTreasuryWorkflow.ts src/lib/treasury*.ts src/pages/Tesouraria.tsx src/components/treasury
npm run build
```

`tests/treasury-database.test.mjs` executa as migrations em PostgreSQL isolado via PGlite. Os schemas Auth/Storage e papéis são criados exclusivamente no processo de teste; a autorização básica reproduz perfil ativo + papel verificado. Não utiliza nem altera o Supabase real. As regras específicas do portal PIN continuam nos helpers existentes, consultados no projeto real.

Cobertura: anônimo, tesoureiro, sociedade alheia, visualizador, administrador inativo, criação pendente, tentativas de autoaprovação/saída/concessão de acesso, confirmação, reserva, divisão de Pix, referência duplicada, correção bancária, saldo versus extrato, mais de mil registros, saldo anterior, revisão obsoleta, auditoria, privacidade e arquivamento/reativação de arquivos. O teste local usa uma conexão; stress concorrente entre sessões remotas permanece parte da homologação.

`tests/treasury-report.test.mjs` gera PDFs de teste em `tmp/pdfs/`, verifica transporte de todas as páginas dos anexos, imagens, falhas explícitas e paginação de 1.005 lançamentos. Os dados são fictícios e jamais são enviados ao banco. `tests/treasury-render.test.mjs` também verifica as ações e os valores disponíveis para cada interface.

## Prévia isolada da interface

```sh
npm run build
node scripts/treasury-ui-preview.mjs --serve
```

Abrir `http://127.0.0.1:8081/`. O aviso amarelo identifica os **dados fictícios**. A prévia monta os componentes reais com hooks de teste e permite alternar Tesoureiro/Administrador/Visitante. Não conecta ao Supabase, não salva finanças e não substitui o teste de integração autenticada. A geração de PDFs dessa prévia fica desabilitada; ela é exercitada nos testes automatizados.

## Verificação manual em homologação

1. Abrir `/tesouraria` sem login: somente confirmados, nenhuma ação de escrita, nenhuma pendência/anexo/referência bancária.
2. Como administrador, vincular uma conta ativa à UMP. Entrar com essa conta: caixa UMP abre por padrão. A ação é **Registrar recebimento**, sem opção de saída ou confirmação. Tentar escrita direta na SAF deve ser recusado pelo banco.
3. Enviar um recebimento de teste de R$ 100,00 com composição 60/30/10. Confirmar que aparece na lista de pendências e que saldo/extrato permanecem inalterados. Reenviar o mesmo UUID não pode criar outro registro.
4. Administrador registra o crédito de R$ 100,00, abre a pendência, vincula e confirma. Esperado: entrada 100, saldo 100, reserva 10, disponível 90. Mesmo Pix confirmado novamente não soma mais 100. Uma alocação que exceda o crédito é recusada.
5. Conferir devolução com motivo, correção de data/valor, saída e utilização da reserva. Dois administradores editando a mesma revisão: o segundo recebe conflito, salvo reenvio exato da mesma operação já salva. Em duas sessões, tentar exceder o mesmo crédito simultaneamente: apenas o valor disponível pode ser confirmado.
6. Anexar PDF com várias páginas, PNG/JPG e testar arquivo acima de 10 MB. Arquivar/reativar um anexo e conferir sua saída/retorno na prestação anual. Tesoureiro da UMP pode baixar comprovante confirmado ativo da UMP, mas não da SAF. Visitante não acessa arquivos. Revogar vínculo/desativar perfil deve bloquear novas escritas e relatórios.
7. Baixar relatório de cada sociedade e consolidado administrativo. Conferir saldo anterior + entradas − saídas = fechamento. Comparar com extrato sem filtros até 31/12. Prestação anual deve conter cada comprovante na íntegra. Simular falha de um arquivo: exibir erro e não baixar relatório parcial.
8. Conferir 375, 390, 768, 1024 e 1440 px: números sem corte, ausência de rolagem horizontal da página, menus, campos de data/valor, modal com rolagem, foco/teclado, mensagens de erro, nova tentativa e download. Testar também zoom 200%.

## Validação desta entrega

- Após integrar as atualizações de EBD e PWA já existentes no Sites, **110 testes automatizados passaram** e os tipos foram aprovados. O gerador de PDF da tesouraria é carregado sob demanda. O processo de publicação executa novamente o build da revisão final.
- PDFs de teste renderizados e páginas principais inspecionadas.
- Conferidas as policies reais dos buckets existentes: limitadas a `receipts`/`election-photos`; não dão acesso ao novo bucket.
- A entrada pública e o acesso Finanças foram conferidos no navegador local. Os roteiros de escrita com contas reais e concorrência entre sessões continuam sendo validação de homologação; não foram criadas credenciais ou movimentações fictícias em produção.
- As duas migrations foram aplicadas. A consulta pública de saldo/extrato foi validada sob o papel `anon`, com o helper administrativo permanecendo restrito. Banco sem lançamentos, quatro sociedades, bucket privado e relatório vedado ao anônimo. O teste isolado reproduz também os grants restritos do helper real.
- O verificador de segurança não apontou novos achados na primeira migration. Existem avisos anteriores sobre funções públicas e proteção contra senhas vazadas desabilitada; eles não foram introduzidos por este módulo. Consulte o [verificador de segurança](https://supabase.com/docs/guides/database/database-linter) e a [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
