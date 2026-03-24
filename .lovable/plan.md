

# Plano: Múltiplas Fotos por Modelo de Camisa (Candidato)

## Contexto
Atualmente cada candidato/modelo tem apenas 1 foto (`photo_url` na tabela `election_candidates`). Para votação de camisas, o usuário quer poder adicionar várias fotos por modelo para que os votantes possam deslizar entre elas.

## Abordagem
Adicionar uma coluna `photo_urls` (jsonb array) na tabela `election_candidates` para armazenar múltiplas URLs. Manter `photo_url` existente como fallback para eleições de cargos. Usar o componente Carousel (já existe no projeto) para exibir as fotos.

## 1. Migração de banco de dados
Adicionar coluna `photo_urls` na tabela `election_candidates`:
```sql
ALTER TABLE public.election_candidates 
  ADD COLUMN photo_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
```

## 2. `CandidateForm.tsx` -- Upload múltiplo
- Adicionar prop `type` (`'cargo' | 'camisa'`) para adaptar comportamento
- Quando tipo = `camisa`:
  - Permitir upload de múltiplas fotos por modelo
  - Exibir miniatura com contador de fotos (ex: "3 fotos")
  - Botão de upload adiciona ao array `photo_urls` em vez de substituir `photo_url`
  - Botão para remover foto individual do array
- Quando tipo = `cargo`: comportamento atual inalterado (single photo)

## 3. `VotePublic.tsx` -- Carousel na votação pública
- Quando o candidato tem `photo_urls` com mais de 1 item, renderizar um Carousel (Embla, já instalado) em vez de imagem estática
- Indicadores de paginação (dots) abaixo das fotos
- Swipe/touch habilitado para mobile
- Na tela de confirmação, mostrar carousel também

## 4. `EleicaoDetalhe.tsx` / `ResultPanel.tsx`
- Exibir primeira foto como thumbnail (sem carousel) nos painéis admin
- Mostrar badge com quantidade de fotos

## Arquivos alterados
- **1 migration SQL**: adicionar `photo_urls` jsonb
- **`src/components/eleicoes/CandidateForm.tsx`**: upload múltiplo para tipo camisa
- **`src/pages/VotePublic.tsx`**: carousel de fotos na votação
- **`src/pages/EleicaoDetalhe.tsx`**: passar prop `type` ao CandidateForm

## O que NÃO muda
- Eleições de cargo continuam com foto única
- Nenhuma tabela nova
- Nenhuma rota nova

