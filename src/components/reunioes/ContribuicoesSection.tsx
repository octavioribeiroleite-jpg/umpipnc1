import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, Lock, Send, Loader2, AlertTriangle } from 'lucide-react';

interface AgendaItem {
  id: string;
  meeting_id: string;
  title: string;
  description: string | null;
  order_index: number;
}

interface Contribution {
  id: string;
  meeting_id: string;
  agenda_item_id: string | null;
  user_id: string;
  content: string;
  status: 'draft' | 'final' | 'revealed';
  userName?: string;
}

interface ContribuicoesSectionProps {
  meetingId: string;
  agendaItems: AgendaItem[];
  contributionsRevealed: boolean;
  isModerator: boolean;
  isProcessing?: boolean;
  onReveal: () => void;
}

export function ContribuicoesSection({
  meetingId,
  agendaItems,
  contributionsRevealed,
  isModerator,
  isProcessing,
  onReveal,
}: ContribuicoesSectionProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const fetchContributions = async () => {
    try {
      const { data: contribData, error } = await supabase
        .from('contributions')
        .select('*')
        .eq('meeting_id', meetingId);

      if (error) throw error;

      // Get profiles for names
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name');

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      const enrichedContributions = (contribData || []).map(c => ({
        ...c,
        status: c.status as 'draft' | 'final' | 'revealed',
        userName: profileMap.get(c.user_id) || 'Desconhecido',
      }));

      setContributions(enrichedContributions);

      // Initialize drafts for current user
      const userDrafts: Record<string, string> = {};
      agendaItems.forEach(item => {
        const existing = enrichedContributions.find(
          c => c.agenda_item_id === item.id && c.user_id === user?.id
        );
        userDrafts[item.id] = existing?.content || '';
      });
      // General contribution (no agenda item)
      const generalContrib = enrichedContributions.find(
        c => c.agenda_item_id === null && c.user_id === user?.id
      );
      userDrafts['general'] = generalContrib?.content || '';
      setDrafts(userDrafts);
    } catch (err) {
      console.error('Error fetching contributions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContributions();
  }, [meetingId, user]);

  const handleSaveDraft = async (agendaItemId: string | null) => {
    if (!user) return;
    const key = agendaItemId || 'general';
    const content = drafts[key];

    if (!content?.trim()) {
      toast({
        title: 'Erro',
        description: 'A contribuição não pode estar vazia.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(key);
    try {
      const existing = contributions.find(
        c => c.agenda_item_id === agendaItemId && c.user_id === user.id
      );

      if (existing) {
        const { error } = await supabase
          .from('contributions')
          .update({ content, status: 'draft' })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('contributions')
          .insert({
            meeting_id: meetingId,
            agenda_item_id: agendaItemId,
            user_id: user.id,
            content,
            status: 'draft',
          });
        if (error) throw error;
      }

      await fetchContributions();
      toast({ title: 'Sucesso', description: 'Rascunho salvo.' });
    } catch (err) {
      console.error('Error saving draft:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar rascunho.',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const handleFinalize = async (agendaItemId: string | null) => {
    if (!user) return;
    const key = agendaItemId || 'general';

    const confirmed = window.confirm(
      'Após finalizar, você não poderá mais editar esta contribuição.\n\nDeseja continuar?'
    );
    if (!confirmed) return;

    setSaving(key);
    try {
      const existing = contributions.find(
        c => c.agenda_item_id === agendaItemId && c.user_id === user.id
      );

      if (existing) {
        const { error } = await supabase
          .from('contributions')
          .update({ status: 'final' })
          .eq('id', existing.id);
        if (error) throw error;
      }

      await fetchContributions();
      toast({ title: 'Sucesso', description: 'Contribuição finalizada.' });
    } catch (err) {
      console.error('Error finalizing:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao finalizar contribuição.',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const getMyContribution = (agendaItemId: string | null) => {
    return contributions.find(
      c => c.agenda_item_id === agendaItemId && c.user_id === user?.id
    );
  };

  const getOtherContributions = (agendaItemId: string | null) => {
    return contributions.filter(
      c => c.agenda_item_id === agendaItemId && c.user_id !== user?.id
    );
  };

  const renderContributionInput = (agendaItemId: string | null, title: string) => {
    const key = agendaItemId || 'general';
    const myContrib = getMyContribution(agendaItemId);
    const otherContribs = getOtherContributions(agendaItemId);
    const isFinalized = myContrib?.status === 'final' || myContrib?.status === 'revealed';

    return (
      <Card key={key} className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* My contribution */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Minha contribuição</span>
              {myContrib && (
                <Badge variant={isFinalized ? 'secondary' : 'outline'}>
                  {isFinalized ? (
                    <>
                      <Lock className="h-3 w-3 mr-1" />
                      Finalizada
                    </>
                  ) : (
                    'Rascunho'
                  )}
                </Badge>
              )}
            </div>
            <Textarea
              value={drafts[key] || ''}
              onChange={(e) => setDrafts({ ...drafts, [key]: e.target.value })}
              placeholder="Escreva sua contribuição aqui..."
              disabled={isFinalized}
              rows={3}
            />
            {!isFinalized && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSaveDraft(agendaItemId)}
                  disabled={saving === key}
                >
                  {saving === key ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Salvar Rascunho
                </Button>
                {myContrib && (
                  <Button
                    size="sm"
                    onClick={() => handleFinalize(agendaItemId)}
                    disabled={saving === key}
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Finalizar
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Other contributions */}
          {otherContribs.length > 0 && (
            <div className="border-t pt-4 space-y-3">
              <span className="text-sm font-medium">Outras contribuições</span>
              {otherContribs.map((contrib) => (
                <div key={contrib.id} className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{contrib.userName}</span>
                    <Badge variant="outline" className="text-xs">
                      {contrib.status === 'revealed' ? 'Revelada' : 
                       contrib.status === 'final' ? 'Finalizada' : 'Rascunho'}
                    </Badge>
                  </div>
                  {contributionsRevealed || contrib.status === 'revealed' ? (
                    <p className="text-sm">{contrib.content}</p>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <EyeOff className="h-4 w-4" />
                      <span className="text-sm italic">Contribuição oculta</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const totalFinal = contributions.filter(c => c.status === 'final').length;
  const totalContributions = contributions.length;

  return (
    <div className="space-y-4">
      {isModerator && !contributionsRevealed && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {totalFinal} contribuição(ões) finalizada(s) de {totalContributions} total.
            </span>
            <Button size="sm" onClick={onReveal} className="ml-4" disabled={isProcessing}>
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              {isProcessing ? 'Processando...' : 'Revelar e Processar'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {contributionsRevealed && (
        <Alert className="border-success">
          <Eye className="h-4 w-4 text-success" />
          <AlertDescription>
            As contribuições foram reveladas e estão visíveis para todos os participantes.
          </AlertDescription>
        </Alert>
      )}

      {/* General contribution */}
      {renderContributionInput(null, 'Contribuição Geral')}

      {/* Per agenda item */}
      {agendaItems.map((item, index) => 
        renderContributionInput(item.id, `${index + 1}. ${item.title}`)
      )}
    </div>
  );
}
