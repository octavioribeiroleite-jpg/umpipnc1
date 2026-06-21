# Senha por sala + registro de quem entrou

Hoje cada professor tem uma conta (nome + PIN + sala). Vamos simplificar: **cada sala terá sua própria senha**. Quando alguém entra com a senha da sala, o sistema pede o **nome da pessoa**, registra esse nome e mostra, numa aba da Secretaria, **quem entrou em cada sala** no dia.

## Como vai funcionar

**Para o admin (aba "Configurações"):**
- A lista deixa de ser de professores e passa a ser de **salas**.
- Para cada sala existente, o admin define/edita uma **senha (PIN de 6 dígitos)**.
- Pode limpar/trocar a senha de qualquer sala.
- Cada senha é única (duas salas não podem ter a mesma).

**Para quem vai dar aula (perfil "Professor"):**
1. Escolhe "Professor" e digita a **senha da sala**.
2. O sistema identifica **qual sala** é aquela senha.
3. Pede o **nome de quem está entrando** (campo de texto).
4. Registra o acesso (nome + sala + data/hora) e libera só a chamada/histórico daquela sala.

**Nova aba "Acessos" (admin):**
- Mostra, por dia, **quais salas tiveram acesso e o nome de quem entrou** (com horário).
- Assim o admin vê rapidamente qual professor fez login em cada sala.

## Verificação do login atual
Antes de migrar, confirmo se o login por PIN está funcionando (login admin e o de professor pela edge function). Como o modelo muda para senha por sala, o fluxo de identificação por PIN é reaproveitado, agora apontando para a sala em vez de um professor específico.

---

## Detalhes técnicos

**Banco de dados (migration)**
- Nova tabela `public.ebd_class_passwords`: `class_id` (ref. `ebd_classes`, único), `pin_hash`, `active`, timestamps. Índice único no `pin_hash`. GRANTs (authenticated + service_role) e RLS via `has_management_role`.
- Nova tabela `public.ebd_class_logins`: `class_id`, `teacher_name` (texto livre), `date`, `created_at`. GRANTs + RLS (gestão lê tudo; inserção via service_role pela edge function).
- A tabela antiga `ebd_teachers` deixa de ser usada pelo fluxo (mantida sem uso ou removida no mesmo migration — removo para evitar confusão).

**Edge functions**
- `ebd-teacher-login` → ajustada (ou nova `ebd-class-login`): recebe `pin` + `name`; encontra a sala pelo hash, grava o registro em `ebd_class_logins` e retorna `{ class_id, class_name, name }`.
- `manage-ebd-teacher` → ajustada (ou nova `manage-ebd-class-password`): ações `set` (definir/trocar senha da sala) e `clear` (remover), com hash no servidor, restrita a admin.

**Frontend**
- `ConfiguracoesEbdTab.tsx`: passa a listar **salas** e definir/editar/limpar a senha de cada uma.
- `Secretaria.tsx`: após o PIN do professor, novo passo de **digitar o nome**; guarda `professorNome`/`professorClassId` do retorno; adiciona a view "Acessos".
- Novo componente `AcessosEbdTab.tsx`: lista os acessos do dia por sala.
- Novo card "Acessos" no menu home (somente admin).
- `PinPad`: mantém o teclado; o passo de nome é uma tela simples de input após validar o PIN.

## Observações
- O nome digitado no acesso será usado também como "marcado por" na chamada e no fechamento do dia daquela sala.
- Senhas guardadas como hash (sem texto puro).
