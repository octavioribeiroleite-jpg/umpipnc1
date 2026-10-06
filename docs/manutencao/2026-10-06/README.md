# Manutenção diária IPNC — 06/10/2026

Base preservada e sincronizada no início: `113f1ab3dafad5f68808b6671a00040f232a6239`, tanto no GitHub quanto na fonte do Sites. Revisão autorizada pelo proprietário e `AGENTS.md`. Escritas de teste usam exclusivamente dados fictícios em ambientes isolados.

## Correções

- **EBD:** os 15 minutos de confirmação pertencem à criação da sessão Auth, vinculada a `session_id` e usuário. Outro login/refresh na conta compartilhada não reativa a sessão expirada. Login quente e sessões simultâneas válidas permanecem; Diretoria/Pastor mantêm seu contrato. [Reprodução e limites](ebd/README.md).
- **Turma desativada:** login do professor e capability de anúncio exigem turma e senha ativas. A negativa acontece antes de criar sessão, registrar acesso ou consumir geração de IA. Administrador e turma ativa preservados. [Regressões](ebd/inactive-class-access.md).
- **Tesouraria:** uma reserva futura não pode sustentar retirada retroativa. O guard verifica o acumulado por dia/sociedade sob os locks existentes, preservando recibos no mesmo dia e reserva anterior ao ano. Nenhum lançamento foi reescrito. A consulta agregada encontrou zero sociedades/dias com reserva negativa. [Evidência](treasury/README.md).
- **PWA:** convite de instalação acompanha o tema escuro com tokens de fundo/texto/borda/foco, mantendo o fluxo e a logo oficial. Cache atualizado de v22 para v23 e URL do Service Worker versionada, para distribuir o código novo. [13 pares de evidências](pwa-install/README.md).
- **Dependências:** jsPDF 4.2.1, React Router DOM 6.30.6, DOMPurify 3.4.16, fflate 0.8.3 e patches compatíveis no lockfile. Não foram executados scripts de instalação nem mudanças forçadas de major.

## Verificações finais

- **419/419 testes passaram**, sem falhas, cancelamentos ou testes pulados. Incluem banco isolado, autorização por perfil/sociedade/turma, expiração, revogação, fila/reconexão EBD, Pix dividido, reservas e geração de PDFs fictícios.
- Tipos: passou. Build de produção: passou. Lint dos arquivos alterados: passou. Diff: passou.
- O lint global continua falhando por dívida anterior: a base, executada com as mesmas regras atualizadas, tem 275 erros/55 avisos; a entrega tem 274 erros/55 avisos. Comparação por arquivo/regra/mensagem: nenhum erro acrescentado; removido um `no-explicit-any` na linha alterada do login EBD. A falha não foi escondida.
- Audit de dependências: 39 avisos (1 crítico) antes; 18 (zero críticos) depois — 10 altos, 7 moderados, 1 baixo. Restam avisos de toolchain e Router que exigem avaliação/atualização própria. O aplicativo usa SPA com BrowserRouter, sem hidratação SSR; não foi confirmada exploração dos avisos residuais. Não afirmar que o audit está limpo.
- Advisors Supabase repetidos após as duas migrations: mesmos avisos anteriores, nenhum novo. 57 tabelas públicas com RLS; isso não comprova todas as policies ou todos os fluxos.

O build conserva os avisos anteriores sobre tamanho de chunks e importação de `sonner` que não cria chunk independente. Não foi realizado redesign ou alteração de identidade.

## Banco e publicação

As migrations finais correspondem exatamente ao histórico nativo do Supabase:

| Versão | Correção | Corpo MD5 confirmado após aplicação |
| --- | --- | --- |
| 20261006162227 | treasury_reserve_timeline | dd49de51930be052a8abe1b96ee6656e |
| 20261006162230 | ebd_auth_session_expiry | 7c23ee3f357779f4635f80bc697da721 |

Foram criadas inicialmente pelo CLI e renomeadas somente para as versões devolvidas pelo servidor, sem mudar seus bytes. OID, proprietário, ACL, configuração e volatilidade das funções foram preservados. Nenhum dado financeiro, perfil, PIN, usuário, presença ou sessão Auth foi alterado. Fonte e dependências de ambas as Edge Functions foram comparadas com o código implantado anterior; todos os módulos coincidiam com a base. Publicadas `ebd-class-login` v4 e `generate-birthday-announcement` v5, ambas ACTIVE, com os arquivos recuperados iguais aos locais e a autenticação própria/configuração anterior preservadas.

A publicação final deve usar exatamente este código validado, na main do GitHub e na fonte do Sites, com o projeto existente e o público de acesso preservado. O registro externo da automação contém os IDs/revisão/status reais após a publicação, sem criar commit/deploy vazio para registrar esse resultado posterior.

## Cobertura e limites

[Inventário e alcance](coverage.md). QA visual atual concentrou-se no convite PWA, com claro/escuro em 390/768/1440 e 375 com área segura; menor contraste habilitado medido no escuro: 7,09:1. Nenhum fluxo protegido real foi usado para teste.

Logs das últimas 24 horas: Sites sem eventos de erro; nenhum HTTP 5xx/fatal no filtro dos serviços Supabase consultados. O PostgreSQL contém seis denegações EBD (`42501`, até 13:57 UTC) e um cancelamento de consulta ao catálogo pelo serviço Realtime (`57014`, 15:37 UTC). Causa/impacto não reproduzidos; não equivalem a ausência de erros de banco. Nenhuma mensagem com dados pessoais foi persistida.

Auth HTTP completo, concorrência PostgreSQL entre duas sessões, instalação/offline em dispositivo físico e restauro de backup **não verificados**. Testes locais/modelados e catálogos remotos não substituem essa cobertura. Nenhuma movimentação financeira, voto ou envio de mensagem real foi feito.
