import { useId } from 'react';
import { usePersistedTextDraft } from './usePersistedTextDraft';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, Sparkles, Check, PenLine, Lock } from 'lucide-react';

interface RegistroReuniaoEditorProps {
  meetingId: string;
  meetingNotes: string | null;
  isProcessed: boolean;
  canManage: boolean;
  isProcessing: boolean;
  processingStep: string;
  onProcess: () => void;
  onFinalize: () => void;
  onNotesChange: (notes: string) => void;
  readOnly?: boolean;
}

export function RegistroReuniaoEditor({
  meetingId,
  meetingNotes,
  isProcessed,
  canManage,
  isProcessing,
  processingStep,
  onProcess,
  onFinalize,
  onNotesChange,
  readOnly = false,
}: RegistroReuniaoEditorProps) {
  const { value: notes, setValue: handleChange, saving: isSaving,
    dirty: hasUnsavedChanges, error, save: saveNotes } = usePersistedTextDraft({
    initialValue: meetingNotes || '', enabled: !readOnly && !isProcessing, delay: 5000,
    persist: async (content) => {
      const { error } = await supabase.from('meetings').update({ meeting_notes: content }).eq('id', meetingId);
      if (error) throw error;
    },
    onSaved: onNotesChange,
  });
  const fieldId = useId();
  const handleManualSave = () => { void saveNotes(); };
  const handleProcess = async () => { if (await saveNotes()) onProcess(); };
  const handleFinalize = async () => { if (await saveNotes()) onFinalize(); };

  const processingSteps = [
    { id: 'saving', label: 'Preparando registro...' },
    { id: 'generating', label: 'Organizando registro e preparando os documentos...' },
    { id: 'done', label: 'Processamento concluído!' },
  ];

  const currentStepIndex = processingSteps.findIndex(s => s.id === processingStep);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-3 sm:px-4">
        <h2 className="flex items-center gap-2.5 font-semibold">
          <span className="meeting-tint inline-grid size-8 shrink-0 place-items-center rounded-lg"><PenLine aria-hidden="true" className="size-4" /></span>
          <label htmlFor={fieldId}>Registro da reunião</label>
        </h2>
        <span role="status" className={`inline-flex items-center gap-1.5 text-xs font-medium ${hasUnsavedChanges && !isSaving && !readOnly ? 'text-warning' : 'text-muted-foreground'}`}>
          {isSaving ? <Loader2 aria-hidden="true" className="size-3 animate-spin" /> : <span aria-hidden="true" className={`size-1.5 rounded-full bg-current ${!hasUnsavedChanges && !readOnly && notes ? 'text-success' : ''}`} />}
          {readOnly ? 'Somente leitura' : isSaving ? 'Salvando…' : hasUnsavedChanges ? 'Alterações pendentes' : notes ? 'Salvo' : 'Sem registro'}
        </span>
      </div>
      <div className="space-y-3 pb-2 has-[button]:pb-0">
        {error && <p role="alert" className="px-3.5 text-sm text-destructive sm:px-4">{error}</p>}
        {isProcessing ? (
          <div className="space-y-4 px-4 py-8">
            <p className="text-center text-muted-foreground mb-6">
              Preparando o resumo da reunião…
            </p>
            <div className="space-y-3 max-w-md mx-auto">
              {processingSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    index < currentStepIndex
                      ? 'bg-success/10 text-success'
                      : index === currentStepIndex
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted/50 text-muted-foreground'
                  }`}
                >
                  {index < currentStepIndex ? (
                    <Check className="h-5 w-5" />
                  ) : index === currentStepIndex ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-current opacity-30" />
                  )}
                  <span className="font-medium">{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="px-3.5 pb-1 sm:px-4">
              <Textarea id={fieldId}
                placeholder={readOnly ? 'Nenhum registro nesta reunião.' : 'Anote as decisões, tarefas, prazos e observações da reunião.'}
                value={notes}
                onChange={(e) => handleChange(e.target.value)}
                readOnly={readOnly}
                className="meeting-editor__field min-h-52 w-full resize-y rounded-xl border-border p-3 text-base leading-relaxed sm:min-h-60 sm:p-4"
                rows={7}
              />
            </div>
            {!readOnly && (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t px-3.5 py-2.5 sm:px-4">
                <Button variant="ghost" onClick={handleManualSave} disabled={!hasUnsavedChanges || isSaving} className="min-h-11 gap-2 px-2 text-primary">
                  <Save aria-hidden="true" className="size-4" /> Salvar
                </Button>
                {canManage && (
                  <>
                    <Button variant={isProcessed ? 'outline' : 'default'} onClick={handleProcess} disabled={!notes.trim() || isSaving}
                      className="min-h-11 gap-2 rounded-xl">
                      <Sparkles aria-hidden="true" className="size-4" />{isProcessed ? 'Preparar novamente' : 'Preparar resumo'}
                    </Button>
                    {isProcessed && (
                      <Button onClick={handleFinalize} disabled={isSaving} className="min-h-11 gap-2 rounded-xl">
                        <Lock aria-hidden="true" className="size-4" /> Finalizar
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
