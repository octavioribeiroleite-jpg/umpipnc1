import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, CheckCircle, UserCheck } from 'lucide-react';

interface ResultPanelProps {
  electionId: string;
  totalPresent: number;
  candidates: { id: string; name: string; photo_url: string | null }[];
}

export function ResultPanel({ electionId, totalPresent, candidates }: ResultPanelProps) {
  const [results, setResults] = useState<{ candidate_id: string; count: number }[]>([]);

  useEffect(() => {
    const fetchResults = async () => {
      const { data } = await supabase
        .from('election_votes' as any)
        .select('candidate_id')
        .eq('election_id', electionId);

      if (data) {
        const counts = (data as any[]).reduce((acc: Record<string, number>, v: any) => {
          acc[v.candidate_id] = (acc[v.candidate_id] || 0) + 1;
          return acc;
        }, {});
        const sorted = Object.entries(counts)
          .map(([candidate_id, count]) => ({ candidate_id, count: count as number }))
          .sort((a, b) => b.count - a.count);
        setResults(sorted);
      }
    };
    fetchResults();
  }, [electionId]);

  const totalVotes = results.reduce((s, r) => s + r.count, 0);
  const isValid = totalVotes === totalPresent;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" /> Resultado
          {isValid ? (
            <Badge className="bg-success text-success-foreground"><CheckCircle className="h-3 w-3 mr-1" /> Válido</Badge>
          ) : (
            <Badge variant="destructive">Inválido</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {results.map((r, i) => {
            const candidate = candidates.find((c) => c.id === r.candidate_id);
            const pct = totalVotes > 0 ? Math.round((r.count / totalVotes) * 100) : 0;
            return (
              <div key={r.candidate_id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                  {candidate?.photo_url ? (
                    <img src={candidate.photo_url} alt={candidate?.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserCheck className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {i === 0 && <Trophy className="h-4 w-4 text-warning" />}
                    <span className="font-medium">{candidate?.name || 'Desconhecido'}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-1">
                    <div className="bg-primary rounded-full h-2" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold">{r.count}</p>
                  <p className="text-xs text-muted-foreground">{pct}%</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-4 pt-2 border-t text-sm">
          <span>Total votos: <strong>{totalVotes}</strong></span>
          <span>Total presentes: <strong>{totalPresent}</strong></span>
        </div>
      </CardContent>
    </Card>
  );
}
