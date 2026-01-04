import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Calendar, Users, Loader2, Edit, Save, X } from 'lucide-react';

interface Meeting {
  id: string;
  title: string;
  date: string;
  status: 'aberta' | 'fechada';
  moderator_id: string;
  contributions_revealed: boolean;
  ai_organized: boolean;
  final_minutes: string | null;
}

interface AgendaItem {
  id: string;
  meeting_id: string;
  title: string;
  description: string | null;
  order_index: number;
}

interface AtaViewerProps {
  meeting: Meeting;
  agendaItems: AgendaItem[];
  editable?: boolean;
  canManage?: boolean;
  onClose?: (finalMinutes: string) => void;
  onUpdateMinutes?: (newMinutes: string) => void;
}

interface AISuggestion {
  id: string;
  category: string;
  original_content: string;
  edited_content: string | null;
  status: string;
}

interface Contribution {
  id: string;
  content: string;
  user_id: string;
  agenda_item_id: string | null;
  userName?: string;
}

export function AtaViewer({ meeting, agendaItems, editable, canManage, onClose, onUpdateMinutes }: AtaViewerProps) {
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<AISuggestion[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [moderatorName, setModeratorName] = useState('');
  const [participantNames, setParticipantNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [finalMinutes, setFinalMinutes] = useState(meeting.final_minutes || '');
  const [generating, setGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMinutes, setEditedMinutes] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch accepted suggestions
        const { data: suggestions } = await supabase
          .from('ai_suggestions')
          .select('*')
          .eq('meeting_id', meeting.id)
          .eq('status', 'accepted');

        setAcceptedSuggestions(suggestions || []);

        // Fetch revealed contributions
        const { data: contribs } = await supabase
          .from('contributions')
          .select('*')
          .eq('meeting_id', meeting.id)
          .eq('status', 'revealed');

        // Get profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name');

        const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

        setContributions((contribs || []).map(c => ({
          ...c,
          userName: profileMap.get(c.user_id) || 'Desconhecido',
        })));

        setModeratorName(profileMap.get(meeting.moderator_id) || 'Desconhecido');

        // Fetch participants
        const { data: participants } = await supabase
          .from('meeting_participants')
          .select('user_id')
          .eq('meeting_id', meeting.id);

        const names = (participants || [])
          .map(p => profileMap.get(p.user_id))
          .filter(Boolean) as string[];
        setParticipantNames(names);
      } catch (err) {
        console.error('Error fetching ata data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [meeting]);

  const generateMinutes = () => {
    const lines: string[] = [];
    
    lines.push(`# ATA DE REUNIÃO`);
    lines.push('');
    lines.push(`**Reunião:** ${meeting.title}`);
    lines.push(`**Data:** ${new Date(meeting.date).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`);
    lines.push(`**Moderador:** ${moderatorName}`);
    lines.push(`**Participantes:** ${participantNames.join(', ')}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Pauta
    if (agendaItems.length > 0) {
      lines.push('## PAUTA');
      lines.push('');
      agendaItems.forEach((item, i) => {
        lines.push(`${i + 1}. ${item.title}`);
        if (item.description) lines.push(`   ${item.description}`);
      });
      lines.push('');
    }

    // Group suggestions by category
    const grouped = acceptedSuggestions.reduce((acc, s) => {
      if (!acc[s.category]) acc[s.category] = [];
      acc[s.category].push(s);
      return acc;
    }, {} as Record<string, AISuggestion[]>);

    const categoryTitles: Record<string, string> = {
      'pauta': 'PAUTA',
      'decisoes': 'DECISÕES',
      'tarefas': 'TAREFAS',
      'pendencias': 'PENDÊNCIAS',
      'datas_prazos': 'DATAS E PRAZOS',
      'observacoes': 'OBSERVAÇÕES',
    };

    Object.entries(grouped).forEach(([category, items]) => {
      const title = categoryTitles[category] || category.toUpperCase();
      lines.push(`## ${title}`);
      lines.push('');
      items.forEach((item, i) => {
        lines.push(`${i + 1}. ${item.edited_content || item.original_content}`);
      });
      lines.push('');
    });

    lines.push('---');
    lines.push('');
    lines.push('*Ata gerada automaticamente pelo sistema.*');

    return lines.join('\n');
  };

  const handleGenerate = () => {
    const minutes = generateMinutes();
    setFinalMinutes(minutes);
  };

  const handleClose = () => {
    if (!finalMinutes.trim()) {
      alert('A ata não pode estar vazia.');
      return;
    }

    const confirmed = window.confirm(
      'ATENÇÃO: Após encerrar a reunião, nenhuma alteração poderá ser feita.\n\nDeseja continuar?'
    );

    if (confirmed && onClose) {
      setGenerating(true);
      onClose(finalMinutes);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // Read-only mode (closed meeting)
  if (meeting.status === 'fechada' && meeting.final_minutes) {
    const handleStartEdit = () => {
      setEditedMinutes(meeting.final_minutes || '');
      setIsEditing(true);
    };

    const handleSaveEdit = () => {
      if (onUpdateMinutes && editedMinutes.trim()) {
        onUpdateMinutes(editedMinutes);
        setIsEditing(false);
      }
    };

    const handleCancelEdit = () => {
      setIsEditing(false);
      setEditedMinutes('');
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Ata da Reunião
            </span>
            {canManage && !isEditing && (
              <Button variant="outline" size="sm" onClick={handleStartEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar Ata
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(meeting.date).toLocaleDateString('pt-BR')}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {participantNames.length} participantes
            </span>
          </div>
          <Separator className="my-4" />
          
          {isEditing ? (
            <div className="space-y-4">
              <Textarea
                value={editedMinutes}
                onChange={(e) => setEditedMinutes(e.target.value)}
                rows={20}
                className="font-mono text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
              {meeting.final_minutes}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Editable mode
  if (editable) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {acceptedSuggestions.length} itens aceitos
            </Badge>
            <Badge variant="outline">
              {contributions.length} contribuições
            </Badge>
          </div>
          <Button variant="outline" onClick={handleGenerate}>
            Gerar Ata Automática
          </Button>
        </div>

        <Textarea
          value={finalMinutes}
          onChange={(e) => setFinalMinutes(e.target.value)}
          placeholder="Cole ou edite a ata da reunião aqui..."
          rows={20}
          className="font-mono text-sm"
        />

        <div className="flex justify-end gap-2">
          <Button
            onClick={handleClose}
            disabled={generating || !finalMinutes.trim()}
          >
            {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Encerrar Reunião e Salvar Ata
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
