# Entrada da área de eleições - 08/11/2026

## Alterações

- Cabeçalho compacto e botão de nova votação disponível também no celular.
- Estado vazio substituído por escolhas diretas: diretoria UMP ou votação avulsa; camisas mantidas na sua categoria.
- Cards de criação com alturas iguais nas cinco larguras verificadas.
- Busca por nome/cargo sem distinção de acentos e filtro por situação, com limpeza dos filtros.
- Cards da lista indicam preparação, novas indicações, votação aberta ou conclusão e apresentam a ação correspondente.
- Formato no formulário com opções nativas de rádio e foco visível; demais campos e regras de criação preservados.

## Verificação

- TypeScript, 627 testes existentes e build de produção aprovados.
- `git diff --check` limpo.
- Lint dos dois arquivos alterados: nenhum novo problema; três `any` preexistentes permanecem nos handlers de criação/exclusão de `Eleicoes.tsx`.
- CUA no navegador interno: 375, 390, 768, 1024 e 1440 px. Estado vazio e formulário avulso sem overflow; cards com alturas iguais em todas as larguras.
- Roteiro UMP conferido no celular, avulsa permite apagar 1 e digitar 2 vagas, escolhas sincronizadas em 2.
- Busca `PRESIDENCIA` encontra `Presidência`; filtro sem correspondências e limpeza conferidos.
- Categoria camisas e criação com tipo correspondente conferidas.
- Console sem novos erros na inspeção.
- Dados fictícios em fixture isolada; nenhuma eleição real, voto, chamada ou configuração do ensaio público foi alterada.

Evidências locais: `/tmp/ipnc-election-entry-375.jpg`, `/tmp/ipnc-election-entry-390.jpg`, `/tmp/ipnc-election-entry-768.jpg`, `/tmp/ipnc-election-entry-1024.jpg`, `/tmp/ipnc-election-entry-1440.jpg`.
