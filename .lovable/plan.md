

# Substituir Drawers/Dialogs por Visualização Full-Screen Inline

## Problema
O conteúdo dentro dos drawers ainda transborda horizontalmente. Os cards internos (como RegistroReuniaoEditor) têm larguras fixas e padding que ultrapassam a viewport no mobile.

## Nova Abordagem
Abandonar completamente o `ResponsiveDialog` (drawer/dialog) e usar uma **visualização inline full-screen** controlada por estado. Quando o usuário clica em um card, o grid desaparece e o conteúdo do card ocupa a página inteira, com um botão "Voltar" no topo — como se fosse uma navegação de página.

## Mudanças

### `src/pages/ReuniaoDetalhe.tsx`
- Remover todas as importações de `ResponsiveDialog` e componentes relacionados
- Usar renderização condicional: se `openSheet` é `null`, mostra o header + grid de cards. Se `openSheet` tem valor, mostra o header com botão voltar + título da ferramenta + conteúdo da ferramenta ocupando toda a área
- Layout:
  ```text
  openSheet === null:
  ┌──────────────────────┐
  │ ← Título    [Badge]  │
  │   data/hora           │
  │ [Alert se fechada]    │
  │ ┌────────┐ ┌────────┐│
  │ │Registro│ │Resumo  ││
  │ ├────────┤ ├────────┤│
  │ │Ata     │ │WhatsApp││
  │ ├────────┤ ├────────┤│
  │ │Pauta   │ │Ações   ││
  │ └────────┘ └────────┘│
  └──────────────────────┘

  openSheet === 'registro':
  ┌──────────────────────┐
  │ ← Registro da Reunião│
  │                       │
  │ [Conteúdo full-width] │
  │ [sem Card wrapper]    │
  │ [scroll natural]      │
  └──────────────────────┘
  ```

### `src/components/reunioes/RegistroReuniaoEditor.tsx`
- Remover o wrapper `<Card>` / `<CardHeader>` / `<CardContent>` para que o conteúdo flua direto sem padding extra
- Ou: adicionar prop `embedded?: boolean` que quando `true` remove o Card wrapper e renderiza o conteúdo diretamente com `w-full overflow-hidden`

### Limpeza
- Remover import de `ResponsiveDialog` do arquivo
- O `responsive-dialog.tsx` permanece no projeto pois pode ser usado em outros lugares

## Detalhes Técnicos
- Botão voltar no topo: `<Button variant="ghost" onClick={() => setOpenSheet(null)}><ArrowLeft /> {título}</Button>`
- Conteúdo renderizado dentro do `<AppLayout>` normal, usando toda a largura disponível
- Sem max-width, sem padding extra, sem overlay — conteúdo nativo na página
- Os componentes filhos (AtaViewer, ComunicacaoTab, etc.) herdam `w-full` naturalmente

