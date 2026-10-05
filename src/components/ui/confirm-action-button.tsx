import { useState } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export function ConfirmActionButton({ label, title, description, onConfirm, variant = 'ghost' }: {
  label: string;
  title: string;
  description: string;
  onConfirm: () => Promise<boolean | void>;
  variant?: ButtonProps['variant'];
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <>
    <Button variant={variant} onClick={() => {setError('');setOpen(true);}}>{label}</Button>
    <AlertDialog open={open} onOpenChange={value => {if (!busy) setOpen(value);}}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={async event => {
            event.preventDefault(); setBusy(true); setError('');
            try {if (await onConfirm() !== false) setOpen(false);}
            catch {setError('Não foi possível concluir. Confira o estado atual antes de tentar novamente.');}
            finally {setBusy(false);}
          }}>{busy ? 'Confirmando…' : label}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
