import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MembroLayout } from '@/components/membro/MembroLayout';
import { MembroEventos } from '@/components/membro/MembroEventos';
import { MembroPagamentos } from '@/components/membro/MembroPagamentos';

export default function MembroHome() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'eventos' | 'pagamentos'>('eventos');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return (
    <MembroLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'eventos' ? <MembroEventos /> : <MembroPagamentos />}
    </MembroLayout>
  );
}
