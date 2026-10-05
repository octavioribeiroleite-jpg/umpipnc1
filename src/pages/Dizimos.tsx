import { Heart } from 'lucide-react';
import '@/finance-responsive.css';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PastorLayout } from '@/components/pastor/PastorLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { DizimosTab } from '@/components/financas/DizimosTab';
import { MembroDizimos } from '@/components/membro/MembroDizimos';

export default function Dizimos() {
  const { isAdmin, isPastor } = useAuth();

  const canConfigure = isAdmin || isPastor;

  const content = (
    <div className="finance-page finance-tab-panel min-w-0">
      <PageHeader
        title="Dízimos e ofertas"
        eyebrow="Contribuições"
        icon={<Heart />}
        description={canConfigure
          ? "Configuração da chave PIX para dízimos e ofertas da igreja"
          : "Informações para dízimos e ofertas da igreja"
        }
      />
      {canConfigure ? <DizimosTab /> : <MembroDizimos />}
    </div>
  );

  if (isPastor && !isAdmin) {
    return <PastorLayout>{content}</PastorLayout>;
  }

  return <AppLayout>{content}</AppLayout>;
}
