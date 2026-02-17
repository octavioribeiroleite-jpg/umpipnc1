

# Corrigir Service Worker - Cache Impedindo Atualizacoes

## Problema
O Service Worker atual (`public/sw.js`) usa estrategia **cache-first**: ele sempre serve o conteudo do cache antes de tentar buscar da rede. Isso faz com que, apos publicar mudancas, os usuarios continuem vendo a versao antiga ate que o cache expire ou seja limpo manualmente.

## Solucao
Mudar a estrategia para **network-first** com fallback para cache. Isso garante que o usuario sempre receba a versao mais recente, e so use o cache quando estiver offline.

Tambem vamos incrementar a versao do cache (`CACHE_NAME`) para forcar a limpeza do cache antigo.

## Detalhes tecnicos

### Arquivo: `public/sw.js`

**Mudancas:**
1. Atualizar `CACHE_NAME` de `'ump-cache-v1'` para `'ump-cache-v2'` para invalidar o cache antigo
2. Mudar o handler do evento `fetch` de cache-first para **network-first**:
   - Tentar buscar da rede primeiro
   - Se a rede responder, salvar no cache e retornar
   - Se a rede falhar (offline), usar o cache como fallback
3. Manter o pre-cache de assets estaticos no install para funcionamento offline

**Codigo do novo fetch handler:**
```javascript
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
```

## Resultado esperado
- Usuarios sempre recebem a versao mais recente ao publicar
- App continua funcionando offline com fallback do cache
- Cache antigo (v1) sera automaticamente removido pelo evento `activate`
