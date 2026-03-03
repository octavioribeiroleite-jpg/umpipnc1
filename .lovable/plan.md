

# Redesign da Página de Detalhe da Reunião

## Problema Atual
A página tem muitos elementos empilhados verticalmente (header, badge de status, alerta de fechada, tabs, conteúdo) que ocupam muito espaço e dificultam a visualização no mobile. As abas inline empurram o conteúdo para baixo.

## Nova Abordagem

### Layout Compacto com Sheets/Drawers

Substituir as Tabs por um layout onde:

1. **Header compacto**: título + data + status badge + botão voltar, tudo em uma área condensada
2. **Alerta de reunião fechada**: manter inline mas mais compacto
3. **Grid de botões/cards**: substituir as TabsList por uma grade 2x3 de cards clicáveis, cada um representando uma ferramenta:
   - 📝 Registro
   - 🤖 Resumo IA  
   - 📄 Ata
   - 💬 WhatsApp
   - 📋 Pauta
   - ⚙️ Ações (reabrir, excluir ata, editar — apenas para moderador/gestão)
4. **Ao clicar em um card**: abrir o conteúdo em um **Sheet** (drawer de baixo para cima no mobile, dialog no desktop) que sobrepõe a página, em vez de renderizar inline

### Arquivos a Alterar

**`src/pages/ReuniaoDetalhe.tsx`**:
- Remover `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`
- Adicionar estado `openSheet: string | null` para controlar qual sheet está aberto
- Criar grid de cards com ícones (grid-cols-2 gap-3)
- Cada card abre um `ResponsiveDialog` (drawer no mobile, dialog no desktop) com o conteúdo correspondente
- Mover ações de gestão (reabrir, excluir ata) para o card "Ações" ou manter no alerta
- O card "Registro" fica destacado como principal

### Detalhes da UI

**Cards na grid:**
- Cada card: ícone + título + descrição curta
- Cards com indicador visual se tem conteúdo (ex: badge "✓" no Ata se já foi gerada)
- Card "Registro" maior ou destacado como ação principal

**Sheet/Dialog:**
- Abre quase em tela cheia no mobile (sheet de baixo, altura ~90vh)
- Header com título + botão fechar
- Conteúdo scrollável
- No desktop: dialog com max-w-4xl

