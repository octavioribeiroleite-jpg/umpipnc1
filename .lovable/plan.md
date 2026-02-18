
# Suporte Offline Basico para o App

## O que muda para o usuario

- Ao abrir o app sem internet, ele carrega normalmente (a interface aparece)
- Um banner discreto aparece avisando "Voce esta offline" quando nao ha conexao
- Os dados que o usuario ja viu antes (eventos, tarefas, reunioes) continuam visiveis
- Quando a conexao voltar, o banner some e os dados atualizam automaticamente

## Mudancas tecnicas

### 1. Melhorar o Service Worker (`public/sw.js`)

- Pre-cachear todos os assets estaticos do build (JS, CSS, fontes, imagens)
- Adicionar uma pagina de fallback offline para rotas nao cacheadas
- Usar estrategia "cache-first" para assets estaticos (JS/CSS/imagens) e "network-first" para navegacao HTML
- Excluir chamadas de API do cache do service worker (o React Query ja cuida disso)
- **Excluir** a rota `/~oauth` do cache (requisito tecnico para autenticacao funcionar)

### 2. Criar componente de aviso offline (`src/components/OfflineBanner.tsx`)

- Detecta estado da conexao usando `navigator.onLine` e eventos `online`/`offline`
- Mostra um banner fixo no topo: "Sem conexao. Os dados exibidos podem estar desatualizados."
- O banner some automaticamente quando a internet volta
- Animacao suave de entrada/saida

### 3. Configurar cache de dados com React Query

- No `App.tsx`, ajustar as opcoes globais do React Query para:
  - `gcTime` (garbage collection time) maior para manter dados em memoria por mais tempo
  - `staleTime` maior para nao re-buscar dados desnecessariamente
  - `retry` inteligente que para de tentar quando offline
- Isso faz com que dados ja carregados continuem visiveis mesmo sem internet

### 4. Adicionar o banner no layout

- Incluir `OfflineBanner` no `AppLayout.tsx` e no `PastorLayout.tsx` para que apareca em todas as paginas

## Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `public/sw.js` | Melhorar estrategia de cache com pre-cache de assets e fallback offline |
| `src/components/OfflineBanner.tsx` | Novo componente de aviso de conexao |
| `src/components/layout/AppLayout.tsx` | Incluir OfflineBanner |
| `src/components/pastor/PastorLayout.tsx` | Incluir OfflineBanner |
| `src/App.tsx` | Ajustar configuracoes do React Query para melhor cache offline |

## Limitacoes

- O usuario **nao podera criar ou editar** dados enquanto estiver offline (apenas visualizar o que ja foi carregado)
- Se o usuario nunca abriu o app antes, a primeira abertura precisa de internet
- Arquivos anexados (PDFs, imagens) so ficam disponiveis offline se ja foram abertos antes
