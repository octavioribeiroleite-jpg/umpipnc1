

# Gerador de Cartaz para WhatsApp com IA

## O que será criado
Uma ferramenta dentro do app que guia o usuário passo a passo para gerar um cartaz/flyer de divulgação usando inteligência artificial. O resultado é uma imagem pronta para compartilhar no WhatsApp.

## Fluxo do Wizard (4 passos)

```text
Passo 1: Tipo          Passo 2: Estilo        Passo 3: Conteúdo      Passo 4: Gerar
─────────────────      ─────────────────      ─────────────────      ─────────────
○ Evento/Culto         ○ Minimalista          Título: ________       [Gerar Cartaz]
○ Anúncio              ○ Colorido             Data: __________       
○ Convite              ○ Jovem/Divertido      Horário: ________      Imagem gerada
○ Campanha             ○ Institucional        Local: __________      [Baixar] [Novo]
                                              Detalhes: ______       
```

## Arquivos

| Arquivo | Ação |
|---|---|
| `supabase/functions/generate-poster/index.ts` | **Novo** -- Edge function que monta prompt detalhado e chama o modelo de imagem |
| `src/components/cartaz/PosterWizard.tsx` | **Novo** -- Wizard multi-step com RadioGroup e formulário |
| `src/pages/GerarCartaz.tsx` | **Nova** -- Página dedicada com o wizard |
| `src/App.tsx` | Adicionar rotas `/cartaz` e `/pastor/cartaz` |
| `src/pages/PainelPastor.tsx` | Adicionar botão "Gerar Cartaz" no acesso rápido |
| `src/pages/Index.tsx` | Adicionar botão "Gerar Cartaz" nas ações rápidas |

## Detalhes técnicos

### Edge Function
- Recebe tipo, estilo, título, data, horário, local, detalhes e cor
- Monta um prompt em português otimizado para gerar um flyer/cartaz vertical (9:16)
- Usa `google/gemini-2.5-flash-image` com `modalities: ["image", "text"]`
- Retorna imagem base64
- Trata erros 429 (rate limit) e 402 (créditos)

### Frontend
- Wizard com 4 steps, navegação voltar/avançar
- No passo final, exibe loading enquanto gera
- Imagem exibida com botão "Baixar" (download direto) e "Gerar outro"
- Responsivo para mobile

### Acesso
- Pastor, Admin e Diretoria (mesmas permissões já existentes)

