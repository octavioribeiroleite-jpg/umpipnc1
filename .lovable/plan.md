

# Melhorias na Pagina de Gestao de Usuarios (Mobile)

## Problemas Identificados na Screenshot

1. **Botao "Novo Usuario" ocupa espaco no header do card** - Deveria ser um FAB no mobile
2. **Abas de sociedade ocupam muito espaco vertical** - Grid de badges com contadores toma quase 1/3 da tela
3. **Tabela nao e adaptada para mobile** - Colunas Nome/Usuario/Senha/Cargo/Acoes nao cabem, forcando scroll horizontal ou layout quebrado
4. **Sem indicacao clara de qual aba esta selecionada** - As abas parecem badges estaticos

## Alteracoes Planejadas

### 1. `src/pages/Usuarios.tsx` - Layout mobile otimizado

**Botao "Novo Usuario":**
- Trocar por FAB (botao flutuante) no mobile, igual foi feito em Reunioes
- Manter botao normal no desktop

**Abas de sociedade:**
- No mobile, usar um `Select` dropdown em vez de tabs para selecionar a sociedade
- Mostrar a contagem de usuarios dentro do dropdown
- No desktop, manter as tabs atuais

**Tabela no mobile:**
- Substituir a tabela por cards empilhados no mobile
- Cada card mostra: nome, usuario, badge do cargo, e botoes de acao
- Senha fica acessivel via botao de olho dentro do card
- No desktop, manter a tabela atual

## Detalhes Tecnicos

### Select de sociedade (mobile)
- Usar `useIsMobile()` para detectar
- Criar estado `selectedSociety` controlado
- Renderizar `Select` com opcoes coloridas (bolinha + nome + contagem)

### Cards de usuario (mobile)
- Layout vertical com nome em destaque, username abaixo
- Linha com badge de cargo + botoes de acao (editar, excluir)
- Linha de senha com toggle show/hide
- Select de cargo inline no card

### FAB
- Importar `FAB` de `@/components/ui/fab`
- Posicionar `fixed bottom-20 right-4` como nas Reunioes
- Esconder botao do header com `hidden md:inline-flex`

