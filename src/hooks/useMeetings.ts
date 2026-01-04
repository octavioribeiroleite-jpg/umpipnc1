import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

interface MeetingWithDetails extends Meeting {
  moderatorName: string;
  participantsCount: number;
  agendaItemsCount: number;
  totalContributions: number;
  finalizedContributions: number;
  aiSuggestionsCount: number;
  aiValidatedCount: number;
}

export function useMeetings() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<MeetingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeetings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch meetings
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meetings')
        .select('*')
        .order('date', { ascending: false });

      if (meetingsError) throw meetingsError;

      // Fetch profiles for moderator names
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name');

      // Fetch participants count for each meeting
      const { data: participants } = await supabase
        .from('meeting_participants')
        .select('meeting_id');

      // Fetch agenda items count
      const { data: agendaItems } = await supabase
        .from('agenda_items')
        .select('meeting_id');

      // Fetch contributions
      const { data: contributions } = await supabase
        .from('contributions')
        .select('meeting_id, status');

      // Fetch AI suggestions
      const { data: aiSuggestions } = await supabase
        .from('ai_suggestions')
        .select('meeting_id, status');

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      const meetingsWithDetails: MeetingWithDetails[] = (meetingsData || []).map(meeting => {
        const meetingParticipants = participants?.filter(p => p.meeting_id === meeting.id) || [];
        const meetingAgenda = agendaItems?.filter(a => a.meeting_id === meeting.id) || [];
        const meetingContributions = contributions?.filter(c => c.meeting_id === meeting.id) || [];
        const meetingAiSuggestions = aiSuggestions?.filter(s => s.meeting_id === meeting.id) || [];
        
        const finalizedContributions = meetingContributions.filter(c => c.status === 'final' || c.status === 'revealed').length;
        const validatedAiSuggestions = meetingAiSuggestions.filter(s => s.status === 'accepted').length;

        return {
          ...meeting,
          status: meeting.status as 'aberta' | 'fechada',
          moderatorName: profileMap.get(meeting.moderator_id) || 'Desconhecido',
          participantsCount: meetingParticipants.length,
          agendaItemsCount: meetingAgenda.length,
          totalContributions: meetingContributions.length,
          finalizedContributions,
          aiSuggestionsCount: meetingAiSuggestions.length,
          aiValidatedCount: validatedAiSuggestions,
        };
      });

      setMeetings(meetingsWithDetails);
    } catch (err) {
      console.error('Error fetching meetings:', err);
      setError('Erro ao carregar reuniões');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [user]);

  return { meetings, loading, error, refetch: fetchMeetings };
}
