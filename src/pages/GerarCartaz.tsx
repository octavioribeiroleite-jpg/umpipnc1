import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PastorLayout } from '@/components/pastor/PastorLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { PosterWizard } from '@/components/cartaz/PosterWizard';

export default function GerarCartaz() {
  const { isPastor, isAdmin } = useAuth();

  // Pastor (non-admin) uses PastorLayout
  if (isPastor && !isAdmin) {
    return (
      <PastorLayout>
        <PageHeader title="Gerar Cartaz" description="Crie um cartaz para divulgação no WhatsApp com IA" />
        <PosterWizard />
      </PastorLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Gerar Cartaz" description="Crie um cartaz para divulgação no WhatsApp com IA" />
      <PosterWizard />
    </AppLayout>
  );
}
