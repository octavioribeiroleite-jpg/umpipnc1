# Tesouraria da Igreja Presbiteriana de Nova Carapina

> **Acesso atual:** o proprietário substituiu a consulta pública por PIN de cada sociedade, configurado no painel administrativo. Consulte [WORKFLOW.md](WORKFLOW.md). O histórico abaixo não descreve as permissões atuais.

> **Atualização de 05/10/2026:** o fluxo de tesoureiros por sociedade, confirmação administrativa, conferência bancária, reserva de per capita e PDFs está implementado. As migrations foram aplicadas no Supabase em 05/10; consulte [WORKFLOW.md](WORKFLOW.md) para regras, testes e configuração de acesso. O texto abaixo documenta o estado histórico de 28/09/2026.

## Entrega e estado da ativação

O módulo está implementado na rota **`/tesouraria`** do Aplicativo IPNC. Há acesso
na tela inicial de entrada e no menu do aplicativo. A consulta não exige login;
o tesoureiro usa o usuário e a senha administrativos já existentes, dentro da
própria página. Somente contas `admin` com perfil ativo podem escrever.

**Banco configurado e validado; interface ainda não publicada.** A estrutura foi
aplicada ao projeto Renovo IPNC `xhhfgnkpgtnzlvpvqjpl` pelo conector Supabase em
28/09/2026. O arquivo `schema.sql` contém a cópia para revisão. O teste SQL completo
também foi executado e terminou com rollback. Restam quatro sociedades e zero
lançamentos; nenhuma pessoa, sociedade ou movimentação de teste ficou gravada.
O cliente está integrado às RPCs reais. Ainda falta testar essa integração no
navegador, com autenticação e formulários, e publicar a interface.

`preview.html` é uma prévia estática gerada do componente e do CSS reais, com
aviso visível de que não está conectada ao banco. Não salva dados e não substitui
o teste interativo. Abra o arquivo diretamente no navegador, sem servidor.
O estado vazio ilustra a organização da tela; não é uma consulta financeira.

## Comportamento

- UMP, SAF, UPH e UPA são cadastradas pelo SQL apenas com nomes e cores, sem
  lançamentos. O administrador pode acrescentar outras sociedades.
- Cards mostram o saldo por sociedade. Selecionar um card abre seu extrato e
  mantém a seleção na URL (`?sociedade=<uuid>`), inclusive ao recarregar.
- O resumo diferencia o saldo histórico das entradas e saídas do mês. Os
  gráficos mostram seis meses e a comparação dos saldos. Ausência de registros
  resulta em estados vazios, sem curvas ou porcentagens inventadas.
- Lançamentos pedem sociedade, entrada/saída, valor, data, pessoa e descrição.
  O saldo inicial, quando conhecido, pode ser lançado como entrada identificada
  como “Saldo inicial”. Não existe integração automática com banco.
- Busca, tipo e intervalo de datas filtram o extrato. A paginação usa 20 linhas.
  Se uma correção esvaziar a última página, a consulta retorna a uma página válida.
- Valores são inteiros em centavos; totais e saldos acumulados são calculados
  pelo PostgreSQL sobre todo o histórico, antes de filtrar ou paginar. O limite
  de linhas do PostgREST não interfere na soma. O cliente rejeita números fora
  do limite de representação segura, sem arredondá-los silenciosamente.
- Toda nova tentativa do mesmo formulário conserva o UUID. Uma resposta perdida
  não duplica a gravação: o reenvio confere todos os campos da linha existente.
  Alterar os dados após uma falha ambígua causa conflito explícito. Edições usam
  a revisão original e não sobrescrevem silenciosamente uma correção concorrente.
- Não há exclusão de lançamentos. Correções são feitas por edição autenticada.
  Datas futuras são recusadas; o banco usa o fuso de São Paulo como referência.

## Separação e permissões

`treasury_funds` e `treasury_entries` são independentes das tabelas financeiras
anteriores. Nenhuma consulta do novo módulo lê dízimos, comprovantes, mensalidades,
contas bancárias ou dados privados existentes. A leitura pública é intencional
e inclui nome da pessoa e descrição de cada novo lançamento, conforme solicitado.
O formulário informa essa visibilidade antes de salvar.

As duas novas tabelas têm RLS e concessões explícitas por operação/coluna. `anon`
só recebe leitura. `authenticated` recebe inserção/atualização limitadas pela
função existente `ipnc_private.actor_has_role('admin')`, que também exige perfil
ativo. Papéis de diretoria, pastor ou visualizador não bastam. Metadados editáveis
pelo usuário não concedem poderes administrativos. DELETE/TRUNCATE não são
concedidos ao cliente. As duas RPCs de consulta são `SECURITY INVOKER` com
`search_path` vazio; os metadados de revisão e ordenação são controlados no banco.

## Banco aplicado e etapas de publicação

1. O acesso ao Supabase IPNC **`xhhfgnkpgtnzlvpvqjpl`** e a função
   `ipnc_private.actor_has_role(public.app_role)` foram confirmados diretamente.
   A função real exige perfil ativo e respeita as sessões internas. Não usar projetos
   VetSync ou Essência Capixaba. Não reaplicar as migrations históricas do
   aplicativo em um banco vazio (ver README principal).
2. A migration aditiva `20260928151725_public_treasury` já foi aplicada. O arquivo
   local em `supabase/migrations/` conserva o número gerado pela API e confirmado
   no histórico remoto. Não reaplicar `schema.sql` ao mesmo banco.
3. `20260928151821_verify_public_treasury` registrou a execução bem-sucedida das
   asserções do arquivo `verify.sql`. Essa execução criou fixtures dentro de uma
   transação, verificou os casos e terminou com `ROLLBACK`. O endpoint genérico
   de SQL desta conexão só permite leitura e não permite `SET ROLE`; por isso o
   teste que contém DDL temporário e alternância de papéis foi executado pelo
   mecanismo oficial de migrations, que possui a capacidade administrativa.
   Nenhuma proteção foi desativada. Para repetir em banco de teste compatível,
   usar o proprietário do banco com parada no primeiro erro:

   ```sh
   psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/treasury/verify.sql
   ```

   O script cria dados de teste apenas dentro de uma transação e termina com
   `ROLLBACK`. Inclui mais de mil movimentos, entradas/saídas, datas retroativas,
   desempate no mesmo dia, saldo antes dos filtros, paginação, ausência de login,
   bloqueio de escrita anônima/não administrativa/inativa, revisão e duplicação.
   **As asserções passaram nesta entrega; fixtures revertidas foram conferidas.**
4. Os advisors de segurança foram consultados e não apontaram as novas tabelas
   ou funções. Atualizar tipos gerados se desejado (o novo contrato TypeScript
   está isolado em `useTreasury.ts`). As variáveis públicas já existentes servem
   ao módulo; não criar senhas no código nem colocar service-role em `VITE_*`.
5. Abrir a prévia real `/tesouraria` e validar leitura sem login, login de admin,
   novo lançamento, edição, reenvio e bloqueio de escrita não autorizada. Conferir
   visualmente em 375, 390, 768, 1024 e 1440 px, inclusive modais, tabelas e teclado.
6. Publicar pelo fluxo Sites existente e repetir as verificações na URL publicada.
   Somente então compartilhar `<origem-publicada>/tesouraria` como consulta ativa.

## Verificações realizadas em 28/09/2026

- Build de produção do aplicativo aprovado (`dist/client`), sem iniciar servidor.
- **62/62 testes automatizados aprovados**: os existentes, 14 de regras de
  tesouraria e 8 de renderização. Incluem centavos, entradas/saídas, datas,
  filtros, paginação, erros, reenvio idempotente e submissões concorrentes.
- ESLint dos arquivos novos/alterados do módulo aprovado.
- Typecheck não apresenta erros no módulo. O projeto possui dois erros anteriores
  na cópia não rastreada `src/pages/Secretaria 2.tsx` (props `onAiSessionExpired`
  e `onCallStatusChange` ausentes). Essa cópia e as alterações alheias de
  secretaria/aniversariantes foram preservadas.
- **Testes SQL/RLS executados no banco real, em transação revertida**: leitura
  pública, escrita por administrador ativo, bloqueio de visitante anônimo,
  visualizador e admin inativo; permissões por coluna; ausência de DELETE;
  revisões; UUID duplicado; centavos; datas; saldo anterior aos filtros;
  paginação com 1.005 linhas. A leitura posterior confirmou RLS ativo, funções
  invoker, quatro caixas, zero lançamentos e zero usuários de teste remanescentes.
- Advisors não encontraram problemas nas novas tabelas/funções. Mantiveram
  avisos de objetos anteriores (`list_birthdays`, `register_portal_visit`,
  helpers e EBD) e configuração de senha vazada. A tesouraria não alterou esses
  objetos/configurações. Referências: [funções públicas privilegiadas](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
  [funções autenticadas privilegiadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
  e [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- A abertura do servidor local depende de uma aprovação nativa pendente. Não
  houve tentativa de contornar essa aprovação, alterar segurança ou abrir portas
  por outro mecanismo. A inspeção visual/interativa nos tamanhos acima permanece
  pendente. HTML estático e testes de renderização não equivalem a essa inspeção.

## Arquivos principais

`src/pages/Tesouraria.tsx` integra sessão, filtros, consultas e formulários.
`src/components/treasury/` contém dashboard, gráficos, formulários e estilos
escopados. `src/lib/treasury.ts` concentra contratos, validação e dinheiro.
`src/hooks/useTreasury.ts` concentra leitura, escrita e atualização do cache.
`schema.sql` e `verify.sql` preparam banco e validação isolada.

As versões aplicadas também estão registradas em
`supabase/migrations/20260928151725_public_treasury.sql` e
`supabase/migrations/20260928151821_verify_public_treasury.sql`.

Para reconstruir a prévia estática, executar `node scripts/render-treasury-preview.mjs`.
Os scripts usam as dependências já instaladas no projeto; o Node disponível nesta
máquina fica em `/Users/octavioribeiroleite/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`.
