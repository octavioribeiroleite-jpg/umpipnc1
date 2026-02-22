
# Tela de boas-vindas para visitantes + confirmacao de retorno + cores do menu

## 1. Tela de boas-vindas para visitantes (novo)

Quando um visitante (que marcou "Sou visitante") completar o formulario de identificacao pela primeira vez, antes de entrar no portal, sera exibida uma tela especial de boas-vindas:

- Logo da igreja grande e centralizada (128px), com animacao suave de fade-in
- Titulo: "Que alegria ter voce aqui!" (texto grande, bold)
- Mensagem acolhedora: "Seja muito bem-vindo a nossa igreja! E uma honra receber voce. Que este momento seja especial e que voce se sinta em casa entre nos. Deus te abencoe!"
- Nome da pessoa em destaque: "Obrigado pela sua visita, **[Nome]**!"
- Icone decorativo de coracao com animacao
- Botao "Entrar no Portal" (primario, grande) para prosseguir
- Fundo com gradiente sutil verde/transparente
- Animacoes de entrada (fade-in, scale-in) para dar vida a tela

Para membros (que escolheram uma sociedade), a tela de boas-vindas nao aparece -- entra direto no portal como hoje.

## 2. Confirmacao de retorno para todos

Quando a pessoa ja tem dados salvos no localStorage (retornando ao portal):

- Tela simples com logo centralizada
- "Bem-vindo de volta!"
- "Voce e **[Nome Completo]**?"
- Botao "Sim, sou eu" (primario) -- registra nova visita e entra
- Botao "Nao, sou outra pessoa" (outline) -- limpa localStorage e mostra formulario

Cada confirmacao gera um novo INSERT no `portal_visitors`, servindo como log de presenca.

## 3. Corrigir cor do menu lateral

Trocar classes do Sheet sidebar de `bg-sidebar`/`text-sidebar-*` para `bg-card`/`text-foreground`/`bg-primary` etc., seguindo as cores gerais do app.

## 4. Painel de visitantes para Pastor e Admin (`Configuracoes.tsx`)

- Tornar o relatorio do portal visivel tambem para o Pastor
- Adicionar coluna "Hora" na tabela de acessos
- Adicionar badge "Novo" vs "Retornou" por device_id
- Nova secao "Visitantes recorrentes" agrupando por nome+dispositivo com contagem de visitas

## Detalhes tecnicos

### Fluxo atualizado do `PortalIgreja`

```text
tem localStorage?
  Sim -> Tela "Voce e fulano?" (ReturnVisitorConfirm)
    "Sim" -> INSERT portal_visitors + entra no portal
    "Nao"  -> limpa localStorage -> formulario
  Nao -> Formulario de identificacao
    Preencheu -> salva localStorage
      E visitante? -> Tela de boas-vindas (WelcomeScreen) -> botao "Entrar"
      E membro?    -> entra direto no portal
```

### Novo componente `WelcomeScreen`
- Props: `visitor: VisitorData`, `onContinue: () => void`
- Logo 128px com `animate-fade-in`
- Textos com delay de animacao escalonado
- Botao grande primario

### Novo componente `ReturnVisitorConfirm`
- Props: `visitor: VisitorData`, `onConfirm: () => void`, `onReset: () => void`
- Logo centralizada, pergunta com nome em bold
- Dois botoes

### Arquivos modificados
- `src/pages/PortalIgreja.tsx`: novos componentes WelcomeScreen e ReturnVisitorConfirm, ajuste no fluxo principal, correcao de cores do Sheet
- `src/pages/Configuracoes.tsx`: acesso para pastor, melhorias no relatorio de visitantes
