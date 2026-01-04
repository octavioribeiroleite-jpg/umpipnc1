import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Calendar, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const mockMeetings = [
  {
    id: '1',
    title: 'Reunião Ordinária - Janeiro',
    date: '2024-01-15T19:00:00',
    moderator: 'João Silva',
    status: 'aberta',
    participants: 5,
  },
  {
    id: '2',
    title: 'Planejamento Retiro 2024',
    date: '2024-01-08T19:00:00',
    moderator: 'Maria Santos',
    status: 'fechada',
    participants: 4,
  },
  {
    id: '3',
    title: 'Reunião Extraordinária',
    date: '2024-01-02T19:00:00',
    moderator: 'Pedro Oliveira',
    status: 'fechada',
    participants: 6,
  },
];

export default function Reunioes() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <PageHeader
        title="Reuniões"
        description="Gerencie as reuniões da diretoria"
        action={
          <Button onClick={() => navigate('/reunioes/nova')}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Reunião
          </Button>
        }
      />

      <div className="space-y-4">
        {mockMeetings.map((meeting) => (
          <Card key={meeting.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{meeting.title}</h3>
                    <Badge
                      variant={meeting.status === 'aberta' ? 'default' : 'secondary'}
                    >
                      {meeting.status === 'aberta' ? 'Aberta' : 'Fechada'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(meeting.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {meeting.participants} participantes
                    </span>
                    <span>Moderador: {meeting.moderator}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/reunioes/${meeting.id}`)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {meeting.status === 'aberta' ? 'Acessar' : 'Ver ata'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
