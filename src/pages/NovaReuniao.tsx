import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  active: boolean;
}

export default function NovaReuniao() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const userId = user?.id;
  const societyId = profile?.society_id;
  const [loading, setLoading] = useState(false);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [profilesError, setProfilesError] = useState(false);
  const [profileAttempt, setProfileAttempt] = useState(0);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '19:00',
  });

  useEffect(() => {
    let cancelled = false;
    const fetchProfiles = async () => {
      if (!userId) return;
      setProfilesLoading(true);
      setProfilesError(false);
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('active', true)
        .order('full_name');

      // Filter participants by same society
      if (societyId) {
        query = query.eq('society_id', societyId);
      }

      const { data, error } = await query;

      if (cancelled) return;
      setProfilesLoading(false);
      setProfilesError(Boolean(error));
      if (!error && data) {
        setProfiles(data);
        // Auto-select current user
        if (userId) {
          const currentProfile = data.find(p => p.user_id === userId);
          if (currentProfile) {
            setSelectedParticipants(previous => previous.length ? previous : [currentProfile.user_id]);
          }
        }
      }
    };

    fetchProfiles();
    return () => { cancelled = true; };
  }, [userId, societyId, profileAttempt]);

  const handleParticipantToggle = (userId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para criar uma reunião.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.title || !formData.date) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedParticipants.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos um participante.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const dateTime = `${formData.date}T${formData.time}:00`;

      // Create meeting
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .insert({
          title: formData.title,
          date: dateTime,
          moderator_id: user.id,
          status: 'aberta',
          society_id: profile?.society_id || null,
        })
        .select()
        .single();

      if (meetingError) throw meetingError;

      // Add participants
      const participantInserts = selectedParticipants.map(userId => ({
        meeting_id: meeting.id,
        user_id: userId,
      }));

      const { error: participantsError } = await supabase
        .from('meeting_participants')
        .insert(participantInserts);

      if (participantsError) throw participantsError;

      toast({
        title: 'Sucesso',
        description: 'Reunião criada com sucesso!',
      });

      navigate(`/reunioes/${meeting.id}`);
    } catch (err) {
      console.error('Error creating meeting:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao criar reunião. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Nova Reunião"
        description="Crie uma nova reunião da diretoria"
        action={
          <Button variant="outline" onClick={() => navigate('/reunioes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[720px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Identidade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  placeholder="Ex: Reunião Ordinária - Janeiro"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Agenda</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date">Data *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Horário *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Participantes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {profilesLoading && <p role="status" className="text-muted-foreground">Carregando participantes…</p>}
                {profilesError && <div role="alert" className="space-y-2"><p>Não foi possível carregar os participantes.</p><Button type="button" variant="outline" onClick={() => setProfileAttempt(value => value + 1)}>Tentar novamente</Button></div>}
                {profiles.map((profile) => (
                  <div key={profile.id} className="flex min-h-14 items-center space-x-3 rounded-lg border border-border px-3">
                    <Checkbox
                      id={profile.user_id}
                      checked={selectedParticipants.includes(profile.user_id)}
                      onCheckedChange={() => handleParticipantToggle(profile.user_id)}
                    />
                    <label
                      htmlFor={profile.user_id}
                      className="flex min-h-14 min-w-0 flex-1 flex-wrap items-center break-words text-base font-medium leading-relaxed peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {profile.full_name}
                      {profile.user_id === user?.id && (
                        <span className="ml-2 text-xs text-muted-foreground">(Moderador)</span>
                      )}
                    </label>
                  </div>
                ))}
                {!profilesLoading && !profilesError && profiles.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum perfil ativo encontrado.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end [&_button]:w-full sm:[&_button]:w-auto">
          <Button type="submit" disabled={loading || profilesLoading || profilesError}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Reunião
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
