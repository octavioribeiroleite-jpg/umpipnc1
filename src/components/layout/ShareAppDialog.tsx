import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Share2, Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const APP_URL = 'https://umpipnc1.lovable.app';

export function ShareAppDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(APP_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <Share2 className="h-5 w-5" />
            Compartilhar App
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-center">Compartilhar App</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG value={APP_URL} size={200} level="H" />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Escaneie o QR Code para acessar o app
          </p>
          <Button variant="outline" className="w-full gap-2" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copiado!' : 'Copiar link'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
