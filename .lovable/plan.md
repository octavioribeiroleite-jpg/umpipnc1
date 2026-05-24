
# Planilha de Alunos — Novo módulo da Secretaria

Criar módulo de gestão de alunos da EBD com importação CSV inteligente (Levenshtein), exportação, edição inline, transferência entre turmas e ações em massa.

## 1. Migração de banco

`ebd_students` (idempotente):
- `origin` (text, default `'manual'`, check `'manual' | 'importado'`)
- `created_at` já existe — manter.

## 2. Componente novo

`src/components/secretaria/PlanilhaAlunosTab.tsx`

Props: `classes`, `allStudents`, `onRefresh`, `accessLevel`, `professorClassId?`.

Header com botão Voltar já é renderizado pelo wrapper em `Secretaria.tsx` (padrão de `TurmasTab` e `ChamadaTab`). **Sem `onBack` interno.**

## 3. Helpers locais (sem libs)

- `stringSimilarity` (Levenshtein normalizado): `=1` idêntico, `≥0.75 e <1` similar, `<0.75` diferente.
- `parseCSV` suporta `, ; | \t`, remove aspas externas e trim.

## 4. Funcionalidades

- Seletor de turma (oculto para professor — fixa em `professorClassId`)
- Totalizadores: total / ativos / inativos
- Busca + filtro (todos / ativos / inativos)
- Adicionar manual (`origin='manual'`)
- Edição inline com `autoFocus`, Enter salva, Esc cancela
- Toggle ativo/inativo individual e em massa (via `selectedIds: Set<string>`)
- Transferir entre turmas (dedicada)
- Exportar CSV com BOM UTF-8
- Importar CSV via wizard de 3 passos

## 5. Wizard de importação

**Passo 1 — Upload**
- Aceita `.csv` e `.txt`, UTF-8
- Preview 5 primeiras linhas, coluna escolhida destacada em azul
- Dropdown de coluna do nome
- **Turma destino começa vazia** — botão "Analisar" desabilitado até escolher

**Passo 2 — Análise (`handleAnalyze`)**

Ordem por linha:
1. Idêntico a aluno no banco → `duplicata_certa` (similarTo + similarId)
2. Similar a aluno no banco (Levenshtein ≥ 0.75 e < 1) → `duplicata_provavel`
3. Repetido dentro do próprio CSV (detectado via `Set` pré-calculado de todos os nomes do CSV, não dependendo da ordem) → `duplicata_certa` com mensagem "duplicata dentro da planilha importada"
4. Caso contrário → `novo`

Tela:
- Verde / amarelo / vermelho conforme status
- Botões por linha: Ignorar / Adicionar mesmo assim / Substituir nome existente
- Ações em massa: ignorar todas duplicatas, adicionar todas mesmo assim
- Scroll interno `max-h-[60vh]`

**Passo 3 — Confirmação**
- Resumo: "X adicionados · Y substituídos · Z ignorados"
- **Aviso vermelho destacado quando substituições > 0**: "⚠️ Y substituições de nome serão feitas — esta ação não pode ser desfeita."

**`handleImport` — batch insert + loop de updates + contador de erros**

```ts
const toAdd = importRows.filter(r => r.action === 'adicionar')
  .map(r => ({ name: r.name, class_id: importTargetClass, active: true, origin: 'importado' as const }));

let added = 0, replaced = 0, errors = 0;
if (toAdd.length) {
  const { data, error } = await supabase.from('ebd_students').insert(toAdd).select('id');
  if (error) errors += toAdd.length; else added = data?.length ?? toAdd.length;
}
for (const row of importRows.filter(r => r.action === 'substituir' && r.similarId)) {
  const { error } = await supabase.from('ebd_students').update({ name: row.name }).eq('id', row.similarId!);
  if (error) errors++; else replaced++;
}
```

Reset completo do wizard ao final.

## 6. Layout

**Desktop**: tabela em `<Card><CardContent className="p-0">` — checkbox / Nome / Status / Origem / Cadastro (`hidden sm:table-cell`) / Ações.

**Mobile (`< sm`)**: cards empilhados (`sm:hidden`).
- Linha 1: checkbox + nome (bold, `line-through` se inativo)
- Linha 2: badges de status + origem à esquerda · ícones Transferir e Ativar/Desativar à direita
- Sem data de cadastro

Ações em massa aparecem apenas se `selectedIds.size > 0` (com `animate-in fade-in`).

## 7. Integração em `Secretaria.tsx`

- Adicionar `'planilha'` ao `CurrentView`
- Entrada em `viewTitles`
- Card no menu home (ícone `TableProperties`)
- Renderizar `<PlanilhaAlunosTab>` com `classes`, `allStudents`, `fetchData`, `accessLevel`, `professorClassId`

## 8. CSV de teste

`public/alunos-teste-duplicatas.csv` com casos: idênticos, acentos diferentes ("João"/"Joao"), espaços extras, similares ("María Sílva"/"Maria Silva"), repetidos no CSV ("Pedro Santos" 2x), e novos.

## Regras

- Não tocar em `TurmasTab.tsx` nem `ChamadaTab.tsx`
- Padrão shadcn/ui, semantic colors
- 100% pt-BR (toasts e erros)
- `useMemo` em derivados
- Toasts via `sonner`
- `title` em ícones, sem confirm para toggles simples

Pronto para implementar?
