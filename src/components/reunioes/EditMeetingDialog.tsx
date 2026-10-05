import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from '@/components/ui/responsive-dialog';
import { Loader2 } from 'lucide-react';

interface EditMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: {
    id: string;
    title: string;
    date: string;
  };
  onUpdate: (updates: { title: string; date: string }) => Promise<void>;
}

export function EditMeetingDialog({
  open,
  onOpenChange,
  meeting,
  onUpdate,
}: EditMeetingDialogProps) {
  const [title, setTitle] = useState(meeting.title);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const previousOpen = useRef(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && !previousOpen.current) {
      setError('');
      setTitle(meeting.title);
      const meetingDate = new Date(meeting.date);
      setDate(`${meetingDate.getFullYear()}-${String(meetingDate.getMonth() + 1).padStart(2, '0')}-${String(meetingDate.getDate()).padStart(2, '0')}`);
      setTime(meetingDate.toTimeString().slice(0, 5));
    }
    previousOpen.current = open;
  }, [open, meeting]);

  const handleSave = async () => {
    if (!title.trim() || !date || !time) return;

    setIsSaving(true);
    try {
      const dateTime = new Date(`${date}T${time}:00`);
      await onUpdate({
        title: title.trim(),
        date: dateTime.toISOString(),
      });
      onOpenChange(false);
    } catch {
      setError('Não foi possível salvar. Confira os dados e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={value => { if (!isSaving) onOpenChange(value); }}>
      <ResponsiveDialogContent size="form">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Editar Reunião</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Altere o título, data e horário da reunião.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {error && <p role="alert" className="text-destructive">{error}</p>}
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              disabled={isSaving} id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome da reunião"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                disabled={isSaving} type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Horário *</Label>
              <Input
                id="time"
                disabled={isSaving} type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim() || !date || !time || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
