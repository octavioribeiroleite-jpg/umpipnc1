# Manutenção diária IPNC — 07/10/2026

Base: `41642b51e304cd7532bd281e6dd9dd3cc8830b97`, versão 49. GitHub e fonte do Sites foram conferidos e coincidiam antes das alterações. O diretório de relatório antigo não rastreado do proprietário foi preservado. Testes usam apenas dados fictícios locais; consultas de produção retornam somente metadados e agregados.

## Correções

- **Contexto da IA de reuniões:** Diretoria envia apenas responsáveis ativos da sociedade e admin/Pastor ativos permitidos pelo guard. Nomes históricos são buscados apenas por vínculos da reunião. Administrador conserva alcance global; atribuições fora da lista são recusadas como responsáveis. [Reprodução e escopo](ai/README.md), [módulos locais exatos](ai/deploy-manifest.json).
- **PDF financeiro legado:** falha de URL ou imagem de comprovante interrompe a exportação e impede o download parcial anunciado como completo. Relatórios válidos, layout e links de PDFs foram preservados. [Regressões](finance/README.md).
- **CI:** quatro verificações responsivas usam Node 22. O workflow obsoleto que reescrevia a fonte foi aposentado, com permissão somente leitura e aviso manual. [Runtime e dependências](runtime/README.md).
- **Distribuição PWA:** cache v28 e registro versionado `2026-10-07-maintenance-v20`. Mantidos abertura na Home, fluxo de PIN, logo oficial e tema do sistema.

## Verificação coordenada

- Node 24, lockfile preservado, sem instalar dependências.
- Tipos `npx tsc -p tsconfig.app.json --noEmit`: aprovado.
- Suíte `node --experimental-strip-types --test tests/*.mjs tests/*.ts`: **473/473 aprovados**; sem falha, cancelamento ou caso pulado.
- IA: sete regressões finais passam; contra a cópia implantada anterior, seis falham e o controle de autorização passa. Os 21 testes focais incluem esses sete e não devem ser somados à suíte completa.
- PDF: cinco regressões falham antes e passam depois, exigindo rejeição e zero downloads; três casos válidos passam antes/depois. jsPDF real e objetos de imagem são conferidos.
- Lint endpoint/helper IA e novos testes limpo. O gerador PDF e RelatoriosTab mantêm, respectivamente, um e dois erros anteriores; comparação por regra/mensagem não encontrou erro novo. Dívida global anterior permanece documentada.
- Sete YAML foram parseados; permissões/triggers/versões e aposentadoria sem escrita foram conferidos. Diff limpo.
- A produção deve ser construída do commit final pelo helper do Sites. O pacote externo da automação registra build, revisão, versão e status reais após a publicação; este arquivo não usa prévia ou push como prova de deploy.

## Leitura de produção e limites

Janela dos logs: 06/10/2026 13:40:36 UTC até 07/10/2026 13:40:36 UTC. Sites: zero eventos de erro. Serviços Supabase consultados: nenhum HTTP 5xx/fatal no filtro; treze denegações `42501` no RPC de sessão EBD e dois cancelamentos `57014` em catálogo foram registrados. Três refresh tokens ausentes e respostas negativas do PIN aparecem no recorte; não se inferiu defeito de usuário sem reprodução. Zero invocações da IA de processamento de reunião nessa janela não prova ausência histórica de envio.

57 tabelas públicas com RLS. A tesouraria mantém as migrations, 22 funções iguais aos corpos locais finais, guards/auditoria, grants e bucket privado conforme contrato. O livro novo estava vazio; agregados sem violações não substituem testes com dados reais ou concorrência. Consultas legadas sem paginação e relatório em consultas separadas permanecem residuais sem truncamento atual confirmado.

Advisors Supabase conservam os avisos anteriores. Audit de dependências: 19 pacotes afetados, zero crítico, nenhum GHSA novo em relação à revisão anterior; não é audit limpo. Scan do bundle da versão 49 não identificou segredo privado ou sourcemap. Não foi aplicada atualização de banco ou mudança de RLS/permissões.

A QA visual imediatamente anterior abrangeu 400 combinações, cinco larguras e temas claro/escuro; este ajuste não altera a composição. A revisão diária não repetiu todos os gestos de cada rota. Não foram usadas contas protegidas reais nem executados modelo, presença, voto, lançamento financeiro, upload ou mensagem real. Auth HTTP completo, concorrência PostgreSQL entre sessões, instalação/offline em dispositivo físico, retenção do provedor de IA, magic bytes de uploads e restauro de backup não foram certificados.

Site existente: https://renovo-ipnc.octavioribeiroleite.chatgpt.site, público atual preservado. Correções autorizadas pela manutenção diária e entrega de `AGENTS.md`; a certificação integral continua limitada pelas evidências descritas acima.

