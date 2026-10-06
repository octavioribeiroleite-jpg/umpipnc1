import logoIpnc from '@/assets/logo-ipnc.png';
import OpeningBackdrop from './OpeningBackdrop';

export default function AppLoadingSplash({ label = 'Carregando…', role = 'status' }: { label?: string; role?: 'status' }) {
  return <main className="ipnc-loading-splash ipnc-opening-surface ipnc-safe-managed" data-opening-pending="true" role={role} aria-busy="true" aria-live="polite">
    <OpeningBackdrop />
    <div className="ipnc-loading-splash-content"><img src={logoIpnc} alt="IPNC" width="200" height="200" /><div className="ipnc-loading-indicator"><p>{label}</p></div></div>
  </main>;
}
