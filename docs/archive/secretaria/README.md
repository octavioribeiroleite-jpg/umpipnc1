# Referência histórica da Secretaria

`Secretaria-2.2026-09-28.tsx.txt` preserva integralmente a antiga cópia `src/pages/Secretaria 2.tsx`, antes da correção de tipos solicitada em 28/09/2026. O SHA-256 e tamanho estão em `preservation.json`.

A cópia antiga não era usada por nenhuma rota, mas era incluída pelo TypeScript. Ela não implementava os controles atuais de sessão expirada e de status da chamada exigidos pelos componentes compartilhados.

O caminho antigo agora reexporta a página atual e o tipo `VisitorEntry`. Assim há uma única implementação, com os controles reais já existentes, e o caminho continua compatível. A rota ativa, os componentes, os handlers e a configuração do TypeScript não foram alterados. Este arquivo de referência não é código executável do aplicativo.
