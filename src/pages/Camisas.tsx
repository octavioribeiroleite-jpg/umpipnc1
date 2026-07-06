import { Shirt } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { CamisasTab } from '@/components/financas/CamisasTab';
import '@/finance-responsive.css';

export default function Camisas() {
  return (
    <AppLayout>
      <div className="finance-page min-w-0">
        <PageHeader
          title="Camisas"
          description="Controle de lotes, pedidos, pagamentos, entregas e resultado financeiro"
          icon={Shirt}
        />

        <div className="finance-tab-panel">
          <CamisasTab />
        </div>
      </div>
    </AppLayout>
  );
}
