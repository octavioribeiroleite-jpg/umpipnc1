# Composição da entrada IPNC — 05/10/2026

A página `/auth` segue a referência enviada “Portal IPNC: Acesso e Comunhão”, mantendo a logo oficial já aprovada no commit de identidade 04f5f56832a83f35917c3bf3c375592d0dbc3d07. O arquivo mestre, ícones e manifest não foram modificados nesta entrega.

## Resultado

- Desktop a partir de 1024 px: lateral verde de 32%, conteúdo claro de 68%, bloco de acesso com até 620 px.
- Logo inteira e proporcional, nome da igreja, lema e instalação na lateral. A composição usa uma textura discreta de gradientes; não utiliza a foto da igreja do mockup, pois não existe uma fotografia original correspondente no repositório.
- Título com presença, quatro cards alinhados, ícones distintos e indicação de navegação. Administrativo separado por uma linha; copyright discreto no rodapé.
- Abaixo de 1024 px: cabeçalho verde compacto, sem a lateral desktop e seus conteúdos secundários. Instalação continua disponível.
- Horário de atualização removido somente da entrada. Avisos de atualização e notificações preservados.
- PIN, sociedades, identificação e administrativo continuam com seus campos e decisões existentes. A confirmação se adapta a nomes longos e fontes ampliadas.
- Dois enhancers antigos ignoram `.auth-page`, impedindo que reconstruam o layout anterior após renderização.

O trecho de hooks, handlers, sessões e requests anterior a `renderContent` foi comparado com o HEAD original: permanece idêntico, descontando a retirada do import visual de BuildStamp. Não houve mudança no backend, em permissões, PINs, banco ou regras de negócio.

## Verificação automatizada

Executada com Node.js 24 e o package-lock existente:

```sh
npx tsc -p tsconfig.app.json --noEmit
node --experimental-strip-types --test tests/*.mjs tests/*.ts
npm run build
git diff --check
npx eslint src/pages/Auth.tsx src/components/auth/SocietyScreenEnhancer.tsx src/components/auth/IdentityConfirmationEnhancer.tsx
```

Tipos, 224 testes, build e diff check passaram. O teste existente de PWA integra a suíte completa.

O lint dos dois enhancers passou. Auth.tsx mantém um erro preexistente `@typescript-eslint/no-explicit-any`, no handler `handleSelectMembroSociety` (linha 269 nesta revisão). A versão anterior foi verificada com `git show HEAD:src/pages/Auth.tsx | npx eslint --stdin --stdin-filename src/pages/Auth.tsx --format json` e apresenta o mesmo erro. Nenhum erro novo de lint foi introduzido. O build conserva avisos anteriores sobre import dinâmico de sonner e bundles maiores que 500 kB.

## Verificação visual e funcional

Browser controlado, fixture isolada `tests/vite.diretoria.config.ts`, origem local 127.0.0.1:8083. Esta fixture bloqueia conexões externas e escritas de rede e usa exclusivamente identidades fictícias. Ela não comprova autenticação real, PIN correto ou instalação nativa de um PWA.

- Larguras 320, 375, 390, 768, 1023, 1024, 1440 e 1920 px: sem rolagem horizontal; logo quadrada e proporcional; instalação sem sobreposição. Medidas em `evidence/geometry.json`.
- Fonte ampliada a 200%: tablet 768 px e celular 320 px; nome longo na confirmação e botões legíveis com quebra de layout.
- PIN vazio, preenchido, confirmação sintática no stub, erro simulado e retorno.
- Seleção de sociedade fictícia, identificação com nome e função, continuação e mensagem de entrada.
- Identidade fictícia retornando, opção “Não sou eu”, retorno à identificação.
- Formulário administrativo com falha simulada e erro inline.
- Janela de tesouraria aberta e fechada; nenhuma autenticação financeira real executada.
- Janela de instalação aberta e fechada; foco devolvido ao botão Instalar.
- Navegação por Tab: foco visível entre cards.
- Secretaria EBD segue para `/secretaria` e Portal para `/igreja`, sob a base da fixture.
- Contrastes calculados: descrições 6,55:1; rodapé 4,85:1; lema 6,93:1; textos desativados 4,62:1.

## Conferência manual no site publicado

1. Abrir `/auth` em uma sessão sem login e conferir logo, quatro acessos e administrativo abaixo.
2. Conferir desktop, celular 390 px e celular 320 px: ausência de cortes, rolagem horizontal e sobreposição do sino.
3. Abrir Diretoria e retornar; abrir Finanças e fechar; abrir Instalar e fechar.
4. Conferir navegação com Tab e foco visível; ampliar a fonte para 200% e conferir leitura/rolagem.
5. Fazer login somente com uma conta de teste autorizada, em ambiente isolado. Não movimentar dinheiro, alterar pessoas reais ou realizar votos para validar esta entrega.

Evidências visuais encontram-se na pasta `evidence/`. A confirmação de deploy, URL e revisão é informada na entrega após o status nativo do Sites.
