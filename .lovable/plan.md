

# Fluxo Estruturado de Eleicao com Cadastro de Dispositivos Fixos

## Problema Atual

Hoje, os QR Codes aparecem assim que a votacao e iniciada, sem uma etapa previa de planejamento dos dispositivos fixos. O usuario quer um fluxo mais seguro e organizado.

## Nova Ordem Proposta (5 etapas sequenciais)

O accordion da eleicao tera as seguintes secoes, com indicadores visuais de "concluido" em cada etapa:

```text
1. Candidatos         [v] Concluido (2 candidatos)
2. Modo de Votacao    [v] Ambos selecionado
3. Dispositivos Fixos [v] 2 urnas cadastradas  (so aparece no modo "Ambos" ou "Urna Fixa")
4. Chamada de Presenca [v] 15 presentes
5. Votacao            [ ] Aguardando...  -> Botao "Iniciar Votacao" (so libera quando 1-4 estao ok)
```

Os QR Codes so aparecem APOS clicar em "Iniciar Votacao", que so fica habilitado quando todas as etapas anteriores estao completas.

## Etapa 3: Cadastro de Dispositivos Fixos (nova)

Quando o modo for "Ambos" ou "Urna Fixa", aparece uma secao para cadastrar as urnas fixas:

- Campo para adicionar um rotulo (ex: "Mesa 1", "Entrada", "Salao Principal")
- Lista dos dispositivos cadastrados com botao de remover
- Cada dispositivo gera um link unico com token: `/vote/{id}?mode=urna&token={uuid}`
- O QR Code so e gerado e exibido apos a votacao ser iniciada

Isso permite que a diretoria planeje quantas urnas terao e onde ficarao ANTES de iniciar.

## Tabela no Banco de Dados (nova)

Criar tabela `election_devices` para registrar os dispositivos fixos:

- `id` (uuid, PK)
- `election_id` (uuid, FK para elections)
- `label` (text) - nome/rotulo do dispositivo (ex: "Mesa 1")
- `token` (uuid) - token unico para autenticacao do dispositivo
- `activated` (boolean, default false) - se ja foi ativado com senha
- `created_at` (timestamp)

Politicas RLS:
- SELECT: autenticados podem ver
- ALL: apenas admin/diretoria podem gerenciar

## Mudancas na Autenticacao da Urna (VotePublic.tsx)

Em vez de usar apenas `?mode=urna`, o link agora sera `?mode=urna&token={uuid}`:

1. Ao abrir, verifica se o `token` existe na tabela `election_devices`
2. Se o token for invalido, mostra "Dispositivo nao cadastrado"
3. Se valido, mostra a tela de login (admin/diretoria) como ja funciona
4. Apos autenticar, marca `activated = true` na tabela
5. Funciona como urna compartilhada

Isso adiciona uma camada extra: mesmo que alguem veja o QR Code da urna, o token precisa estar cadastrado.

## Mudancas no Painel Admin (VotingPanel.tsx)

### Status Draft - Secao "Dispositivos Fixos"
- Lista de dispositivos cadastrados com rotulo
- Botao "Adicionar Urna" para cadastrar novo dispositivo
- Cada item mostra: rotulo + status (cadastrado/ativado)

### Status Open - Aba "Urna Fixa"
- Mostra a lista de dispositivos cadastrados
- Cada um com seu QR Code proprio (com token unico)
- Indicador de status: "Aguardando ativacao" ou "Ativada"
- Os QR Codes so podem ser revelados um por um ao clicar

## Mudancas no EleicaoDetalhe.tsx

Nova secao no accordion (posicao 3), visivel apenas quando modo = 'both' ou 'shared':

```text
Dispositivos Fixos (icone Monitor)
```

O botao "Iniciar Votacao" valida:
- Pelo menos 1 candidato cadastrado
- Modo de votacao definido
- Se modo inclui urna fixa: pelo menos 1 dispositivo cadastrado
- Chamada realizada (total_present > 0)

## Novo Componente: DeviceRegistration.tsx

Componente para gerenciar os dispositivos fixos:
- Props: `electionId`, `disabled`, `onRefresh`
- Formulario simples: campo de texto para rotulo + botao adicionar
- Lista de dispositivos com rotulo e botao remover
- Contador: "X dispositivos cadastrados"

## Arquivos Alterados

1. **Migracao SQL** - Criar tabela `election_devices` com RLS
2. **`src/components/eleicoes/DeviceRegistration.tsx`** (novo) - Componente de cadastro de dispositivos
3. **`src/pages/EleicaoDetalhe.tsx`** - Adicionar secao "Dispositivos Fixos" no accordion
4. **`src/components/eleicoes/VotingPanel.tsx`** - Mostrar QR Codes individuais por dispositivo na aba "Urna Fixa"; validar etapas antes de iniciar
5. **`src/pages/VotePublic.tsx`** - Validar token do dispositivo; marcar como ativado apos autenticacao

## Seguranca

- Token unico por dispositivo (UUID) - dificil de adivinhar
- Autenticacao de admin/diretoria ainda e obrigatoria
- Dispositivo precisa estar pre-cadastrado para funcionar
- Status de ativacao visivel no painel admin
- RLS protege a tabela de dispositivos

## Fluxo Completo (passo a passo)

1. Diretoria cadastra os candidatos
2. Escolhe o modo "Ambos"
3. Cadastra os dispositivos fixos (ex: "Mesa 1", "Mesa 2")
4. Faz a chamada de presenca
5. Clica em "Iniciar Votacao" (so habilitado se tudo esta pronto)
6. QR Codes aparecem: um geral para celulares, e um por dispositivo fixo
7. Mesarios abrem o QR da urna fixa no dispositivo correspondente
8. Digitam credenciais de admin/diretoria para ativar
9. Urna fica ativa para votacao compartilhada

