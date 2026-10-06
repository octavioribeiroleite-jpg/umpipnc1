import logoIpnc from '@/assets/logo-ipnc.png';
import { ArrowLeft, BookOpen, ChevronRight, GraduationCap, Lock, Shield } from 'lucide-react';
import './ProfileSelect.css';

interface ProfileSelectProps {
  onSelect: (profile: 'admin' | 'professor') => void;
  onBack?: () => void;
}

export default function ProfileSelect({ onSelect, onBack }: ProfileSelectProps) {
  return (
    <main className="ebd-access" aria-labelledby="ebd-access-title">
      <svg className="ebd-access__art" viewBox="0 0 1600 1000" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="ebd-access-canopy" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#badbcc" stopOpacity="0.12" />
            <stop offset="0.52" stopColor="#498e72" stopOpacity="0.5" />
            <stop offset="1" stopColor="#005039" />
          </linearGradient>
          <linearGradient id="ebd-access-leaf" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#afdcc1" stopOpacity="0.55" />
            <stop offset="1" stopColor="#62aa8a" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="ebd-access-floor" x1="0" y1="1" x2="1" y2="0">
            <stop stopColor="#6baa8c" stopOpacity="0.28" />
            <stop offset="1" stopColor="#eaf5ef" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M780 0H1600V470C1490 330 1280 346 1136 235C1015 142 920 76 780 0Z" fill="url(#ebd-access-canopy)" />
        <path d="M0 637C201 664 222 802 465 857C650 900 674 984 785 1000H0Z" fill="url(#ebd-access-floor)" />
        <g fill="url(#ebd-access-leaf)">
          <path d="M1427 320C1271 293 1236 144 1233 26C1360 62 1449 169 1427 320Z" />
          <path d="M1443 322C1423 165 1493 76 1580 29C1576 177 1537 281 1443 322Z" />
          <path d="M5 999C-17 864 34 781 124 733C120 862 83 956 5 999Z" />
          <path d="M21 1000C36 885 113 847 220 852C174 945 98 995 21 1000Z" />
        </g>
        <g fill="none" stroke="#d7eee0" strokeOpacity="0.2" strokeWidth="2">
          <path d="M1233 26L1427 320M1580 29L1443 322M124 733L5 999M220 852L21 1000" />
        </g>
      </svg>

      <div className="ebd-access__navigation">
        {onBack && (
          <button type="button" onClick={onBack} className="ebd-access__back">
            <ArrowLeft aria-hidden="true" />
            <span>Voltar à Igreja</span>
          </button>
        )}
      </div>

      <div className="ebd-access__content">
        <img className="ebd-access__logo" src={logoIpnc} alt="IPNC" width="1254" height="1254" />
        <header className="ebd-access__heading">
          <span className="ebd-access__lock"><Lock aria-hidden="true" /></span>
          <p className="ebd-access__eyebrow">Acesso restrito</p>
          <h1 id="ebd-access-title">Secretaria EBD</h1>
          <p className="ebd-access__intro">Escolha seu perfil para continuar com segurança.</p>
        </header>

        <div className="ebd-access__profiles">
          <button type="button" className="ebd-access__profile" onClick={() => onSelect('admin')}>
            <span className="ebd-access__profile-icon"><Shield aria-hidden="true" /></span>
            <span className="ebd-access__profile-copy">
              <span className="ebd-access__profile-title">Administrador</span>
              <span className="ebd-access__profile-description">Acesso completo à chamada, histórico, turmas e configurações.</span>
            </span>
            <ChevronRight className="ebd-access__chevron" aria-hidden="true" />
          </button>
          <button type="button" className="ebd-access__profile" onClick={() => onSelect('professor')}>
            <span className="ebd-access__profile-icon"><GraduationCap aria-hidden="true" /></span>
            <span className="ebd-access__profile-copy">
              <span className="ebd-access__profile-title">Professor</span>
              <span className="ebd-access__profile-description">Acesso rápido para registrar chamada e acompanhar sua turma.</span>
            </span>
            <ChevronRight className="ebd-access__chevron" aria-hidden="true" />
          </button>
        </div>

        <footer className="ebd-access__footer">
          <div className="ebd-access__book"><BookOpen aria-hidden="true" /></div>
          <p>Ensinar também é servir</p>
          <span>2 Timóteo 2:15</span>
        </footer>
      </div>
    </main>
  );
}
