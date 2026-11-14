import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper function to format minutes display with proper styling
function formatMinutesDisplay(text: string, largeText: boolean) {
  const cleaned = text.replace(/\*\*/g, '').replace(/\*/g, '');
  
  // Split into lines
  const lines = cleaned.split('\n').map(line => line.trim().replace(/^#{1,6}\s+/, ''));
  const archivedFields = new Map<string, string>();
  const indexedFields = new Set<number>();
  // O cabeçalho de atas antigas também pode aparecer logo abaixo de PAUTA.
  for (const [index, line] of lines.entries()) {
    if (!line || /^---+$|^ATA (DA|DE) REUNIÃO$|^PAUTA:?$/i.test(line) || /^Moderador:/i.test(line)) continue;
    const field = /^(Reunião|Data|Participantes):\s*\S/i.exec(line)?.[1].toLowerCase();
    if (!field || archivedFields.has(field)) break;
    archivedFields.set(field, line);
    indexedFields.add(index);
  }
  const hasMeetingMetadata = archivedFields.has('reunião') || archivedFields.size > 1;
  const bodyLines = hasMeetingMetadata ? lines.filter((_, index) => !indexedFields.has(index)) : lines;
  
  // Known section headers
  const sectionHeaders = [
    'PAUTA',
    'DELIBERAÇÕES',
    'ENCAMINHAMENTOS',
    'PENDÊNCIAS',
    'OBSERVAÇÕES',
    'DECISÕES',
    'TAREFAS',
    'DATAS E PRAZOS',
  ];
  
  return (
    <div className={cn('meeting-minutes space-y-1.5 break-words border-t pt-2', largeText ? 'text-base leading-6' : 'text-sm leading-5 sm:text-base sm:leading-6')}>
      {bodyLines.map((trimmedLine, index) => {
        if (!trimmedLine || /^ATA (DA|DE) REUNIÃO$/i.test(trimmedLine)) return null;
        if (/^---+$/.test(trimmedLine)) return <hr key={index} className="border-border" />;
        
        // Check if it's a known section header (exact match or starts with)
        const isHeader = sectionHeaders.some(header => 
          trimmedLine.toUpperCase() === header || 
          trimmedLine.toUpperCase().startsWith(header + ':')
        );
        
        // Also detect ALL CAPS lines as headers
        const isAllCaps = trimmedLine === trimmedLine.toUpperCase() && 
                          trimmedLine.length > 3 && 
                          /[A-Z]/.test(trimmedLine);
        
        if (isHeader || isAllCaps) {
          return (
            <h3 key={index} className="border-t border-border pt-2 first:border-t-0 first:pt-0">
              {trimmedLine}
            </h3>
          );
        }
        
        if (/^Moderador:/i.test(trimmedLine)) {
          return (
            <p key={index} className="text-sm text-muted-foreground">
              {trimmedLine}
            </p>
          );
        }
        
        // Regular content
        return (
          <p key={index}>
            {trimmedLine}
          </p>
        );
      })}
      {hasMeetingMetadata && (
        <details className="border-t text-xs text-muted-foreground">
          <summary className="flex min-h-12 cursor-pointer list-none items-center font-semibold text-primary [&::-webkit-details-marker]:hidden">
            Dados originais da ata
          </summary>
          <div className="space-y-1">
            {[...archivedFields].map(([field, line]) => <p key={field}>{line}</p>)}
          </div>
        </details>
      )}
    </div>
  );
}

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
  onUpdateMinutes?: (newMinutes: string) => void | Promise<void>;
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
  const [loading, setLoading] = useState(!!editable);
  const [finalMinutes, setFinalMinutes] = useState(meeting.final_minutes || '');
  const [generating, setGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [editedMinutes, setEditedMinutes] = useState('');
  const [largeText, setLargeText] = useState(false);

  useEffect(() => {
    if (!editable) {
      setLoading(false);
      return;
    }
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
  }, [editable, meeting.id, meeting.moderator_id, meeting.contributions_revealed, meeting.ai_organized]);

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

  // Show minutes if they exist (regardless of meeting status)
  if (meeting.final_minutes) {
    const handleStartEdit = () => {
      setSaveError('');
      setEditedMinutes(meeting.final_minutes || '');
      setIsEditing(true);
    };

    const handleSaveEdit = async () => {
      if (!onUpdateMinutes || !editedMinutes.trim() || savingEdit) return;
      setSavingEdit(true); setSaveError('');
      try { await onUpdateMinutes(editedMinutes); setIsEditing(false); }
      catch { setSaveError('Não foi possível salvar a ata. Seu texto foi preservado.'); }
      finally { setSavingEdit(false); }
    };

    const handleCancelEdit = () => {
      setIsEditing(false);
      setEditedMinutes('');
    };

    return (
      <Card className="meeting-panel rounded-xl shadow-none">
        <CardHeader className="min-h-12 flex-row flex-wrap items-center justify-between gap-x-2 space-y-0 px-3 py-0 sm:space-y-0 md:px-4 md:py-0">
          <h2 className="text-base font-semibold">Ata da reunião</h2>
          {!isEditing && (
            <div className="-mr-2 flex items-center gap-0.5">
              <Button variant="ghost" size="sm" className="px-2 text-xs text-primary sm:hidden" aria-pressed={largeText} onClick={() => setLargeText(previous => !previous)}>
                Texto maior
              </Button>
              {canManage && <Button variant="ghost" size="sm" className="min-w-12 px-2 text-[.8125rem] text-primary" onClick={handleStartEdit}>
                Editar
              </Button>}
            </div>
          )}
        </CardHeader>
        <CardContent className="px-3 pb-3 md:px-4 md:pb-4">
          {meeting.status !== 'fechada' && <p className="pb-2 text-xs text-muted-foreground">Rascunho da ata. Revise antes de finalizar e compartilhar.</p>}
          {saveError && <p role="alert" className="mb-4 text-destructive">{saveError}</p>}
          
          {isEditing ? (
            <div className="space-y-4">
              <Textarea aria-label="Texto da ata"
                disabled={savingEdit}
                value={editedMinutes}
                onChange={(e) => setEditedMinutes(e.target.value)}
                rows={10}
                className="text-base leading-6"
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={handleCancelEdit} disabled={savingEdit}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit} disabled={savingEdit || !editedMinutes.trim()}>
                  Salvar ata
                </Button>
              </div>
            </div>
          ) : (
            formatMinutesDisplay(meeting.final_minutes, largeText)
          )}
        </CardContent>
      </Card>
    );
  }

  // Editable mode
  if (editable) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
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

        <Textarea aria-label="Texto da ata"
          value={finalMinutes}
          onChange={(e) => setFinalMinutes(e.target.value)}
          placeholder="Cole ou edite a ata da reunião aqui..."
          rows={20}
          className="text-base leading-6"
        />

        <div className="flex flex-wrap justify-end gap-2">
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
