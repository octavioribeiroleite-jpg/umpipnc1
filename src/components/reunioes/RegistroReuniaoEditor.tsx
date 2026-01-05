import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, Wand2, Check, FileText } from 'lucide-react';

interface RegistroReuniaoEditorProps {
  meetingId: string;
  meetingNotes: string | null;
  isProcessed: boolean;
  canManage: boolean;
  isProcessing: boolean;
  processingStep: string;
  onProcess: () => void;
  onNotesChange: (notes: string) => void;
}

export function RegistroReuniaoEditor({
  meetingId,
  meetingNotes,
  isProcessed,
  canManage,
  isProcessing,
  processingStep,
  onProcess,
  onNotesChange,
}: RegistroReuniaoEditorProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState(meetingNotes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Auto-save every 5 seconds when there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges || isProcessed) return;

    const timer = setTimeout(() => {
      saveNotes();
    }, 5000);

    return () => clearTimeout(timer);
  }, [notes, hasUnsavedChanges, isProcessed]);

  const saveNotes = useCallback(async () => {
    if (isSaving || isProcessed) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('meetings')
        .update({ meeting_notes: notes })
        .eq('id', meetingId);

      if (error) throw error;

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      onNotesChange(notes);
    } catch (err) {
      console.error('Error saving notes:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o registro.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [notes, meetingId, isSaving, isProcessed, onNotesChange, toast]);

  const handleChange = (value: string) => {
    setNotes(value);
    setHasUnsavedChanges(true);
  };

  const handleManualSave = () => {
    saveNotes();
  };

  const handleProcess = async () => {
    // Save before processing
    if (hasUnsavedChanges) {
      await saveNotes();
    }
    onProcess();
  };

  const processingSteps = [
    { id: 'saving', label: 'Salvando registro...' },
    { id: 'analyzing', label: 'Analisando conteúdo...' },
    { id: 'generating', label: 'Gerando ata...' },
    { id: 'whatsapp', label: 'Criando mensagem WhatsApp...' },
    { id: 'done', label: 'Concluído!' },
  ];

  const currentStepIndex = processingSteps.findIndex(s => s.id === processingStep);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Registro da Reunião
            </CardTitle>
            <CardDescription>
              Escreva livremente o que foi discutido. Use títulos para organizar as seções.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isSaving ? (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Salvando...
              </Badge>
            ) : hasUnsavedChanges ? (
              <Badge variant="outline" className="gap-1">
                Não salvo
              </Badge>
            ) : lastSaved ? (
              <Badge variant="secondary" className="gap-1 bg-success/10 text-success border-success/20">
                <Check className="h-3 w-3" />
                Salvo
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isProcessing ? (
          <div className="space-y-4 py-8">
            <p className="text-center text-muted-foreground mb-6">
              Processando reunião automaticamente...
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
            <Textarea
              placeholder="Escreva aqui tudo o que foi discutido na reunião...

Exemplo:
DECISÕES
- Aprovado o orçamento para o evento de Páscoa
- Definida a data do retiro: 15 a 17 de março

TAREFAS
- João: preparar a programação do evento
- Maria: entrar em contato com o palestrante

OBSERVAÇÕES
- Próxima reunião será dia 20/01 às 19h"
              value={notes}
              onChange={(e) => handleChange(e.target.value)}
              className="min-h-[400px] font-mono text-sm leading-relaxed resize-y"
            />

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSave}
                disabled={!hasUnsavedChanges || isSaving || isProcessed}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>

              {canManage && (
                <Button
                  onClick={handleProcess}
                  disabled={!notes.trim() || isProcessing}
                  className="gap-2"
                  size="lg"
                  variant={isProcessed ? "outline" : "default"}
                >
                  <Wand2 className="h-5 w-5" />
                  {isProcessed ? 'Reprocessar Reunião' : 'Processar e Gerar Ata'}
                </Button>
              )}
            </div>

            {!notes.trim() && canManage && (
              <p className="text-sm text-muted-foreground text-center">
                Escreva o registro da reunião para poder processar e gerar a ata automaticamente.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
