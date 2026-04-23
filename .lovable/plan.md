
Vou ajustar o fluxo das urnas e revisar o problema do primeiro voto sem som / retorno rápido.

## Objetivo

Deixar a eleição com este fluxo:

```text
1. Criar eleição
2. Cadastrar candidatos/modelos
3. Confirmar presença
4. Criar urnas pelo nome
5. Mostrar QR Code de cada urna
6. Ativar/conectar cada urna
7. Iniciar votação
8. Continuar podendo adicionar novas urnas com a votação aberta
9. Acompanhar se cada urna está conectada durante a votação
```

## Alterações planejadas

### 1. Permitir criar urnas antes e durante a votação

Hoje a área de dispositivos fica bloqueada quando a votação não está mais em rascunho. Vou alterar para:

- Permitir adicionar novas urnas quando a eleição estiver em `Rascunho`.
- Permitir adicionar novas urnas também quando a eleição já estiver `Em votação`.
- Bloquear apenas quando a eleição estiver `Finalizada`.

Assim, se precisar abrir mais uma urna no meio da votação, o administrador poderá cadastrar o nome, gerar o QR Code e ativar normalmente.

### 2. Melhorar a lista de urnas

Na etapa de dispositivos, cada urna cadastrada ficará mais clara:

- Nome da urna em destaque.
- Status visual ao lado:
  - `Aguardando ativação`
  - `Online / conectada`
- Botão **Mostrar QR Code** ao lado de cada urna.
- Botão de copiar link.
- Remoção da urna só enquanto fizer sentido, evitando apagar dispositivos depois que a votação estiver finalizada.

Ao clicar em **Mostrar QR Code**, será aberto um popup com:

- QR Code grande.
- Nome da urna.
- Link específico daquela urna.
- Botão para copiar o link.

### 3. Sincronizar status online da urna

Quando a urna for aberta pelo QR Code e autenticada, ela continuará marcando `activated = true`.

Vou melhorar o painel administrativo para escutar mudanças em tempo real na tabela de urnas da eleição. Assim:

- O administrador cria a urna.
- Abre o QR Code.
- A urna é autenticada.
- O painel muda automaticamente para `Online / conectada`.

Sem precisar atualizar a página.

### 4. Mostrar status das urnas durante a votação

Na área de votação aberta, vou adicionar um bloco fixo de monitoramento das urnas:

```text
Urnas conectadas
Mesa 1       Online
Entrada      Online
Galeria      Aguardando ativação
```

Esse bloco continuará visível enquanto a votação estiver aberta, para identificar se alguma urna não conectou corretamente.

### 5. Melhorar contraste com fundo branco

Vou reformular a área administrativa da votação aberta para ficar com fundo branco e leitura forte.

Mudanças visuais:

- Painel principal com `bg-white/95` ou equivalente do design system.
- Cards internos com borda leve e fundo claro.
- Progresso, presentes, votos e diferença com contraste melhor.
- Evitar blocos “verde sobre verde”.
- Status de sucesso ainda pode usar verde, mas só como detalhe visual, não como fundo dominante.

Isso será aplicado principalmente em:

- Área “Em votação”
- Cards de progresso
- Lista de urnas
- Ações de concluir/reiniciar
- Área de QR Codes

### 6. Revisar o primeiro voto sem som

O problema provável é que o som está tentando tocar depois de operações assíncronas, como envio do voto para o banco. Em navegadores móveis, áudio iniciado depois de `await` pode ser bloqueado porque saiu do clique direto do usuário.

Vou ajustar o fluxo para:

- Preparar/desbloquear o áudio no clique do usuário, antes do envio assíncrono.
- Manter o áudio carregado e o contexto de áudio ativo.
- Depois que o voto for salvo com sucesso, tocar o som usando o áudio já preparado.
- Manter um fallback de beep caso o arquivo MP3 falhe.
- Evitar que o primeiro voto seja silencioso.

### 7. Revisar retorno rápido após o voto

Vou garantir que, na urna fixa:

- A tela **VOTO CONFIRMADO** permaneça visível pelo tempo correto.
- A urna não volte rápido demais para “Iniciar votação”.
- O reset automático só aconteça depois do tempo mínimo configurado.
- O som tenha chance de tocar antes da tela reiniciar.

A ideia é manter a confirmação estável, clara e com áudio perceptível.

## Arquivos que serão alterados

### `src/components/eleicoes/DeviceRegistration.tsx`

- Botão “Mostrar QR Code”.
- Popup com QR Code por urna.
- Status visual online/aguardando.
- Permitir uso em rascunho e em votação aberta.
- Melhor contraste do card de dispositivos.

### `src/components/eleicoes/VotingPanel.tsx`

- Área “Em votação” com fundo branco.
- Monitor de urnas durante a votação.
- Permitir criar/acessar QR Codes de urnas durante votação aberta.
- Melhorar contraste dos cards de progresso.
- Ajustar layout para ficar legível no celular e no desktop.

### `src/pages/EleicaoDetalhe.tsx`

- Ajustar regra de bloqueio dos dispositivos: bloquear só se finalizada.
- Adicionar sincronização em tempo real das urnas da eleição.
- Atualizar lista de urnas automaticamente quando uma conectar.

### `src/pages/VotePublic.tsx`

- Melhorar fluxo de áudio do voto confirmado.
- Garantir que o primeiro voto saia som.
- Garantir que a tela de confirmação não retorne rápido demais.
- Manter a tela da urna com fundo branco e alta visibilidade.

## Resultado esperado

O administrador poderá cadastrar urnas antes de iniciar a votação, ver o QR Code de cada uma, acompanhar quando cada urna ficar online, iniciar a votação somente depois, e ainda adicionar novas urnas durante a votação se necessário. A área administrativa ficará mais clara com fundo branco, e o primeiro voto deverá tocar som corretamente sem retornar rápido demais.
