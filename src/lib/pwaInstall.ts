import { INSTALLED_DISPLAY_QUERIES, isInstalledDisplayMode } from './pwa-display';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function createPWAInstallController(browser: Window, device: Navigator) {
  const displayModes = INSTALLED_DISPLAY_QUERIES.map(query => browser.matchMedia(query));
  const isInstalled = () => isInstalledDisplayMode({ matchMedia: browser.matchMedia.bind(browser), navigator: device as Navigator & { standalone?: boolean } });
  const ua = device.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (device.platform === 'MacIntel' && device.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isEmbedded = /FBAN|FBAV|Instagram|Line\/|; wv\)|WebView/i.test(ua);
  let deferred: InstallEvent | null = null;
  let opener: HTMLElement | null = null;
  let state = {
    isInstalled: isInstalled(),
    isIOS, isAndroid, isEmbedded,
    isMacSafari: /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua),
    isOpen: false, canPrompt: false, isInstalling: false, message: '',
  };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<typeof state>) => {
    state = { ...state, ...patch };
    listeners.forEach(listener => listener());
  };
  const installed = () => {
    deferred = null;
    update({ isInstalled: true, isOpen: false, canPrompt: false, isInstalling: false, message: '' });
  };
  const beforeInstall = (event: Event) => {
    event.preventDefault();
    if (state.isInstalled) return;
    deferred = event as InstallEvent;
    update({ canPrompt: true });
  };
  const modeChanged = () => { if (isInstalled()) installed(); };
  browser.addEventListener('beforeinstallprompt', beforeInstall);
  browser.addEventListener('appinstalled', installed);
  displayModes.forEach(mode => mode.addEventListener('change', modeChanged));

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    open: (trigger?: HTMLElement) => {
      if (state.isInstalled) return;
      opener = trigger ?? null;
      update({ isOpen: true, message: '' });
    },
    close: () => update({ isOpen: false }),
    restoreFocus: () => { if (opener?.isConnected) opener.focus(); },
    install: async () => {
      if (!deferred || state.isInstalled || state.isInstalling) return;
      const event = deferred;
      deferred = null; // Each native prompt can only be consumed once.
      update({ isInstalling: true, canPrompt: false, message: '' });
      try {
        await event.prompt();
        const { outcome } = await event.userChoice;
        if (state.isInstalled) return;
        update({ message: outcome === 'accepted'
          ? 'Pedido enviado ao navegador. Conclua a instalação na janela de confirmação.'
          : 'Instalação cancelada. Você pode instalar depois pelo menu do navegador.' });
      } catch {
        if (!state.isInstalled) update({ message: 'Não foi possível abrir a instalação. Siga as orientações abaixo ou tente novamente mais tarde.' });
      } finally {
        update({ isInstalling: false });
      }
    },
    dispose: () => {
      browser.removeEventListener('beforeinstallprompt', beforeInstall);
      browser.removeEventListener('appinstalled', installed);
      displayModes.forEach(mode => mode.removeEventListener('change', modeChanged));
      listeners.clear();
    },
  };
}

// Capture events before React renders; both entry points share this controller.
export const pwaInstall = createPWAInstallController(window, navigator);
if (import.meta.hot) import.meta.hot.dispose(() => pwaInstall.dispose());
