

# Portal Aberto com Identificacao por Formulario

## Resumo

Transformar a area de membros em um portal aberto (sem login/senha), onde qualquer pessoa que acessar pela primeira vez preenche um formulario rapido com nome completo e sociedade (ou "Visitante"). Essa informacao fica salva no dispositivo (localStorage) e registrada no banco para relatorios do admin.

## Como vai funcionar

### Primeiro acesso no dispositivo
Ao acessar `/igreja`, se nao houver identificacao salva no dispositivo, aparece um formulario simples:

```text
+-----------------------------------------------+
|  [Logo IPNC]                                    |
|                                                 |
|  Bem-vindo a Igreja Presbiteriana               |
|  de Nova Carapina!                              |
|                                                 |
|  Nome completo:                                 |
|  [____________________________]                 |
|                                                 |
|  Voce e integrante de qual sociedade?           |
|  ( ) UMP                                        |
|  ( ) SAF                                        |
|  ( ) UPH                                        |
|  ( ) UPA                                        |
|  ( ) UCP                                        |
|  ( ) Visitante                                  |
|                                                 |
|           [Entrar]                              |
+-----------------------------------------------+
```

### Apos identificacao
- Dados salvos no `localStorage` do dispositivo
- Registro salvo no banco (tabela `portal_visitors`)
- O portal abre normalmente com as abas: Inicio, Programacoes, Avisos, Dizimos
- Na proxima vez que abrir no mesmo dispositivo, vai direto pro portal

### Relatorio para o Admin
- Nova secao na area administrativa mostrando:
  - Quantas pessoas acessaram no mes
  - Quantos visitantes vs membros
  - Lista de acessos recentes com nome, sociedade/visitante e data

## Mudancas no Banco de Dados

### Nova tabela: `portal_visitors`

```sql
CREATE TABLE public.portal_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  society_id uuid REFERENCES public.societies(id),
  is_visitor boolean NOT NULL DEFAULT false,
  device_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_access timestamptz NOT NULL DEFAULT now()
);
```

- `full_name`: nome informado pela pessoa
- `society_id`: sociedade escolhida (null se visitante)
- `is_visitor`: true se marcou "Visitante"
- `device_id`: identificador unico gerado no navegador (UUID salvo no localStorage)
- `last_access`: atualizado a cada acesso

### Politicas RLS
- **INSERT para anon**: qualquer pessoa pode se registrar
- **UPDATE para anon**: pode atualizar `last_access` do proprio device_id
- **SELECT para admin/diretoria**: apenas gestao ve os relatorios

### Politicas anon para dados publicos (mesmas do plano anterior)
- `events`: SELECT para anon (eventos nao cancelados)
- `pastor_announcements`: SELECT para anon (scope = 'church')
- `settings`: SELECT para anon (chaves PIX)

## Arquivos

### 1. Migracao SQL (novo)
- Criar tabela `portal_visitors`
- Criar politicas RLS para a nova tabela
- Criar politicas anon para `events`, `pastor_announcements`, `settings`

### 2. `src/pages/PortalIgreja.tsx` (novo)
Pagina principal do portal publico com 2 estados:

**Estado 1 - Formulario de identificacao** (primeiro acesso):
- Campo nome completo (obrigatorio)
- Radio buttons com as sociedades ativas + opcao "Visitante"
- Botao "Entrar"
- Ao submeter: salva no localStorage + insere na tabela `portal_visitors`

**Estado 2 - Portal com abas** (ja identificado):
- Header com logo + nome da pessoa + botao "Fazer Login" (vai para `/auth`)
- 4 abas no rodape: Inicio, Programacoes, Avisos, Dizimos
- Aba Inicio: boas-vindas + cards de acesso rapido
- Aba Programacoes: proximos eventos (sem filtro de sociedade)
- Aba Avisos: comunicados com scope "church"
- Aba Dizimos: chave PIX com botao copiar (reutiliza logica do MembroDizimos)
- Nao usa `useAuth()` -- funciona sem sessao do Supabase

### 3. `src/App.tsx`
- Importar `PortalIgreja`
- Adicionar rota `<Route path="/igreja" element={<PortalIgreja />} />`

### 4. `src/pages/Auth.tsx`
- Adicionar botao "Acessar sem login" abaixo dos cards de perfil
- Navega para `/igreja`

### 5. `src/pages/Configuracoes.tsx` (ou nova secao admin)
- Adicionar secao "Relatorio de Acessos ao Portal"
- Busca dados da tabela `portal_visitors`
- Mostra:
  - Total de acessos no mes atual
  - Quantidade de visitantes vs membros
  - Lista com nome, sociedade/visitante e data do primeiro acesso
  - Filtro por periodo (mes/semana)

## Fluxo Completo

1. Pessoa acessa `/igreja` (ou clica "Acessar sem login" na tela de login)
2. Se e primeiro acesso no dispositivo: preenche nome + sociedade/visitante
3. Dados salvos no localStorage e no banco
4. Portal abre com as informacoes publicas da igreja
5. A cada novo acesso no mesmo dispositivo, atualiza `last_access` no banco
6. Admin pode ver na area de configuracoes quem acessou, quantos visitantes receberam, etc.

## Seguranca

- Apenas dados publicos ficam acessiveis (eventos, avisos gerais, PIX)
- A tabela `portal_visitors` permite INSERT/UPDATE anonimo apenas para o proprio `device_id`
- Relatorios so sao visiveis para admin/diretoria
- Nenhum dado sensivel e exposto
- O formulario nao substitui o login -- quem quiser funcionalidades completas (pagamentos, cobrancas) continua usando login/senha
