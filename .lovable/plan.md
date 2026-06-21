Diagnóstico encontrado:

- A Secretaria libera o administrador por PIN interno (`secretaria_admin_password`), mas isso não cria uma sessão autenticada no backend.
- A função `manage-ebd-class-password`, que cria/troca/remove senha das salas, exige um usuário autenticado com permissão de diretoria/admin.
- Por isso, ao tentar salvar senha dentro da Secretaria, a função retorna `Não autenticado`/401; a tela oculta essa mensagem e mostra apenas `Erro ao salvar a senha`.
- As tabelas principais existem, têm as colunas esperadas e a restrição única por sala está correta.
- O login do professor por senha da sala usa outra função (`ebd-class-login`) e está alinhado com o modelo de “senha por sala + nome do professor”, mas depende das senhas conseguirem ser criadas primeiro.

Plano de correção:

1. Ajustar o fluxo administrativo da Secretaria
  - Guardar temporariamente, apenas na sessão da tela, o PIN administrativo validado.
  - Passar esse PIN para a aba de Configurações ao criar/trocar/remover senhas de salas.
2. Ajustar a função `manage-ebd-class-password`
  - Permitir dois caminhos seguros de autorização:
    - usuário autenticado com cargo de gestão; ou
    - PIN administrativo correto da Secretaria.
  - Validar o PIN no backend antes de aceitar alterações de senha.
  - Manter a validação de senha de sala com exatamente 6 dígitos.
3. Corrigir a tela de Configurações de salas
  - Enviar o PIN administrativo junto com as ações de definir/remover senha.
  - Melhorar a mensagem exibida quando a função retorna erro, para mostrar o motivo real.
  - Se necessário, carregar o status “Com senha/Sem senha” por uma função segura em vez de leitura direta da tabela protegida.
4. Validar o fluxo completo
  - Entrar na Secretaria como administrador via PIN.
  - Definir senha para uma sala.
  - Trocar senha da mesma sala.
  - Tentar usar senha repetida em outra sala e confirmar a mensagem correta.
  - Entrar como professor usando a senha da sala + nome.
  - Confirmar que o acesso aparece na aba de acessos da Secretaria.