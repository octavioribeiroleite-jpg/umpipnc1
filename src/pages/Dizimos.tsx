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
    <>
      <PageHeader
        title="Dízimos e Ofertas"
        description={canConfigure
          ? "Configuração da chave PIX para dízimos e ofertas da igreja"
          : "Informações para dízimos e ofertas da igreja"
        }
      />
      {canConfigure ? <DizimosTab /> : <MembroDizimos />}
    </>
  );

  if (isPastor && !isAdmin) {
    return <PastorLayout>{content}</PastorLayout>;
  }

  return <AppLayout>{content}</AppLayout>;
}
