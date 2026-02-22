

# Aba de Dizimos com Chave PIX para Membros

## Resumo

Criar uma nova aba "Dizimos" na area financeira do admin para configurar a chave PIX da igreja, e exibir essa informacao de forma destacada no portal dos membros com um botao de copiar a chave PIX.

## Como vai funcionar

### Para o Admin (pagina Financas)
- Nova aba **"Dizimos"** ao lado das abas existentes (Cobrancas, Comprovantes, etc.)
- Permite configurar:
  - Tipo da chave PIX (CPF, CNPJ, E-mail, Telefone, Chave aleatoria)
  - Valor da chave PIX
  - Nome do beneficiario (ex: "Igreja Presbiteriana Nova Cidade")
  - Mensagem/instrucoes para os membros (ex: "Coloque seu nome completo na descricao do PIX")
- As configuracoes sao salvas na tabela `settings` (que ja existe) com chaves como `pix_key`, `pix_key_type`, `pix_beneficiary`, `pix_instructions`

### Para os Membros (portal do membro)
- Nova aba **"Dizimos"** no menu lateral e navegacao do membro (ao lado de Inicio, Eventos, Pagamentos, Comunicados)
- Card grande e destacado com:
  - Titulo "Dizimos" com icone de coracao/oferenda
  - Chave PIX em destaque com botao "Copiar Chave PIX" (feedback visual ao copiar)
  - Nome do beneficiario para confirmacao
  - Instrucoes do admin (se houver)
  - Tipo da chave PIX para referencia

## Mudancas no Banco de Dados

Nenhuma migracao necessaria -- a tabela `settings` ja existe e usa pares chave/valor. Serao inseridos registros com as chaves:
- `pix_key` (valor da chave PIX)
- `pix_key_type` (tipo: cpf, cnpj, email, telefone, aleatoria)
- `pix_beneficiary` (nome do beneficiario)
- `pix_instructions` (instrucoes para os membros)

## Arquivos Alterados

### 1. `src/components/financas/DizimosTab.tsx` (novo)
- Componente para o admin configurar a chave PIX
- Formulario com campos: tipo da chave, valor da chave, beneficiario, instrucoes
- Carrega/salva na tabela `settings` via Supabase
- Preview de como o membro vera as informacoes

### 2. `src/pages/Financas.tsx`
- Importar e adicionar a aba "Dizimos" no TabsList e TabsContent
- Adicionar opcao no Select mobile

### 3. `src/components/membro/MembroDizimos.tsx` (novo)
- Componente do portal do membro
- Card grande e destacado com a chave PIX
- Botao "Copiar Chave PIX" usando `navigator.clipboard.writeText()`
- Toast de confirmacao "Chave PIX copiada!"
- Exibe tipo da chave, beneficiario e instrucoes
- Estado de loading e mensagem caso a chave PIX nao esteja configurada

### 4. `src/components/membro/MembroLayout.tsx`
- Adicionar 'dizimos' ao tipo `MembroTab`
- Adicionar item no menu: icone Heart/Church + label "Dizimos"

### 5. `src/pages/MembroHome.tsx`
- Importar `MembroDizimos`
- Adicionar case 'dizimos' no `renderContent()`

### 6. `src/components/membro/MembroInicio.tsx`
- Adicionar card de acesso rapido "Dizimos" na tela inicial do membro, com destaque visual (cor primaria, icone)
- Botao leva para `onTabChange('dizimos')`

## Layout do Card de Dizimos (Membro)

O card sera visualmente destacado para facilitar o acesso:

```text
+-----------------------------------------------+
|  [icone]  DIZIMOS                              |
|                                                |
|  Chave PIX:                                    |
|  +------------------------------------------+  |
|  |  12.345.678/0001-90          [COPIAR]    |  |
|  +------------------------------------------+  |
|                                                |
|  Beneficiario: Igreja Presb. Nova Cidade       |
|  Tipo: CNPJ                                    |
|                                                |
|  "Coloque seu nome na descricao do PIX"        |
+-----------------------------------------------+
```

## Seguranca

- A tabela `settings` ja tem RLS: admin pode gerenciar, autenticados podem ler
- Membros so tem acesso de leitura (SELECT) -- perfeito para visualizar a chave PIX
- Nenhuma informacao sensivel e exposta alem do que o admin configura

