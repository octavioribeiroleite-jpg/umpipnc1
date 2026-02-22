import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MembroLayout, type MembroTab } from '@/components/membro/MembroLayout';
import { MembroInicio } from '@/components/membro/MembroInicio';
import { MembroEventos } from '@/components/membro/MembroEventos';
import { MembroPagamentos } from '@/components/membro/MembroPagamentos';
import { MembroComunicados } from '@/components/membro/MembroComunicados';

export default function MembroHome() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<MembroTab>('inicio');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  const renderContent = () => {
    switch (activeTab) {
      case 'inicio':
        return <MembroInicio onTabChange={setActiveTab} />;
      case 'eventos':
        return <MembroEventos />;
      case 'pagamentos':
        return <MembroPagamentos />;
      case 'comunicados':
        return <MembroComunicados />;
    }
  };

  return (
    <MembroLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </MembroLayout>
  );
}
