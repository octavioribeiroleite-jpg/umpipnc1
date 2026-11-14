import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface AISuggestion {
  id: string;
  category: string;
  original_content: string;
  edited_content: string | null;
  status: string;
  suggested_event_title: string | null;
  suggested_event_date: string | null;
}

interface ResumoIATabProps {
  meetingId: string;
  isProcessed: boolean;
  revision?: number;
}

const categoryLabels: Record<string, string> = {
  decisoes: 'Decisões',
  tarefas: 'Tarefas',
  pendencias: 'Pendências',
  datas_prazos: 'Datas e prazos',
  observacoes: 'Observações',
  pontos_discutidos: 'Pontos discutidos',
  eventos_sugeridos: 'Eventos sugeridos',
};

export function ResumoIATab({ meetingId, isProcessed, revision = 0 }: ResumoIATabProps) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!isProcessed) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(false);
      try {
        const { data, error } = await supabase
          .from('ai_suggestions')
          .select('*')
          .eq('meeting_id', meetingId);

        if (error) throw error;
        setSuggestions(data || []);
      } catch (err) {
        setLoadError(true);
        console.error('Error fetching AI suggestions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [meetingId, isProcessed, revision, attempt]);

  if (!isProcessed) {
    return (
      <Card>
        <CardContent className="space-y-1 p-3">
          <h3 className="font-semibold text-primary">Resumo ainda não preparado</h3>
          <p className="text-sm text-muted-foreground">
            Escreva o registro da reunião e use “Preparar resumo” para organizar o conteúdo.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (loadError) return <div role="alert" className="rounded-xl border p-6 space-y-3"><p>Não foi possível carregar o resumo da IA.</p><Button variant="outline" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</Button></div>;

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-1 p-3">
          <h3 className="font-semibold text-primary">Nenhum item encontrado</h3>
          <p className="text-sm text-muted-foreground">
            A IA não identificou itens categorizáveis no registro da reunião.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group suggestions by category
  const grouped = suggestions.reduce((acc, suggestion) => {
    const category = suggestion.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(suggestion);
    return acc;
  }, {} as Record<string, AISuggestion[]>);

  // Define order of categories
  const categoryOrder = ['decisoes', 'tarefas', 'pendencias', 'datas_prazos', 'observacoes', 'pontos_discutidos', 'eventos_sugeridos'];
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    return categoryOrder.indexOf(a) - categoryOrder.indexOf(b);
  });

  return (
    <Card className="meeting-panel">
      <CardHeader className="min-h-12 flex-row items-center space-y-0">
        <h2>Resumo IA</h2>
      </CardHeader>
      <CardContent>
        <div className="meeting-minutes space-y-1.5 break-words border-t pt-2 text-sm leading-5 sm:text-base sm:leading-6">
          <p className="mobile-reading-meta text-xs text-muted-foreground">Revise os itens antes de finalizar a ata.</p>
          {sortedCategories.map(category => (
            <section key={category} className="space-y-1.5 border-t pt-2">
              <h3>{categoryLabels[category] ?? category}</h3>
              <ol className="list-decimal space-y-1.5 pl-5">
                {grouped[category].map(item => (
                  <li key={item.id}>{item.edited_content || item.original_content}</li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
