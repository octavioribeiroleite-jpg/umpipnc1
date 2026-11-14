import { useId } from 'react';
import { usePersistedTextDraft } from './usePersistedTextDraft';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Check } from 'lucide-react';

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
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 px-3 sm:px-4">
        <h2 className="text-base font-semibold">
          <label htmlFor={fieldId}>Registro da reunião</label>
        </h2>
        <span role="status" className={`inline-flex items-center gap-1.5 text-xs font-medium ${hasUnsavedChanges && !isSaving && !readOnly ? 'text-warning' : 'text-muted-foreground'}`}>
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
            <div className="px-3 pb-1 sm:px-4">
              <Textarea id={fieldId}
                placeholder={readOnly ? 'Nenhum registro nesta reunião.' : 'Anote as decisões, tarefas, prazos e observações da reunião.'}
                value={notes}
                onChange={(e) => handleChange(e.target.value)}
                readOnly={readOnly}
                className="meeting-editor__field min-h-36 w-full resize-y rounded-lg border-border p-2.5 text-base leading-6 sm:min-h-52"
                rows={6}
              />
            </div>
            {!readOnly && (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t px-3 py-1.5 sm:px-4">
                <Button variant="ghost" onClick={handleManualSave} disabled={!hasUnsavedChanges || isSaving} className="px-2 text-[.8125rem] text-primary">
                  Salvar
                </Button>
                {canManage && (
                  <>
                    <Button variant={isProcessed ? 'outline' : 'default'} onClick={handleProcess} disabled={!notes.trim() || isSaving}
                      className="px-3 text-[.8125rem]">
                      {isProcessed ? 'Preparar novamente' : 'Preparar resumo'}
                    </Button>
                    {isProcessed && (
                      <Button onClick={handleFinalize} disabled={isSaving} className="px-3 text-[.8125rem]">
                        Finalizar
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
