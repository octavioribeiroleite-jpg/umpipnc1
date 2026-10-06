import logoIpnc from '@/assets/logo-ipnc.png';

export default function AppLoadingSplash({ label = 'Carregando…', role = 'status' }: { label?: string; role?: 'status' }) {
  return <main className="ipnc-loading-splash ipnc-safe-managed" role={role} aria-busy="true" aria-live="polite">
    <svg className="ipnc-splash-leaves" viewBox="0 0 400 650" preserveAspectRatio="none" aria-hidden="true">
      <path d="M400 0H190C230 130 330 180 400 245Z" fill="#b7d9c6" opacity=".45" />
      <path d="M325 185C245 165 242 66 244 30C290 65 336 107 325 185ZM328 188C330 104 368 64 398 35C400 108 379 158 328 188Z" fill="#70aa89" opacity=".18" />
      <path d="M0 650V525C65 570 164 581 223 650Z" fill="#d7e9de" opacity=".7" />
    </svg>
    <div className="ipnc-loading-splash-content"><img src={logoIpnc} alt="IPNC" width="200" height="200" /><p>{label}</p></div>
  </main>;
}
