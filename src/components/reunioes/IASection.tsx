import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Brain, Check, X, Edit, Loader2, Info, FileText } from 'lucide-react';

interface AISuggestion {
  id: string;
  meeting_id: string;
  category: string;
  original_content: string;
  edited_content: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  suggested_event_title: string | null;
  suggested_event_date: string | null;
}

interface IASectionProps {
  meetingId: string;
  canManage: boolean;
  aiOrganized: boolean;
  onUpdate: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  'pauta': 'Pauta',
  'decisoes': 'Decisões',
  'tarefas': 'Tarefas',
  'pendencias': 'Pendências',
  'datas_prazos': 'Datas e Prazos',
  'observacoes': 'Observações',
};

export function IASection({ meetingId, canManage, aiOrganized, onUpdate }: IASectionProps) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_suggestions')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('category');

      if (error) throw error;
      setSuggestions((data || []).map(s => ({
        ...s,
        status: s.status as 'pending' | 'accepted' | 'rejected'
      })));
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [meetingId]);

  const handleGenerateAI = async () => {
    setGenerating(true);
    try {
      const response = await supabase.functions.invoke('organize-meeting', {
        body: { meetingId },
      });

      if (response.error) {
        // Check for specific error types
        const errorData = response.error as any;
        if (errorData?.context?.status === 429) {
          throw new Error('RATE_LIMIT');
        }
        if (errorData?.context?.status === 402) {
          throw new Error('CREDITS');
        }
        throw response.error;
      }

      // Check if response contains an error message
      if (response.data?.error) {
        if (response.data.error.includes('Limite') || response.data.error.includes('rate')) {
          throw new Error('RATE_LIMIT');
        }
        if (response.data.error.includes('Créditos') || response.data.error.includes('credit')) {
          throw new Error('CREDITS');
        }
        throw new Error(response.data.error);
      }

      // Update meeting
      await supabase
        .from('meetings')
        .update({ ai_organized: true })
        .eq('id', meetingId);

      await fetchSuggestions();
      onUpdate();
      
      toast({
        title: 'Sucesso',
        description: 'Contribuições organizadas pela IA com sucesso!',
      });
    } catch (err: any) {
      console.error('Error generating AI:', err);
      
      let errorMessage = 'Erro ao processar com IA. Tente novamente.';
      if (err.message === 'RATE_LIMIT') {
        errorMessage = 'Limite de requisições excedido. Aguarde alguns minutos e tente novamente.';
      } else if (err.message === 'CREDITS') {
        errorMessage = 'Créditos de IA insuficientes. Entre em contato com o administrador.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const response = await supabase.functions.invoke('summarize-contributions', {
        body: { meetingId },
      });

      if (response.error) {
        throw response.error;
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setSummary(response.data.summary);
      toast({
        title: 'Sucesso',
        description: 'Resumo gerado com sucesso!',
      });
    } catch (err: any) {
      console.error('Error summarizing:', err);
      toast({
        title: 'Erro',
        description: err.message || 'Erro ao gerar resumo.',
        variant: 'destructive',
      });
    } finally {
      setSummarizing(false);
    }
  };

  const handleAccept = async (suggestionId: string) => {
    try {
      const { error } = await supabase
        .from('ai_suggestions')
        .update({ status: 'accepted' })
        .eq('id', suggestionId);

      if (error) throw error;
      await fetchSuggestions();
    } catch (err) {
      console.error('Error accepting:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao aceitar sugestão.',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (suggestionId: string) => {
    try {
      const { error } = await supabase
        .from('ai_suggestions')
        .update({ status: 'rejected' })
        .eq('id', suggestionId);

      if (error) throw error;
      await fetchSuggestions();
    } catch (err) {
      console.error('Error rejecting:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao rejeitar sugestão.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (suggestion: AISuggestion) => {
    setEditingId(suggestion.id);
    setEditContent(suggestion.edited_content || suggestion.original_content);
  };

  const handleSaveEdit = async (suggestionId: string) => {
    try {
      const { error } = await supabase
        .from('ai_suggestions')
        .update({ edited_content: editContent, status: 'accepted' })
        .eq('id', suggestionId);

      if (error) throw error;
      setEditingId(null);
      await fetchSuggestions();
      toast({ title: 'Sucesso', description: 'Sugestão editada e aceita.' });
    } catch (err) {
      console.error('Error saving edit:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar edição.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const groupedSuggestions = suggestions.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {} as Record<string, AISuggestion[]>);

  const pendingCount = suggestions.filter(s => s.status === 'pending').length;
  const acceptedCount = suggestions.filter(s => s.status === 'accepted').length;

  return (
    <div className="space-y-4">
      <Alert className="border-primary/50 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription>
          A organização realizada pela IA é apenas uma sugestão. Somente os itens aceitos pelo moderador comporão a ata final.
        </AlertDescription>
      </Alert>

      {/* Summary Card */}
      {summary && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Resumo Consolidado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{summary}</p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-3" 
              onClick={() => setSummary(null)}
            >
              Fechar resumo
            </Button>
          </CardContent>
        </Card>
      )}

      {!aiOrganized && suggestions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Organizar com IA</h3>
            <p className="text-sm text-muted-foreground mb-4">
              A IA irá analisar todas as contribuições reveladas e extrair automaticamente pautas, decisões, tarefas e mais.
            </p>
            {canManage && (
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button variant="outline" onClick={handleSummarize} disabled={summarizing}>
                  {summarizing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  {summarizing ? 'Resumindo...' : 'Resumir Ideias'}
                </Button>
                <Button onClick={handleGenerateAI} disabled={generating}>
                  {generating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4 mr-2" />
                  )}
                  {generating ? 'Processando...' : 'Organizar Contribuições'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <Badge variant="outline">
                {pendingCount} pendentes
              </Badge>
              <Badge variant="default" className="bg-success">
                {acceptedCount} aceitas
              </Badge>
            </div>
            {canManage && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSummarize} disabled={summarizing}>
                  {summarizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  Resumir
                </Button>
                <Button variant="outline" size="sm" onClick={handleGenerateAI} disabled={generating}>
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
                  Reorganizar
                </Button>
              </div>
            )}
          </div>

          {Object.entries(groupedSuggestions).map(([category, items]) => (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {CATEGORY_LABELS[category] || category}
                </CardTitle>
                <CardDescription>
                  {items.length} item(ns)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className={`p-3 rounded-lg border ${
                      suggestion.status === 'accepted' ? 'border-success bg-success/5' :
                      suggestion.status === 'rejected' ? 'border-destructive/50 bg-destructive/5 opacity-50' :
                      'border-border'
                    }`}
                  >
                    {editingId === suggestion.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSaveEdit(suggestion.id)}>
                            Salvar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm">
                          {suggestion.edited_content || suggestion.original_content}
                        </p>
                        {suggestion.suggested_event_title && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Evento sugerido: {suggestion.suggested_event_title}
                            {suggestion.suggested_event_date && ` - ${new Date(suggestion.suggested_event_date).toLocaleDateString('pt-BR')}`}
                          </p>
                        )}
                        {canManage && suggestion.status === 'pending' && (
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" variant="outline" className="text-success border-success hover:bg-success/10" onClick={() => handleAccept(suggestion.id)}>
                              <Check className="h-3 w-3 mr-1" />
                              Aceitar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEdit(suggestion)}>
                              <Edit className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => handleReject(suggestion.id)}>
                              <X className="h-3 w-3 mr-1" />
                              Rejeitar
                            </Button>
                          </div>
                        )}
                        {suggestion.status !== 'pending' && (
                          <Badge className="mt-2" variant={suggestion.status === 'accepted' ? 'default' : 'secondary'}>
                            {suggestion.status === 'accepted' ? 'Aceita' : 'Rejeitada'}
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
