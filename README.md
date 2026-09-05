# Renovo IPNC

Aplicativo da igreja em React, TypeScript e Vite. Hospedagem pelo Sites; banco,
autenticação, arquivos privados e funções no Supabase próprio. A IA usa a API
Gemini do Google diretamente no servidor, sem intermediário.

## Desenvolvimento

Use Node.js 22 e npm. Copie `.env.example` para `.env.local`, preencha a chave
publicável do Supabase e execute `npm ci` e `npm run dev`.

Valide com `npx tsc -p tsconfig.app.json --noEmit`, `node --experimental-strip-types --test tests/*.mjs tests/*.ts`
e `npm run build`. O resultado está em `dist/client`.

## Configuração

Variáveis VITE são públicas. Nunca coloque service-role, senhas ou chaves de IA
nelas. Configure `GEMINI_API_KEY` exclusivamente nos segredos das Edge Functions.
O nome existente `Gemini API Key` também é reconhecido. Modelo:
`gemini-3.1-flash-lite`. O proprietário confirmou plano pago em 05/09/2026.
Não use a modalidade gratuita para dados pessoais da igreja. Reavalie os termos
de privacidade ao trocar a chave/projeto. Não há fallback automático de provedor.

O projeto próprio é `xhhfgnkpgtnzlvpvqjpl`. O manifesto `.openai/hosting.json`
identifica o Site e configura fallback de navegação para rotas como `/auth`.
Sites publica o conteúdo estático após validação. Acesso público ao Site não
dispensa os controles de autorização internos da igreja.

A configuração pública de produção está em `.env.production`, para que a main
gere o mesmo aplicativo sem depender de arquivos locais. Segredos nunca entram
nesse arquivo. O portal dos membros ainda não está liberado; as contas e dados
existentes foram preservados. A diretoria mantém o acesso por PIN.

Os lembretes de aniversários rodam diariamente às 08h de São Paulo no próprio
banco, sem chaves em tarefas agendadas. A geração é atômica e não duplica avisos.

## Segurança e migração

Comprovantes usam o bucket privado `receipts` com URLs assinadas de curta duração;
fotos eleitorais são públicas. A EBD usa sessão separada de 15 minutos, emitida
após validação de PIN, e permissões de banco por turma. Trocar o PIN invalida o
acesso anterior.

As migrations históricas documentam a origem e não devem ser reaplicadas
cegamente em um banco vazio: a migração para o projeto próprio usa um baseline
canônico e migrations de acesso posteriores. Backups, dados pessoais e segredos
ficam fora deste repositório. Consulte os relatórios de publicação para os testes
realizados e pendências; build bem-sucedido não prova migração concluída.
