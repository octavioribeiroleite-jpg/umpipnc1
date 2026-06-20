## Objetivo
Conectar um domínio **.com.br** (que você ainda vai comprar) ao seu app publicado e configurar o **GitHub** para você editar o código com sincronização automática.

> Importante: estas etapas são feitas por você na interface do Lovable, GitHub e no registrador do domínio — não envolvem mudança de código no projeto.

---

## Parte 1 — Comprar o domínio .com.br

1. Domínios `.com.br` são registrados no **Registro.br** (oficial) ou em revendas (HostGator, GoDaddy, Hostinger, etc.).
2. Acesse https://registro.br, pesquise o nome desejado e finalize a compra (é necessário CPF/CNPJ válido).
3. Após comprar, você terá acesso ao painel de **DNS/Zona** desse domínio — é onde os registros do passo 3 serão adicionados.

---

## Parte 2 — Publicar o app e conectar o domínio

1. No Lovable, clique em **Publish** (canto superior direito) para gerar a URL pública `umpipnc1.lovable.app`.
2. Vá em **Project Settings → Domains → Connect Domain**.
3. Digite seu domínio (ex: `seusite.com.br`) e depois repita para `www.seusite.com.br` (os dois precisam ser adicionados).
4. O Lovable mostrará os registros DNS a configurar no Registro.br:
   - **A record** — Nome `@`, valor `185.158.133.1`
   - **A record** — Nome `www`, valor `185.158.133.1`
   - **TXT record** — Nome `_lovable`, valor de verificação fornecido pelo Lovable
5. No painel do Registro.br, adicione exatamente esses registros e salve.
6. Volte ao Lovable e aguarde a verificação. A propagação de DNS pode levar de alguns minutos até 72h. O SSL (https) é provisionado automaticamente.
7. Quando o status ficar **Active**, escolha qual será o domínio **Primary** (o outro redireciona).

---

## Parte 3 — Conectar o GitHub para editar o código

1. No Lovable, abra o menu **(+)** na caixa de chat → **GitHub → Connect project**.
2. Autorize o **Lovable GitHub App** na sua conta GitHub.
3. Escolha a conta/organização e clique em **Create Repository** — o Lovable cria o repositório com todo o código atual.
4. A partir daí a sincronização é **bidirecional e automática**:
   - O que você editar no GitHub aparece no Lovable.
   - O que for feito no Lovable é enviado ao GitHub.

### Como atualizar o site após editar
- **Mudanças de front-end (UI/visual):** depois de editar, clique em **Publish → Update** para o site no domínio atualizar.
- **Mudanças de back-end (banco, edge functions):** publicam automaticamente.

---

## Observações importantes
- O app **precisa estar publicado** antes de conectar o domínio.
- Conectar domínio personalizado e o badge "Edit with Lovable" exigem **plano pago**.
- Editar código (no GitHub ou no Lovable) também requer **plano pago**.
- Cuidado ao editar regras financeiras/banco direto no GitHub — sempre revise antes de mesclar, pois sincroniza direto para o app.

---

## O que eu posso fazer por você agora
Posso preparar o **metadata de publicação** (título e descrição da página para SEO/compartilhamento) antes de você publicar, deixando o site pronto para o domínio próprio. As etapas de compra de domínio, DNS e conexão GitHub são feitas por você nas interfaces indicadas, pois exigem suas credenciais.