

# Reorganizar Fluxo da Eleicao + Modo "Ambos"

## Problema
A ordem atual (Chamada -> Candidatos -> Votacao) nao e ideal. O usuario quer preparar tudo antes da chamada, pois a chamada e o ultimo passo antes de iniciar a votacao.

## Nova Ordem das Secoes

1. **Candidatos** - Cadastrar os candidatos primeiro
2. **Modo de Votacao** - Escolher: Urna Compartilhada, Voto Individual, ou Ambos
3. **Chamada de Presenca** - Fazer a chamada e confirmar quorum
4. **Votacao** - Acompanhar votos em tempo real (aparece ao iniciar)
5. **Resultado** - Exibido ao concluir

Isso reflete o fluxo natural: preparar candidatos e modo -> contar presentes -> votar -> resultado.

## Novo Modo "Ambos" (shared + individual)

Adicionar terceira opcao de modo de votacao: `'both'`
- Gera o mesmo link/QR code
- Na pagina publica (`VotePublic.tsx`), funciona como individual (1 voto por dispositivo)
- No painel admin, o aparelho fixo tambem pode ser usado como urna compartilhada
- Pratica: a banca oferece os dois caminhos -- quem quiser vota no celular, quem preferir vota na urna fixa

### Migration SQL
```sql
-- Nenhuma migration necessaria. A coluna voting_mode ja e text e aceita qualquer valor.
-- Vamos usar 'both' como novo valor possivel.
```

## Mudancas por Arquivo

### 1. `EleicaoDetalhe.tsx`
- Reordenar accordion: Candidatos -> Votacao (modo) -> Chamada -> Resultado
- Ajustar `defaultOpen` no draft: `['candidatos', 'votacao']`
- Mover o seletor de modo para dentro da secao "Votacao" (ja esta la)

### 2. `VotingPanel.tsx` - Status Draft
- Adicionar terceiro botao no seletor de modo: "Ambos" com icone de Monitor+Smartphone
- Mover o botao "Iniciar Votacao" para a secao de chamada (ou validar que chamada foi feita)
- Ajustar label: `totalPresent === 0` -> "Confirme a presenca na secao Chamada"

### 3. `VotingPanel.tsx` - Status Open
- Quando modo = `'both'`, mostrar badge "Urna + Celular"
- QR Code e link funcionam igual

### 4. `VotePublic.tsx`
- Tratar modo `'both'` igual a `'individual'` (1 voto por dispositivo via device_id)

### 5. `AttendanceList.tsx`
- Adicionar indicador de quorum na confirmacao de presenca
- Mostrar "Quorum atingido" ou "Quorum nao atingido" com base em regra simples (ex: > 50% dos membros importados, ou simplesmente exibir o numero de presentes de forma destacada)

## Detalhes Tecnicos

### Seletor de modo com 3 opcoes
```
grid grid-cols-3 gap-2
[Urna Compartilhada] [Voto Individual] [Ambos]
```

### Accordion reordenado (draft)
```
1. Candidatos (aberto)
2. Votacao - modo (aberto)  
3. Chamada de Presenca (fechado, abre quando candidatos estiverem prontos)
4. Resultado (so aparece quando finished)
```

### VotePublic.tsx - modo 'both'
- Simplesmente tratar `'both'` como `'individual'` na logica de device_id
- `if (votingMode === 'individual' || votingMode === 'both')` nas verificacoes

## Resultado Esperado
- Fluxo mais logico: preparar -> contar -> votar -> resultado
- Terceira opcao de votacao para flexibilidade maxima
- Quorum visivel na chamada de presenca

