

# Ajustes no fluxo da Secretaria EBD

## 1. Admin entra direto (sem pedir nome)
- Em `Secretaria.tsx`: admin ja entra direto apos PIN (ja funciona assim, linha 92-93). Nenhuma mudanca necessaria aqui.

## 2. Fluxo de chamada por turma com Iniciar/Finalizar/Reabrir

Refatorar `ChamadaTab.tsx`:

- **Remover** a tela global de "Iniciar Chamada" (com campo de nome do professor) - isso ja foi tratado no login
- **Adicionar estado** `chamadaStatus` por turma: `Map<string, 'idle' | 'aberta' | 'finalizada'>`
- **Ao clicar numa turma**: mostrar o detalhe da turma
  - Se status `idle`: mostrar botao "Iniciar Chamada" grande (PlayCircle)
  - Se status `aberta`: mostrar lista de alunos com checkboxes (como hoje) + botao "Finalizar Chamada" no rodape
  - Se status `finalizada`: mostrar lista de alunos (somente leitura, sem poder editar) + badge "Chamada Finalizada" + botao "Reabrir Chamada"
- **Responsavel**: mostrar nome do professor no header da turma (vem de `initialProfessorName`)
- **Admin**: admin nao tem `initialProfessorName`, entao nao exibir campo de responsavel. Admin pode iniciar/finalizar chamada normalmente

### Arquivos a alterar
- `src/components/secretaria/ChamadaTab.tsx`: refatorar para ter fluxo iniciar/finalizar/reabrir por turma
- `src/pages/Secretaria.tsx`: passar `accessLevel` como prop para ChamadaTab saber se e admin

### Detalhes da UI por turma

**Estado idle (turma ainda nao teve chamada iniciada):**
- Card centralizado com icone PlayCircle
- Texto "Iniciar Chamada" + nome da turma
- Se professor: mostrar "Responsavel: [nome]"
- Botao "Iniciar Chamada"

**Estado aberta (chamada em andamento):**
- Header com nome da turma + stats + badge "Em andamento"
- Lista de alunos com checkboxes (comportamento atual)
- Botao fixo no rodape: "Finalizar Chamada" (verde)

**Estado finalizada:**
- Header com badge "Finalizada"
- Lista de alunos somente leitura (checkboxes desabilitados)
- Resumo: X presentes de Y alunos
- Botao "Reabrir Chamada" (outline/secondary)

**Na grid de turmas (visao principal):**
- Mostrar badge de status em cada card: "Nao iniciada", "Em andamento", "Finalizada"

