

# Acesso Diretoria via PIN por Sociedade

## Visão Geral
Substituir o login com usuário/senha da Diretoria por um sistema de PIN por sociedade (igual à Secretaria EBD). Cada sociedade terá seu PIN. Ao entrar, a pessoa informa nome completo e função na diretoria. Essa identificação fica salva no dispositivo para acessos futuros.

## Fluxo do Usuário

```text
Auth (step 'select')
  └─ Clica "Diretoria"
       └─ Mostra cards das sociedades (UMP, SAF, UPH, UPA, UCP)
            └─ Clica na sociedade
                 └─ PinPad (6 dígitos)
                      └─ PIN correto?
                           ├─ Já tem nome salvo no device? → "Você é Fulano?" (confirmar/trocar)
                           └─ Não tem → Formulário: Nome completo + Função (Presidente, Tesoureiro, etc.)
                                └─ Salva no localStorage + entra no dashboard da sociedade
```

## Mudanças

### 1. Banco de Dados - Tabela `settings`
Inserir um PIN padrão para cada sociedade ativa. Chave: `diretoria_pin_{society_slug}` (ex: `diretoria_pin_ump`).

### 2. Tela de Login (`src/pages/Auth.tsx`)
- Quando clica "Diretoria", em vez de ir para o formulário de login, mostrar **cards das sociedades** (buscar da tabela `societies`).
- Ao clicar em uma sociedade, mostrar o **PinPad** (reutilizar o componente existente).
- Validar o PIN contra `settings` (chave `diretoria_pin_{slug}`).
- Após PIN correto:
  - Checar `localStorage` por nome salvo (`diretoria_name_{slug}`).
  - Se existe: tela "Você é Fulano?" com opções Sim/Não.
  - Se não: formulário com Nome Completo + Função (select: Presidente, Vice, Secretário, Tesoureiro, Outro).
- Salvar no localStorage: `diretoria_name_{slug}` e `diretoria_function_{slug}`.
- **Não faz login Supabase** — acessa como sessão local (similar à Secretaria EBD).

### 3. Contexto de Sessão Diretoria
Criar um contexto leve (`DiretoriaSessionContext`) ou usar estado no `Auth.tsx` + rota protegida:
- Armazena: `societyId`, `societySlug`, `operatorName`, `operatorFunction`.
- As páginas de diretoria usam esse contexto para registrar "quem fez o quê".
- O acesso ao Supabase continua via anon key (as tabelas já têm RLS, então precisaremos ajustar).

### 4. Gestão de PINs (`src/pages/Configuracoes.tsx`)
Na seção admin, adicionar card "PINs da Diretoria" listando cada sociedade com input de PIN de 6 dígitos + botão salvar. Reutilizar o padrão da Secretaria EBD.

## Problema de Arquitetura: RLS

O sistema atual usa autenticação Supabase (login com senha) e RLS baseado em `auth.uid()` + `user_roles`. Se a Diretoria entrar só com PIN (sem login Supabase), as queries ao banco falharão por falta de `auth.uid()`.

**Duas opções:**

**Opção A — PIN + Login Supabase híbrido**: Manter o login com usuário/senha como está, mas adicionar o PIN como camada de conveniência. O PIN identifica a sociedade, mas o login Supabase ainda é necessário para o RLS funcionar. **Mais seguro, menos mudança.**

**Opção B — PIN puro (sem login)**: Criar uma conta "service" por sociedade no Supabase e fazer login automático com ela após o PIN. O nome/função fica no contexto local. **Mais simples para o usuário, mais complexo na infra.**

Preciso que você escolha antes de implementar.

