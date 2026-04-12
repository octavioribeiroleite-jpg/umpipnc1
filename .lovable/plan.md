

## Plan: AI-Organized Plenary Minutes

The user wants the plenary notes to be permanently saved and organized by AI to produce a polished final document (ata).

### What will be built

1. **Add `final_minutes` column to `plenaries` table** -- store the AI-organized version separately from raw notes.

2. **Create edge function `organize-plenary`** -- receives the plenary ID, fetches raw notes + attendance data, calls Lovable AI (Gemini Flash) to organize everything into a structured "Ata da Plenária" with sections (Pauta, Deliberações, Informes, etc.), and saves the result to `final_minutes`.

3. **Update `PlenariaDetalhe.tsx` UI**:
   - Add a "Organizar com IA" button below the notes textarea (visible to management).
   - When clicked, calls the edge function; shows loading state.
   - Once generated, display the organized minutes in a read-only card below, with option to edit and re-save.
   - The PDF generation will use `final_minutes` (if available) instead of raw `notes` for a polished report.

### Technical details

- **Migration**: `ALTER TABLE plenaries ADD COLUMN final_minutes text;`
- **Edge function** (`supabase/functions/organize-plenary/index.ts`):
  - Validates auth + management role
  - Fetches plenary data (title, date, notes) and attendance (present/absent names)
  - Sends to Lovable AI Gateway with a system prompt instructing structured organization
  - Saves result to `plenaries.final_minutes`
- **UI changes** in `PlenariaDetalhe.tsx`:
  - New state: `organizingAI`, `finalMinutes`
  - "Organizar com IA" button triggers `supabase.functions.invoke('organize-plenary', { body: { plenaryId } })`
  - Display organized minutes with edit capability
  - PDF uses `finalMinutes` when available

