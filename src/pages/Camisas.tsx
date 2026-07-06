import { Shirt } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { CamisasTab } from '@/components/financas/CamisasTab';
import { StableRefreshBoundary } from '@/components/ui/stable-refresh-boundary';
import '@/finance-responsive.css';
import '@/camisas.css';
import '@/camisas-orders-refinement.css';

export default function Camisas() {
  return (
    <AppLayout>
      <div className="finance-page shirts-page min-w-0">
        <PageHeader
          title="Camisas"
          description="Controle de lotes, pedidos, pagamentos, entregas e resultado financeiro"
          eyebrow="Gestão de camisas"
          icon={<Shirt />}
        />

        <StableRefreshBoundary className="finance-tab-panel">
          <CamisasTab />
        </StableRefreshBoundary>
      </div>
    </AppLayout>
  );
}
