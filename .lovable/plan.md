
# Melhorar a aba de Dizimos no Portal

## Resumo

Adicionar uma mensagem inspiradora antes do card PIX e melhorar o visual geral da aba de Dizimos, tornando-a mais acolhedora e bonita.

## Mudancas em `src/pages/PortalIgreja.tsx` - componente `DizimosPortalTab`

### 1. Adicionar mensagem motivacional antes do card PIX

Antes do card com a chave PIX, inserir um bloco com:
- Um titulo acolhedor: "Contribua com alegria"
- Um versiculo biblico curto como motivacao: "Cada um de como propôs no seu coração, não com tristeza ou por necessidade; porque Deus ama ao que dá com alegria. — 2 Corintios 9:7"
- Fundo com gradiente sutil (mesmo padrao do InicioTab)
- Icone decorativo de coracao

### 2. Melhorar o card PIX

- Manter o layout atual mas adicionar mais respiro (padding)
- Tornar o botao "Copiar" mais proeminente (full-width em mobile)
- Exibir o tipo da chave PIX (que ja e carregado mas nao aparece)

### 3. Sugestao de instrucao para configurar

Na pagina de configuracao (`/dizimos`), no campo "Instrucoes para os membros", sugestoes de frases que podem ser usadas:
- "Coloque seu nome completo na descricao do PIX para identificacao."
- "Identifique seu pagamento com: Nome - Dizimo (ou Oferta)."
- "Em caso de duvidas, procure a diretoria."

Essas frases nao serao adicionadas automaticamente ao codigo, sao apenas sugestoes para o usuario preencher na configuracao.

## Detalhes tecnicos

### Bloco motivacional (novo, antes do card)
```text
[Gradiente verde sutil, rounded-2xl, padding generoso]
  [Icone Heart grande, cor primaria, opacidade 30%]
  "Contribua com alegria" (text-xl, bold)
  "Cada um de como propôs no seu coração..." (text-sm, italic, muted)
```

### Card PIX melhorado
```text
[Card com borda primaria]
  [Header gradiente: "Dizimos e Ofertas"]
  [Chave PIX + botao copiar]
  [Tipo da chave] (novo - exibir CPF/CNPJ/Email etc)
  [Beneficiario]
  [Instrucoes - bloco destaque]
```

### Mudancas especificas
- Linhas ~541-571: Reescrever o return do `DizimosPortalTab`
- Adicionar bloco de saudacao/motivacao antes do Card
- Mostrar `pixKeyType` formatado (ja carregado do banco mas nao exibido)
- Aumentar padding e melhorar espacamento geral
