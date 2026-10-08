# Manutenção diária — 08/10/2026

Dois defeitos de acessibilidade foram reproduzidos em ambiente local com dados sintéticos e corrigidos:

- O botão da conta no cabeçalho compartilhado media 40 × 48 px no celular. A área de toque agora mede 48 × 48 px, com o avatar centralizado, mantendo a apresentação do desktop.
- A edição do nome de aluno na planilha EBD não tinha nome acessível. Os campos de celular e desktop agora são identificados como “Nome do aluno”.

A conferência no navegador cobriu 320, 375 e 390 × 844 px, além de 1440 × 900 px, nos temas claro e escuro. As oito combinações ficaram sem transbordamento horizontal; abrir/fechar o menu preservou a rota e a identidade fictícia. A edição foi cancelada sem salvar. Não houve mudança de autenticação, permissões ou gravações.

Verificações: tipos, 473/473 testes isolados, build de produção e diff check. Node 24.19.0; npm/npx ausentes nesta sessão, portanto os CLIs locais de TypeScript e Vite foram executados diretamente, equivalentes aos comandos do projeto, sem instalação ou mudança de lockfile.

A revisão passiva manteve a comparação de GitHub/Sites, Edge de reuniões v6 com oito módulos iguais à fonte, 57 tabelas públicas com RLS e o catálogo/invariantes da tesouraria. Logs disponíveis e advisories não demonstraram defeito de segurança novo. Os avisos e limites anteriores permanecem: banco financeiro novo vazio, contas protegidas reais, concorrência PostgreSQL, restauração e instalação/gestos físicos de PWA não foram certificados.

Evidências detalhadas, estado final da publicação e limites de cobertura estão no pacote externo da automação `reports/security-reports/2026-10-08_1f0714a`. Nenhum lançamento financeiro, presença, voto, mensagem ou dado de negócio real foi criado ou alterado nos testes.
