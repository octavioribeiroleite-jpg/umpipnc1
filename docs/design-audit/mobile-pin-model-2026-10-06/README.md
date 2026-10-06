# Home móvel e modelo comum de PIN — 06/10/2026

Base: `4f1348e2048aa695a7d0568ecc467d76ca0a7423` (Site v38).

## Escopo entregue

Referências do proprietário: `Tela de Login IPNC com PIN.png` e `Mockup de Login e Perfis IPNC.png`. A Home móvel adota a composição do mockup: logo central, curva verde superior, folhas suaves, cards claros com ícones mint e rodapé com livro. Os quatro acessos existentes permanecem: Diretoria, Secretaria EBD, Finanças e Portal da igreja. O login administrativo mantém usuário/senha. As opções Google, lembrar conta e os novos perfis ilustrativos não foram adicionados.

O PIN comum usa página clara, logo oficial, título sem serifa, seis posições, teclado amplo e ajuda textual. Cadeado e card pesado foram retirados. Acesso completo, confirmação compacta e diálogo da tesouraria usam o mesmo componente. Todos têm “Voltar para a Home”. A navegação de acesso abre no topo; diálogos também reiniciam sua rolagem ao abrir o PIN. O espaço do botão de fechar acompanha a fonte ampliada.

A logo `src/assets/logo-ipnc.png` foi preservada sem edição. O import da entrada passou a usar esse master; o PNG de entrada anterior tinha o mesmo conteúdo. Nenhum asset de marca ou ícone foi regenerado nesta entrega. O PWA recebeu cache `ump-cache-v17` e URL versionada do service worker para distribuir esta interface.

## Superfícies de PIN encontradas

1. Diretoria, antes da seleção de sociedade/Pastor (`Auth.tsx`).
2. Secretaria EBD — administrador.
3. Secretaria EBD — professor/senha da sala.
4. Secretaria EBD — confirmação de acesso compacta.
5. Tesouraria — PIN da sociedade, tanto pela Home quanto pela rota bloqueada.

Formulários de configuração de novos PINs não são telas de entrada. Login administrativo com senha continua usando o fluxo existente.

## Conferência no navegador

Dados fictícios e transportes isolados das fixtures existentes. Nenhum PIN real, movimentação financeira ou alteração em banco foi utilizado.

- Home: 320, 375, 390, 768, 1024 e 1440 px; sem rolagem horizontal. Composição móvel até 767 px e desktop/tablet preservados.
- PIN da Diretoria: 390 e 1440 px, além de 320 px com fonte 200%.
- Secretaria: PIN administrativo em 320/390 px, professor em 320 px, confirmação compacta em 320 px com fonte 200%.
- Tesouraria: 320/390 px e 320 px com fonte 200%; botão Home no topo, fechamento sem sobreposição e teclado acessível por rolagem.
- Login administrativo em 320 px; campos e botão de entrada preservados.
- Teclado: digitar, apagar, limpar, seis posições e Enter sobre Home. Este último voltou à Home sem enviar o PIN.
- Home na tesouraria fecha o diálogo e retorna à seleção de acessos.
- Console das duas fixtures sem erros após a última navegação.

Arquivos PNG nesta pasta são evidências das superfícies, não assets do aplicativo. As capturas de diálogo com fonte ampliada mostram a parte superior; o restante é acessível pela rolagem interna. As fixtures EBD incluem controles de simulação abaixo da interface.

## Verificações

- `npx tsc -p tsconfig.app.json --noEmit`: aprovado.
- `node --experimental-strip-types --test tests/*.mjs tests/*.ts`: 250 testes aprovados, zero falhas.
- `npm run build`: aprovado.
- Lint de PinPad, TreasuryAccessDialog e testes alterados: aprovado.
- `Auth.tsx`: um erro `no-explicit-any` preexistente na linha 292, confirmado por lint do arquivo da base. Não foi ocultado nem introduzido nesta alteração.
- `git diff --check`: aprovado.

O teste novo da tesouraria executa o adaptador real com dependências isoladas: PIN direto na requisição, trava de envio duplicado, autorização, descarte de sessão sem acesso, erro original e limpeza do PIN. A sequência de cache, sessão e verificação de acesso permanece preservada. Os testes PWA verificam a eliminação dos caches antigos e a preservação do cache atual e de outros aplicativos.

Os avisos existentes de Browserslist, importação estática/dinâmica de Sonner e tamanho de bundles permanecem; o build não apresentou erro. Não houve migração ou mudança de backend, autenticação, permissões ou regras de negócio.

## Publicação

Entrega prevista na `main` do GitHub e na fonte do Site existente, com pacote estático gerado do mesmo commit validado. O número efetivo da revisão e o status de deploy são informados após a confirmação nativa do Sites. A validação pública adicional é visual e de integridade dos arquivos; não autentica contas reais nem comprova atualização do ícone de um PWA instalado em aparelho físico.
