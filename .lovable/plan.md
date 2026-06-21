# Gestão de Professores da EBD

Hoje a Secretaria EBD usa **um único PIN compartilhado** para todos os professores e o nome fica salvo só no aparelho. Vamos trocar isso por **contas individuais**: o admin cadastra cada professor com nome, PIN e a sala (turma) dele. Ao entrar, o professor só enxerga e faz a chamada/histórico da própria sala.

## O que o admin poderá fazer

Nova aba **"Configurações"** (só admin) dentro da Secretaria EBD, com a lista de professores cadastrados. Para cada professor:
- **Cadastrar**: nome do professor, PIN de 6 dígitos e a sala vinculada (escolhida entre as turmas existentes).
- **Editar**: alterar nome, PIN e a sala.
- **Excluir**: remover o cadastro.

Regras:
- Cada PIN é único (não pode haver dois professores com o mesmo PIN).
- O cadastro só funciona se já existirem turmas criadas (a sala é obrigatória).

## Como fica o login do professor

- A tela continua igual: o professor escolhe **"Professor"** e digita seu **PIN de 6 dígitos**.
- O sistema identifica automaticamente **qual professor é** (pelo PIN) e **qual sala** ele atende — não precisa mais digitar o nome.
- O **login compartilhado antigo é removido**: só entram professores cadastrados pelo admin.

## O que o professor vê depois de entrar

- **Chamada**: apenas a sala vinculada a ele (não vê nem seleciona outras turmas).
- **Histórico**: apenas os dados da própria sala.
- **Não tem acesso** a Turmas, Configurações nem ao histórico geral.
- O nome do professor é registrado automaticamente na chamada e no fechamento do dia.

O acesso de **Administrador** continua igual: vê tudo, todas as salas e as abas de gestão.

---

## Detalhes técnicos

**Banco de dados (migration)**
- Nova tabela `public.ebd_teachers`: `name`, `pin_hash`, `class_id` (referência a `ebd_classes`), `active`, timestamps.
- PIN guardado como **hash** (não em texto puro), respeitando a regra de "sem senhas em texto". Índice único no PIN.
- GRANTs + RLS: leitura/gestão somente para admin/diretoria via `has_management_role`; service_role para a edge function.
- Remoção do uso da chave `secretaria_professor_password` no fluxo (login compartilhado descontinuado).

**Edge functions**
- `ebd-teacher-login`: recebe o PIN, compara com os hashes e retorna `{ name, class_id }` do professor correspondente (ou erro). Evita expor os PINs no cliente.
- `manage-ebd-teacher`: criar/editar/excluir professor (faz o hash do PIN no servidor), restrito a admin.

**Frontend**
- Novo componente `ConfiguracoesEbdTab.tsx` (lista + formulário de cadastro/edição + excluir), seguindo o padrão visual do `TurmasTab`.
- Novo card "Configurações" no menu home da Secretaria (só admin).
- `Secretaria.tsx`: ajustar `handlePinComplete` do professor para chamar `ebd-teacher-login`; guardar `professorClassId` e `professorNome` retornados; remover o passo de digitar nome para o professor.
- Filtrar `classes`/dados por `professorClassId` quando o acesso for professor, em Chamada e Histórico.
- `ProfileSelect`: ajustar o texto do card "Professor".

## Observações
- Professores existentes precisarão ser recadastrados pelo admin (o modelo antigo não tinha contas individuais).
- Como é por PIN, recomendo PINs diferentes por professor; o sistema vai impedir PINs repetidos.
