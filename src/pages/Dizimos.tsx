import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PastorLayout } from '@/components/pastor/PastorLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { DizimosTab } from '@/components/financas/DizimosTab';

export default function Dizimos() {
  const { isAdmin, isPastor } = useAuth();

  if (!isAdmin && !isPastor) {
    return <Navigate to="/" replace />;
  }

  const content = (
    <>
      <PageHeader
        title="Dízimos e Ofertas"
        description="Configuração da chave PIX para dízimos e ofertas da igreja"
      />
      <DizimosTab />
    </>
  );

  if (isPastor && !isAdmin) {
    return <PastorLayout>{content}</PastorLayout>;
  }

  return <AppLayout>{content}</AppLayout>;
}
