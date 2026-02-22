import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger,
} from '@/components/ui/drawer';
import { Sparkles, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AISummary {
  geral?: string;
  financas?: string;
  tarefas?: string;
  destaques?: string | string[];
  [key: string]: any;
}

export function AISummaryDrawer() {
  const [open, setOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [aiGeneratedAt, setAiGeneratedAt] = useState<string | null>(null);
  const [aiFromCache, setAiFromCache] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAISummary = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    else setAiLoading(true);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('summarize-for-pastor', {
        body: force ? { force: true } : undefined,
      });
      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);
      setAiSummary(result.summaries || null);
      setAiGeneratedAt(result.generated_at || null);
      setAiFromCache(result.from_cache || false);
    } catch (err: any) {
      console.error('AI Summary error:', err);
    } finally {
      setAiLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !aiSummary && !aiLoading) {
      fetchAISummary();
    }
  };

  return (
    <Drawer open={open} onOpenChange={handleOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
          Resumo IA
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DrawerTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Resumo Pastoral (IA)
            </DrawerTitle>
            <div className="flex items-center gap-2">
              {aiGeneratedAt && (
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(aiGeneratedAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </span>
              )}
              {aiFromCache && <Badge variant="outline" className="text-[10px] px-1">Cache</Badge>}
            </div>
          </div>
        </DrawerHeader>
        <div className="px-4 pb-6 max-h-[60vh] overflow-y-auto">
          {aiLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Carregando resumo...
            </div>
          ) : aiSummary?.geral ? (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-muted-foreground">{aiSummary.geral}</p>
              {aiSummary.destaques && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium mb-1">Pontos de atenção:</p>
                  {Array.isArray(aiSummary.destaques) ? (
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {aiSummary.destaques.map((d: string, i: number) => (
                        <li key={i}>• {d}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">{aiSummary.destaques}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum resumo disponível ainda.</p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full"
            onClick={() => fetchAISummary(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-3 w-3 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Gerando...' : aiSummary ? 'Atualizar Resumo' : 'Gerar Resumo com IA'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
