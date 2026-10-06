import { Download, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { pwaInstall } from '@/lib/pwaInstall';
import logoIpnc from '@/assets/logo-ipnc.png';

export function PWAInstallPrompt() {
  const pwa = usePWAInstall();
  const steps = pwa.isEmbedded
    ? ['Abra o menu deste navegador e escolha “Abrir no navegador”.', `Use ${pwa.isIOS ? 'o Safari' : 'o Chrome'} e toque novamente em “Instalar aplicativo” no Renovo.`]
    : pwa.isIOS
      ? ['Abra este site no Safari e toque em Compartilhar.', 'Escolha “Adicionar à Tela de Início”. Se necessário, role a lista de ações.', 'Mantenha “Abrir como App” ativado, se aparecer, e toque em “Adicionar”.']
      : pwa.isAndroid
        ? ['No Chrome, abra o menu de três pontos (⋮).', 'Toque em “Instalar aplicativo” ou “Adicionar à tela inicial”.', 'Confirme a opção exibida pelo navegador.']
        : pwa.isMacSafari
          ? ['No Safari, abra o menu Arquivo.', 'Escolha “Adicionar ao Dock” e confirme em “Adicionar”.']
          : ['Abra este site no Chrome ou no Edge.', 'Procure o ícone de instalação na barra de endereço ou a opção de instalar no menu do navegador.', 'Confirme a instalação. Se a opção não aparecer, tente novamente em um navegador atualizado.'];

  return (
    <Dialog open={pwa.isOpen && !pwa.isInstalled} onOpenChange={open => { if (!open) pwa.close(); }}>
      <DialogContent
        style={{ maxWidth: 'min(28rem, calc(100vw - 1.5rem))', borderRadius: '1.5rem' }}
        className="max-w-md gap-5 rounded-3xl border-emerald-200/70 bg-white p-6 text-slate-900 shadow-2xl sm:rounded-3xl [&>button:last-child]:hidden"
        onCloseAutoFocus={event => { event.preventDefault(); pwaInstall.restoreFocus(); }}
      >
        <DialogClose asChild>
          <button type="button" aria-label="Fechar instalação" className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700">
            <X className="h-5 w-5" />
          </button>
        </DialogClose>
        <div className="flex h-24 w-24 items-center justify-center">
          <img src={logoIpnc} alt="Marca IPNC" className="h-24 w-24 object-contain" />
        </div>
        <DialogHeader className="space-y-3">
          <DialogTitle className="pr-2 text-2xl font-bold leading-tight sm:text-2xl">Tenha o Renovo na sua tela inicial</DialogTitle>
          <DialogDescription className="text-base leading-relaxed text-slate-600">Abra o aplicativo pelo ícone no seu aparelho e acesse sua igreja com facilidade.</DialogDescription>
        </DialogHeader>
        {pwa.message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-950">{pwa.message}</p>}
        {pwa.canPrompt || pwa.isInstalling ? (
          <Button type="button" onClick={() => void pwa.install()} disabled={pwa.isInstalling} className="h-auto min-h-12 gap-2 whitespace-normal rounded-xl bg-emerald-800 px-4 py-3 text-base text-white hover:bg-emerald-900">
            <Download className="h-5 w-5 shrink-0" />
            {pwa.isInstalling ? 'Aguardando o navegador…' : 'Instalar agora'}
          </Button>
        ) : (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <p className="mb-4 flex items-center gap-2 text-base font-semibold text-emerald-950"><Smartphone className="h-5 w-5 shrink-0" />Como instalar</p>
            <ol className="space-y-4">
              {steps.map((step, index) => (
                <li key={step} className="flex items-start gap-3 text-base leading-relaxed text-slate-700">
                  <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-sm font-semibold text-white">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        <DialogClose asChild>
          <Button type="button" variant="ghost" className="min-h-11 rounded-xl text-base text-slate-600 hover:bg-slate-100 hover:text-slate-900">Agora não</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
