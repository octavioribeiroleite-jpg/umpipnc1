# Entrega — tema do sistema e acesso EBD

## Comportamento

O aplicativo acompanha automaticamente `prefers-color-scheme`: ao abrir, ao mudar a preferência com a tela aberta e ao voltar de uma suspensão. Não salva uma preferência própria nem altera credenciais, sessões ou regras de acesso. O script inicial aplica o tema antes das folhas de estilo e do módulo React; `color-scheme` também adapta os controles nativos. A composição do navegador/PWA representa a superfície visível, inclusive nos diálogos.

Os tokens escuros usam uma base quase preta, textos claros e verde institucional com contraste nos botões. Overrides locais cobrem as entradas, PINs, EBD, Diretoria, Tesouraria, Pastor e Portal. Os arquivos, as cores e as proporções da logo, assim como os fluxos existentes, foram preservados. O modo claro permaneceu intacto nos overrides de tema.

O PIN da EBD usa o mesmo componente visual da Diretoria, com proporções menores na entrada mobile e no diálogo de renovação. Em 375 × 740 e 390 × 844, com áreas seguras simuladas, o teclado, as seis posições e a confirmação preenchida ficam visíveis sem rolagem. Os alvos de toque das ações mantêm pelo menos 44 px. O texto completo “Voltar para a Home” permanece disponível. A identificação agora distingue Secretaria EBD e Professor, sem alterar verificações de PIN, handlers ou os dados preenchidos.

Os ícones e propriedades de lançamento do manifest permanecem iguais. Service Worker: `ump-cache-v22`; URL versionada `2026-10-06-system-theme-v14`. A cor estática do splash nativo depende do navegador/OS e não representa o tema HTML dinâmico; não foi testada num aparelho físico.

## Validação

- Suite completa final: 399 testes passaram, incluindo PWA, tema inicial/dinâmico, isolamento da fixture e quatro verificações dos PINs reais da EBD.
- Tipos, lint dos arquivos novos/controlador/AppShell/fixtures e diff-check passaram.
- Lint de Secretaria.tsx registra 13 erros preexistentes de `no-explicit-any`: comparação com a base 0fa8e98 confirmou os mesmos 13 diagnósticos, sem erro novo desta alteração.
- Build produtivo passou; avisos preexistentes sobre Browserslist antigo, import estático/dinâmico de Sonner e tamanho dos chunks permanecem explícitos.
- QA isolada em dados fictícios está em README.md, summary.json e capturas desta pasta. Nenhuma consulta/alteração de dados reais foi usada para testar.
- Capturas e medidas adicionais registram o PIN EBD vazio, preenchido, carregando e com erro fictício, nos temas claro e escuro. A aparência estática do splash nativo não foi tratada como validada.

## Referências técnicas

A detecção utiliza [prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-color-scheme). O documento declara [color-scheme](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/color-scheme) e atualiza [theme-color](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/theme-color); a aparência do [background_color do manifest](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/background_color) é controlada pelo navegador/OS.
