## Problema

Ao puxar para atualizar (pull-to-refresh) na tela da **Secretaria EBD**, o usuário (professor ou administrador) volta para a tela de login (seleção de perfil/PIN).

A correção anterior persistiu apenas as sessões de **Diretoria** e **Membro**. O login da Secretaria EBD é controlado por estado local em `src/pages/Secretaria.tsx` (`accessLevel`, `selectedProfile`, `adminPin`, `professorNome`, `professorClassId`), que é descartado a cada recarregamento da página. Por isso essa tela continua deslogando.

## Solução

Persistir a sessão da Secretaria no `sessionStorage`, igual ao padrão já usado nas sessões de Diretoria/Membro, e restaurá-la quando a página recarrega.

### Alterações em `src/pages/Secretaria.tsx`

1. Definir uma chave `EBD_SESSION_KEY = 'ebd_session'` e uma função `loadStoredEbdSession()` que lê do `sessionStorage`.

2. Inicializar os estados de login a partir da sessão salva:
   - `accessLevel`, `selectedProfile`, `adminPin`, `professorNome`, `professorClassId` passam a iniciar com o valor restaurado (em vez de `null`/vazio).

3. Salvar a sessão no `sessionStorage` quando o login é concluído:
   - No login de **admin** (após validar o PIN): gravar `{ accessLevel: 'admin', adminPin }`.
   - No login de **professor** (`handleNameSubmit`, após sucesso): gravar `{ accessLevel: 'professor', professorNome, professorClassId }`.

4. Limpar a sessão salva em `confirmExit` (botão Sair) — remover a chave do `sessionStorage` junto com o reset dos estados.

### Comportamento esperado

- Professor/administrador permanece logado na mesma tela ao puxar para atualizar.
- A sessão é encerrada normalmente apenas ao tocar em "Sair".
- A sessão fica restrita à aba (sessionStorage), encerrando ao fechar o app — mantendo o mesmo nível de segurança das demais sessões.

### Observação técnica

Nenhuma mudança em regras de negócio ou banco de dados; é apenas persistência de estado de UI no cliente, seguindo o padrão já existente em `DiretoriaSessionContext`/`MembroSessionContext`.