# Implementação — 21/09/2026

- Dashboard inicial reorganizado conforme o mockup; fluxos internos e permissões preservados.
- Fontes Inter e Plus Jakarta Sans hospedadas no próprio site, com aliases exclusivos da secretaria e licenças incluídas.
- Verde do botão ajustado de #1F8959 para #1C8053 para melhorar o contraste com texto branco.
- Grade móvel adaptada, cabeçalho com menu de perfil/saída, resumo com três métricas e estados de carregamento, aniversariantes com prévia e acesso à lista completa para administradores.
- Professores mantêm todos os aniversariantes na prévia, pois não possuem acesso à gestão da lista.
- Datas e contadores continuam dinâmicos; nenhuma data ou pessoa fictícia foi incorporada à aplicação.

## Verificações

- Build de produção aprovado.
- 15 testes existentes de regressão aprovados (sincronização EBD, sessão de aniversariantes e legibilidade).
- TypeScript aprovado excluindo apenas as três cópias locais não rastreadas com sufixo “ 2.tsx”. A verificação abrangendo todas as cópias encontra dois erros preexistentes em Secretaria 2.tsx; esses arquivos não são importados pelo aplicativo e não foram alterados.
- Componentes reais renderizados em página temporária isolada, com dados fictícios, para conferência visual a 640 px e 390 px, reflow a 320 px e inspeção de overflow a 1440 px.
- Texto ampliado a 200% em 320 px: ajustada a grade de indicadores; sem sobreposição ou overflow interno após correção.
- Menu de usuário abre e apresenta perfil e saída. Nomes longos e ações secundárias usam quebra de texto.
- A página temporária foi removida; não faz parte do build ou da publicação.
- A prévia local da rota autenticada exige login; a inspeção inicial não acessou dados reais nem alterou registros.
