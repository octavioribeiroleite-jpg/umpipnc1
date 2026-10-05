# Entrega e publicação

- Preferência expressa do proprietário em 05/10/2026: sempre que alterar o aplicativo, concluir a entrega com commit na `main`, sincronização da `main` no GitHub e no repositório de fonte do Sites e deploy do Site existente. Só manter alterações exclusivamente locais quando o usuário pedir isso explicitamente.
- Preservar e integrar mudanças existentes em ambos os repositórios antes de publicar. Nunca sobrescrever o histórico remoto com force push.
- Executar as verificações adequadas à mudança e publicar exatamente o código validado. Não confundir prévia local, push para GitHub ou versão salva com deploy concluído.
- Reutilizar o projeto de `.openai/hosting.json`, manter o acesso atual e confirmar sucesso pela ferramenta de status do Sites. Informar URL, revisão e qualquer bloqueio real.
- Manter dados reais, permissões e credenciais protegidos. Testes devem usar dados fictícios em ambiente isolado; não realizar movimentações financeiras, votos, envio de mensagens ou alterações clínicas reais para validar uma publicação.

## Comandos e documentação

Usar Node.js 22 ou superior e npm com `package-lock.json`. Verificar tipos com `npx tsc -p tsconfig.app.json --noEmit`, executar `node --experimental-strip-types --test tests/*.mjs tests/*.ts` e gerar produção com `npm run build`.

Consultar `docs/treasury/WORKFLOW.md` para o fluxo da tesouraria. Relatórios antigos em `docs/design-audit` descrevem a data indicada, não substituem a validação atual.
