import { BookOpen, GraduationCap, Shield } from 'lucide-react';
import { AccessShell } from '@/components/auth/AccessShell';
import { AccessOption } from '@/components/auth/AccessOption';

interface ProfileSelectProps {
  onSelect: (profile: 'admin' | 'professor') => void;
  onBack?: () => void;
}

export default function ProfileSelect({ onSelect, onBack }: ProfileSelectProps) {
  return <AccessShell title="Secretaria EBD" titleId="ebd-access-title" description="Escolha seu perfil para continuar com segurança." onBack={onBack} backLabel="Voltar à Igreja" footer={<><div className="ebd-access__book"><BookOpen aria-hidden="true" /></div><p>Ensinar também é servir</p><span>2 Timóteo 2:15</span></>}>
    <div className="ebd-access__profiles">
      <AccessOption title="Administrador" description="Acesso completo à chamada, histórico, turmas e configurações." icon={Shield} onClick={() => onSelect('admin')} />
      <AccessOption title="Professor" description="Acesso rápido para registrar chamada e acompanhar sua turma." icon={GraduationCap} onClick={() => onSelect('professor')} />
    </div>
  </AccessShell>;
}
