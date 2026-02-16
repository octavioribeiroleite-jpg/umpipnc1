

## Configurar PWA com ícone personalizado UMP

### O que será feito

Transformar o app em um PWA (Progressive Web App) instalável, usando a imagem da UMP como ícone do app no celular.

### Etapas

1. **Copiar o ícone para o projeto**
   - Salvar a imagem enviada em `public/icons/icon-512x512.png`
   - Criar versao 192x192 referenciando o mesmo arquivo (o navegador redimensiona)

2. **Criar o arquivo `public/manifest.json`**
   - Nome do app: "UMP"
   - Nome curto: "UMP"
   - Cores do tema baseadas no azul marinho do logo
   - Ícones em 192x192 e 512x512
   - Display: standalone (para parecer app nativo)

3. **Criar o Service Worker (`public/sw.js`)**
   - Cache básico para funcionamento offline
   - Estratégia cache-first para assets estáticos

4. **Atualizar `index.html`**
   - Adicionar link para o manifest
   - Adicionar meta tags para tema e cor
   - Adicionar link para o favicon com a nova imagem
   - Registrar o service worker

### Resultado

Ao acessar o site pelo celular, o navegador vai oferecer a opção "Adicionar à tela inicial". O app aparecerá com o ícone da UMP, abrirá em tela cheia (sem barra do navegador) e terá aparência de app nativo.

### Detalhes técnicos

- Manifest configurado com `display: standalone`, `theme_color: #1B2A4A`, `background_color: #ffffff`
- Service worker com cache de assets estáticos para carregamento rápido
- Favicon atualizado para usar a mesma imagem da UMP

