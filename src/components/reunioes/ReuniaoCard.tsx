import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Eye, CheckCircle, Circle, Brain, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MeetingProgress {
  pautaComplete: boolean;
  totalContributions: number;
  finalizedContributions: number;
  contributionsRevealed: boolean;
  aiStatus: 'not_generated' | 'pending' | 'validated';
}

interface ReuniaoCardProps {
  id: string;
  title: string;
  date: string;
  moderatorName: string;
  status: 'aberta' | 'fechada';
  participantsCount: number;
  progress: MeetingProgress;
}

export function ReuniaoCard({
  id,
  title,
  date,
  moderatorName,
  status,
  participantsCount,
  progress,
}: ReuniaoCardProps) {
  const navigate = useNavigate();

  const getAiStatusText = () => {
    switch (progress.aiStatus) {
      case 'not_generated':
        return 'Não gerada';
      case 'pending':
        return 'Pendente';
      case 'validated':
        return 'Validada';
    }
  };

  const getAiStatusColor = () => {
    switch (progress.aiStatus) {
      case 'not_generated':
        return 'text-muted-foreground';
      case 'pending':
        return 'text-warning';
      case 'validated':
        return 'text-success';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold">{title}</h3>
                <Badge
                  variant={status === 'aberta' ? 'default' : 'secondary'}
                  className={status === 'aberta' ? 'bg-success hover:bg-success/90' : ''}
                >
                  {status === 'aberta' ? '🟢 Aberta' : '⚪ Fechada'}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(date).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {participantsCount} participantes
                </span>
                <span>Moderador: {moderatorName}</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/reunioes/${id}`)}
            >
              {status === 'aberta' ? (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Acessar
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Ata
                </>
              )}
            </Button>
          </div>

          {/* Progress Indicators */}
          <div className="flex flex-wrap items-center gap-4 text-xs border-t pt-3">
            <span className="flex items-center gap-1">
              {progress.pautaComplete ? (
                <CheckCircle className="h-3.5 w-3.5 text-success" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              Pauta: {progress.pautaComplete ? '✔️' : 'incompleta'}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Contribuições: {progress.finalizedContributions}/{progress.totalContributions}
              {progress.contributionsRevealed && ' | Reveladas ✔️'}
            </span>
            <span className={`flex items-center gap-1 ${getAiStatusColor()}`}>
              <Brain className="h-3.5 w-3.5" />
              IA: {getAiStatusText()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
