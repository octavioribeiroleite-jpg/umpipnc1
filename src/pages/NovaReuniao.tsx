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
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '19:00',
  });

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('active', true)
        .order('full_name');

      if (!error && data) {
        setProfiles(data);
        // Auto-select current user
        if (user) {
          const currentProfile = data.find(p => p.user_id === user.id);
          if (currentProfile) {
            setSelectedParticipants([currentProfile.user_id]);
          }
        }
      }
    };

    fetchProfiles();
  }, [user]);

  const handleParticipantToggle = (userId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Reunião</CardTitle>
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
              <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {profiles.map((profile) => (
                  <div key={profile.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={profile.user_id}
                      checked={selectedParticipants.includes(profile.user_id)}
                      onCheckedChange={() => handleParticipantToggle(profile.user_id)}
                    />
                    <label
                      htmlFor={profile.user_id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {profile.full_name}
                      {profile.user_id === user?.id && (
                        <span className="ml-2 text-xs text-muted-foreground">(Moderador)</span>
                      )}
                    </label>
                  </div>
                ))}
                {profiles.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum perfil ativo encontrado.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Reunião
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
