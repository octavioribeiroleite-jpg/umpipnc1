# Seleção de sociedades — referência do proprietário, 05/10/2026

Esta revisão substitui a grade provisória por uma composição baseada em `Seleção de Sociedades IPNC.png`. Os seis PNGs enviados pelo proprietário foram incorporados sem redesenho ou recoloração. O mockup não foi usado como screenshot dentro da aplicação.

- Tela clara em largura total durante a seleção, mantendo a composição original da entrada nos demais passos.
- Duas colunas a partir de 700 px; uma coluna compacta abaixo disso. Cards com alturas iguais, ícone, sigla, nome e seta alinhados.
- Ordem: SAF, UCP, UMP, UPA, UPH e Pastor. Descrições institucionais e ícones enviados; sociedade desconhecida conserva o nome e um ícone genérico.
- A nova marca de duas folhas aprovada permanece no cabeçalho desktop. A marca diferente desenhada no mockup não substitui a identidade aprovada.
- Pastor somente na Diretoria; seleção de membro preserva suas sociedades. A referência não concede novos acessos.
- Callbacks, objetos, PINs, sessões, backend e regras existentes preservados. Título recebe foco ao abrir a seleção, evitando abrir a página no meio da lista depois do PIN com fonte ampliada.
- Espaço reservado para o sino, incluindo fonte 200%; loading tem status acessível e não deixa cards disponíveis.

## Assets

`src/assets/societies/{saf,ucp,ump,upa,uph,pastor}.png`: 384 × 384 RGBA. Redução do canvas integral fornecido de 1254 × 1254, sem recorte nem ampliação. Originais em Downloads intactos. Hashes e metadados em `docs/branding/2026-10-05/society-icons/asset-provenance.json`.

## Validação

Fixture local com backend/autenticação fictícios e transportes externos bloqueados. UCP foi acrescentada somente ao seed local para conferir os seis cards. Nenhuma chamada real, voto, pessoa ou valor foi alterado.

320, 375, 390, 768, 1024 e 1440 px: seis imagens carregadas, cards alinhados, sem rolagem horizontal. 320 e 768 com fonte 200%: texto completo e espaço do sino preservados. Seleção da UMP fictícia segue para confirmação existente; Voltar retorna à lista. Loading e Pastor opcional verificados por render isolado independente. Os dados de geometry registram coordenadas de viewport; quando a página está rolada, valores top podem ser negativos.

Evidências atuais em `../auth-composition-2026-10-05/evidence/society-cards-*.png`, `society-card-geometry.json` e `society-font200-*`. As capturas anteriores nessa pasta continuam como histórico dos outros fluxos.

Com Node >=22: tipos, 224 testes, build de produção e git diff --check passaram. Lint do seletor passou; Auth mantém um any antigo e Portal nove, confirmados no HEAD anterior. Avisos de build anteriores permanecem documentados no relatório de branding.

## Conferência manual

1. Abrir /auth, Diretoria, informar PIN válido somente com conta de teste autorizada e conferir a seleção.
2. Conferir SAF/UCP/UMP/UPA/UPH/Pastor no desktop, tablet e celular; somente um card visível por sociedade e ícone correto.
3. Abrir uma sociedade e retornar; conferir que PIN/identificação seguem o fluxo anterior.
4. Navegar por teclado e ampliar fonte; ler nomes completos, percorrer a lista e conferir foco visível.
5. Conferir sidebar, rail, cabeçalhos, Secretaria, pastor, portal, instalação, favicon e PDFs com a marca transparente. Não validar usando movimentações reais.

Publicação deve usar a mesma revisão validada, main GitHub + fonte Sites, e sucesso confirmado pelo status nativo do Site existente.
