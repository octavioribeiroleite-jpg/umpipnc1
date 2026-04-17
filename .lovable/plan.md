

## Diagnóstico real

Encontrei a causa raiz. O site publicado **já tem** `sw.js` v5 e o HTML/JS atualizado (deploy `04e94f83...`, bundle `index-BGKtDdin.js`). O código novo está no servidor.

**O problema é o navegador do seu PC**, que ainda tem o **service worker antigo (v3 ou anterior)** instalado e ativo. O SW antigo:

1. Foi registrado da versão anterior do `index.html` (que tinha `register('/sw.js')` inline).
2. Está servindo o `index.html` em **cache-first** (estratégia antiga, agressiva).
3. Como ele intercepta o HTML, o navegador **nunca chega a baixar o novo `index.html`** — e portanto nunca baixa o novo `sw.js` v5, nem o novo banner "Atualizar agora", nem o `registerSW.ts`.
4. Resultado: você está preso num loop de cache antigo. Ctrl+Shift+R no Chrome/Edge **não desinstala SW** — só ignora cache HTTP.

Por que o "Atualizar agora" não aparece: o componente `UpdateAvailableBanner` está no JS novo, que o seu navegador nunca recebeu, porque o SW antigo serve o HTML velho que carrega o JS velho.

## Plano de correção

Estratégia: forçar uma **morte total e definitiva** do service worker antigo, no próximo carregamento, via um pequeno script inline no `index.html` que roda **antes** de qualquer outro código. Esse script:

1. Detecta qualquer SW registrado e o **desinstala incondicionalmente**.
2. Limpa todos os caches `ump-cache*`.
3. Se encontrou e removeu algo, faz **um único reload** automático para puxar a versão limpa.
4. Só depois disso o app normal carrega e o `registerSW.ts` registra o SW novo (v5) com a estratégia network-first para HTML.

Como isso roda inline no `<head>`, ele **executa mesmo se o JS antigo estiver em cache** — porque o HTML, ao ser revalidado pelo SW antigo, já foi atualizado no servidor (deploy de hoje). Para garantir 100%, vou adicionar um `<meta http-equiv="Cache-Control" content="no-cache">` para o HTML.

### Arquivos a alterar

1. **`index.html`** — adicionar:
   - `<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">` 
   - Script inline de "kill switch" do SW antigo (executa antes de tudo, com flag em `sessionStorage` para evitar loop).

2. **`src/lib/registerSW.ts`** — pequeno ajuste: garantir que, em produção, se houver caches antigos `ump-cache-v1` até `v4`, eles sejam apagados antes de registrar o v5.

3. **`public/sw.js`** — reforçar: bumpar `CACHE_NAME` para `ump-cache-v6` para invalidar qualquer cache de versão intermediária e garantir que clientes que recebem o novo SW realmente troquem de cache.

### Resultado esperado

- Próximo refresh no PC: o kill-switch desinstala o SW velho → reload automático único → app novo carrega com SW v6 → "Atualizar agora" passa a funcionar a partir daí.
- Publicações futuras: sem necessidade de cache-busting manual.
- App instalado/PWA: mantido funcional.
- Tela de votação (som de urna + 15s): aparece imediatamente após o reload automático.

