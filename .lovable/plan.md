
# Melhorias no Portal da Igreja

## Resumo

Tres ajustes no portal publico (`/igreja`): adicionar aba "Dizimos" na navegacao inferior, adicionar menu hamburguer no header, e melhorar a mensagem de boas-vindas.

## Mudancas em `src/pages/PortalIgreja.tsx`

### 1. Adicionar aba "Dizimos" no bottom nav

Atualmente o portal tem 3 abas: Inicio, Programacoes, Avisos. Adicionar uma 4a aba "Dizimos" que mostra o card de dizimos (chave PIX) que hoje fica dentro do InicioTab.

- Novo tipo: `type PortalTab = 'inicio' | 'programacoes' | 'avisos' | 'dizimos';`
- Novo item no array `tabs`: `{ key: 'dizimos', label: 'Dizimos', icon: Heart }`
- Novo componente `DizimosPortalTab` extraido do bloco de dizimos que ja existe no `InicioTab`
- Renderizar `{activeTab === 'dizimos' && <DizimosPortalTab />}` no content
- Remover o card de dizimos do `InicioTab` (ja que tera aba propria)

### 2. Adicionar menu hamburguer no header

Adicionar um botao hamburguer no header do portal que abre um Sheet lateral com as opcoes de navegacao (mesmo padrao do MembroLayout), permitindo navegar entre as abas.

- Importar `Sheet`, `SheetContent`, `SheetTrigger`, `Menu` icon
- Estado `menuOpen` para controlar o Sheet
- Dentro do Sheet: logo, nome do visitante, lista de abas clicaveis, botao de login

### 3. Melhorar a mensagem de boas-vindas

Substituir o texto simples "Bem-vindo a IPNC!" por uma saudacao mais bonita com:
- Saudacao personalizada com o nome do visitante ("Ola, [nome]!")
- Subtitulo "Igreja Presbiteriana de Nova Carapina" em destaque
- Icone decorativo ou gradiente sutil no fundo
- Estilo mais visual com espacamento e tipografia melhores

## Detalhes tecnicos

### Estrutura do Portal (apos mudancas)

```text
Portal
  |-- Header (logo + nome + hamburguer + login)
  |-- Content
  |     |-- InicioTab (saudacao bonita + proximo evento + ultimo aviso)
  |     |-- ProgramacoesTab (sem mudancas)
  |     |-- AvisosTab (sem mudancas)
  |     |-- DizimosPortalTab (card PIX extraido do InicioTab)
  |-- Bottom Nav (4 abas: Inicio, Programacoes, Avisos, Dizimos)
```

### Header com hamburguer

```text
[Menu] [Logo] Portal da Igreja    [Login]
              Ola, nome!
```

O Sheet lateral tera:
- Logo + titulo "Portal da Igreja"
- Botoes de navegacao para cada aba
- Nome do visitante
- Botao de login

### Saudacao no InicioTab

Substituir o bloco simples por um design com gradiente e texto maior:
- "Ola, [primeiro nome]!" em fonte grande e bold
- "Bem-vindo a Igreja Presbiteriana de Nova Carapina" como subtitulo
- Background com gradiente sutil verde (cor primaria)
- Padding e border-radius generosos
