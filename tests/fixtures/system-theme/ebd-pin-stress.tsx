import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import PinPad from '@/components/secretaria/PinPad';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import '../../../src/pages/secretaria-home.css';
import '../../../src/pages/secretaria-theme.css';

// Only the error text is synthetic. Layout, dialog, keypad and CSS are real.
export default function EbdPinStressFixture() {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    document.body.classList.add('ebd-theme');
    return () => document.body.classList.remove('ebd-theme');
  }, []);
  const home = () => location.assign('/auth?role=anonymous&home=1&safe=1');
  return <BrowserRouter>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="ebd-reauth" size="access">
        <DialogHeader>
          <DialogTitle>Confirmar acesso</DialogTitle>
          <DialogDescription>Digite novamente o PIN do seu acesso. Seus dados preenchidos continuam na tela.</DialogDescription>
        </DialogHeader>
        <PinPad presentation="compact" profileLabel="Secretaria EBD · Professor"
          onBack={() => setOpen(false)} onHome={home} onComplete={() => undefined}
          errorMessage="Não foi possível confirmar o acesso. Confira seu PIN e tente novamente para continuar com segurança." />
      </DialogContent>
    </Dialog>
  </BrowserRouter>;
}
