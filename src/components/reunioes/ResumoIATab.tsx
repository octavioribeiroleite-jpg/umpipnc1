import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, 
  CheckCircle2, 
  ListTodo, 
  Clock, 
  AlertTriangle, 
  MessageSquare,
  Calendar,
  Info
} from 'lucide-react';

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
}

const categoryConfig: Record<string, { title: string; icon: React.ReactNode; color: string }> = {
  decisoes: {
    title: 'Decisões',
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'bg-success/10 text-success border-success/20',
  },
  tarefas: {
    title: 'Tarefas',
    icon: <ListTodo className="h-4 w-4" />,
    color: 'bg-primary/10 text-primary border-primary/20',
  },
  pendencias: {
    title: 'Pendências',
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'bg-warning/10 text-warning border-warning/20',
  },
  datas_prazos: {
    title: 'Datas e Prazos',
    icon: <Calendar className="h-4 w-4" />,
    color: 'bg-info/10 text-info border-info/20',
  },
  observacoes: {
    title: 'Observações',
    icon: <MessageSquare className="h-4 w-4" />,
    color: 'bg-muted text-muted-foreground border-muted',
  },
  pontos_discutidos: {
    title: 'Pontos Discutidos',
    icon: <MessageSquare className="h-4 w-4" />,
    color: 'bg-secondary/50 text-secondary-foreground border-secondary/20',
  },
  eventos_sugeridos: {
    title: 'Eventos Sugeridos',
    icon: <Calendar className="h-4 w-4" />,
    color: 'bg-accent/50 text-accent-foreground border-accent/20',
  },
};

export function ResumoIATab({ meetingId, isProcessed }: ResumoIATabProps) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!isProcessed) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('ai_suggestions')
          .select('*')
          .eq('meeting_id', meetingId);

        if (error) throw error;
        setSuggestions(data || []);
      } catch (err) {
        console.error('Error fetching AI suggestions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [meetingId, isProcessed]);

  if (!isProcessed) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">Ainda não processado</h3>
          <p className="text-sm text-muted-foreground">
            Escreva o registro da reunião e clique em "Processar Reunião" para que a IA organize o conteúdo.
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

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">Nenhum item encontrado</h3>
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
    <div className="space-y-4">
      <Alert className="border-primary/50 bg-primary/5">
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription>
          A IA analisou o registro e organizou o conteúdo nas categorias abaixo. Revise os itens antes de finalizar a ata.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {sortedCategories.map((category) => {
          const config = categoryConfig[category] || {
            title: category,
            icon: <MessageSquare className="h-4 w-4" />,
            color: 'bg-muted text-muted-foreground border-muted',
          };
          const items = grouped[category];

          return (
            <Card key={category}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={config.color}>
                    {config.icon}
                    <span className="ml-1">{config.title}</span>
                  </Badge>
                  <span className="text-sm text-muted-foreground font-normal">
                    ({items.length} {items.length === 1 ? 'item' : 'itens'})
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2">
                  {items.map((item, index) => (
                    <li key={item.id} className="flex gap-2 text-sm">
                      <span className="text-muted-foreground font-mono">{index + 1}.</span>
                      <span>{item.edited_content || item.original_content}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
