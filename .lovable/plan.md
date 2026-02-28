

# Login Secretaria EBD com PIN Numérico

## Resumo
Substituir login com usuário/senha por seleção de perfil via cards + teclado numérico de 6 dígitos (estilo banco), agrupados 4+2.

## Implementação

### 1. Atualizar senhas no banco
- UPDATE `settings` → `secretaria_admin_password` = `140723`
- UPDATE `settings` → `secretaria_professor_password` = `654321`
- Remover chaves `secretaria_admin_login` e `secretaria_professor_login` (não mais necessárias)

### 2. Refatorar `src/pages/Secretaria.tsx`
- **Step 1 — Seleção de perfil**: dois cards grandes
  - Card "Administrador" com ícone Shield
  - Card "Professor" com ícone GraduationCap
- **Step 2 — Tela de PIN**: 
  - Header com nome do perfil + botão voltar
  - 6 slots visuais agrupados (4 + 2) mostrando pontos preenchidos
  - Teclado numérico customizado: grid 3x4 (1-9, limpar, 0, apagar)
  - Validação automática ao completar 6 dígitos
  - Feedback de erro com shake/vibração visual
- Remover campos de texto de usuário/senha
- Remover imports de `User` icon, adicionar `Shield`, `GraduationCap`, `ArrowLeft`, `Delete`

### 3. Atualizar `src/pages/Configuracoes.tsx`
- Trocar campos de login+senha por campos de PIN numérico (maxLength 6, inputMode numeric)
- Remover campos de login (`secAdminLogin`, `secProfLogin`)
- Validar que só aceita 6 dígitos numéricos

### 4. Atualizar RLS policy de `settings`
- Remover `secretaria_admin_login` e `secretaria_professor_login` da lista de chaves visíveis ao anon

### Arquivos modificados
- `src/pages/Secretaria.tsx` — nova UI com cards + PIN pad
- `src/pages/Configuracoes.tsx` — campos de PIN numérico
- Migration SQL — atualizar RLS policy
- Data update — atualizar senhas para PINs numéricos

