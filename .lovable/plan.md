

# Vídeo de fundo na tela de login

## Resumo
Adicionar o vídeo enviado como plano de fundo da tela inicial (`Auth.tsx`), com overlay escuro para legibilidade, e transição suave ao entrar no app.

## Mudanças

### 1. Copiar vídeo
- Copiar `user-uploads://82da427d-...mp4` para `public/videos/bg-home.mp4` (público, pois é referenciado por URL no `<video>`)

### 2. `src/pages/Auth.tsx`
- Adicionar `<video>` fixo cobrindo a tela: `autoPlay muted loop playsInline`, `object-cover`, `fixed inset-0 z-0`
- Overlay escuro `bg-black/60` em `z-10` para garantir leitura
- Conteúdo existente em `relative z-20`
- Ajustar textos e cards para funcionar sobre fundo escuro:
  - Logo e título em branco
  - Cards com `bg-white/90 backdrop-blur-sm` (ou `bg-card/90 backdrop-blur`)
  - Textos auxiliares em `text-white/70`
- Ao confirmar login (navegar para `/membro`, `/diretoria`, etc.), adicionar uma animação de fade-out (`opacity-0 transition-opacity duration-500`) antes do `navigate()` para transição suave

### 3. Transição ao logar
- Estado `isExiting` que, ao ser ativado, aplica `opacity-0 scale-105 transition-all duration-500` no container inteiro
- Após 400ms, executa o `navigate()` real
- As páginas de destino já têm layout normal sem vídeo

## Arquivos

| Arquivo | Ação |
|---|---|
| `public/videos/bg-home.mp4` | Copiar vídeo |
| `src/pages/Auth.tsx` | Adicionar video bg, overlay, transição de saída |

